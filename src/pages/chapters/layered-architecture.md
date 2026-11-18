---
layout: ../../layouts/ChapterLayout.astro
title: 'Layered Architecture'
---

A layered architecture groups code by the work it does. <sup><a href="#ref-1">[1]</a></sup> Take [Spring PetClinic](../what-is-software-architecture/#about-the-spring-petclinic-example), where a receptionist books a visit through a web form. Suppose the clinic also wants to import visits from a file. Both callers need to check the visit date. Where can that rule live so that changing it once changes it for both?

## TL;DR

In our layered version, the controller reads the form, a booking service checks the date and the selected pet, and a repository saves the updated owner. An import job could call the same service. All three layers still run in one Spring Boot application. <sup><a href="#ref-1">[1]</a></sup>

## Three layers in one application

Consider what happens when a receptionist enters today's date. The **presentation layer** reads the form and can show an error beside the date field. The **business layer** decides which dates the clinic accepts. The **data access layer** loads and saves records when the booking needs them. These are logical layers. A *tier* describes where software runs or is deployed. Adding a service class here introduces no network call. <sup><a href="#ref-1">[1]</a></sup>

In a strictly layered design, a caller goes through the next layer to reach the one below it. A design can also allow a layer to be skipped for a particular task.

## Reading the dependencies

To see how the layers work together in our variant, follow the solid arrows from the controller through the booking service to the repository. Each arrow means “uses in its code”. The dashed arrow shows why the controller also holds an `OwnerRepository`. When it opens the form or shows it again after an error, it passes the repository to `VisitFormModel`, which loads the owner and pet for display.

<figure class="architecture-figure">
<div class="diagram-scroll" tabindex="0" role="region" aria-label="Architecture diagram. Scroll horizontally to see the complete figure.">
<img src="../../diagrams/layered-dependencies.svg" alt="For booking, LayeredVisitController uses VisitService, which uses OwnerRepository. For form display the controller also depends on OwnerRepository and passes it to VisitFormModel." style="max-width:100%;height:auto" />
</div>
<figcaption>Code dependencies in our layered PetClinic variant. The controller and the service run in the same application. The repository provides the data access operations.</figcaption>
</figure>

## Refactoring the booking into a service layer

In the [original booking code](../visit-use-case/#what-happens-in-the-code), the controller checks the visit date and adds a field error when the date is too early. <sup><a href="#ref-2">[2]</a></sup> In our variant, `VisitService.bookVisit` gives both the form and a possible import job the same operation to call. The caller supplies the booking details, and the service coordinates the checks and the save. That is the role of the **service layer**. <sup><a href="#ref-3">[3]</a></sup>

**Our refactoring · <a href="https://github.com/guendeti/spring-petclinic/blob/bdd7783bf9c778882b7ec77e0f0a2f402e20b247/src/main/java/org/springframework/samples/petclinic/visits/layered/VisitService.java#L34-L46" target="_blank" rel="noopener noreferrer"><code>VisitService.java</code></a>**

```java
public void bookVisit(int ownerId, int petId, Visit visit) {
    LocalDate date = visit.getDate();
    if (date == null || !date.isAfter(LocalDate.now())) {
        throw new InvalidVisitDateException(date);
    }
    Owner owner = owners.findById(ownerId)
        .orElseThrow(() -> new IllegalArgumentException("Owner not found with id: " + ownerId));
    if (owner.getPet(petId) == null) {
        throw new IllegalArgumentException("Pet with id " + petId + " not found for owner with id " + ownerId);
    }
    owner.addVisit(petId, visit);
    owners.save(owner);
}
```

The first check runs before the service reads any owner records. Today and earlier dates are rejected. There is also one deliberate change from the original: the original date check skips a missing date, while the service rejects it. For a future date, the service loads the owner and looks for the pet among that owner's pets. Once both checks pass, `addVisit` updates the pet in memory and `save` asks the repository to store the updated owner. <sup><a href="#ref-2">[2]</a></sup>

The <a href="https://github.com/guendeti/spring-petclinic/blob/bdd7783bf9c778882b7ec77e0f0a2f402e20b247/src/main/java/org/springframework/samples/petclinic/visits/layered/LayeredVisitController.java#L74-L85" target="_blank" rel="noopener noreferrer">controller</a> calls the service and turns a date exception into an error beside the date field. An import job could catch the same exception and report which row in the file needs fixing.

## What another caller can reuse

The import job can use the date and ownership checks by calling `bookVisit` directly. One detail still needs attention. The web form uses `@Valid` to check the description against the constraints on `Visit`: it must contain text and can be at most 255 characters long. A direct call to `bookVisit` does not run that form validation. If every entry point must give the same feedback for a blank description, the import job needs an explicit validation step or the service must take responsibility for that check too. <sup><a href="#ref-2">[2]</a></sup>

The same distinction helps with testing. A test can call the service with today's date and check for `InvalidVisitDateException` without starting a web server or reading a database. A test that also needs to check whether the visit was actually stored must exercise the repository and its database mapping. The [Visit use case](../visit-use-case/#the-same-cases-for-every-variant) lists the booking cases used to compare the variants.

## What still depends on storage?

The service calls `findById` and `save` on `OwnerRepository`, a Spring Data JPA interface. It also works with `Owner` and `Visit` objects mapped to database tables. A change behind the repository can leave the service alone if those operations and types still work the same way. But suppose visits are later stored separately from owners. The line `owners.save(owner)` shows exactly which assumption the team would need to revisit. <sup><a href="#ref-2">[2]</a></sup> <sup><a href="#ref-4">[4]</a></sup>

For the pet clinic, the extra service earns its place by giving the web form and a possible import job one booking operation to share. A class that only forwards a call would offer less value. If the team also wants to test and change the booking logic independently of the Spring Data types, the next question is who defines the storage interface. The [Clean Architecture chapter](../clean-architecture/) follows that question through the same booking.

## References

<a id="ref-1"></a>
**[1]** Martin Fowler, “[Presentation Domain Data Layering](https://martinfowler.com/bliki/PresentationDomainDataLayering.html),” 26 August 2015. Accessed 18 November 2026.

<a id="ref-2"></a>
**[2]** Spring Projects contributors, *Spring PetClinic*, commit `500158f732419217507c7656904b8e6aa1bcc0d6`. <a href="https://github.com/guendeti/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/java/org/springframework/samples/petclinic/owner/VisitController.java#L95-L109" target="_blank" rel="noopener noreferrer">Original date check and save</a>, <a href="https://github.com/guendeti/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/java/org/springframework/samples/petclinic/owner/Visit.java#L39-L45" target="_blank" rel="noopener noreferrer">visit date and description constraints</a> and <a href="https://github.com/guendeti/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/java/org/springframework/samples/petclinic/owner/OwnerRepository.java#L36" target="_blank" rel="noopener noreferrer">owner repository interface</a>. Accessed 18 November 2026.

<a id="ref-3"></a>
**[3]** Randy Stafford, “[Service Layer](https://martinfowler.com/eaaCatalog/serviceLayer.html),” in Martin Fowler's *Patterns of Enterprise Application Architecture*, online entry dated 5 March 2003. Accessed 18 November 2026.

<a id="ref-4"></a>
**[4]** Jeffrey Palermo, “[The Onion Architecture: Part 1](https://jeffreypalermo.com/2008/07/the-onion-architecture-part-1/),” 29 July 2008, discussion of dependencies on data access in traditional layered applications. Accessed 18 November 2026.

Return to [The Visit use case](../visit-use-case/). Continue with [Clean Architecture](../clean-architecture/).
