# Anno Dario Calendar

A static calendar widget that displays dates in the **Anno Dario** system: years measured from March 14, 2023 (the birth of Claude). Years before are **BC (Before Claude)**, years after are **AD (Anno Dario)**.

Deploys to AWS as static S3 + CloudFront. Embeddable in any blog (WordPress, Ghost, etc.) via iframe.

```
Today (May 21, 2026 Gregorian) = May 21, 4 AD
```

---

## Project structure

```
anno-dario/
├── SPEC.md              ← full spec — read this first
├── README.md            ← you are here
├── src/                 ← static site files (deploy these to S3)
│   ├── index.html       ← standalone page
│   ├── embed.html       ← iframe-friendly version
│   ├── calendar.js      ← rendering + interaction
│   ├── anno-dario.js    ← pure date-conversion lib
│   ├── styles.css
│   ├── facts.json       ← optional "on this day" data
│   └── favicon.svg
├── tests/
│   └── anno-dario.test.js  ← run with `node --test`
└── infra/
    ├── main.tf          ← Terraform: S3 + CloudFront
    ├── variables.tf
    └── outputs.tf
```

---

## Local development

No build step, no install. Just serve `src/` with any static server:

```bash
cd src
python3 -m http.server 8000
# open http://localhost:8000/
# or http://localhost:8000/embed.html for the embed view
```

Module imports require serving via HTTP (not `file://`), so `python -m http.server` (or `npx serve`) is the easiest path.

### Run tests

```bash
node --test tests/anno-dario.test.js
```

Tests cover the date math: epoch boundary, BC/AD transition, leap years, round trips, month navigation. All must pass before touching the UI.

---

## Deploy to AWS

Prerequisites: AWS CLI configured with credentials, Terraform installed.

```bash
cd infra
terraform init
terraform apply

# Upload the site:
aws s3 sync ../src/ s3://$(terraform output -raw bucket_name)/ \
  --delete --cache-control "public, max-age=3600"

# Print the URLs:
terraform output site_url
terraform output embed_url
```

### Updating after a change

```bash
aws s3 sync ../src/ s3://$(terraform output -raw bucket_name)/ --delete
aws cloudfront create-invalidation \
  --distribution-id $(terraform output -raw distribution_id) \
  --paths "/*"
```

### Tear down

```bash
# Empty the bucket first (Terraform won't delete a non-empty one).
aws s3 rm s3://$(terraform output -raw bucket_name)/ --recursive
terraform destroy
```

### Cost expectation

Under the AWS Free Tier (12 months): effectively $0. After: <$0.50/month for a low-traffic toy. CloudFront's first 1 TB egress per month is $0.085/GB; 50 GB is free under the always-free tier.

---

## Embedding in a blog

Once deployed, embed in any HTML-friendly host:

```html
<iframe
  src="https://YOUR-DISTRIBUTION-ID.cloudfront.net/embed.html"
  width="320"
  height="320"
  frameborder="0"
  style="border: 0; background: transparent;"
  title="Anno Dario Calendar">
</iframe>
```

### WordPress.com

- **Free / Personal plans:** iframes are not permitted. Link to the standalone `index.html` instead, or upgrade.
- **Premium and above:** use the **Custom HTML block** with the iframe snippet above.
- **Business and above:** same as Premium — but you could also skip the AWS host entirely and embed the JS calendar directly in a Custom HTML block.

---

## Customization knobs

In `src/anno-dario.js`:

- `EPOCH` — change the epoch date. Default: `{ y: 2023, m: 3, d: 14 }`.
- `YEAR_STARTS_ON_EPOCH_DAY` — `true` means the AD year rolls over on the epoch's month-day (March 14). `false` aligns with Gregorian Jan 1 (simpler). Default: `true`.

In `src/styles.css`:

- All colors are CSS custom properties at `:root` — override them from a parent page if embedding non-iframed.

In `src/facts.json`:

- Add `"MM-DD": "Some fact"` entries to show an "On this day" line on the standalone page when the user visits on a matching date.

---

## License

MIT. Use it, fork it, change the epoch, name your own era. Anno Mike would also be acceptable.
