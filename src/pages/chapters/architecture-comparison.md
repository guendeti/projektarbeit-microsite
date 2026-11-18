---
layout: ../../layouts/ChapterLayout.astro
title: 'Architecture comparison'
---

Suppose a receptionist at the pet clinic tries to book Leo for today. The form should show a date error. Now suppose the clinic adds a file import for future visits. Which code could the import call to apply the same rule? This chapter compares the original [Spring PetClinic](../what-is-software-architecture/#about-the-spring-petclinic-example) with three ways we reorganised that booking operation. All run in one application. The [system architecture comparison](../scs-and-isa/#comparing-the-system-architectures) covers a separate question: which parts could run and be released independently?

## TL;DR

In the original application, the web controller checks the date. In our layered version, an import could call a service that still uses the existing owner repository. Our Clean and Hexagonal chapters look at the same implementation: the booking use case defines what it needs from storage, and a test can supply that storage in memory. In our Onion version, an owner object can decide whether to accept a visit using the pet IDs it already holds. <sup><a href="#ref-1">[1]</a></sup>

## What each architecture helps you see

Read across a row to connect an architecture term with a decision in the pet clinic. The chapter links lead to diagrams of the actual variants.

| Approach | Question to ask | What to look for in the diagram |
| --- | --- | --- |
| [Layered Architecture](../layered-architecture/#reading-the-dependencies) | Which work belongs to the form, the booking service and the database code? | The controller calls the service for booking. The service uses the existing repository. <sup><a href="#ref-2">[2]</a></sup> |
| [Clean Architecture](../clean-architecture/#where-the-boundary-falls-in-spring-petclinic) | Which types does the booking rule need to know? | The use case depends on the `VisitStore` interface in the core. The JPA adapter implements it. <sup><a href="#ref-3">[3]</a></sup> |
| [Hexagonal Architecture](../hexagonal-architecture/#the-same-code-seen-as-ports-and-adapters) | Who starts a booking, and what does the application ask of storage? | A web controller or a test can call the same booking port. The storage port can be implemented by a database adapter or an in-memory store. <sup><a href="#ref-4">[4]</a></sup> |
| [Onion Architecture](../onion-architecture/#reading-the-rings) | Which decisions can the domain model make on its own? | The application service loads a `PetOwner`. The owner checks the date and the pet. Infrastructure implements the repository interface defined beside the model. <sup><a href="#ref-5">[5]</a></sup> |

Clean, Hexagonal and Onion Architecture share a goal: the clinic should be able to change its web or database code while keeping its booking rules intact. Martin explicitly draws on both Cockburn and Palermo. <sup><a href="#ref-3">[3]</a></sup>

One arrow is worth comparing across diagrams. During a successful booking, both the layered service and the Clean use case eventually call code that writes to the database. In the layered version, the service names a Spring Data repository. In the Clean version, the database adapter names an interface owned by the booking core. The runtime call still reaches storage. The source dependency across that boundary has changed direction. <sup><a href="#ref-2">[2]</a></sup> <sup><a href="#ref-3">[3]</a></sup>

## Following the same booking through the code

The table follows the booking operation for an existing owner. We added the three variants in our PetClinic fork. The first row shows the original controller. <sup><a href="#ref-1">[1]</a></sup>

| Implementation | What happens when the date is today? | What happens with a future date and the right pet? |
| --- | --- | --- |
| Original Spring PetClinic | Spring MVC has already loaded the owner and pet. The controller adds an error to the date field and returns the form. | The controller calls `owner.addVisit` and saves the owner through `OwnerRepository`. |
| Layered | `VisitService` rejects the date before it looks up the owner. The controller turns the exception into a form error. | The service loads the owner, checks the pet, adds the visit and saves the owner. |
| Clean and Hexagonal | `BookVisitInteractor` rejects the date before it calls `VisitStore`. | The interactor asks the store whether the pet belongs to the owner, then calls `addVisit`. The JPA adapter does the database work. |
| Onion | `VisitBookingService` first loads a `PetOwner`. The domain object rejects the date, so the service never asks the repository to add the visit. | The domain object returns a `NewVisit`. The service hands that value to the repository to be stored. |

These are differences you can observe in our code. For example, a date-only **domain test** in the Onion variant can construct an owner and supply a fixed value for today. Calling the full Onion **service** for the same date still requires an owner lookup. In the layered and Clean variants, a bad date stops the service or interactor before its first lookup. In all three web variants, showing the form again after an error can still read owner and pet details. This is why it matters whether a test starts at the form, the booking operation or the domain object. [How the variants prepare the form](../visit-use-case/#our-refactorings)

There is one deliberate behaviour change to keep in mind when comparing results. The original controller skips the date check for a missing date. All three refactorings reject a missing date. They also keep the description constraints on the form object. A caller that invokes a booking method directly must arrange that validation if it needs the same feedback as the receptionist. <sup><a href="#ref-1">[1]</a></sup>

## What the shared tests establish

Consider a different mistake: the date is fine, but the receptionist has selected another owner's pet. In the sample data, owner 1 has pet 1, Leo. Pet 2 belongs to owner 2. Our test submits owner 1 and pet 2 to each of the three implementations. <sup><a href="#ref-1">[1]</a></sup>

**Our tests · <a href="https://github.com/guendeti/spring-petclinic/blob/bdd7783bf9c778882b7ec77e0f0a2f402e20b247/src/test/java/org/springframework/samples/petclinic/visits/VisitBookingVariantsTests.java#L120-L124" target="_blank" rel="noopener noreferrer"><code>VisitBookingVariantsTests.java</code></a>**

```java
@ParameterizedTest
@ValueSource(strings = { "layered", "clean", "onion" })
void rejectsPetOfAnotherOwner(String name) {
    assertRejected(name, 1, 2, LocalDate.now().plusDays(1));
}
```

Each name runs the same case against a different implementation. Tomorrow is a valid date, so the mismatch between owner 1 and pet 2 is the detail this case is meant to test. The shared helper below checks the outcome.

**Our tests · <a href="https://github.com/guendeti/spring-petclinic/blob/bdd7783bf9c778882b7ec77e0f0a2f402e20b247/src/test/java/org/springframework/samples/petclinic/visits/VisitBookingVariantsTests.java#L87-L92" target="_blank" rel="noopener noreferrer"><code>VisitBookingVariantsTests.java</code></a>**

```java
private void assertRejected(String name, int ownerId, int petId, LocalDate date) {
    long before = allVisits();
    assertThatThrownBy(() -> variant(name).book(ownerId, petId, date, "Check-up"))
        .isInstanceOf(RuntimeException.class);
    assertThat(allVisits()).isEqualTo(before);
}
```

The helper counts visits before the call, expects a runtime exception, then checks the count again. For the wrong-pet case, this verifies rejection and an unchanged total. It accepts any `RuntimeException`, so the test alone cannot tell us exactly why the call failed. Separate controller tests check the HTTP form and the error shown for today's date. [Booking and controller test cases](../visit-use-case/#the-same-cases-for-every-variant)

There is a limit to what the passing tests tell us. The shared tests run inside test transactions. None of the three booking operations defines a transaction around the whole operation in production. In the Clean and Onion variants, the adapter looks up the owner again when saving. If the clinic needs a guarantee about two people changing the same record at once, that is a storage and transaction decision in its own right.

## How to choose for the pet clinic

- **The clinic adds a file import.** A layered service already offers one place for the form and the import to enforce the date rule. The importer must supply the `Visit` type the service expects. This can be a reasonable cost while both callers use the same data model. <sup><a href="#ref-2">[2]</a></sup>
- **The booking team wants to exercise its whole use case without Spring Data.** The Clean and Hexagonal implementation gives the team a small storage interface it can implement in memory. That buys a specific test: the same operation used by the form can run against known owner and pet data. The team must also maintain the real adapter and test its mapping. <sup><a href="#ref-3">[3]</a></sup> <sup><a href="#ref-4">[4]</a></sup>
- **More decisions depend on the owner and their pets.** The Onion version gives those rules a home in `PetOwner`. Tests can supply exactly the pets and date a rule needs. The cost is building that model from stored records and translating the result back. Clean Architecture also allows rules in domain entities. Either design can use this idea when the rules justify it. <sup><a href="#ref-3">[3]</a></sup> <sup><a href="#ref-5">[5]</a></sup>

## Trying the variants yourself

Follow the <a href="https://github.com/guendeti/spring-petclinic/blob/bdd7783bf9c778882b7ec77e0f0a2f402e20b247/README.md#visit-booking-demo" target="_blank" rel="noopener noreferrer">start instructions in our PetClinic fork</a>. With the application running on `http://localhost:8080` and using its default sample data, open one of the following paths. The Clean and Hexagonal chapters use the same route.

| Version | Path for Leo's booking form |
| --- | --- |
| Original | `/owners/1/pets/1/visits/new` |
| Layered | `/layered/owners/1/pets/1/visits/new` |
| Clean and Hexagonal | `/clean/owners/1/pets/1/visits/new` |
| Onion | `/onion/owners/1/pets/1/visits/new` |

For a visible comparison, enter tomorrow's date and a short description. A successful submission returns to the owner page. To follow a rejected request even when the browser prevents choosing today, run <a href="https://github.com/guendeti/spring-petclinic/blob/bdd7783bf9c778882b7ec77e0f0a2f402e20b247/src/test/java/org/springframework/samples/petclinic/visits/VisitVariantControllersTests.java" target="_blank" rel="noopener noreferrer"><code>VisitVariantControllersTests</code></a>. Its date-error case submits today directly to each variant. Then use the table above to locate the decision in the code.

## References

<a id="ref-1"></a>
**[1]** Spring Projects contributors, *Spring PetClinic*, commit `500158f732419217507c7656904b8e6aa1bcc0d6`, <a href="https://github.com/guendeti/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/java/org/springframework/samples/petclinic/owner/VisitController.java#L63-L111" target="_blank" rel="noopener noreferrer">visit form setup and submission</a>, <a href="https://github.com/guendeti/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/java/org/springframework/samples/petclinic/owner/Visit.java#L39-L45" target="_blank" rel="noopener noreferrer">date and description fields</a> and <a href="https://github.com/guendeti/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/resources/db/h2/data.sql#L36-L37" target="_blank" rel="noopener noreferrer">H2 sample pets</a>. Accessed 18 November 2026.

<a id="ref-2"></a>
**[2]** Martin Fowler, “[Presentation Domain Data Layering](https://martinfowler.com/bliki/PresentationDomainDataLayering.html),” 26 August 2015. Accessed 18 November 2026.

<a id="ref-3"></a>
**[3]** Robert C. Martin, “[The Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html),” 13 August 2012, sections “The Dependency Rule,” “Entities” and “Crossing boundaries.” Accessed 18 November 2026.

<a id="ref-4"></a>
**[4]** Alistair Cockburn, “[Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/),” 4 September 2005, sections “Intent” and “Motivation.” Accessed 18 November 2026.

<a id="ref-5"></a>
**[5]** Jeffrey Palermo, “[The Onion Architecture: Part 1](https://jeffreypalermo.com/2008/07/the-onion-architecture-part-1/),” 29 July 2008. Accessed 18 November 2026.

Return to [Onion Architecture](../onion-architecture/). Back to [What is software architecture?](../what-is-software-architecture/).
