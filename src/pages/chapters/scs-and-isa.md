---
layout: ../../layouts/ChapterLayout.astro
title: 'Self-contained Systems and ISA'
---

A feature may still be unavailable during another system's outage even when it has its own deployment. Self-contained Systems address this by giving a business area its own user interface, logic and data, so it can fulfil its main use cases independently. <sup><a href="#ref-1">[1]</a></sup>

## TL;DR

Self-contained Systems, or SCS, are web applications that own their user interface, logic and data and can perform their main tasks independently. Independent Systems Architecture, or ISA, gives broader principles for independent systems. Our PetClinic design uses local pet information so booking does not wait for the owner system. The price is explicit rules for stale data, event recovery and authorisation.

## Different questions, related ideas

An SCS owns its user interface, logic and data and should fulfil its primary use cases without other systems being available. Communication should be decoupled in time wherever possible. A service API is optional. An API without a user-facing interface does not meet the UI requirement. SCS also discourages shared business logic and unnecessary shared infrastructure. <sup><a href="#ref-1">[1]</a></sup>

ISA calls decisions shared across the system macroarchitecture. Decisions made inside one module belong to its microarchitecture. Its principles cover interfaces, separate runtime units, standardised integration and metadata, independent delivery, operations and resilience. Principles 7 and 8 use “should”, while the others use “must.” Systems may call each other and wait for a response, exchange messages for later processing, or connect through their user interfaces. <sup><a href="#ref-2">[2]</a></sup>

Thus an API-only system could follow ISA without being an SCS. Neither term means “microservices, but larger.” The concepts express overlapping concerns rather than stages in a mandatory evolution.

## Our PetClinic design

The following proposal applies SCS principles to PetClinic. It introduces new system boundaries and events rather than describing an existing PetClinic variant. Owner, Pet, Visit and Vet come from the official PetClinic model. <sup><a href="#ref-3">[3]</a></sup>

| Proposed system | Owns | Local information obtained from elsewhere |
| --- | --- | --- |
| Owners and Pets | Owner/Pet records and their management UI | Optional visit summaries |
| Visits | Booking UI, Visit records and history | Pet identity, owner relationship and active status |
| Vets | Vet records, specialties and UI | Only what its own future use cases require |

<figure class="architecture-figure">
<div class="diagram-scroll" tabindex="0" role="region" aria-label="Architecture diagram. Scroll horizontally to see the complete figure.">
<img src="../../diagrams/scs-structure.svg" alt="Proposed Owners and Pets, Visits, and Vets SCSs each own UI, logic and data. Owners and Pets provides navigation and deferred pet events to Visits." style="max-width:100%;height:auto" />
</div>
<figcaption>Our SCS design. A browser link changes the user's destination. Events delivered later supply local data. Neither arrow grants direct access to another system's tables.</figcaption>
</figure>

The three-way split is a design choice, not a requirement of SCS. For one small practice, a separate Vets web system might add little value. Grouping more responsibilities in fewer systems may better fit that setting.

### Navigation conveys context, not permission

A link from a pet page could open `/visits/new?petId=34`. Visits renders its own form and checks the user's permission. The ID is context, not proof of ownership or authorisation. Shared sign-in could help the user move between systems, but each system still needs its own decision about allowed operations.

Visits keeps a local read model, also called a projection. This is a copy of the information it needs for booking, rather than a shared internal table. An event could update that copy.

```json
{
  "eventId": "pet-34-v7",
  "type": "PetChanged",
  "petId": 34,
  "version": 7,
  "ownerId": 12,
  "status": "active"
}
```

The event ID helps detect duplicate messages. The version helps decide whether an update is older than data already stored. Neither field alone guarantees delivery, ordering or correct processing. We would need to define version scope, initial data transfer and recovery.

## Booking with local knowledge

Visits validates input and checks its locally known Pet information and permissions. If the pet is known and usable, it saves the Visit together with an outgoing event record in a local transaction. After a successful commit, it can confirm the booking while a separate relay publishes the event. The response does not wait for delivery or remote processing.

<figure class="architecture-figure">
<div class="diagram-scroll" tabindex="0" role="region" aria-label="Architecture diagram. Scroll horizontally to see the complete figure.">
<img src="../../diagrams/scs-visit-flow.svg" alt="Proposed booking checks local pet data, commits Visit and outbox together, returns confirmation and delivers the event later." style="max-width:100%;height:auto" />
</div>
<figcaption>Proposed booking flow. Response handling and event publication both follow the commit and can proceed independently. Their relative completion order is not guaranteed.</figcaption>
</figure>

