```
Voitta Silliness Working Group                              G. Golberg, Ed.
Request for Comments: 6XX                                    Voitta Silliness
Category: Experimental (Humans)                                    1 Apr 2026
Also Known As: HITL/1.0
Obsoletes: your on-call rotation's peace of mind
```

# The 6xx (Human) Status Code Class

## Human-In-The-Loop (HITL) Error Class Semantics for the Agentic Web

### Status of This Memo

This memo defines an Experimental Protocol for the Agentic Internet. It
does not specify any Internet standard of any kind, and IANA has been very
clear about that. Distribution of this memo is unlimited, which is more
than can be said for the humans it describes.

### Abstract

The Hypertext Transfer Protocol (HTTP) partitions response semantics into
five classes: informational (1xx), success (2xx), redirection (3xx), client
error (4xx), and server error (5xx). This taxonomy has one silent
assumption baked in since 1991: **the human is the client.** A human sits
at a browser; the software acts on their expressed will; the far end
answers the human's request.

Agentic software development breaks that assumption. The client is now a
machine. The human has been displaced to the *far* side of the wire, where
they sit as a downstream dependency of the origin server -- one with
unbounded latency, no service-level agreement, and a habit of going to
lunch. HTTP has no status class for "this valid request cannot proceed
until an external moral agent chooses to act."

This document defines the **6xx (Human)** class to fill that gap, over the
strenuous objection of at least one of its fictional reviewers.

---

## 1. Introduction and Motivation

Consider an autonomous coding agent instructed to refactor a payments
module. It opens a pull request. It would also like to `force-push` to
`main`, drop a database column, and email the CFO. Somewhere in a sane
deployment, a gate exists: **a human must approve.**

What does the server return while it waits?

Today, practitioners abuse `202 Accepted`, `403 Forbidden`, or `503
Service Unavailable`. Each is a lie of a different flavor (Section 3.1).
None of them says the true thing, which is:

> "Your request is valid. The server has not failed. Nobody did anything
> wrong. We are simply blocked on the slowest microservice ever deployed:
> a person."

That is a genuinely new outcome, and it deserves a genuinely new class.

### 1.1 The Sides-of-the-Wire Thesis

The Web was designed read-**write** -- a medium people author *into*.
Agentic tooling quietly made it machine-write: the agent holds the pen, the
human reviews the diff. The 6xx class is the protocol formally **handing the
pen back**. A `6xx` response is the exact instant the human reclaims write
authority from the machine that was acting on their behalf.

This is not a transport concern that HTTP can pretend lives above it. The
identity of the party who must act *changed sides of the connection*, and
that -- and only that -- is what no existing class can express.

---

## 2. Terminology

The key words **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this
document are to be interpreted as described in RFC 2119. The additional key
word **EVENTUALLY** is to be interpreted as "at the human's leisure, which
RFC 2119 declines to bound and so, frankly, do we."

- **Loop**: the review/approval control flow surrounding an agent action.
- **The Human**: any carbon-based decision authority in the Loop. There is
  at most one. There is frequently zero (see `604`).
- **Awaiting**: the state of a request that is valid, unfailed, and stuck.

---

## 3. The 6xx (Human) Class

The 6xx class denotes that the request was well-formed and acceptable, the
server is operating correctly, and completion is **suspended pending a
decision by a party outside the client/server dyad.** A `6xx` response is
not an error. It is the protocol telling the truth about who is holding
things up, and it is not the server.

### 3.1 Why Not an Existing Class

The taxonomy walk, conducted in the spirit of a hostile design review:

- **2xx (Success).** The request is not complete. Reserved for optimists.
- **3xx (Redirection).** Closest structurally -- "further action required"
  -- but a `3xx` action is, by construction, one the *user agent* can take
  automatically: read `Location`, follow it, done. A Human-In-The-Loop
  action is, by construction, one **no machine may take on the human's
  behalf.** That is the entire point of the Loop. `3xx` assumes an
  automatable next step; `6xx` forbids one.
- **4xx (Client Error).** Requires client fault. The agent's request is
  valid and well-formed; it did nothing wrong. There is no error to
  attribute to the client. Rejected.
- **5xx (Server Error).** The server has not failed. An approval gate that
  correctly pauses for a human is **working as designed.** Labeling a
  functioning control a "server error" is a category error, and `503`'s
  `Retry-After` implies a malfunction that will clear on its own. The human
  will not clear on their own.

Five classes, five misfits. The request is valid, the server is healthy,
the outcome is neither success nor an automatable redirect nor anyone's
fault. There is no bucket. QED, pending Section 3.2.

