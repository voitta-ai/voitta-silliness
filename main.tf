###############################################################################
# Anno Dario Calendar — AWS infrastructure
#
# Creates a static-hosted site:
#   - Private S3 bucket (no public access)
#   - CloudFront distribution with Origin Access Control (OAC)
#   - Bucket policy that only allows the CloudFront distribution to read
#
# Usage:
#   terraform init
#   terraform apply
#   # Then upload the built files:
#   aws s3 sync ../src/ s3://$(terraform output -raw bucket_name)/
#   # And invalidate the CDN if you're updating:
#   aws cloudfront create-invalidation \
#     --distribution-id $(terraform output -raw distribution_id) \
#     --paths "/*"
###############################################################################

terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

provider "aws" {
  region = var.region
}

resource "random_id" "suffix" {
  byte_length = 4
}

###############################################################################
# S3 bucket (private)
###############################################################################

resource "aws_s3_bucket" "site" {
  bucket = "${var.project_name}-${random_id.suffix.hex}"
}

resource "aws_s3_bucket_public_access_block" "site" {
  bucket                  = aws_s3_bucket.site.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "site" {
  bucket = aws_s3_bucket.site.id
  versioning_configuration {
    status = "Disabled"
  }
}

###############################################################################
# CloudFront — Origin Access Control + distribution
###############################################################################

resource "aws_cloudfront_origin_access_control" "site" {
  name                              = "${var.project_name}-${random_id.suffix.hex}-oac"
  description                       = "OAC for ${var.project_name}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "site" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100" # US/EU only — cheapest
  comment             = var.project_name

  origin {
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_id                = "s3-origin"
    origin_access_control_id = aws_cloudfront_origin_access_control.site.id
  }

  default_cache_behavior {
    target_origin_id       = "s3-origin"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    # AWS-managed "CachingOptimized" policy id.
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  }

  # SPA-style 404 → index.html. Not strictly needed since we have real files,
  # but doesn't hurt and helps if someone deep-links a path that doesn't exist.
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Project = var.project_name
  }
}

###############################################################################
# Bucket policy — CloudFront-only access
###############################################################################

data "aws_iam_policy_document" "site" {
  statement {
    sid     = "AllowCloudFrontServicePrincipal"
    effect  = "Allow"
    actions = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.site.arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.site.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "site" {
  bucket = aws_s3_bucket.site.id
  policy = data.aws_iam_policy_document.site.json
}