The Transactional Outbox pattern stores a data change and the intent to send a message in one database transaction. A relay sends the stored messages later. It may send duplicates, so processing must be idempotent, meaning that processing the same event again does not repeat its effect. <sup><a href="#ref-4">[4]</a></sup> It is one possible implementation, not a requirement of every SCS.

A newly created pet may not yet exist in the local projection. Our policy is to defer booking for unknown pets and explain the pending synchronisation. For known pets, booking can continue during a temporary Owners outage. That is the specific autonomy this design provides.

### When a pet changes owner

Suppose Pet 34 moves from Owner 12 to Owner 19 while Visits is disconnected. Which owner should a new booking name? Which owner should a historical Visit retain?

These are distinct questions in our scenario. Overwriting every old record with the newest owner could alter the interpretation of history. Keeping stale permissions forever could permit an inappropriate operation. The event format cannot decide either policy.

Before implementation, we need to agree on several rules.

- Which information is historical and which must reflect current ownership.
- How long local permission information may be trusted.
- When booking is provisional, deferred or rejected.
- How missed changes are detected and projections rebuilt.

Eventual consistency allows copies to differ temporarily and converge after successful updates. Waiting alone does not repair a missing update. Our design still needs repeatable initial loading, retries, duplicate handling and a way to find and repair gaps. More restrictive freshness requirements can reduce the independence of booking.

## Apply ISA to this design

Our shared rules would define identifiers, event contracts, identity metadata such as authentication tokens, and supported ways to communicate. Each SCS would own its delivery pipeline, the automated steps that build, check and release it, and its internal implementation. Operational standards would cover logging, tracing, configuration and recovery, with justified exceptions where appropriate. These choices apply ISA's distinction between shared and local decisions. <sup><a href="#ref-2">[2]</a></sup>

For example, agreeing on a message schema does not require every system to use the same internal layering. A Visits SCS could use Clean Architecture while another system uses a simpler arrangement. The [application chapters](../visit-use-case/) examine those internal choices.

## Comparing this with the Microservices example

In the community implementation analysed in the preceding chapter, Visit creation contains no Customers membership call. A separate gateway read combines Customers and Visits data. Our SCS design adds a local Pet projection. The comparison concerns these two examples, not a universal division between synchronous Microservices and asynchronous SCS.

Microservices can also use events, local projections and their own UI. Our SCS design specifically emphasises end-to-end responsibility and booking that does not wait for a remote pet lookup. The distinction is an explicit requirement and contract, not a ban on a technology.

## Compare system boundaries

The table compares the responsibilities and behaviour of the four PetClinic designs.

| Example | Deployment | Booking collaboration | Data consistency question |
| --- | --- | --- | --- |
| Official monolith | Shared application | Local controller/model/repository calls | Actual transaction boundary and entity relationships |
| Our modular monolith | Shared application | Direct public module API | Check-then-write and module ownership |
| Community Microservices | Separate applications | Visits stores a pet ID without a Customers call in the inspected method | The identifier alone does not establish owner-pet membership |
| Our SCS proposal | Separate web applications | Local pet projection and deferred integration | Staleness, recovery and historical meaning |

For a small clinic, the extra UI, integration and operational responsibilities may outweigh the benefit. Separate teams with a concrete need for available local workflows could justify them. Before choosing this design, define which operations must remain available during an outage and how much data staleness each operation can accept.

## References

<a id="ref-1"></a>
**[1]** INNOQ and the SCS community, *Self-contained Systems*, n.d., “Characteristics.” Original description, FAQ and comparison with Microservices. Accessed 2 November 2026.

<a id="ref-2"></a>
**[2]** ISA contributors, *Independent Systems Architecture*, n.d., principles 1–9 and definitions of “must” and “should.” Original principles. Accessed 2 November 2026.

<a id="ref-3"></a>
**[3]** Spring Projects contributors, *Spring PetClinic*, commit `500158f732419217507c7656904b8e6aa1bcc0d6`, `src/main/resources/db/h2/schema.sql`. Pinned model/schema. Accessed 2 November 2026.

<a id="ref-4"></a>
**[4]** Chris Richardson, “Pattern: Transactional outbox,” *Microservices.io*, n.d. Pattern and delivery caveats. Accessed 2 November 2026.

Return to [Microservices](../microservices/). Continue with [The original Visit use case](../visit-use-case/).
