---
layout: ../../layouts/ChapterLayout.astro
title: 'Architecture comparison'
---

Suppose a receptionist at the pet clinic tries to book a visit for today. The form should show a date error. Now suppose the clinic adds a file import for future visits. Which code could the import call to apply the same rule? This chapter compares the original [Spring PetClinic](../what-is-software-architecture/#about-the-spring-petclinic-example) with three ways we reorganised that booking operation. All run in one application. The [system architecture comparison](../scs-and-isa/#comparing-the-system-architectures) covers a separate question: which parts could run and be released independently?

## TL;DR

In the original application, the web controller checks the date. In our layered version, an import could call a service that still uses the existing owner repository. Our Clean and Hexagonal chapters look at the same implementation: the booking use case defines what it needs from storage, and a test can supply that storage in memory. In our Onion version, an owner object can decide whether to accept a visit using the pet IDs it already holds. <sup><a href="#ref-1">[1]</a></sup>

## Following the same booking through the code

Follow the same booking for an existing owner, first in the original application and then in our three variants. The links take you to the corresponding diagrams and code. <sup><a href="#ref-1">[1]</a></sup>

| Implementation | What happens when the date is today? | What happens with a future date and the right pet? |
| --- | --- | --- |
| [Original Spring PetClinic](../visit-use-case/#what-happens-in-the-code) | Spring MVC has already loaded the owner and pet. The controller adds an error to the date field and returns the form. | The controller calls `owner.addVisit` and saves the owner through `OwnerRepository`. |
| [Layered](../layered-architecture/#reading-the-dependencies) | `VisitService` rejects the date before it looks up the owner. The controller turns the exception into a form error. | The service loads the owner, checks the pet, adds the visit and saves the owner. |
| [Clean](../clean-architecture/#where-the-boundary-falls-in-spring-petclinic) and [Hexagonal](../hexagonal-architecture/#the-same-code-seen-as-ports-and-adapters) | `BookVisitInteractor` rejects the date before it calls `VisitStore`. | The interactor asks the store whether the pet belongs to the owner, then calls `addVisit`. The JPA adapter does the database work. |
| [Onion](../onion-architecture/#reading-the-rings) | `VisitBookingService` first loads a `PetOwner`. The domain object rejects the date, so the service never asks the repository to add the visit. | The domain object returns a `NewVisit`. The service hands that value to the repository to be stored. |

Look at the successful booking in Layered and Clean. Both reach the database, but the layered service names a Spring Data repository, while the Clean adapter names an interface defined in the booking core. The call still reaches storage at runtime. The source dependency across that boundary has changed direction. Clean, Hexagonal and Onion use that idea to keep rules independent of web and database code. Martin draws on both Cockburn and Palermo. <sup><a href="#ref-2">[2]</a></sup> <sup><a href="#ref-3">[3]</a></sup>

These are differences you can observe in our code. For example, a date-only **domain test** in the Onion variant can construct an owner and supply a fixed value for today. Calling the full Onion **service** for the same date still requires an owner lookup. In the layered and Clean variants, a bad date stops the service or interactor before its first lookup. In all three web variants, showing the form again after an error can still read owner and pet details. This is why it matters whether a test starts at the form, the booking operation or the domain object. [How the variants prepare the form](../visit-use-case/#our-refactorings)

There is one deliberate behaviour change to keep in mind when comparing results. The original controller skips the date check for a missing date. All three refactorings reject a missing date. They also keep the description constraints on the form object. A caller that invokes a booking method directly must arrange that validation if it needs the same feedback as the receptionist. <sup><a href="#ref-1">[1]</a></sup>

## What the shared tests establish

Now consider a booking for tomorrow where the pet belongs to someone else. In the sample data, pet 2 belongs to owner 2. The test asks each of our three variants to book that pet for owner 1. <sup><a href="#ref-1">[1]</a></sup>

**Our tests · <a href="https://github.com/guendeti/spring-petclinic/blob/bdd7783bf9c778882b7ec77e0f0a2f402e20b247/src/test/java/org/springframework/samples/petclinic/visits/VisitBookingVariantsTests.java#L120-L124" target="_blank" rel="noopener noreferrer"><code>VisitBookingVariantsTests.java</code></a>**

```java
@ParameterizedTest
@ValueSource(strings = { "layered", "clean", "onion" })
void rejectsPetOfAnotherOwner(String name) {
    assertRejected(name, 1, 2, LocalDate.now().plusDays(1));
}
```

For each variant, the <a href="https://github.com/guendeti/spring-petclinic/blob/bdd7783bf9c778882b7ec77e0f0a2f402e20b247/src/test/java/org/springframework/samples/petclinic/visits/VisitBookingVariantsTests.java#L87-L92" target="_blank" rel="noopener noreferrer">shared test helper</a> expects a runtime exception and checks that the number of stored visits stays the same. Because the assertion accepts any `RuntimeException`, the exact reason for the rejection remains open. The [controller tests](../visit-use-case/#the-same-cases-for-every-variant) separately check what the form shows for today's date.

There is a limit to what the passing tests tell us. The shared tests run inside test transactions. None of the three booking operations defines a transaction around the whole operation in production. In the Clean and Onion variants, the adapter looks up the owner again when saving. If the clinic needs a guarantee about two people changing the same record at once, that is a storage and transaction decision in its own right.

## How to choose for the pet clinic

- **The clinic adds a file import.** A layered service already offers one place for the form and the import to enforce the date rule. The importer must supply the `Visit` type the service expects. This can be a reasonable cost while both callers use the same data model. <sup><a href="#ref-2">[2]</a></sup>
- **The booking team wants to exercise its whole use case without Spring Data.** The Clean and Hexagonal implementation gives the team a small storage interface it can implement in memory. That buys a specific test: the same operation used by the form can run against known owner and pet data. The team must also maintain the real adapter and test its mapping. <sup><a href="#ref-3">[3]</a></sup> <sup><a href="#ref-4">[4]</a></sup>
- **More decisions depend on the owner and their pets.** The Onion version gives those rules a home in `PetOwner`. Tests can supply exactly the pets and date a rule needs. The cost is building that model from stored records and translating the result back. Clean Architecture also allows rules in domain entities. Either design can use this idea when the rules justify it. <sup><a href="#ref-3">[3]</a></sup> <sup><a href="#ref-5">[5]</a></sup>

## Trying the variants yourself

Follow the <a href="https://github.com/guendeti/spring-petclinic/blob/bdd7783bf9c778882b7ec77e0f0a2f402e20b247/README.md#visit-booking-demo" target="_blank" rel="noopener noreferrer">start instructions in our PetClinic fork</a> to run the application with its default sample data. On `http://localhost:8080`, open one of the following paths to book a visit for Leo, George Franklin's cat. The Clean and Hexagonal chapters use the same route. <sup><a href="#ref-1">[1]</a></sup>

| Version | Path for Leo's booking form |
| --- | --- |
| Original | `/owners/1/pets/1/visits/new` |
| Layered | `/layered/owners/1/pets/1/visits/new` |
| Clean and Hexagonal | `/clean/owners/1/pets/1/visits/new` |
| Onion | `/onion/owners/1/pets/1/visits/new` |

For a visible comparison, enter tomorrow's date and a short description. A successful submission returns to the owner page. To follow a rejected request even when the browser prevents choosing today, run <a href="https://github.com/guendeti/spring-petclinic/blob/bdd7783bf9c778882b7ec77e0f0a2f402e20b247/src/test/java/org/springframework/samples/petclinic/visits/VisitVariantControllersTests.java" target="_blank" rel="noopener noreferrer"><code>VisitVariantControllersTests</code></a>. Its date-error case submits today directly to each variant. The [booking comparison](#following-the-same-booking-through-the-code) shows where each variant rejects the date.

## References

<a id="ref-1"></a>
**[1]** Spring Projects contributors, *Spring PetClinic*, commit `500158f732419217507c7656904b8e6aa1bcc0d6`, <a href="https://github.com/guendeti/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/java/org/springframework/samples/petclinic/owner/VisitController.java#L63-L111" target="_blank" rel="noopener noreferrer">visit form setup and submission</a>, <a href="https://github.com/guendeti/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/java/org/springframework/samples/petclinic/owner/Visit.java#L39-L45" target="_blank" rel="noopener noreferrer">date and description fields</a> and <a href="https://github.com/guendeti/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/resources/db/h2/data.sql#L18-L37" target="_blank" rel="noopener noreferrer">H2 sample data for owners and pets</a>. Accessed 18 November 2026.

<a id="ref-2"></a>
**[2]** Martin Fowler, “[Presentation Domain Data Layering](https://martinfowler.com/bliki/PresentationDomainDataLayering.html),” 26 August 2015. Accessed 18 November 2026.

<a id="ref-3"></a>
**[3]** Robert C. Martin, “[The Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html),” 13 August 2012, sections “The Dependency Rule,” “Entities” and “Crossing boundaries.” Accessed 18 November 2026.

<a id="ref-4"></a>
**[4]** Alistair Cockburn, “[Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/),” 4 September 2005, sections “Intent” and “Motivation.” Accessed 18 November 2026.

<a id="ref-5"></a>
**[5]** Jeffrey Palermo, “[The Onion Architecture: Part 1](https://jeffreypalermo.com/2008/07/the-onion-architecture-part-1/),” 29 July 2008. Accessed 18 November 2026.

Return to [Onion Architecture](../onion-architecture/). Back to [What is software architecture?](../what-is-software-architecture/).
