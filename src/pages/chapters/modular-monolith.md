---
layout: ../../layouts/ChapterLayout.astro
title: 'Modular Monolith'
---

A modular monolith is an application that is deployed as a single unit and organised into modules. In [Spring PetClinic](../what-is-software-architecture/#about-the-spring-petclinic-example), the same application handles visit bookings and keeps track of owners. Suppose the clinic wants to send reminders before a visit. The reminder code needs a way to look up an owner's contact details. How much should it need to know about the code that manages owners? <sup><a href="#ref-1">[1]</a></sup>

## TL;DR

A module gives other parts of the application a clear way to use the work it does. If reminders can ask for contact details through a lookup, the team can change how those details are stored while keeping the lookup working as before. The modules still run together and ship in the same release.

## What makes a useful module boundary?

Consider two ways to build that reminder. The reminder code could read the owner's record and pick out the contact details itself. If the team later stores those details separately, it will also have to update the reminder code. Or the owner module could offer a lookup that returns just the details needed to send a reminder. Then the change to storage can stay inside the owner module as long as the lookup still gives callers the information they expect. This is **information hiding**. A module takes responsibility for a design decision that other parts of the application would otherwise have to understand. <sup><a href="#ref-1">[1]</a></sup>

The lookup is part of the owner module's **provided interface**, the operations it offers to other modules. From the reminder module's point of view, that same lookup is something it needs from another module, part of its **required interface**. In this example the two modules could communicate through an ordinary Java method call inside one application. <sup><a href="#ref-2">[2]</a></sup>

## Where the boundaries fall in Spring PetClinic

In the original Spring PetClinic, recording a visit involves an owner and a pet. Looking up a vet is a separate task. You can see that distinction in the Java code. The `owner` package handles owners, pets and visits, while `vet` handles the vet directory. Neither package imports classes from the other. Both use the shared `Person` class in `model`. <sup><a href="#ref-3">[3]</a></sup>

Read each arrow in the diagram as “uses code from”. All four packages run in the same application.

<figure class="architecture-figure">
<div class="diagram-scroll" tabindex="0" role="region" aria-label="Architecture diagram. Scroll horizontally to see the complete figure.">
<img src="../../diagrams/modular-structure.svg" alt="Four packages in the original Spring PetClinic. Arrows from owner and vet point to model. There are no imports between owner and vet, or between system and the other three packages." style="max-width:100%;height:auto" />
</div>
<figcaption>Imports between the four packages directly below the main application package. Each arrow points to the package whose code is used. Own diagram based on the original Spring PetClinic code. <sup><a href="#ref-3">[3]</a></sup></figcaption>
</figure>

The diagram tells us which dependencies exist today. To understand which dependencies a developer could add tomorrow, look at what the packages make public. For example, Java keeps the package-private `VisitController` inside `owner`, but `OwnerRepository` is public. Another package can use that repository to load and save owners. A reminder that only needs a contact lookup would have access to much more than it needs. <sup><a href="#ref-3">[3]</a></sup>

## Which boundaries can a test check?

In our local PetClinic refactoring, we added a test using **Spring Modulith**, a library that can check dependencies between application modules. By default it treats each package directly below the main application package as a module. The diagram shows the four packages in the original application. The test below runs against our working copy, which has a fifth package, `visits`, for the booking examples on this site. <sup><a href="#ref-2">[2]</a></sup>

**Our tests · <a href="https://github.com/guendeti/spring-petclinic/blob/bdd7783bf9c778882b7ec77e0f0a2f402e20b247/src/test/java/org/springframework/samples/petclinic/ModularityTests.java#L27-L42" target="_blank" rel="noopener noreferrer"><code>ModularityTests.java</code></a>**

```java
class ModularityTests {

    private final ApplicationModules modules = ApplicationModules.of(PetClinicApplication.class);

    @Test
    void detectsTheExpectedModules() {
        assertThat(modules.stream().map(ApplicationModule::getIdentifier).map(Object::toString)).contains("owner",
                "vet", "model", "system", "visits");
    }

    @Test
    void verifiesModularStructure() {
        modules.verify();
    }

}
```

Both tests passed in our local working copy. In the first test, `contains(...)` requires all five listed module names and allows additional modules. In the second test, `verify()` checks dependencies between modules. For example, if `owner` started using `vet` and `vet` also used `owner`, the two modules would form a cycle and `verify()` would report it. The check also catches access to another module's internal packages under the default rules. <sup><a href="#ref-2">[2]</a></sup>

Now consider a dependency that those rules allow. In our working copy, the booking code in `visits` uses `OwnerRepository` directly. The repository is a public type in the base package of the owner module, which Spring Modulith treats as part of its API. The test therefore has no reason to reject that access on visibility grounds. Whether booking code should be able to save an entire owner is a question for the team. <sup><a href="#ref-2">[2]</a></sup> <sup><a href="#ref-3">[3]</a></sup>

## What should the owner module offer?

For the reminder we imagined earlier, the team could offer the contact lookup as the public operation and move the repository into an internal package. Java might still require the repository to be public so that code elsewhere in the same module can use it. Spring Modulith understands the wider module boundary and could flag a caller in `visits` that still used the repository directly. That is a possible redesign. The working copy used for the test keeps the repository in `owner`. <sup><a href="#ref-2">[2]</a></sup>

A narrower interface takes work. The team needs to find out what existing callers use and give them a way to do their jobs before moving the repository. In return, those callers can keep using the same operations when storage changes. The reminder example gives the team a practical way to decide what belongs in the interface. Which operations does another feature actually need? <sup><a href="#ref-1">[1]</a></sup>

## When one deployment still fits

A modular monolith suits the pet clinic if the team wants to change how it manages owners without having to revisit the reminder code each time, and a shared release still works well. If bookings get busy, starting a second instance still starts the vet directory too. A module boundary helps the team control dependencies in the code. Scaling or deploying booking on its own would require a separate deployment boundary, which the [Microservices](../microservices/) chapter explores. <sup><a href="#ref-4">[4]</a></sup>

## References

<a id="ref-1"></a>
**[1]** Paul Clements, Felix Bachmann, Len Bass, David Garlan, James Ivers, Reed Little, Paulo Merson, Robert Nord and Judith Stafford, *Documenting Software Architectures: Views and Beyond*, 2nd ed., Addison-Wesley Professional, 2010, ISBN 978-0-321-55268-6. [Publisher-hosted chapter excerpt](https://ptgmedia.pearsoncmg.com/images/9780321552686/samplepages/0321552687.pdf#page=54), prologue, section P.4.1, p. 30. Accessed 18 November 2026.

<a id="ref-2"></a>
**[2]** Spring Modulith team, *Spring Modulith Reference Documentation*, version 2.1.1, "[Fundamentals](https://github.com/spring-projects/spring-modulith/blob/2.1.1/src/docs/antora/modules/ROOT/pages/fundamentals.adoc)" (provided and required interfaces, package detection and internal packages) and "[Verifying Application Module Structure](https://github.com/spring-projects/spring-modulith/blob/2.1.1/src/docs/antora/modules/ROOT/pages/verification.adoc)" (cycles and access to module internals). Accessed 17 November 2026.

<a id="ref-3"></a>
**[3]** Spring Projects contributors, *Spring PetClinic*, commit `500158f732419217507c7656904b8e6aa1bcc0d6`. <a href="https://github.com/guendeti/spring-petclinic/tree/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/java/org/springframework/samples/petclinic" target="_blank" rel="noopener noreferrer">Application packages</a>, <a href="https://github.com/guendeti/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/java/org/springframework/samples/petclinic/owner/Owner.java#L50" target="_blank" rel="noopener noreferrer">Owner</a>, <a href="https://github.com/guendeti/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/java/org/springframework/samples/petclinic/vet/Vet.java#L45" target="_blank" rel="noopener noreferrer">Vet</a>, <a href="https://github.com/guendeti/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/java/org/springframework/samples/petclinic/owner/VisitController.java#L43" target="_blank" rel="noopener noreferrer">VisitController</a> and <a href="https://github.com/guendeti/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/java/org/springframework/samples/petclinic/owner/OwnerRepository.java#L36" target="_blank" rel="noopener noreferrer">OwnerRepository</a>. Accessed 17 November 2026.

<a id="ref-4"></a>
**[4]** James Lewis and Martin Fowler, "[Microservices](https://martinfowler.com/articles/microservices.html)," 25 March 2014, introduction and "Componentization via Services." Accessed 17 November 2026.

Return to [Monolith](../monolith/). Continue with [Microservices](../microservices/).
