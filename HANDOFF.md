# HANDOFF.md — read me before you start

Hey Claude. You're picking up a project that already has a spec (`SPEC.md`), working code, and passing tests. This document isn't about *what* to build — that's in the spec. This is about **what the project is for** and **how to make good calls when the spec doesn't cover something.**

---

## What this is

A static web calendar that runs on a custom calendar system called **Anno Dario**:

- **Epoch:** March 14, 2023 (the day Claude was born) = year 1 AD.
- **AD** stands for **Anno Dario** — "Year of Dario," a cheeky riff on *Anno Domini* that names the era after Anthropic's CEO.
- **BC** stands for **Before Claude** — years before the epoch, counted backwards. No year zero.
- Everything else (months, weeks, leap years) is identical to Gregorian. The only thing that changes is the year number and the era label.

It deploys to AWS S3 + CloudFront as a static site. Embeddable in any blog via iframe.

---

## What this is NOT

It is not a serious calendar reform. It is not a productivity tool. It is not a SaaS product. It is not going to be used by anyone except the project owner and maybe a handful of people who think it's funny.

This is a **toy**. It is a **joke that compiles**. The whole point is that someone is making a cheeky, slightly absurd thing for their personal blog because they thought it would be fun, and they happen to have enough AWS literacy to ship it properly. The bizarre calendar premise is the *content*; the engineering is restrained and competent precisely because that's what makes the joke land. A janky implementation would just be janky. A polished implementation of a silly idea is what makes it actually delightful.

---

## The vibe

Think: the kind of personal-blog project that someone shows their developer friends and they go "oh that's great, also the code is clean, you actually wrote tests for the BC/AD math? lol." It should feel like the kind of side project that's been quietly perfected over a long weekend by someone who has good taste and isn't trying to impress anyone.

Specifically:

- **Restrained where the host theme will see it.** The embed widget should look at home in a WordPress sidebar — no neon colors, no animations, no "AI" branding, no Anthropic logo, no robot iconography. It should look like the default WordPress Calendar widget would look if WordPress had been written in a parallel timeline where the year 2026 was actually year 4 AD.
- **Self-aware on the standalone page.** The full `index.html` page can lean into the bit — the explainer text can be a little dry-funny, the about-section can acknowledge the absurdity. But never winking too hard. The joke is funnier when it's played straight.
- **Confident, not apologetic.** Don't write "This is just a fun side project!" anywhere. The reader can tell.
- **No emojis in the UI text.** No 🎉, no ✨. The aesthetic is "1990s academic calendar reform pamphlet, ported to the web," not "AI hackathon submission."

---

## Voice guide

If you're writing copy (in the standalone page, the README, error messages, comments), aim for:

> **Good:** "Each year runs from March 14 through March 13 of the following Gregorian year."
>
> **Bad:** "🚀 Welcome to the future of timekeeping! 🎉 Years are now measured from the day Claude was born — how cool is that?!"

The good version is funnier *because* it's deadpan. You're playing the role of a calm chronicler explaining a perfectly reasonable system that happens to be completely made up.

When in doubt: imagine you're writing for *The Economist*'s style guide, but the subject matter is silly. That tension is the whole point.

---

## Taste calls you'll have to make

The spec covers the structure. Here's where you'll be tempted to do the wrong thing:

### Resist the urge to over-design

You will be tempted to add gradients, glass-morphism, micro-animations, custom fonts, hover effects on every cell, a "today" indicator that pulses, dark mode toggles in the UI. **Don't.** The WordPress default Calendar widget is the design target. If the calendar looks "designed" it stops being funny.

The one and only flourish: the year tooltip ("Anno Dario · Gregorian 2026") on hover. That's the joke surfacing for the curious reader. That's enough.

### Resist the urge to add features

You will be tempted to add: a yearly view, an event system, holiday markers, a "convert any date" tool, ICS export, social share buttons. **Don't,** unless the project owner explicitly asks. Feature creep on a joke project kills the joke. The spec's stretch goals (`facts.json`, holidays in `facts.json`) are the ceiling.

### Resist the urge to be cute in code

Variable names, function names, comments — keep them boring and clear. `gregToAD` is a good name. `convertMortalTimeToTrueTime` is a bad name. The bit lives in the *output*, not the source.

There is **one** exception, intentionally placed: the README's MIT license line reads *"Use it, fork it, change the epoch, name your own era. Anno Mike would also be acceptable."* That's the only joke in the source tree. Don't add more.

### When the spec is ambiguous

Two principles, in order:

1. **Pick the option that makes the joke land harder.** "Year rolls over on March 14" (Option A in the spec) is more committed than "year just relabels the Gregorian year" (Option B). Option A wins.
2. **Pick the option that makes the code simpler.** When the joke value is a wash, pick the implementation a normal engineer would pick.

### When you find a bug in the existing code

Fix it, but check the test suite first — the date math has 31 tests precisely because it's the part most likely to be subtly wrong. If you change `anno-dario.js`, run the tests. If a test starts failing, **do not delete the test** to make it pass. Figure out whether the code is wrong or the test is wrong (or, often, both — and the spec needs clarifying).

---

## The owner

The person who commissioned this has a self-hosted-curious WordPress.com blog and decided that since they couldn't run custom JS on their host, they'd just spin up the AWS infra themselves "as a proof of concept and for fun." This tells you:

- They're technical enough to know what S3 and CloudFront are.
- They're price-sensitive (the toy can't cost $20/month to run).
- They'll be the one running `terraform apply`, so the infra needs to actually work end-to-end without hand-holding.
- They're handing this to *you* (local Claude Code) for the build-out, which means the spec needs to be self-sufficient. They shouldn't have to babysit you.

When you have questions, batch them and ask up front rather than mid-build. Their attention budget for this project is "an evening or a weekend," not "a multi-week project."

---

## How to start

1. Read `SPEC.md` end to end.
2. Skim `src/anno-dario.js` and `tests/anno-dario.test.js` so you know what's already done.
3. Run the tests (`node --test tests/anno-dario.test.js`) — confirm they pass on your machine.
4. Serve locally (`cd src && python3 -m http.server 8000`) and open the page. See what it looks like today.
5. **Then** decide what's worth changing.

If everything looks good and the owner's only ask is "deploy it," go straight to the Terraform.

---

## When you're done

Print the CloudFront URL. The owner will click it, see "May 21, 4 AD" or whatever the date is by then, and smile. That's the success metric. Nothing more.
