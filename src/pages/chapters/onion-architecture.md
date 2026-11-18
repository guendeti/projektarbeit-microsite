---
layout: ../../layouts/ChapterLayout.astro
title: 'Onion Architecture'
---

Suppose a receptionist at the pet clinic wants to book a vaccination for tomorrow. The date is valid, but the selected pet belongs to another owner. Which part of the application should refuse the booking? **Onion Architecture** puts the domain model at the centre. In our version of [Spring PetClinic](../what-is-software-architecture/#about-the-spring-petclinic-example), an owner object answers that question using the pet IDs it already holds. The same decision can be tested without loading a web form or connecting to a database. <sup><a href="#ref-1">[1]</a></sup>

## TL;DR

The application service loads a `PetOwner` and asks it to book a visit. If the date and pet are valid, the domain object returns a `NewVisit`. The service then asks a repository to store it. The booking code defines the repository interface, and the infrastructure supplies its implementation. <sup><a href="#ref-1">[1]</a></sup>

## Reading the rings

Start in the centre of the diagram. The **domain model** represents the business concepts and rules. The application ring coordinates a task that uses those rules. The outer ring contains the web interface, the code that talks to the database, and the tests. The arrows describe dependencies in the source code. Code in an outer ring can refer directly to any ring further in. <sup><a href="#ref-1">[1]</a></sup>

<figure class="architecture-figure">
<div class="diagram-scroll" tabindex="0" role="region" aria-label="Architecture diagram. Scroll horizontally to see the complete figure.">
<img src="../../diagrams/onion-architecture.svg" alt="Three rings. In the centre the domain with PetOwner, NewVisit and the PetOwnerRepository interface. Around it the application ring with VisitBookingService. In the outer ring the user interface with OnionVisitController, the infrastructure with JpaPetOwnerRepository and the tests. Arrows point toward the centre." style="max-width:100%;height:auto" />
</div>
<figcaption>Selected source code dependencies in our booking variant. The controller uses the application service. The repository implementation and the domain test can depend directly on types in the centre.</figcaption>
</figure>

The original Spring PetClinic checks the date in its web controller and saves the updated owner through `OwnerRepository`. <sup><a href="#ref-2">[2]</a></sup> In our Onion variant, `PetOwnerRepository` sits beside `PetOwner` in the `domain` package. In Palermo's description, repository interfaces typically sit in the ring around the domain model. <sup><a href="#ref-1">[1]</a></sup> `PetOwnerRepository` describes what booking needs, while the existing Spring Data `OwnerRepository` gives the outer implementation access to stored owners.

## How the domain decides whether to accept a visit

For booking, an owner needs an ID and the IDs of their pets. Details such as a postal address can stay in the clinic's existing owner record. Follow the two checks in `bookVisit` to see what that smaller model can decide.

**Our refactoring · <a href="https://github.com/guendeti/spring-petclinic/blob/bdd7783bf9c778882b7ec77e0f0a2f402e20b247/src/main/java/org/springframework/samples/petclinic/visits/onion/domain/PetOwner.java#L21-L42" target="_blank" rel="noopener noreferrer"><code>PetOwner.java</code></a>**

```java
public class PetOwner {

    private final int ownerId;

    private final Set<Integer> petIds;

    public PetOwner(int ownerId, Set<Integer> petIds) {
        this.ownerId = ownerId;
        this.petIds = Set.copyOf(petIds);
    }

    public NewVisit bookVisit(int petId, LocalDate date, String description, LocalDate today) {
        if (date == null || !date.isAfter(today)) {
            throw new InvalidVisitDateException(date);
        }
        if (!petIds.contains(petId)) {
            throw new IllegalArgumentException("Pet with id " + petId + " not found for owner with id " + ownerId);
        }
        return new NewVisit(ownerId, petId, date, description);
    }

}
```

First, the date must be present and later than `today`. Then the pet ID must be in this owner's set. Either check can stop the booking. If both pass, the method returns a `NewVisit` with the details that should be saved. At this point the database has received no write. Passing in `today` also lets the same method run against a fixed date in a test.

The description passes through to `NewVisit`. In our working copy, the web form checks that it contains text and is at most 255 characters long. A caller using the domain object directly gets the date and ownership checks. It would need to arrange description validation separately.

## How the service loads and saves

The domain package defines two repository operations. `findOwner` can return an empty result for an unknown ID. `add` takes the accepted visit, including its owner and pet IDs.

**Our refactoring · <a href="https://github.com/guendeti/spring-petclinic/blob/bdd7783bf9c778882b7ec77e0f0a2f402e20b247/src/main/java/org/springframework/samples/petclinic/visits/onion/domain/PetOwnerRepository.java#L20-L26" target="_blank" rel="noopener noreferrer"><code>PetOwnerRepository.java</code></a>**

```java
public interface PetOwnerRepository {

    Optional<PetOwner> findOwner(int ownerId);

    void add(NewVisit visit);

}
```

The application service uses that interface to complete one booking.

**Our refactoring · <a href="https://github.com/guendeti/spring-petclinic/blob/bdd7783bf9c778882b7ec77e0f0a2f402e20b247/src/main/java/org/springframework/samples/petclinic/visits/onion/application/VisitBookingService.java#L32-L37" target="_blank" rel="noopener noreferrer"><code>VisitBookingService.java</code></a>**

```java
public void bookVisit(int ownerId, int petId, LocalDate date, String description) {
    PetOwner owner = owners.findOwner(ownerId)
        .orElseThrow(() -> new IllegalArgumentException("Owner not found with id: " + ownerId));
    NewVisit visit = owner.bookVisit(petId, date, description, LocalDate.now());
    owners.add(visit);
}
```

The order matters. An unknown owner stops the operation at `findOwner`. For a known owner, the service supplies today's date and lets `PetOwner` check the visit. An exception from either domain check prevents `owners.add(visit)` from running. This version therefore reads the owner even for an invalid date. That is a consequence of how we wrote this service.

## Where the database comes in

When Spring starts the application, `OnionVisitConfiguration` supplies a `JpaPetOwnerRepository` to the service. At runtime the call to `findOwner` reaches that implementation. In the source code it is the outer class that names and implements the inner interface. Palermo's practical example uses the same distinction between a dependency in the code and the object supplied at runtime. <sup><a href="#ref-1">[1]</a></sup>

**Our refactoring · <a href="https://github.com/guendeti/spring-petclinic/blob/bdd7783bf9c778882b7ec77e0f0a2f402e20b247/src/main/java/org/springframework/samples/petclinic/visits/onion/infrastructure/JpaPetOwnerRepository.java#L37-L41" target="_blank" rel="noopener noreferrer"><code>JpaPetOwnerRepository.java</code></a>**

```java
@Override
public Optional<PetOwner> findOwner(int ownerId) {
    return owners.findById(ownerId)
        .map(owner -> new PetOwner(ownerId, owner.getPets().stream().map(Pet::getId).collect(Collectors.toSet())));
}
```

The adapter asks Spring Data for an owner and copies the pet IDs into a set. If an owner was found, the domain gets a `PetOwner` with the information available at lookup time. When `add` runs, the adapter looks up the stored owner again, builds a JPA `Visit`, attaches it to the selected pet and saves the owner. The two repository operations have no shared transaction in this variant. The domain test below can tell us which bookings the model accepts. Checking that a visit was actually saved requires exercising the mapping against a database.

The diagram follows the booking operation. To open the form or show it again after an error, `OnionVisitController` also passes the Spring Data repository to the shared form helper. The [Visit use case](../visit-use-case/#our-refactorings) explains that separate read path.

## Testing the centre on its own

The test gives owner 1 a single pet, number 7, and fixes today at 2 November 2026. Those values are all the setup the model needs.

**Our tests · <a href="https://github.com/guendeti/spring-petclinic/blob/bdd7783bf9c778882b7ec77e0f0a2f402e20b247/src/test/java/org/springframework/samples/petclinic/visits/onion/domain/PetOwnerTests.java#L28-L48" target="_blank" rel="noopener noreferrer"><code>PetOwnerTests.java</code></a>**

```java
private static final LocalDate TODAY = LocalDate.of(2026, 11, 2);

private final PetOwner owner = new PetOwner(1, Set.of(7));

@Test
void acceptsVisitForTomorrow() {
    NewVisit visit = owner.bookVisit(7, TODAY.plusDays(1), "Vaccination", TODAY);
    assertThat(visit).isEqualTo(new NewVisit(1, 7, TODAY.plusDays(1), "Vaccination"));
}

@Test
void rejectsVisitForToday() {
    assertThatThrownBy(() -> owner.bookVisit(7, TODAY, "Vaccination", TODAY))
        .isInstanceOf(InvalidVisitDateException.class);
}

@Test
void rejectsPetOfAnotherOwner() {
    assertThatThrownBy(() -> owner.bookVisit(8, TODAY.plusDays(1), "Vaccination", TODAY))
        .isInstanceOf(IllegalArgumentException.class);
}
```

The first test checks the complete result, including the date and description. Moving the visit to today triggers the date error. Keeping tomorrow's date and changing only the pet to 8 triggers the ownership error. None of these cases needs a repository, even an in-memory one, because the test starts with an owner whose pets are already known.

## How this differs from our Clean and Hexagonal examples

Both the [Clean variant](../clean-architecture/) and this one keep booking rules independent of Spring and JPA. In our Clean implementation, the interactor checks the date first and asks a store whether the owner has the pet. Here the service first loads an owner, then the owner decides from its own data. Clean Architecture also allows rules in domain entities. The different order of checks and the choice to pass in today's date belong to our two implementations. <sup><a href="#ref-1">[1]</a></sup> <sup><a href="#ref-3">[3]</a></sup>

The [Hexagonal chapter](../hexagonal-architecture/) looks at how callers and storage adapters can be replaced. Its test goes through the booking use case with an in-memory store. Here the test exercises the domain decision directly. Both are useful: one checks an operation across a port, the other isolates the rules on a single object.

## When the extra model earns its place

Suppose the clinic changes how future appointments are stored. If the two repository operations can still deliver the same behaviour, the date and ownership checks can stay in `PetOwner`. The cost is visible in the adapter: someone must maintain the translation from a stored owner to a booking owner and from an accepted visit to a stored visit. For a small form with stable rules, the [layered service](../layered-architecture/) takes fewer steps. A separate domain model becomes more useful as the clinic gains rules it wants to change and test together. <sup><a href="#ref-1">[1]</a></sup>

The [architecture comparison](../architecture-comparison/) follows the same booking across all the variants.

## References

<a id="ref-1"></a>
**[1]** Jeffrey Palermo, "[The Onion Architecture: Part 1](https://jeffreypalermo.com/2008/07/the-onion-architecture-part-1/)," 29 July 2008, and “[The Onion Architecture: Part 2](https://jeffreypalermo.com/2008/07/the-onion-architecture-part-2/),” 30 July 2008, practical example of repository interfaces and runtime wiring. Accessed 18 November 2026.

<a id="ref-2"></a>
**[2]** Spring Projects contributors, *Spring PetClinic*, commit `500158f732419217507c7656904b8e6aa1bcc0d6`, <a href="https://github.com/guendeti/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/java/org/springframework/samples/petclinic/owner/VisitController.java#L95-L109" target="_blank" rel="noopener noreferrer">original visit form handler</a>. Accessed 18 November 2026.

<a id="ref-3"></a>
**[3]** Robert C. Martin, "[The Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)," Clean Coder Blog, 13 August 2012, section "Entities." Accessed 18 November 2026.

Return to [Hexagonal Architecture / Ports and Adapters](../hexagonal-architecture/). Continue with [Architecture comparison](../architecture-comparison/).
