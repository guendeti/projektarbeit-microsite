---
layout: ../../layouts/ChapterLayout.astro
title: 'Hexagonal Architecture / Ports and Adapters'
---

A receptionist at the pet clinic uses a web form to book a vaccination for tomorrow. How could a developer check the same booking rule without opening the form or starting a database? In our working copy of [Spring PetClinic](../what-is-software-architecture/#about-the-spring-petclinic-example), the form and a test can both ask the application to book a visit. **Hexagonal Architecture**, also called **Ports and Adapters**, explains how to keep this possible as the application grows. <sup><a href="#ref-1">[1]</a></sup>

## TL;DR

A **port** defines an interaction in terms the application understands. An **adapter** connects a particular caller or technology to that port. Our booking code offers one port for booking a visit and uses another to check ownership and record the visit. The test can use a different storage adapter and still run the booking rules used by the web form.

## Inside and outside

Start with the question **who asks whom to do something?** The receptionist starts a booking. The web controller reads the form and calls the application. This makes the controller a **driving** (or **primary**) adapter. On the other side, the application asks for stored information. The adapter that answers that request is **driven** (or **secondary**). Even when it sends information back, it is still on the driven side because the application started the interaction. <sup><a href="#ref-1">[1]</a></sup>

The hexagon gives us room to draw several interactions around one application. Its six sides leave the number of ports open. A port can be as simple as a callable operation. In our Java example, the booking core expresses its two ports as interfaces. <sup><a href="#ref-1">[1]</a></sup>

## The same code seen as ports and adapters

We use the same booking code as in the [Clean Architecture chapter](../clean-architecture/). The driving port, `BookVisitUseCase`, is the same interface that Clean calls the input port. `VisitStore` is the driven port here and the output port in Clean.

Start with the top row of the diagram. The web controller asks the application to book a visit, and the interactor uses the JPA adapter to store it. Now follow the bottom row. A test makes the same request, this time with an in-memory store.

<figure class="architecture-figure">
<div class="diagram-scroll" tabindex="0" role="region" aria-label="Architecture diagram. Scroll horizontally to see the complete figure.">
<img src="../../diagrams/hexagonal-ports.svg" alt="A hexagon contains the application. On the left, the web controller and a test drive the port BookVisitUseCase. On the right, a JPA adapter and an in-memory adapter implement the port VisitStore." style="max-width:100%;height:auto" />
</div>
<figcaption>Two ways to run the same booking in our working copy. Solid arrows show which port the callers use. Dashed arrows point from each storage adapter to the interface it implements.</figcaption>
</figure>

On the right, the arrows point back to `VisitStore` because both adapters implement that interface. During a booking, the interactor calls whichever adapter it was given.

The diagram covers submitting a booking. Opening the form or showing it again after an error also needs the owner and pet for display. The controller passes `OwnerRepository` to the shared `VisitFormModel` helper for that lookup. This part of the web adapter still depends on the repository. The [Visit use case](../visit-use-case/#our-refactorings) explains the choice.

## A second driving adapter, a test

To see how the test uses the lower path in the diagram, look at `setUp()`. It creates a fresh in-memory store with pet 7 registered to owner 1 and passes that store to the interactor. The test then calls the same `bookVisit` operation as the web controller.

<p class="code-source"><span><strong>BookVisitInteractorTests.java</strong><small>Our tests</small></span><a href="https://github.com/guendeti/spring-petclinic/blob/bdd7783bf9c778882b7ec77e0f0a2f402e20b247/src/test/java/org/springframework/samples/petclinic/visits/clean/BookVisitInteractorTests.java#L38-L49" target="_blank" rel="noopener noreferrer" aria-label="View BookVisitInteractorTests.java on GitHub (opens in a new tab)">View on GitHub</a></p>

```java
@BeforeEach
void setUp() {
    store = new InMemoryVisitStore();
    store.addPet(1, 7);
    bookVisit = new BookVisitInteractor(store);
}

@Test
void booksVisitForTomorrow() {
    bookVisit.bookVisit(1, 7, LocalDate.now().plusDays(1), "Vaccination");
    assertThat(store.visits).hasSize(1);
}
```

The test checks that the booking adds one entry. The <a href="https://github.com/guendeti/spring-petclinic/blob/bdd7783bf9c778882b7ec77e0f0a2f402e20b247/src/test/java/org/springframework/samples/petclinic/visits/clean/BookVisitInteractorTests.java#L51-L63" target="_blank" rel="noopener noreferrer">rejection tests</a> make one change at a time, either booking for today or using the wrong owner. In both cases the store stays empty. These tests cover the rules in the interactor. Form validation and the JPA mapping are checked separately in the [shared cases](../visit-use-case/#the-same-cases-for-every-variant).

## A second driven adapter, memory instead of a database

The <a href="https://github.com/guendeti/spring-petclinic/blob/bdd7783bf9c778882b7ec77e0f0a2f402e20b247/src/test/java/org/springframework/samples/petclinic/visits/clean/InMemoryVisitStore.java#L26-L46" target="_blank" rel="noopener noreferrer"><code>InMemoryVisitStore</code></a> uses the test data to answer the ownership check and keeps accepted visits in memory. The [JPA adapter](../clean-architecture/#how-the-adapters-carry-out-the-booking) provides the same two operations using the database. That lets the test run the booking rules in isolation, as in Cockburn's original example. <sup><a href="#ref-1">[1]</a></sup>

## Choosing ports by purpose

Suppose the clinic adds a file import. If the file contains upcoming visits, an import adapter could call the existing booking port for each row. Both the receptionist and the import job want to book a future visit. Now suppose the file contains **past visits** from a paper archive. Applying the booking rule would reject every historical date. One possible design is a separate operation for recording visit history, with rules the clinic defines for that task. This proposed feature illustrates when a new purpose justifies a new operation. Changing from a form to a file alone only calls for another adapter. <sup><a href="#ref-1">[1]</a></sup>

## Hexagonal and Clean Architecture

For this booking, the two views answer different questions about the same code. Clean Architecture helps explain why `VisitStore` belongs to the core even though the database code runs outside it. Hexagonal Architecture helps explain how a test can drive that core and supply a different store at the same time. Martin names Hexagonal Architecture as one of the approaches behind Clean Architecture. The [comparison chapter](../architecture-comparison/) looks at how these ideas relate to Onion Architecture as well. <sup><a href="#ref-1">[1]</a></sup> <sup><a href="#ref-2">[2]</a></sup>

## References

<a id="ref-1"></a>
**[1]** Alistair Cockburn, "[Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/)," alistair.cockburn.us, 4 September 2005, sections "Intent," "Motivation," "Nature of the Solution" and "Application Notes." Accessed 18 November 2026.

<a id="ref-2"></a>
**[2]** Robert C. Martin, "[The Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)," Clean Coder Blog, 13 August 2012, introduction and section "Crossing boundaries." Accessed 18 November 2026.
