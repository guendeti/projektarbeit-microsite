---
layout: ../../layouts/ChapterLayout.astro
title: 'Microservices'
---

In [Spring PetClinic](../what-is-software-architecture/#about-the-spring-petclinic-example), receptionists book visits and look up vets. Suppose the booking team wants to release a new field for the expected length of a visit while the vet directory stays on its current version. In a monolith, the clinic releases the booking form and the vet directory together. With booking and the directory in separate **microservices**, the booking team can release the new form on its own. Each service runs in its own process and provides an interface that other parts of the application can use. <sup><a href="#ref-1">[1]</a></sup>

## TL;DR

Microservices let teams release and scale different parts of an application independently. In our proposed pet clinic design, the Visits team owns the booking form and the visit records. It can change both together. To confirm a booking, though, it needs to know whether the selected pet belongs to the owner. Who has that information, and what should the receptionist see if it is unavailable?

## From packages to services

In the [modular monolith](../modular-monolith/), modules have clear boundaries in the code and run in one application. With microservices, a boundary also changes how the code runs. For example, if the vet directory gets much more traffic than booking, the clinic can run extra copies of the Vets service on its own. Teams can also release at different times, provided a change to a service's API still works with the clients that use it. <sup><a href="#ref-1">[1]</a></sup>

## Who owns which part

A common way to draw service boundaries is to look at what people need to do. In the official Spring PetClinic, the `owner` package already groups owners, pets and visits, while the `vet` package contains the vet directory. <sup><a href="#ref-2">[2]</a></sup> Suppose the clinic now has a team that looks after booking and regularly changes the form and the rules behind it. That gives us a reason to consider moving visits into their own service.

| In our proposed design | What the team looks after |
| --- | --- |
| Owners | Owner and pet records, including which pets belong to each owner, and the pages that show them |
| Visits | The booking form, visit records and the visit history shown on the owner page |
| Vets | Vet profiles, their specialties and the directory where receptionists look them up |

Here each team owns its pages, its service and its data, and runs its service in production. Giving the Visits team the booking form means it can add the duration field without waiting for another team to update the page. Each service controls access to the records it owns. The services could use separate databases or share a database server with private schemas. In either setup, Visits asks Owners for pet information through its API. <sup><a href="#ref-1">[1]</a></sup>

In our proposed design, each team's pages are reached through a shared API gateway. Follow the arrows from the browser. Looking up a vet takes one call from the gateway to Vets. Booking a visit adds a call from Visits to Owners.

<figure class="architecture-figure">
<div class="diagram-scroll" tabindex="0" role="region" aria-label="Architecture diagram. Scroll horizontally to see the complete figure.">
<img src="../../diagrams/microservices-structure.svg" alt="An API gateway routes browser requests to Owners, Visits and Vets. Each team owns its pages, service and data. Visits owns the booking rules and calls Owners to check pet ownership." style="max-width:100%;height:auto" />
</div>
<figcaption>Proposed design for Spring PetClinic. Each dashed frame shows what one team owns. Arrows show requests and database access at runtime. The service split is an example developed for this chapter. <sup><a href="#ref-2">[2]</a></sup></figcaption>
</figure>

The **API gateway** gives the browser one address and forwards each request to the right service. For example, requests under `/visits` go to Visits. <sup><a href="#ref-3">[3]</a></sup>

## Booking a visit across a service boundary

In the official application, the controller first loads the owner. It then looks for the selected pet among that owner's pets. This matters because finding a pet somewhere in the clinic would answer a different question. <sup><a href="#ref-2">[2]</a></sup>

**Original Spring PetClinic · <a href="https://github.com/guendeti/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/java/org/springframework/samples/petclinic/owner/VisitController.java#L70-L74" target="_blank" rel="noopener noreferrer"><code>VisitController.java</code></a>**

```java
Pet pet = owner.getPet(petId);
if (pet == null) {
    throw new IllegalArgumentException(
            "Pet with id " + petId + " not found for owner with id " + ownerId + ".");
}
```

Excerpt from `VisitController.java`, copyright 2012–2025 the original authors, licensed under the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0).

In our proposed split, Visits still needs to answer the same question. Suppose the receptionist selects pet 7 for owner 42 and submits a valid booking form. Visits asks Owners for `GET /owners/42/pets/7` and waits for a reply. This is a **synchronous call**. The outcome determines what Visits does next.

| Result of the lookup | What the receptionist sees |
| --- | --- |
| Owners returns `200 OK` for the owner and pet together. | Visits saves the visit with the owner and pet IDs, then confirms the booking. |
| Owners returns `404 Not Found` for that combination. | Visits asks the receptionist to check the owner and pet. No visit is saved. |
| Owners fails to respond before the timeout. | Visits stops before it saves the visit and asks the receptionist to try again later. |

