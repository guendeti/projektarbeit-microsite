---
layout: ../../layouts/ChapterLayout.astro
title: 'Clean Architecture'
---

Suppose a receptionist at the pet clinic tries to book a visit for today. When the form supplies a date, the original [Spring PetClinic](../what-is-software-architecture/#about-the-spring-petclinic-example) controller rejects today and earlier dates. A web form, a file import and an automated test could all ask the same question: can this visit be booked? Clean Architecture puts that decision in a use case that can run independently of the web framework and the database. <sup><a href="#ref-1">[1]</a></sup>

## TL;DR

The booking code defines the storage operations it needs. A database adapter implements them. During a booking, the use case calls the adapter through that interface. A test can supply an in-memory store through the same interface and exercise the same rules.

## The Dependency Rule

Read the diagram from the centre outward. **Entities** hold business rules that can apply across applications. **Use cases** carry out tasks in a particular application, such as booking a visit. **Interface adapters** translate between the use case and a particular way of entering, displaying or storing data. **Frameworks and drivers** include the web framework, the database and the code that connects these tools to the application. <sup><a href="#ref-1">[1]</a></sup>

<figure class="architecture-figure">
<div class="diagram-scroll" tabindex="0" role="region" aria-label="Clean Architecture layers and inward source dependencies. Scroll horizontally to see the complete figure.">
<img src="../../diagrams/clean-architecture-layers.svg" alt="Nested areas from outside to inside. Frameworks and drivers surround interface adapters, use cases and entities. Source dependency arrows point inward toward business rules." style="max-width:100%;height:auto" />
</div>
<figcaption>The responsibility areas of Clean Architecture. Arrows show the permitted direction of source code dependencies. Own diagram based on the original description. <sup><a href="#ref-1">[1]</a></sup></figcaption>
</figure>

The arrows show which code may refer to which types. Across a boundary, source code dependencies point inward. For example, a controller may refer to a booking interface defined in the core. If the core accepted Spring MVC's form-validation result, it would acquire a dependency back on the web framework. The number of circles can vary. <sup><a href="#ref-1">[1]</a></sup>

Martin uses *Entities* for general business rules. In JPA, an entity is an object mapped to stored data. In our example, the booking rules live in the use case, while the existing JPA entities stay outside the core. <sup><a href="#ref-1">[1]</a></sup> <sup><a href="#ref-2">[2]</a></sup>

## Where the boundary falls in Spring PetClinic

In the official application, the controller checks the date and saves an updated owner. <sup><a href="#ref-2">[2]</a></sup> In our [layered version](../layered-architecture/), the controller delegates booking to a service, but that service still accepts a JPA-mapped `Visit` and calls `OwnerRepository`. Our Clean refactoring changes what the booking code needs to know about storage. It lives in the same application under `visits.clean`.

Our Clean version still saves the visit through a JPA adapter. Let's follow that call, then look at which types the booking code actually names.

<link rel="stylesheet" href="../../interactions/clean-visit.css">
<section class="clean-visit" aria-labelledby="clean-visit-title" data-view="runtime" hidden>
  <h3 id="clean-visit-title">One booking, two views</h3>
  <p>Leo's visit is booked for tomorrow. Follow the call that saves the visit, then compare it with what each class needs to know in the source code.</p>
  <div class="clean-visit-controls" role="group" aria-label="Diagram view">
    <button type="button" data-show-view="runtime" aria-pressed="true">Runtime call</button>
    <button type="button" data-show-view="dependency" aria-pressed="false">Source dependencies</button>
  </div>
  <div class="clean-visit-graph" aria-hidden="true">
    <div class="clean-visit-core">
      <span class="clean-visit-region">Booking core</span>
      <div class="clean-visit-core-flow">
        <code class="clean-visit-node">BookVisitInteractor</code>
        <span class="clean-visit-edge"><span data-core-relation>calls through</span></span>
        <code class="clean-visit-node">VisitStore</code>
      </div>
    </div>
    <span class="clean-visit-edge clean-visit-crossing"><span data-boundary-relation>dispatches to</span></span>
    <div class="clean-visit-adapter">
      <span class="clean-visit-region">Persistence adapter</span>
      <code class="clean-visit-node">JpaVisitStore</code>
    </div>
  </div>
  <div class="clean-visit-evidence">
    <p data-evidence="runtime">The interactor calls <a href="https://github.com/guendeti/spring-petclinic/blob/bdd7783bf9c778882b7ec77e0f0a2f402e20b247/src/main/java/org/springframework/samples/petclinic/visits/clean/core/BookVisitInteractor.java#L36" target="_blank" rel="noopener noreferrer"><code>visitStore.addVisit(ownerId, petId, date, description);</code></a> through the interface. Java runs the JPA adapter's implementation.</p>
    <div data-evidence="dependency" hidden>
      <p>The interactor names <code>VisitStore</code>. The JPA adapter implements that interface, so its source code depends on the core.</p>
      <ul>
        <li><a href="https://github.com/guendeti/spring-petclinic/blob/bdd7783bf9c778882b7ec77e0f0a2f402e20b247/src/main/java/org/springframework/samples/petclinic/visits/clean/core/BookVisitInteractor.java#L22" target="_blank" rel="noopener noreferrer"><code>private final VisitStore visitStore;</code></a></li>
        <li><a href="https://github.com/guendeti/spring-petclinic/blob/bdd7783bf9c778882b7ec77e0f0a2f402e20b247/src/main/java/org/springframework/samples/petclinic/visits/clean/persistence/JpaVisitStore.java#L25" target="_blank" rel="noopener noreferrer"><code>public class JpaVisitStore implements VisitStore</code></a></li>
      </ul>
    </div>
  </div>
</section>
<script type="module" src="../../interactions/clean-visit.js"></script>

<figure class="architecture-figure" id="clean-visit-fallback">
<div class="diagram-scroll" tabindex="0" role="region" aria-label="Architecture diagram. Scroll horizontally to see the complete figure.">
<img src="../../diagrams/clean-dependencies.svg" alt="CleanVisitController uses the input port BookVisitUseCase. BookVisitInteractor implements it and uses the output port VisitStore. JpaVisitStore implements VisitStore and uses OwnerRepository and the JPA entities. All dependencies that cross the core boundary point into the core." style="max-width:100%;height:auto" />
</div>
<figcaption>Source code dependencies in our Clean variant. Every arrow that crosses the boundary of the core points into it.</figcaption>
</figure>

The use case calls out to the persistence adapter at runtime. In the source code, the adapter depends on the core because it implements the interface defined there. This is **dependency inversion**. Martin illustrates the same idea with a presenter that receives use case results. Here it lets the core call storage through an interface it owns. <sup><a href="#ref-1">[1]</a></sup>

## The two interfaces of the core

The **input port**, <a href="https://github.com/guendeti/spring-petclinic/blob/bdd7783bf9c778882b7ec77e0f0a2f402e20b247/src/main/java/org/springframework/samples/petclinic/visits/clean/core/BookVisitUseCase.java#L20-L24" target="_blank" rel="noopener noreferrer"><code>BookVisitUseCase</code></a>, defines the booking operation a caller can use. The form supplies an owner ID, a pet ID, a date and a description. An import job could supply the same values.

The **output port** in our example describes what the use case needs from storage. Read the two methods as a question and an action. The first asks whether this owner has this pet. The second records a visit once the checks pass.

**Our refactoring · <a href="https://github.com/guendeti/spring-petclinic/blob/bdd7783bf9c778882b7ec77e0f0a2f402e20b247/src/main/java/org/springframework/samples/petclinic/visits/clean/core/VisitStore.java#L20-L26" target="_blank" rel="noopener noreferrer"><code>VisitStore.java</code></a>**

```java
public interface VisitStore {

    boolean petBelongsToOwner(int ownerId, int petId);

    void addVisit(int ownerId, int petId, LocalDate date, String description);

}
```

When the use case asks whether the pet belongs to the owner, it receives a boolean. The JPA adapter loads the owner to answer that question. The `Owner` object stays inside the adapter.

## Following one booking through the use case

An **interactor** is the class that carries out a use case. In the code below, follow what happens first for today's date, then for tomorrow's.

**Our refactoring · <a href="https://github.com/guendeti/spring-petclinic/blob/bdd7783bf9c778882b7ec77e0f0a2f402e20b247/src/main/java/org/springframework/samples/petclinic/visits/clean/core/BookVisitInteractor.java#L20-L39" target="_blank" rel="noopener noreferrer"><code>BookVisitInteractor.java</code></a>**

```java
public class BookVisitInteractor implements BookVisitUseCase {

    private final VisitStore visitStore;

    public BookVisitInteractor(VisitStore visitStore) {
        this.visitStore = visitStore;
    }

    @Override
    public void bookVisit(int ownerId, int petId, LocalDate date, String description) {
        if (date == null || !date.isAfter(LocalDate.now())) {
            throw new InvalidVisitDateException(date);
        }
        if (!visitStore.petBelongsToOwner(ownerId, petId)) {
            throw new IllegalArgumentException("Pet with id " + petId + " not found for owner with id " + ownerId);
        }
        visitStore.addVisit(ownerId, petId, date, description);
    }

}
```

For today, a past date or a missing date, the interactor throws `InvalidVisitDateException` before calling `VisitStore`. The web controller still loads the owner and pet when it shows the form again. For tomorrow, the interactor asks the store whether the selected pet belongs to the owner. Only a positive answer reaches `addVisit`. As in our layered version, rejecting a missing date is a deliberate change: the original controller skips its date check when the date is missing. <sup><a href="#ref-2">[2]</a></sup>

The description follows a different path. The web adapter checks that it contains text and is at most 255 characters long. The interactor passes it to the store. A caller using the input port directly gets the date and ownership checks, but must arrange description validation if it needs the same feedback as the form.

## How the adapters carry out the booking

`CleanVisitController` receives a `VisitForm` and passes its date and description, together with the IDs from the URL, to the input port. If the interactor rejects the date, the controller attaches an error to the date field and shows the form again. A successful call returns normally, so the controller can redirect to the owner's page with a confirmation. Opening or redisplaying the form takes a separate path: the controller passes `OwnerRepository` to the shared form helper to load the owner and pet. The [Visit use case](../visit-use-case/#our-refactorings) explains this choice across the variants.

On the storage side, <a href="https://github.com/guendeti/spring-petclinic/blob/bdd7783bf9c778882b7ec77e0f0a2f402e20b247/src/main/java/org/springframework/samples/petclinic/visits/clean/persistence/JpaVisitStore.java#L33-L46" target="_blank" rel="noopener noreferrer"><code>JpaVisitStore</code></a> implements both operations. For the ownership check it loads the owner and looks for the pet. To save, it loads the owner again, creates a JPA `Visit` from the values supplied by the core and saves the updated owner. That second lookup is a cost of this implementation. The check and save run without a shared transaction, so ownership can change between them.

The configuration below makes the choice of store explicit. Spring supplies the repository. The configuration wraps it in a `JpaVisitStore` and gives that adapter to the interactor.

**Our refactoring · <a href="https://github.com/guendeti/spring-petclinic/blob/bdd7783bf9c778882b7ec77e0f0a2f402e20b247/src/main/java/org/springframework/samples/petclinic/visits/clean/config/CleanVisitConfiguration.java#L28-L31" target="_blank" rel="noopener noreferrer"><code>CleanVisitConfiguration.java</code></a>**

```java
@Bean
BookVisitUseCase bookVisitUseCase(OwnerRepository owners) {
    return new BookVisitInteractor(new JpaVisitStore(owners));
}
```

## What the boundary buys the pet clinic

In our test, an in-memory store knows that pet 7 belongs to owner 1. Booking that pet for tomorrow adds a visit. Trying to book the same pet for owner 2 raises an error and leaves the store empty. The test calls the same input port as the controller without starting Spring or a database. It checks the booking decision. Verifying the JPA mapping still needs a database test. The [Hexagonal Architecture chapter](../hexagonal-architecture/#a-second-driving-adapter-a-test) shows the actual test code.

For a small clinic with one form, the [layered service](../layered-architecture/) already gives a second caller a way to reuse the date rule. What the extra interfaces buy here is independence from the storage model. If the clinic changes how visits are stored, the interactor can stay the same as long as the new store honours the same contract. The team still has to implement and wire that store and account for any changes to the data or the pages that read it.

## References

<a id="ref-1"></a>
**[1]** Robert C. Martin, “[The Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html),” 13 August 2012, sections “The Dependency Rule,” “Entities,” “Use Cases,” “Interface Adapters,” “Frameworks and Drivers,” “Only Four Circles?,” “Crossing boundaries” and “What data crosses the boundaries.” Accessed 18 November 2026.

<a id="ref-2"></a>
**[2]** Spring Projects contributors, *Spring PetClinic*, commit `500158f732419217507c7656904b8e6aa1bcc0d6`, <a href="https://github.com/guendeti/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/java/org/springframework/samples/petclinic/owner/VisitController.java#L95-L109" target="_blank" rel="noopener noreferrer">original visit form handler</a> and <a href="https://github.com/guendeti/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/java/org/springframework/samples/petclinic/owner/Visit.java#L33-L45" target="_blank" rel="noopener noreferrer">mapped visit and form fields</a>. Accessed 18 November 2026.

Return to [Layered Architecture](../layered-architecture/). Continue with [Hexagonal Architecture / Ports and Adapters](../hexagonal-architecture/).
