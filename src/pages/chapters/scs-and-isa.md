---
layout: ../../layouts/ChapterLayout.astro
title: 'Self-contained Systems and ISA'
---

Suppose a receptionist opens the booking form just as the system that manages owner records goes offline. Can the pet clinic still book the visit? We use [Spring PetClinic](../what-is-software-architecture/#about-the-spring-petclinic-example) to explore that question. In the [microservices example](../microservices/), Visits asks Owners to check the pet during every booking. A **self-contained system (SCS)** takes a different approach. One team owns a business area, from its web pages to its data, so the system can do its main work even when another system is down. <sup><a href="#ref-1">[1]</a></sup>

## TL;DR

In our proposed design, Owners keeps the clinic's owner and pet records. Visits keeps the few facts it needs for booking and receives updates in the background. A receptionist can open Visits directly and book a known pet while Owners is down. The price is visible at the desk too. A pet registered just before the outage may still be missing from the booking form.

## What makes a system self-contained

Consider what the Visits team needs to change when the clinic adds an expected visit duration. The team owns the form where the receptionist enters the duration, the rule that checks it and the visit record where it is saved. These belong together because they serve one task. The team can release the change itself. It can also provide an API for a mobile client, but receptionists can already use Visits through its own pages. <sup><a href="#ref-1">[1]</a></sup>

Independence also depends on what the systems share. The booking rules belong in Visits. Owners can link to the booking form without keeping a second implementation of those rules. Technical libraries such as database drivers can still be shared. Two systems could even use private schemas on the same database server to save money, although a failure of that server would then affect both. <sup><a href="#ref-1">[1]</a></sup>

## How SCS relate to microservices

In both of our clinic designs, the Visits team owns the booking form and can release it independently. The difference shows up when the receptionist clicks **Book**. In the microservices example, Visits asks Owners to check the pet and waits for a reply. In the SCS example, Visits checks its local copy of the pet details, so it can book a known pet while Owners is offline. An SCS includes the web interface for its business area and can use several microservices internally. <sup><a href="#ref-1">[1]</a></sup> <sup><a href="#ref-2">[2]</a></sup>

## Booking a visit in the pet clinic

The official Spring PetClinic already has an **Add Visit** link on the owner page. Its target includes the IDs of both the owner and the pet. In the original application, the same application serves the owner page and the booking form. <sup><a href="#ref-3">[3]</a></sup>

In our proposed design, there are three web applications. Owners manages owners and pets, Visits manages bookings, and Vets manages the vet directory. Follow the two arrows between Owners and Visits in the diagram. The receptionist follows the solid arrow by clicking **Add Visit**. The dashed arrow carries changes to pet records independently of that click.

<figure class="architecture-figure">
<div class="diagram-scroll" tabindex="0" role="region" aria-label="Architecture diagram. Scroll horizontally to see the complete figure.">
<img src="../../diagrams/scs-structure.svg" alt="Owners, Visits and Vets each own their pages, rules and records. A browser link opens Visits from Owners. Separately, Owners sends pet updates to a local copy in Visits." style="max-width:100%;height:auto" />
</div>
<figcaption>Proposed SCS design for the pet clinic. Visits can use a pet update for many later bookings. Clicking the link does not trigger an update. Own diagram based on the SCS characteristics. <sup><a href="#ref-1">[1]</a></sup></figcaption>
</figure>

For example, the link could open `/visits/new?ownerId=42&petId=7`. Visits renders the form and checks the selected owner and pet against its own data when the receptionist submits it. The IDs in the link identify the selection. A receptionist who opens Visits directly can enter a known owner number and pet number. Visits checks the pair against its local records. This second route matters during an outage because a link on an unavailable owner page cannot help someone reach the form. In this design, the owner page could also link to the pet's visit history in Visits, where the receptionist could see earlier visits for that pet.

### What the booking form knows

Suppose Owners has just assigned pet 7 to owner 42. The example message below carries the current booking details for that pet. The IDs match the link above. This is an example contract for our proposed design.

<p class="code-source"><span><strong>PetChanged</strong><small>Proposed event</small></span></p>

```json
{
  "type": "PetChanged",
  "petId": 7,
  "ownerId": 42,
  "version": 7,
  "active": true
}
```

When the receptionist submits a booking, Visits checks that its local copy lists the pet as active and assigns it to the selected owner. With the details above, pet 7 can be booked for owner 42. Now suppose the pet moves to owner 56. Until Visits applies that update, a booking for owner 42 can still pass the local check. Once Visits applies it, new bookings use owner 56. Existing visits keep the owner recorded at booking.

For that to work, Visits needs an initial copy of the pets and a way to keep it up to date. Each change carries all the fields Visits needs for that pet and a higher `version`, so Visits can ignore duplicate or older updates. With a **transactional outbox**, Owners saves the change and its outgoing event in the same transaction. A background process can then send the event and retry if needed. <sup><a href="#ref-4">[4]</a></sup>

### What happens when the copy is behind?

| What has happened | What the receptionist can do in this design |
| --- | --- |
| Owners is down. Visits already knows the selected owner and pet, and its copy marks the pet as active. | Open Visits directly and book using the local record. |
| Owners registered a new pet, but Visits has not received the update. | Try the numbers again once the update arrives. Visits cannot confirm a booking for an unknown pet. |
| Visits has yet to apply the transfer from owner 42 to owner 56. | A booking for owner 42 can still pass the local check. |

<section class="interaction booking-scenario" data-booking-scenario="scs" aria-labelledby="ownership-transfer-title" hidden>
  <h4 id="ownership-transfer-title">Follow a pet transfer</h4>
  <p>Pet 7 stays active and the booking date is valid. Follow the transfer and see what Visits would do with a booking for each owner.</p>
  <div class="interaction-controls" role="group" aria-label="Stage of the transfer">
    <button type="button" data-scenario="before" aria-pressed="true">Before transfer</button>
    <button type="button" data-scenario="transferred" aria-pressed="false">Transfer to owner 56</button>
    <button type="button" data-scenario="applied" aria-pressed="false">Apply update in Visits</button>
  </div>
  <div class="interaction-result" role="status" aria-atomic="true">
    <dl class="booking-scenario-state">
      <div><dt>Owners record</dt><dd data-field="owners"></dd></div>
      <div><dt>Visits copy</dt><dd data-field="visits"></dd></div>
    </dl>
    <p data-field="delivery"></p>
    <dl class="booking-scenario-state">
      <div><dt>Book for owner 42</dt><dd data-field="owner42"></dd></div>
      <div><dt>Book for owner 56</dt><dd data-field="owner56"></dd></div>
    </dl>
  </div>
</section>
<script type="module" src="../../interactions/booking-scenarios.js"></script>

The transfer illustrates the choice the clinic has to make. If it accepts a delay in ownership updates, Visits can keep booking through an Owners outage. If every booking must reflect the latest transfer, a local copy alone cannot meet the rule. The team could keep the ownership change and booking check inside the same transaction boundary. Simply sending messages more often would shorten the usual delay without removing it.

## Where Independent Systems Architecture fits

**Independent Systems Architecture (ISA)** describes practices for designing and running independent modules, including microservices and SCS. Take the `version` field above. Both teams must agree on its meaning or Visits could apply an old update. That agreement belongs to the **macro architecture**, the decisions shared across modules. How Visits stores the version is part of its **micro architecture**, the decisions the Visits team can make locally. <sup><a href="#ref-5">[5]</a></sup>

The nine ISA principles below use *must* for requirements and *should* where the authors allow exceptions. The clinic examples illustrate what each principle means in practice. <sup><a href="#ref-5">[5]</a></sup>

| ISA principle | Strength | Example in the pet clinic |
| --- | --- | --- |
| 1. Access modules through their interfaces. | Must | Visits receives published pet updates. Owners keeps its tables private. |
| 2. Separate shared and local design decisions. | Must | Both teams agree on the event fields. Each chooses its own database layout. |
| 3. Run modules separately. | Must | Owners, Visits and Vets run in separate processes and can be released separately. |
| 4. Agree on a limited set of ways to communicate. | Must | The teams use web links for navigation and one messaging protocol for updates. |
| 5. Agree on metadata. | Must | Each system recognises the same information about the signed-in receptionist. |
| 6. Give each module its own continuous delivery pipeline. | Must | Visits can build, test and release a new booking form on its own. |
| 7. Use common operating practices. | Should | The teams can find a failed update through familiar logs and alerts. |
| 8. Apply shared standards at the interface. | Should | The event format is agreed across teams. Each can choose its own JSON library. |
| 9. Design for failures and recovery. | Must | Visits can use local records during an outage and resume on another host after a crash with its saved bookings intact. |

## Comparing the system architectures

The table compares the four **pet clinic designs** used in this part of the site. For example, both distributed designs give teams their own pages. The clearest difference between them shows up when the receptionist clicks **Book**. <sup><a href="#ref-1">[1]</a></sup> <sup><a href="#ref-2">[2]</a></sup>

| | [Monolith](../monolith/) | [Modular monolith](../modular-monolith/) | [Microservices example](../microservices/) | [SCS example](#booking-a-visit-in-the-pet-clinic) |
| --- | --- | --- | --- | --- |
| What gets released together? | The whole clinic application | The whole clinic application, including its modules | Each service has its own release | Each web application has its own release |
| Where is ownership checked? | In the clinic application | In the same process, using the owner module | Visits calls Owners and waits | Visits checks its local copy |
| What if the original owner records are unavailable? | Booking needs the application's owner records | The module boundary still leaves booking dependent on those records | A timeout stops the booking | Known pets can still be booked if the local copy is available |
| What must the team look after? | One release for all features | The interfaces between modules | Network calls and failures during a request | Delivery of updates and the effect of older data on bookings |

These choices describe where the clinic draws boundaries between running applications. Inside any one of them, the team still has to decide where to put the controller, booking rules and database access. The [Visit use case](../visit-use-case/) follows those decisions inside the application.

## References

<a id="ref-1"></a>
**[1]** INNOQ and the SCS community, “[Self-contained Systems](https://scs-architecture.org/),” sections “Characteristics” and “The Idea,” and “[SCS vs. Microservices](https://scs-architecture.org/vs-ms.html).” Accessed 18 November 2026.

<a id="ref-2"></a>
**[2]** James Lewis and Martin Fowler, “[Microservices](https://martinfowler.com/articles/microservices.html),” 25 March 2014, sections “Componentization via Services” and “Organized around Business Capabilities.” Accessed 18 November 2026.

<a id="ref-3"></a>
**[3]** Spring Projects contributors, *Spring PetClinic*, commit `500158f732419217507c7656904b8e6aa1bcc0d6`, <a href="https://github.com/guendeti/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/resources/templates/owners/ownerDetails.html#L73" target="_blank" rel="noopener noreferrer">owner page template</a>. Accessed 18 November 2026.

<a id="ref-4"></a>
**[4]** Chris Richardson, “[Pattern: Transactional outbox](https://microservices.io/patterns/data/transactional-outbox.html),” sections “Solution” and “Resulting context.” Accessed 18 November 2026.

<a id="ref-5"></a>
**[5]** ISA contributors, “[Independent Systems Architecture](https://isa-principles.org/),” sections “Terms” and “Principles.” Accessed 18 November 2026.