The lookup tells Visits who owns the pet **at the time of the check**. The check and the later save happen in separate services. If the clinic needs to guarantee that ownership cannot change between those steps, this design alone cannot give that guarantee. That requirement would be a reason to reconsider where the booking boundary belongs. <sup><a href="#ref-1">[1]</a></sup>

The clinic also has a choice about how much booking should depend on Owners being available.

| Booking design | What happens when Owners is down? | What the clinic must decide |
| --- | --- | --- |
| Ask Owners during booking, as in our example | Booking waits for the check and stops if it times out. | How long should the receptionist wait? |
| Keep a local copy of the ownership data in Visits | Visits can check its copy, but a recent transfer may be missing. | Is it acceptable to book using older information? |
| Accept the request and check later | Visits records a pending request. Confirmation comes after the check succeeds. | How will the receptionist learn that a request was declined? |

The [chapter on Self-contained Systems](../scs-and-isa/) explores the second option. Owners publishes changes and Visits updates its local copy as those changes arrive. If ownership stops changing and all updates are applied correctly, the copies agree. This is **eventual consistency**. Keeping an owner ID on a historical visit serves a different purpose. It records which owner the visit was booked for. <sup><a href="#ref-1">[1]</a></sup>

## Combining data for the owner page

Suppose a receptionist opens an owner's page to check a pet's last visit. In our design, the browser first loads the owner and pets from Owners through the gateway. It then requests the visit history from Visits through the same gateway. If Visits is down, the owner details are still available. The history section should say “Visit history is currently unavailable.” An empty list would suggest the pet has never had a visit. Compare that with an outage in Owners during booking. A missing visit history can be shown as a gap on the page. A missing ownership check stops the receptionist from confirming the visit.

The community version of PetClinic shows another way to put that information on the same page. The browser can ask for both in one request. In <a href="https://github.com/spring-petclinic/spring-petclinic-microservices/blob/e8b747ab522721076cacb5cf688eb8a54ba8c5c9/spring-petclinic-api-gateway/src/main/java/org/springframework/samples/petclinic/api/boundary/web/ApiGatewayController.java#L54-L65" target="_blank" rel="noopener noreferrer"><code>getOwnerDetails</code></a>, the gateway loads the owner and their pets, fetches the visits for those pets and returns the combined result. This is **gateway aggregation**. <sup><a href="#ref-3">[3]</a></sup>

## Evaluating the trade-off

For a small clinic with one development team, separate releases may solve little. Booking would now depend on a network call, and someone would have to deploy, monitor and troubleshoot three services and a gateway. Starting with a well-structured monolith gives the team time to learn which features change together before choosing service boundaries. <sup><a href="#ref-1">[1]</a></sup> <sup><a href="#ref-4">[4]</a></sup>

The case for a split gets stronger if the Visits team regularly has to wait for an unrelated directory release, or if directory traffic repeatedly forces the clinic to scale the whole application. Those are two separate reasons to split. The booking example gives the team an equally concrete reason to keep some features together. If receptionists always need a current ownership check, separating Visits from Owners adds a dependency to every booking.

## References

<a id="ref-1"></a>
**[1]** James Lewis and Martin Fowler, "[Microservices](https://martinfowler.com/articles/microservices.html)," martinfowler.com, 25 March 2014, sections "Componentization via Services," "Organized around Business Capabilities," "Products not Projects," "Decentralized Governance," "Decentralized Data Management," "Infrastructure Automation" and "Design for failure." Accessed 17 November 2026.

<a id="ref-2"></a>
**[2]** Spring Projects contributors, *Spring PetClinic*, repository `spring-projects/spring-petclinic`, commit `500158f732419217507c7656904b8e6aa1bcc0d6`, <a href="https://github.com/guendeti/spring-petclinic/tree/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/java/org/springframework/samples/petclinic" target="_blank" rel="noopener noreferrer">source folder</a> with the packages `owner` and `vet`. Accessed 17 November 2026.

<a id="ref-3"></a>
**[3]** Chris Richardson, "[Pattern: API Gateway](https://microservices.io/patterns/apigateway.html)," microservices.io, sections "Solution" and "Resulting context." Accessed 17 November 2026.

<a id="ref-4"></a>
**[4]** Martin Fowler, "[Monolith First](https://martinfowler.com/bliki/MonolithFirst.html)," martinfowler.com, 3 June 2015. Accessed 17 November 2026.

Return to [Modular Monolith](../modular-monolith/). Continue with [Self-contained Systems and ISA](../scs-and-isa/).
