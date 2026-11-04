---
layout: ../../layouts/ChapterLayout.astro
title: 'Monolithic architecture'
---

A monolith keeps its main application features in one deployment unit. Those features can still have clear responsibilities and well-defined interfaces. The defining choice is that they are built and released together. <sup><a href="#ref-1">[1]</a></sup>

## TL;DR

The original PetClinic groups its server-side features in one Spring Boot application. Internal modularity, database placement and deployment boundaries are separate decisions. Its Visit flow gives us a concrete baseline for exploring those boundaries.

## One application boundary

A shared deployment means that a change to one feature is delivered as a new version of the application. Keeping responsibilities in separate packages can help organise the code, while the application remains a single release unit. <sup><a href="#ref-1">[1]</a></sup>

The official PetClinic revision examined here is a Spring Boot application. Its default H2 database keeps data in memory, and configurations for MySQL and PostgreSQL are also provided. An external database does not turn the application's internal features into separate services. <sup><a href="#ref-2">[2]</a></sup>

<figure class="architecture-figure">
<div class="diagram-scroll" tabindex="0" role="region" aria-label="Architecture diagram. Scroll horizontally to see the complete figure.">
<img src="../../diagrams/monolith-structure.svg" alt="Browser and one PetClinic application containing MVC processing, JPA entities and repositories. the database can be embedded or external." style="max-width:100%;height:auto" />
</div>
<figcaption>Logical responsibilities in the original PetClinic application. Database placement depends on the selected profile. <sup><a href="#ref-2">[2]</a></sup> <sup><a href="#ref-3">[3]</a></sup></figcaption>
</figure>

The diagram labels `Owner`, `Pet`, `Visit` and `Vet` as entities, meaning objects mapped to database records. It does not imply an isolated, framework-independent domain model. It uses Jakarta Persistence, usually called JPA, to connect Java objects to database records. Annotations such as `@Entity` describe that mapping. <sup><a href="#ref-3">[3]</a></sup>

## A visit crosses code boundaries, not service boundaries

The important observation is the direct dependency from `VisitController` to `OwnerRepository`. There is no intervening booking service in this flow. The detailed [Visit chapter](../visit-use-case/) follows the actual request handling and persistence path. <sup><a href="#ref-3">[3]</a></sup>

This unchanged excerpt shows the success path after validation.

```java
owner.addVisit(petId, visit);
this.owners.save(owner);
```

The source is `VisitController.processNewVisitForm` <sup><a href="#ref-3">[3]</a></sup>. Copyright 2012–2025 the original authors. [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0). Validation and response handling are omitted.

<figure class="architecture-figure">
<div class="diagram-scroll" tabindex="0" role="region" aria-label="Architecture diagram. Scroll horizontally to see the complete figure.">
<img src="../../diagrams/visit-flow.svg" alt="Original GET and POST paths. preparation, rendering, repeated preparation, validation, conditional save and redirect." style="max-width:100%;height:auto" />
</div>
<figcaption>Request/handler order <sup><a href="#ref-3">[3]</a></sup>. Invalid input and successful persistence are alternative branches. No controller-wide transaction or fixed SQL count is implied.</figcaption>
</figure>

Introducing a `VisitService` would change this internal arrangement. It would not, on its own, make Visits independently deployable. Our [Layered refactoring](../layered-architecture/) demonstrates that difference.

## Local does not mean automatically atomic

A repository provides access to stored objects. A transaction groups database changes so they can succeed or roll back together, which is what atomic means here. A repository transaction does not automatically include earlier controller work. A service facade, an entry point coordinating the operation, can define a wider transaction. <sup><a href="#ref-4">[4]</a></sup> In our booking design, that boundary starts when the command is processed, not when the user opens the form.

The baseline's Owner–Pet–Visit relationships provide a cascade path for persistence. Cascading lets JPA apply a persistence operation to related objects as well. <sup><a href="#ref-3">[3]</a></sup> Changing an object collection, requesting persistence and completing a database commit are different events. The [Visit chapter](../visit-use-case/#persistence-is-a-relationship-contract) explains these boundaries in the original operation.

## When only Visits gets busy

Suppose a campaign produces many booking requests but little additional vet-directory traffic. Another instance of the shared application contains both features. That may be acceptable. The requirement is to handle load, not necessarily to create a separate Visits process.

Separating Visits could allow booking capacity to grow independently of the vet directory. <sup><a href="#ref-1">[1]</a></sup> Whether that helps depends on where the application spends its resources and which part limits throughput. Measuring those constraints gives the team a basis for choosing between more instances of the shared application and a separate Visits service.

The sample configuration raises a more immediate concern. Separate instances with separate in-memory databases would not share one clinic's records. Running multiple instances for the same clinic therefore requires a suitable shared persistence setup. <sup><a href="#ref-2">[2]</a></sup>

Releases are likewise shared. A change packaged in the application artifact is delivered with the application. Whether that coupling is a problem depends on team responsibilities, release frequency and risk.

## Evaluate this boundary

In PetClinic, booking and owner lookup collaborate inside one application. This keeps their calls local and allows a service operation to use a local database transaction. A browser or external database still communicates with the application over a network, but booking does not need to call a separate Owners service.

There are concrete limits. Packages do not create independent releases, and a process-level resource failure can affect the features in that process. Additional instances require appropriate data and deployment design. Shared and separate deployments have different operational consequences. <sup><a href="#ref-1">[1]</a></sup>

If the immediate concern is uncontrolled access between features, a [modular monolith](../modular-monolith/) can address that concern without adding network communication. Separate services become relevant when a requirement justifies independent deployment or operation and the extra integration work it brings.

When the business boundaries are still uncertain, keeping them inside one application can leave more room to revise them before introducing remote calls. That is a reason to consider starting with a monolith, rather than a rule that every system must follow. Later extraction still depends on the dependencies and data relationships the application has acquired. <sup><a href="#ref-5">[5]</a></sup>

## References

<a id="ref-1"></a>
**[1]** James Lewis and Martin Fowler, “Microservices,” 25 March 2014, “Componentization via Services.” Original article. Accessed 2 November 2026.

<a id="ref-2"></a>
**[2]** Spring Projects contributors, *Spring PetClinic*, commit `500158f732419217507c7656904b8e6aa1bcc0d6`. README.md, database configuration. Accessed 2 November 2026.

<a id="ref-3"></a>
**[3]** Spring Projects contributors, same commit, package `src/main/java/org/springframework/samples/petclinic/owner/`: VisitController.java, `loadPetWithVisit` and `processNewVisitForm`. Owner.java, `pets`, `addVisit`. Pet.java, `visits`. OwnerRepository.java. Accessed 2 November 2026.

<a id="ref-4"></a>
**[4]** Spring Data team, *Spring Data JPA Reference: Transactionality*. Repository and facade transaction semantics. Accessed 2 November 2026. This explains framework semantics, not the exact dependency version of the pinned sample.

<a id="ref-5"></a>
**[5]** Martin Fowler, "Monolith First," 3 June 2015, discussion of uncertain service boundaries, modularity and limitations of the recommendation. Original article. Accessed 4 November 2026.

Return to [System vs. application architecture](../system-vs-application-architecture/). Continue with [Modular Monolith](../modular-monolith/).