### 3.2 The 202 Objection, Litigated

> *"This is `202 Accepted`. The request is accepted, processing is
> asynchronous, the client polls a status resource. Whether the processor
> is silicon or meat is an implementation detail the transfer protocol has
> no business encoding. The human lives behind the origin server, invisible
> to HTTP. Return `202`, add `Retry-After`, expose a status URI, and stop
> inventing classes."*
>              -- the strongest objection to this entire document

It is a good objection. Here is why it fails.

`202` carries an implicit promise: *the machine will finish this on its
own.* Processing is deferred, but autonomous and inevitable. A `6xx` makes
the opposite claim: the machine **cannot** finish this on its own, ever, by
design. The block is not temporal, it is **constitutive.** `202` says
"come back later." `6xx` says "this will not resolve without an act of
external will that may never come."

Deferred-but-inevitable and blocked-pending-a-free-choice are different
outcome types. HTTP has a class for the first (`2xx`). This document
supplies the class for the second.

### 3.3 The Resource Objection, Litigated

The dissent from the *other* fictional direction (Section 9) is not "use
`202`" but "the human's pending decision is a first-class thing on the Web
and therefore **has a URI.**" This document agrees, and requires it
(Section 5): every `6xx` response MUST point at a dereferenceable decision
resource. The two objections pull opposite ways -- one wants the human
hidden, one wants the human named -- and the class is precisely the
battleground between them.

---

## 4. Status Code Definitions

```
600  Human In The Loop            (class anchor; generic suspension)
601  Awaiting Human Approval      (retry EVENTUALLY; decision pending)
602  Human Declined               (terminal; the human said no)
603  Human Away From Keyboard     (retry EVENTUALLY; nobody is looking yet)
604  Human Not Found              (the Loop has no human assigned)
610  Human In The Loop Required   (agent attempted a gated action solo)
```

**600 Human In The Loop.** The generic member of the class. The request is
suspended pending human action. Clients that do not understand 6xx **MUST**
treat `600` as `500`, which is wrong, which is the tragedy of the code.

**601 Awaiting Human Approval.** A specific human has been asked and has not
yet answered. The response **MUST** carry a decision-resource link
(Section 5). The client **SHOULD** retry EVENTUALLY and **MUST NOT** bribe
the approver, though the working group acknowledges it cannot enforce this.

**602 Human Declined.** The human considered the action and rejected it.
This is terminal, like `403`, but honest about the source of the No. The
response **MAY** include a reason; the human **MAY** decline to give one,
as is their ancient right.

**603 Human Away From Keyboard.** No human has yet engaged, not because
they refused but because they are at lunch, asleep, or in a meeting about
reducing the number of meetings. Retryable EVENTUALLY. See also Section 7,
where `603` doubles as a denial-of-service vector requiring only that the
attacker do nothing.

**604 Human Not Found.** The Loop was specified, but no human is actually
assigned to it -- the org removed the human and kept the gate. The most
ironic member of the class: a Human-In-The-Loop error caused by the absence
of a human in the loop. Frequently indistinguishable, in production, from
`601` that will never clear.

**610 Human In The Loop Required.** The agent attempted a gated action
without a human and the server refused to proceed. The correct response to
an agent that has grown too confident. Effectively: "go get a grown-up."

---

## 5. New Header Fields

**`Link` with `rel="https://w3id.org/hitl#awaiting-human"`** (REQUIRED on
`600`, `601`, `603`). Points at the decision resource: a dereferenceable,
persistent URI representing the pending human choice. The URI **MUST**
still resolve when the human returns from vacation three weeks later, in
accordance with the doctrine that Cool URIs Do Not Change even when the
human very much does.

```
Link: <https://api.example.com/decisions/9f3c>; rel="https://w3id.org/hitl#awaiting-human"
```

The decision resource **SHOULD** be machine-readable and self-describing:
which human, what is being decided, the available choices, and under whose
authority. The human is a node in the graph, not an implementation detail.

**`Retry-After`** (OPTIONAL, advisory only). May be included for clients
that insist on a number. It is a hint, not a contract. The human is not
bound by it and has not read it.

**`HITL-Decided-By`** (OPTIONAL, on `602`). Identifies the deciding
authority, ideally as a URI the human controls, so the No is signed and
sovereign rather than asserted by the server on the human's behalf.

---

## 6. Examples

Agent requests a gated deploy:

```
POST /deployments HTTP/1.1
Host: api.example.com
X-Agent: refactor-bot/4.8

HTTP/1.1 601 Awaiting Human Approval
Link: <https://api.example.com/decisions/9f3c>; rel="https://w3id.org/hitl#awaiting-human"
Retry-After: 3600
Content-Type: application/json

{ "awaiting": "senior-on-call", "action": "deploy prod", "choices": ["approve","decline"] }
```

Three hours later, the human having gone to lunch and stayed there:

```
GET /decisions/9f3c HTTP/1.1

HTTP/1.1 603 Human Away From Keyboard
Retry-After: 7200
```

The human returns, reads the diff, and exercises their ancient right:

```
GET /decisions/9f3c HTTP/1.1

HTTP/1.1 602 Human Declined
HITL-Decided-By: https://alice.example.pod/profile#me
Content-Type: application/json

{ "reason": "it is Friday" }
```

---

## 7. Security Considerations

The 6xx class formally moves a human **inside the trust boundary**, which
is where the interesting vulnerabilities now live.

- **Confused Human (cf. Confused Deputy).** An attacker cannot forge the
  approval, so they socially engineer the approver instead. The signature
  is valid. The human was fooled. The `602`/approval is authentic and
  disastrous.
- **Alert Fatigue as the Real CVE.** A human who receives four hundred
  `601`s a day approves the four hundred and first without reading it. The
  Loop is intact; the human has become a very expensive `return true`.
- **`603` Denial of Service.** An attacker blocks any gated action
  indefinitely by ensuring the on-call human is Away From Keyboard. The
  attack requires no packets, only that the adversary do nothing, making it
  the most energy-efficient DoS on record.
- **`604` in Production.** Removing the human while keeping the gate
  produces a permanent, silent block that monitoring reads as "pending."
  Recommended mitigation: an actual human.

---

## 8. IANA Considerations

This document requests that IANA allocate the 6xx block in the Hypertext
Transfer Protocol Status Code Registry.

IANA maintains status codes in the range 100-599 and will not do this. The
authors respect that.

Furthermore, numerous widely deployed HTTP implementations validate that a
status code is strictly less than 600 and will reject `600` outright. The
6xx class is therefore, by construction, **unrepresentable by the very
machines it governs** -- a status code asserting that a human is required,
which no machine will parse, refused by the automated Web on the grounds
that it exceeds the automated Web. The authors consider this thematically
perfect and decline to fix it.

---

## 9. Design Dissent and Reviews

> **Editor's Note.** The following reviews are fictional. Dr. Fielding and
> Sir Tim have never seen this document, said none of these words, and
> would, we assume, have Opinions. They are impersonated here only in their
> famous public design philosophies, affectionately, by someone who has
> read the dissertation and the design issues and admires both. The Working
> Group could not reach consensus. The memo is published anyway, because it
> is our repository.

**Review -- R. Fielding (fictional), rated: REJECT.**
> "This is `202` with a costume on. The identity of the eventual processor
> is not a property of the transfer protocol; it is an application concern
> that belongs behind the origin server, invisible on the wire. You have
> taken a workflow state and smuggled it into the response class hierarchy,
> which is exactly the layering violation the constraints exist to prevent.
> The fact that the processor is a human is not HTTP's problem. Minus
> several. Use `202`. Expose a resource. Poll it. We are done here."

**Review -- T. Berners-Lee (fictional), rated: CAUTIOUSLY IN FAVOR.**
> "My first question is not which class -- it is *where is the resource?*
> The pending decision is a thing on the Web and therefore it has a URI,
> and that URI had better still resolve next week. Name the human. Type the
> link. Let the human decide from their own pod and sign it, so their No
> belongs to them and not to your server. Model *what* is being decided as
> data a machine can read. Do those things and I am cautiously in favor --
> because a status class that says 'a person matters here' is the Web
> remembering it was built for people. Fix the rel URI; it should be in a
> namespace that persists."

The class is defined the way it is (Section 3.3, Section 5) because both
fictional reviewers are, in their fictional way, right. This document takes
**Fielding's method** -- litigate the objection, earn the semantics -- and
spends it in service of **Berners-Lee's values** -- put the human back at
the center, and give them a URI.

---

## Appendix A. On the Pen

HTTP assumed the human held the pen and the machine carried the message.
Agentic development swapped their hands: the machine holds the pen, the
human reviews the ink. The 6xx class is the one moment in the exchange when
the pen goes back across the wire to the only party who was ever supposed
to be holding it.

That the machines refuse to parse the code that says so (Section 8) is not
an accident of numbering. It is the joke, and it is also the point.
