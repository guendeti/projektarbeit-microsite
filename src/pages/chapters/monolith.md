---
layout: ../../layouts/ChapterLayout.astro
title: 'Monolithic architecture'
---

As an application grows, it may take on several tasks with different responsibilities. The code for those tasks can be organised into separate parts while the application is still built and deployed as one unit. An application organised this way is called a monolith. When a change to one feature is delivered, it is released as part of a new version of the application. <sup><a href="#ref-1">[1]</a></sup>

## TL;DR

Spring PetClinic brings owner management, visits and vet information into one Spring Boot application. Its code can have separate responsibilities, but those features are released together. Whether this arrangement is suitable depends on how much the features need to change, run and scale independently.

## One application, several responsibilities

Suppose a receptionist uses Spring PetClinic to record a visit for a pet. The server-side views, the code handling the request and the code storing the visit all belong to the same Spring Boot application. Owner management and vet information are there too. These responsibilities have different classes and packages, but they are not deployed as separate services in the version we examine. <sup><a href="#ref-2">[2]</a></sup> <sup><a href="#ref-3">[3]</a></sup>

<figure class="architecture-figure">
<div class="diagram-scroll" tabindex="0" role="region" aria-label="Architecture diagram. Scroll horizontally to see the complete figure.">
<img src="../../diagrams/monolith-structure.svg" alt="A browser uses one Spring PetClinic application containing web controllers, views, JPA entities and repositories. The data store is shown logically, with its physical placement depending on the database configuration." style="max-width:100%;height:auto" />
</div>
<figcaption>Spring PetClinic as one application. The data store is shown logically because its physical placement depends on the database configuration. <sup><a href="#ref-2">[2]</a></sup> <sup><a href="#ref-3">[3]</a></sup></figcaption>
</figure>

The box around the Spring Boot application contains its web controllers and views, data-access repositories, and the `Owner`, `Pet`, `Visit` and `Vet` classes. These classes are JPA entities mapped to stored data, rather than a separate, technology-independent business core. The arrows show selected relationships of different kinds, including HTTP from the browser, so they should not all be read as code dependencies. <sup><a href="#ref-3">[3]</a></sup>

The data store is outside the application box to show where data belongs logically, not to prescribe a separate database process. Spring PetClinic uses an in-memory H2 database by default and provides profiles for MySQL and PostgreSQL. Either choice leaves the application's features within the same release boundary. <sup><a href="#ref-2">[2]</a></sup>

## Following a visit through the code

The diagram places several responsibilities inside one application. In the code for recording a visit, we can see how two of those parts work together. `VisitController` handles the web request and receives an `OwnerRepository` directly through its constructor. The original flow has no separate booking service between them. <sup><a href="#ref-3">[3]</a></sup>

