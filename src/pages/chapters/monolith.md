---
layout: ../../layouts/ChapterLayout.astro
title: 'Monolith'
---

A monolith is an application that is built and deployed as a single unit. Take [Spring PetClinic](../what-is-software-architecture/#about-the-spring-petclinic-example), where receptionists use one application to book visits and look up vets. Suppose they want to record how long they expect each visit to last. Even if only the booking feature changes, the team still deploys a new version of the whole application, including the vet directory. <sup><a href="#ref-1">[1]</a></sup>

## TL;DR

In a monolith, the team can develop features separately and deploy them together in one version of the application. When the application needs to handle more requests, the team can run several copies of it side by side. Each running copy is called an application instance and includes all the features.

## Spring PetClinic as one application

Spring PetClinic, the sample application used throughout this site, shows what a shared release looks like in practice. Its code groups owners, pets and visits in the `owner` package and the vet directory in the `vet` package. The code for each feature has its own place, and the build packages both features in one Spring Boot JAR. That JAR is released as a unit. <sup><a href="#ref-2">[2]</a></sup> <sup><a href="#ref-3">[3]</a></sup>

Follow a request from the browser in the diagram below to see which parts run together. Whether a receptionist opens the booking form or looks up a vet, the request reaches the same application instance. In the PostgreSQL configuration shown here, that instance reads and writes clinic records in a separate database. <sup><a href="#ref-3">[3]</a></sup>

<figure class="architecture-figure">
<div class="diagram-scroll" tabindex="0" role="region" aria-label="Architecture diagram. Scroll horizontally to see the complete figure.">
<img src="../../diagrams/monolith-structure.svg" alt="A browser sends HTTP requests to one Spring PetClinic instance containing visit booking and the vet directory. The application accesses a separate PostgreSQL database." style="max-width:100%;height:auto" />
</div>
<figcaption>Visit booking and the vet directory run in the same application instance and are released together. Arrows show HTTP requests and database access at runtime. Own diagram based on Spring PetClinic. <sup><a href="#ref-3">[3]</a></sup> <sup><a href="#ref-2">[2]</a></sup></figcaption>
</figure>

## How the application records a visit

When a receptionist submits the form, `VisitController` handles the request and calls `OwnerRepository` to save the updated owner. Both run inside the same application instance. In the setup shown above, PostgreSQL runs separately, and PetClinic connects to it to store the visit. You can follow the booking [through the original Java code](../visit-use-case/#what-happens-in-the-code). <sup><a href="#ref-2">[2]</a></sup> <sup><a href="#ref-3">[3]</a></sup>

## What one release boundary means

**Releasing changes.** The expected visit duration from our example would also be useful on the owner's page. The team can deliver both changes in one version of the application, so receptionists can see the duration on the owner's page as soon as they start recording it on the form. If a change to the vet directory is also ready, the teams need to decide whether it belongs in that release. <sup><a href="#ref-1">[1]</a></sup>

**Handling more bookings.** If receptionists book more visits but look up vets just as often as before, the clinic can run a second instance to handle some of the requests. That instance includes the vet directory too. Both instances need access to the same booking records. With PostgreSQL, both instances can use the same database. With the default H2 setup, each instance keeps its own data in memory. <sup><a href="#ref-1">[1]</a></sup> <sup><a href="#ref-3">[3]</a></sup>

**Losing an instance.** Running a second instance also changes what happens if the first one stops. With a single instance, receptionists would lose access to booking and the vet directory together. If two instances share the same PostgreSQL database and one stops, the other can still handle bookings and show the same records, as long as requests reach it and it can access the database.

## When a monolith is a good choice

Early in a project, the team may still be discovering which parts of the application tend to change together. A shared deployment gives it room to adjust the boundaries around those parts as it learns. Within one application, the team can move a rule from one part of the code to another and deploy the change in one go. If the rule moves between two separate services, the team may also need to change how the services communicate and decide which version to deploy first. <sup><a href="#ref-4">[4]</a></sup>

For the pet clinic, the choice depends on what is getting in the team's way. If booking improvements regularly have to wait for unrelated changes to the vet directory, independent deployments may be worth considering. <sup><a href="#ref-1">[1]</a></sup> If the release schedule works well but a change to one feature keeps breaking the other, the more useful question is which parts of the code should be allowed to depend on each other. A [modular monolith](../modular-monolith/) makes those boundaries explicit within one deployment.

## References

<a id="ref-1"></a>
**[1]** James Lewis and Martin Fowler, "[Microservices](https://martinfowler.com/articles/microservices.html)," martinfowler.com, 25 March 2014, introduction and sections "Componentization via Services" and "Design for failure." Accessed 17 November 2026.

<a id="ref-2"></a>
**[2]** Spring Projects contributors, *Spring PetClinic*, commit `500158f732419217507c7656904b8e6aa1bcc0d6`, <a href="https://github.com/guendeti/spring-petclinic/tree/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/java/org/springframework/samples/petclinic" target="_blank" rel="noopener noreferrer">source folder</a> with the packages `owner`, `vet`, `system` and `model`, <a href="https://github.com/guendeti/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/pom.xml" target="_blank" rel="noopener noreferrer">pom.xml</a> and <a href="https://github.com/guendeti/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/java/org/springframework/samples/petclinic/owner/VisitController.java#L95-L109" target="_blank" rel="noopener noreferrer">VisitController.java</a> for date validation and saving. Accessed 17 November 2026.

<a id="ref-3"></a>
**[3]** Spring Projects contributors, *Spring PetClinic*, repository `spring-projects/spring-petclinic`, commit `500158f732419217507c7656904b8e6aa1bcc0d6`, README sections on <a href="https://github.com/guendeti/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/README.md#L14-L36" target="_blank" rel="noopener noreferrer">running the application locally</a>, <a href="https://github.com/guendeti/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/README.md#L43-L56" target="_blank" rel="noopener noreferrer">building and running the container image</a> and <a href="https://github.com/guendeti/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/README.md#L62-L70" target="_blank" rel="noopener noreferrer">database configuration</a>. Accessed 17 November 2026.

<a id="ref-4"></a>
**[4]** Martin Fowler, "[Monolith First](https://martinfowler.com/bliki/MonolithFirst.html)," martinfowler.com, 3 June 2015. Accessed 17 November 2026.

Return to [System vs. application architecture](../system-vs-application-architecture/). Continue with [Modular Monolith](../modular-monolith/).
