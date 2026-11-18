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

We use the booking implementation from our `visits.clean` package. The [Clean Architecture chapter](../clean-architecture/) follows dependencies into the core. Here the question is which parts can take each other's place on either side of that core.

| Port defined by the booking core | What happens at that boundary? | Adapters in our working copy |
| --- | --- | --- |
| `BookVisitUseCase` (driving) | A caller supplies the owner ID, pet ID, date and description. `BookVisitInteractor` implements the operation. | `CleanVisitController` calls it for a receptionist. `BookVisitInteractorTests` calls it from a test. |
| `VisitStore` (driven) | The interactor asks whether the pet belongs to the owner. If the booking checks pass, it asks the store to add the visit. | `JpaVisitStore` implements these operations using the database. `InMemoryVisitStore` implements them in memory for the tests. |

Follow the top pair of adapters in the diagram for a web booking and the bottom pair for a test. On the right, the arrows point back to `VisitStore` because the adapter classes implement that interface. At runtime, the interactor calls the storage adapter supplied to it.

<figure class="architecture-figure">
<div class="diagram-scroll" tabindex="0" role="region" aria-label="Architecture diagram. Scroll horizontally to see the complete figure.">
<img src="../../diagrams/hexagonal-ports.svg" alt="A hexagon contains the application. On the left, the web controller and a test drive the port BookVisitUseCase. On the right, a JPA adapter and an in-memory adapter implement the port VisitStore." style="max-width:100%;height:auto" />
</div>
<figcaption>Two ways to run the same booking in our working copy. Solid arrows show which port the callers use. Dashed arrows point from each storage adapter to the interface it implements.</figcaption>
</figure>

The diagram covers submitting a booking. Opening the form or showing it again after an error also needs the owner and pet for display. The controller passes `OwnerRepository` to the shared `VisitFormModel` helper for that lookup. This part of the web adapter still depends on the repository. The [Visit use case](../visit-use-case/#our-refactorings) explains the choice.

## A second driving adapter, a test

In `setUp`, each test gets a fresh store with pet 7 registered to owner 1. Passing that store to the interactor selects the adapter for this run. Read the three cases below as changes to a single booking request.

**Our addition · `BookVisitInteractorTests.java`, lines 39–64.** Local source `src/test/java/org/springframework/samples/petclinic/visits/clean/BookVisitInteractorTests.java`.

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

@Test
void rejectsVisitForToday() {
    assertThatThrownBy(() -> bookVisit.bookVisit(1, 7, LocalDate.now(), "Vaccination"))
        .isInstanceOf(InvalidVisitDateException.class);
    assertThat(store.visits).isEmpty();
}

@Test
void rejectsPetOfAnotherOwner() {
    assertThatThrownBy(() -> bookVisit.bookVisit(2, 7, LocalDate.now().plusDays(1), "Vaccination"))
        .isInstanceOf(IllegalArgumentException.class);
    assertThat(store.visits).isEmpty();
}
```

Booking a vaccination for tomorrow adds one entry. Changing just the date to today raises a date error. Keeping tomorrow's date but changing the owner to 2 raises an ownership error. In both rejected cases the list stays empty. That last check matters: the test would catch a booking recorded before the error was reported.

These calls cover the rules in the interactor. A blank description is checked on the web form, so exercising the input port directly does not test that validation. Likewise, the successful test checks the number of entries. A test of the JPA adapter would still be needed to verify how the visit fields are stored in the database.

## A second driven adapter, memory instead of a database

The test can inspect the result because its storage adapter keeps a small map and a list. Only two methods below belong to the port. `addPet` is a helper for setting up the test data.

**Our addition · `InMemoryVisitStore.java`, lines 30–50.** Local source `src/test/java/org/springframework/samples/petclinic/visits/clean/InMemoryVisitStore.java`.

```java
class InMemoryVisitStore implements VisitStore {

    private final Map<Integer, Integer> ownerOfPet = new HashMap<>();

    final List<String> visits = new ArrayList<>();

    void addPet(int ownerId, int petId) {
        ownerOfPet.put(petId, ownerId);
    }

    @Override
    public boolean petBelongsToOwner(int ownerId, int petId) {
        return Integer.valueOf(ownerId).equals(ownerOfPet.get(petId));
    }

    @Override
    public void addVisit(int ownerId, int petId, LocalDate date, String description) {
        visits.add(petId + " " + date + " " + description);
    }

}
```

The map uses the pet ID as its key. After `addPet(1, 7)`, looking up pet 7 gives owner 1. Asking about owner 2 therefore returns `false`, and the interactor decides to reject the booking. For an accepted visit, the adapter adds a string to the list. That is enough for the assertions above. In the running web application, the [JPA adapter](../clean-architecture/#how-the-adapters-carry-out-the-booking) uses the same port to load the owner, attach a visit to the pet and save the owner. Using an in-memory adapter to exercise the application in isolation is one of Cockburn's original examples. <sup><a href="#ref-1">[1]</a></sup>

## Choosing ports by purpose

Suppose the clinic adds a file import. If the file contains upcoming visits, an import adapter could call the existing booking port for each row. Both the receptionist and the import job want to book a future visit. Now suppose the file contains **past visits** from a paper archive. Applying the booking rule would reject every historical date. One possible design is a separate operation for recording visit history, with rules the clinic defines for that task. This proposed feature illustrates when a new purpose justifies a new operation. Changing from a form to a file alone only calls for another adapter. <sup><a href="#ref-1">[1]</a></sup>

## Hexagonal and Clean Architecture

For this booking, the two views answer different questions about the same code. Clean Architecture helps explain why `VisitStore` belongs to the core even though the database code runs outside it. Hexagonal Architecture helps explain how a test can drive that core and supply a different store at the same time. Martin names Hexagonal Architecture as one of the approaches behind Clean Architecture. The [comparison chapter](../architecture-comparison/) looks at how these ideas relate to Onion Architecture as well. <sup><a href="#ref-1">[1]</a></sup> <sup><a href="#ref-2">[2]</a></sup>

## References

<a id="ref-1"></a>
**[1]** Alistair Cockburn, "[Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/)," alistair.cockburn.us, 4 September 2005, sections "Intent," "Motivation," "Nature of the Solution" and "Application Notes." Accessed 18 November 2026.

<a id="ref-2"></a>
**[2]** Robert C. Martin, "[The Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)," Clean Coder Blog, 13 August 2012, introduction and section "Crossing boundaries." Accessed 18 November 2026.

Return to [Clean Architecture](../clean-architecture/). Continue with [Onion Architecture](../onion-architecture/).