**Original Spring PetClinic · `VisitController.java`, lines 45–49.** [View these lines in the official repository](https://github.com/spring-projects/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/java/org/springframework/samples/petclinic/owner/VisitController.java#L45-L49).

```java
private final OwnerRepository owners;

public VisitController(OwnerRepository owners) {
    this.owners = owners;
}
```

Later, after the submitted visit passes validation, the controller adds it to the selected pet through the owner and asks the repository to save the owner. <sup><a href="#ref-3">[3]</a></sup>

**Original Spring PetClinic · `VisitController.java`, lines 108–109.** [View these lines in the official repository](https://github.com/spring-projects/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/java/org/springframework/samples/petclinic/owner/VisitController.java#L108-L109).

```java
owner.addVisit(petId, visit);
this.owners.save(owner);
```

These excerpts show how the web controller uses data access inside the application. The diagram gives us the broader view, with Visit, Owner and Vet functionality packaged together. Moving booking rules into another class could change the internal dependency, but Visits would still be part of the monolith as long as they were released with that application. The [Layered Architecture chapter](../layered-architecture/) examines this kind of internal separation.

Both excerpts come from `VisitController.java`. Copyright 2012–2025 the original authors. Licensed under the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0). The surrounding request handling is omitted. The [Visit chapter](../visit-use-case/) follows the complete operation, including its persistence behaviour.

## When one feature gets busier

The shared boundary also matters when demand changes. Suppose the clinic receives many more Visit requests while use of its vet directory stays about the same. It could run another instance of the monolith, giving it another copy of the whole application. That may help if application processing is the bottleneck. A separate Visit service could instead be scaled independently, but it would introduce communication across a service boundary. The choice depends on where the load actually occurs and whether that extra complexity is worthwhile. <sup><a href="#ref-1">[1]</a></sup>

Running several instances also raises a practical data question. With the default in-memory H2 configuration, each instance would have its own records. To serve the same clinic data from multiple instances, we would need a suitable shared persistence setup. <sup><a href="#ref-2">[2]</a></sup>

The same boundary affects releases. Suppose a new requirement changes both visit recording and the owner's page. Those changes can be tested and delivered in one application version. If different teams need to release these features on separate schedules, however, they must coordinate a shared deployment. <sup><a href="#ref-1">[1]</a></sup>

## Assessing the shared boundary

In Spring PetClinic, the Visit and Owner code can collaborate without a network call between business services. This avoids a remote failure at that point in the operation. It does not remove other network communication, since the browser uses HTTP and an external database would require a connection of its own. <sup><a href="#ref-2">[2]</a></sup> <sup><a href="#ref-3">[3]</a></sup>

The limits follow from the same choice. Packages alone cannot give features independent releases, and a failure that stops an application instance affects the features it serves. If the main concern is keeping feature code better organised, a [modular monolith](../modular-monolith/) may be a useful next step. Separate services become more relevant when independent operation or deployment justifies the additional communication and failure handling. <sup><a href="#ref-1">[1]</a></sup>

When the boundaries between features are still uncertain, keeping them in one application can leave room to revise them before introducing remote calls. Fowler presents this as a reason to consider starting with a monolith, while also noting that extracting services later can be difficult. <sup><a href="#ref-4">[4]</a></sup> The useful question is whether a shared release and shared capacity still fit the application's needs.

## References

<a id="ref-1"></a>
**[1]** James Lewis and Martin Fowler, “[Microservices](https://martinfowler.com/articles/microservices.html),” 25 March 2014, especially “Componentization via Services” and “Design for failure.” Accessed 15 November 2026.

<a id="ref-2"></a>
**[2]** Spring Projects contributors, *Spring PetClinic*, commit `500158f732419217507c7656904b8e6aa1bcc0d6`, [README.md](https://github.com/spring-projects/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/README.md), especially “Database configuration.” Accessed 15 November 2026.

<a id="ref-3"></a>
**[3]** Spring Projects contributors, *Spring PetClinic*, same commit, [PetClinicApplication.java](https://github.com/spring-projects/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/java/org/springframework/samples/petclinic/PetClinicApplication.java), [pom.xml](https://github.com/spring-projects/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/pom.xml), [VisitController.java](https://github.com/spring-projects/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/java/org/springframework/samples/petclinic/owner/VisitController.java), [OwnerRepository.java](https://github.com/spring-projects/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/java/org/springframework/samples/petclinic/owner/OwnerRepository.java), [Owner.java](https://github.com/spring-projects/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/java/org/springframework/samples/petclinic/owner/Owner.java), [Pet.java](https://github.com/spring-projects/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/java/org/springframework/samples/petclinic/owner/Pet.java) and [Vet.java](https://github.com/spring-projects/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/java/org/springframework/samples/petclinic/vet/Vet.java). The code excerpts above link to the exact lines used. Accessed 15 November 2026.

<a id="ref-4"></a>
**[4]** Martin Fowler, “[Monolith First](https://martinfowler.com/bliki/MonolithFirst.html),” 3 June 2015, discussion of uncertain service boundaries and the difficulty of later extraction. Accessed 15 November 2026.

Return to [System vs. application architecture](../system-vs-application-architecture/). Continue with [Modular Monolith](../modular-monolith/).
