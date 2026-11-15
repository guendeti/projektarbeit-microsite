---
layout: ../../layouts/ChapterLayout.astro
title: 'Clean Architecture'
---

Business rules often need to outlast the web interface or database used to deliver them. Clean Architecture separates these rules from technical details, so changing how an application receives input or stores data does not automatically require changing its core logic. The separation depends on which parts of the code are allowed to know about others. <sup><a href="#ref-1">[1]</a></sup>

## TL;DR

Clean Architecture places business rules and application operations at the centre, with frameworks and databases outside. Source dependencies point inward, so the core defines the contracts that outer code implements. This allows core logic to be tested without a web server or database, at the cost of additional boundaries, translation and configuration.

## The Dependency Rule

A source dependency exists when code refers to a class, interface or other definition. The Dependency Rule requires these dependencies to point inward, toward the business rules. Inner code must not refer to types defined in an outer layer, including data formats tied to a web framework or database. This is the central constraint of Clean Architecture. <sup><a href="#ref-1">[1]</a></sup>

The usual diagram groups responsibilities into four areas. Entities contain general business rules and concepts. Use cases coordinate application-specific operations. Interface adapters translate between the core and external representations. Frameworks and drivers supply technologies such as web frameworks and databases. An entity in this model is a business concept, not necessarily an object mapped to a database. <sup><a href="#ref-1">[1]</a></sup>

<figure class="architecture-figure">
<div class="diagram-scroll" tabindex="0" role="region" aria-label="Clean Architecture layers and inward source dependencies. Scroll horizontally to see the complete figure.">
<img src="../../diagrams/clean-architecture-layers.svg" alt="Nested areas from outside to inside. Frameworks and drivers surround interface adapters, use cases and entities. Source dependency arrows point inward toward business rules." style="max-width:100%;height:auto" />
</div>
<figcaption>Typical responsibility areas in Clean Architecture. Arrows show permitted inward source dependency directions, not runtime calls or a requirement to use every adjacent layer. <sup><a href="#ref-1">[1]</a></sup></figcaption>
</figure>

These areas do not prescribe four Java packages or an identical structure for every application. The key is to protect inner rules from outer details. When a use case needs storage, it can define an interface describing that need. An outer adapter implements the interface. Execution can then call outward to storage while the source dependency still points inward to the core's contract. This technique is dependency inversion. <sup><a href="#ref-1">[1]</a></sup>

## From a shared service to an independent core

Our [Layered design](../layered-architecture/) centralises booking, but its service still refers to `OwnerRepository` and objects mapped to the database through Jakarta Persistence (JPA). Suppose we want to reuse the booking rules without Spring MVC or those mapped objects. Which dependencies would we have to bring along?

The simplified call sequences show how the booking work moves from the Layered service to a use case and storage adapter. Arrows indicate calls during execution, not source dependencies. The transaction wrapper is omitted here.

```text
Layered
Controller -> Booking service -> OwnerRepository

Clean
Controller -> BookingVisit -> JpaVisitStore -> OwnerRepository
```

The important change is the contract between `BookingVisit` and storage. The booking use case calls through `VisitStore`, an interface defined in the core. `JpaVisitStore` implements that interface and connects the request to the existing database code. The adapter refers to the core's contract, while the core never refers to `JpaVisitStore`. This applies the Dependency Rule to our operation. Adding more classes without changing these dependencies would not achieve the same separation.

Our executable PetClinic example applies Clean Architecture to the Visit booking operation. The rest of the application retains its existing structure. The booking core is independent of the original PetClinic model. The persistence adapter uses its mapped objects for storage, while the web controller still loads Owner and Pet for display. The existing relationships are documented in the [baseline](../visit-use-case/). <sup><a href="#ref-2">[2]</a></sup>

## Keep web and database types outside the core

For this use case, success needs no generated Visit ID because the web caller redirects to the Owner page. We therefore choose a void booking operation. A caller needing the new ID would require a result contract as well.

The packages separate the core from its web, persistence and configuration code.

```text
booking/
  core/
    BookVisit.java
    BookVisitCommand.java
    BookingVisit.java
    VisitDetails.java
    VisitStore.java
    BookingRejected.java
  web/
    VisitController.java
    VisitForm.java
  persistence/
    JpaVisitStore.java
  configuration/
    TransactionalBookVisit.java
    BookingConfiguration.java
```

The core defines the operation, its values and its possible failures. Outer code translates web input, stores data and connects the objects that perform the work. These packages are our design convention, not a mandated Clean folder structure.

The web adapter collects date and description in `VisitForm`, a separate form object rather than an object mapped to the database. The controller passes the values and the Owner and Pet identifiers to `BookVisit`. It translates rejected bookings into form errors or a missing-resource response. This keeps browser-specific input and error handling outside the core.

<figure class="architecture-figure">
<div class="diagram-scroll" tabindex="0" role="region" aria-label="Architecture diagram. Scroll horizontally to see the complete figure.">
<img src="../../diagrams/clean-dependencies.svg" alt="Controller depends on core BookVisit. BookingVisit implements it and uses core VisitStore. JpaVisitStore implements that contract. VisitDetails is core policy." style="max-width:100%;height:auto" />
</div>
<figcaption>Source dependencies in our implementation. Dashed implementation arrows point to the contract. The core has no MVC or JPA imports.</figcaption>
</figure>

## Move booking rules into the core

`BookVisitCommand` groups the same input values as in Layered, the owner ID, pet ID, date and description. `BookingRejected` reports a rejected booking through an exception carrying an error code. Both belong to the core, so their use does not introduce a dependency on web or persistence code.

The date and description are grouped in `VisitDetails`, a value type that checks its own contents. Unlike the original controller's date check, the booking check below can run without a web request or database object.

```java
// Core value. Constructor also guards direct construction.
public record VisitDetails(LocalDate date, String description) {
    public VisitDetails {
        if (date == null) {
            throw new BookingRejected("date.required");
        }
        if (description == null || description.isBlank()) {
            throw new BookingRejected("description.required");
        }
        if (description.length() > 255) {
            throw new BookingRejected("description.tooLong");
        }
    }

    public static VisitDetails forBooking(
            LocalDate date, String description, LocalDate today) {
        VisitDetails details = new VisitDetails(date, description);
        if (!details.date().isAfter(today)) {
            throw new BookingRejected("date.mustBeFuture");
        }
        return details;
    }
}
```

The `forBooking` method creates details for a new booking and checks that its date is in the future. This check belongs there rather than permanently in the constructor because a Visit scheduled for tomorrow becomes historical when time passes. **Valid to store as historical data** and **valid to book now** are different conditions in this design.

The constructor enforces conditions that must always hold, such as having a date and a nonblank description. These are called invariants. The use case additionally checks whether booking is allowed today. Callers must therefore enter through `BookVisit` rather than bypass it and invoke storage directly.

Requiring a date deliberately strengthens the baseline's nullable-date edge case. The other checks follow the source's controller rule and description constraints. <sup><a href="#ref-2">[2]</a></sup> Alongside the structural refactoring, our implementation uses a configurable clinic time zone, explicitly allows only date and description as form fields, and returns HTTP 404 for missing owners or pets outside the selected Owner. These are intentional behaviour changes, not requirements of Clean Architecture.

## Let the core define its boundaries

Instead of calling `OwnerRepository` as the Layered service does, the core defines its own storage contract. `BookVisit` describes how callers enter the use case, while `VisitStore` describes what the use case needs from storage. Neither interface exposes a framework type.

```java
// Core input boundary.
public interface BookVisit {
    void book(BookVisitCommand command);
}

// Core storage boundary.
public interface VisitStore {
    void appendForOwner(int ownerId, int petId, VisitDetails details);
}
```

`VisitStore` exposes one operation rather than general CRUD methods for creating, reading, updating and deleting records. Its contract states what that operation must do.

- Check that the Owner exists and the Pet belongs to that Owner.
- Append one Visit with the supplied details when those checks succeed.
- Reject missing relationships using the agreed application failure codes.
- Let technical failures reach the caller rather than silently turn them into success.
- Participate in the operation's transaction, which the outer configuration supplies.

This contract does not prevent duplicate bookings when a command is repeated, protect against all concurrent ownership changes or coordinate data in remote systems. Those guarantees would require stronger contracts and implementations.

An interface that exposes `JpaRepository`, JPA `Owner` or MVC `BindingResult` would still require the core to depend on those external types. Our contract instead uses plain IDs and core values. This is our concrete application of the dependency rule. <sup><a href="#ref-1">[1]</a></sup>

## Coordinate the operation without a framework

`BookingVisit` brings the rules and storage contract together. Storage and the clock are passed into its constructor rather than created inside it. This lets the same use case run with the real database adapter or a test substitute, without changing its booking logic.

```java
// Core use case using java.time.Clock and LocalDate.
public final class BookingVisit implements BookVisit {
    private final VisitStore visits;
    private final Clock clock;

    public BookingVisit(VisitStore visits, Clock clock) {
        this.visits = visits;
        this.clock = clock;
    }

    @Override
    public void book(BookVisitCommand command) {
        LocalDate today = LocalDate.now(clock);
        VisitDetails details = VisitDetails.forBooking(
            command.date(), command.description(), today);
        visits.appendForOwner(command.ownerId(), command.petId(), details);
    }
}
```

The caller must supply a non-null command. The outer configuration supplies a clock with the clinic's time zone. Tests can supply a fixed clock to check date rules without depending on the day they run. Java's Clock API supports this substitution. <sup><a href="#ref-3">[3]</a></sup>

This use case is intentionally small. Its job is to apply booking policy and request storage. `VisitDetails` holds the small set of value rules in the same core package. We do not introduce a separate hierarchy of domain entities for this operation. The existing JPA entities remain persistence types outside the core.

## Adapt persistence to the core's contract

The persistence adapter imports the original Owner/Pet/Visit and repository types. It implements `VisitStore`, the interface defined by the core.

| Layered code | Clean code | What changes |
| --- | --- | --- |
| Service holds `OwnerRepository` | Use case holds `VisitStore` | The core defines the operation it needs |
| Service builds a JPA `Visit` | Adapter builds a JPA `Visit` | Database mapping stays outside the core |
| Service calls `owners.save(owner)` | Use case calls `visits.appendForOwner(...)` | The use case describes its intent without referring to a JPA entity |

```java
// Outer adapter with a transaction supplied by the outer decorator.
public final class JpaVisitStore implements VisitStore {
    private final OwnerRepository owners;

    public JpaVisitStore(OwnerRepository owners) {
        this.owners = owners;
    }

    @Override
    public void appendForOwner(
            int ownerId, int petId, VisitDetails details) {
        Owner owner = owners.findById(ownerId)
            .orElseThrow(() -> new BookingRejected("owner.notFound"));
        Pet pet = owner.getPet(petId);
        if (pet == null) {
            throw new BookingRejected("pet.notForOwner");
        }

        Visit entity = new Visit();
        entity.setDate(details.date());
        entity.setDescription(details.description());
        pet.addVisit(entity);
        owners.save(owner);
    }
}
```

The adapter creates the original PetClinic `Visit` object and attaches it to the Pet. The existing database mapping saves that Visit through the Owner's relationships. <sup><a href="#ref-2">[2]</a></sup> This translation keeps mapped objects out of `BookingVisit`. It is small here, but a larger model could require substantial mapping code and duplicated representations.

The Owner/Pet check is an important design choice. The core-owned contract requires the relationship to hold, while the adapter checks the loaded records before appending. This keeps the core model small, but places enforcement of a required relationship inside each storage implementation. The dependency direction is preserved, although this decision is less visible in the use case. A fake that always accepts every pet would therefore fail to model the full contract.

An alternative would return relationship information to the use case and make the decision there. That makes the policy more visible in the core, while requiring another contract and an explicit strategy for changes between lookup and save. For this small implementation, we keep the check and append together. Neither arrangement makes concurrent ownership changes safe without a suitable transaction and concurrency policy.

## Keep transaction handling outside the use case

The database changes for a booking should succeed or fail together. A transaction provides this unit of work. An outer wrapper, called a decorator, adds transaction handling around the use case. It implements the same `BookVisit` interface and delegates the booking. This keeps Spring transaction code outside the core and is our implementation choice, not a prescribed Clean Architecture class structure.

```java
// Outer transaction decorator configured as a Spring bean.
public class TransactionalBookVisit implements BookVisit {
    private final BookVisit delegate;

    public TransactionalBookVisit(BookVisit delegate) {
        this.delegate = delegate;
    }

    @Override
    @Transactional
    public void book(BookVisitCommand command) {
        delegate.book(command);
    }
}
```

The outer `BookingConfiguration` connects these objects. Its `@Bean` methods register the objects that Spring manages.

```java
@Bean
VisitStore visitStore(OwnerRepository owners) {
    return new JpaVisitStore(owners);
}

@Bean
BookVisit bookVisit(VisitStore store, Clock clinicClock) {
    BookVisit useCase = new BookingVisit(store, clinicClock);
    return new TransactionalBookVisit(useCase);
}
```

The controller receives Spring's managed `BookVisit`. Spring intercepts calls to apply `@Transactional`, so manually constructing the decorator would bypass this handling. The core itself needs no Spring annotation. <sup><a href="#ref-4">[4]</a></sup>

<figure class="architecture-figure">
<div class="diagram-scroll" tabindex="0" role="region" aria-label="Architecture diagram. Scroll horizontally to see the complete figure.">
<img src="../../diagrams/clean-flow.svg" alt="Runtime. web maps command, transaction decorator enters the core, core calls VisitStore, JPA adapter maps and saves, then commit precedes success." style="max-width:100%;height:auto" />
</div>
<figcaption>Runtime flow for our web booking operation, with the transaction supplied by the outer decorator. The storage call goes outward at runtime, while the adapter's source depends on the core-owned interface.</figcaption>
</figure>

For this web flow, Spring completes the booking transaction before returning to the controller. A commit failure must propagate rather than produce a success message. Runtime exceptions, including `BookingRejected`, trigger rollback by default. A caller with an existing transaction would share that transaction under the default settings, so its eventual commit could still fail after `book` returns. Transactions alone do not define how competing ownership changes are handled. <sup><a href="#ref-4">[4]</a></sup>

## Compare the separation and its costs

The table compares responsibilities in the original code and our two designs.

| Question | Original Visit flow | Our Layered design | Our Clean design |
| --- | --- | --- | --- |
| Where is the future-date decision? | MVC controller | Shared independent policy called by service | Core booking factory called by use case |
| What invokes persistence? | Controller | Application service | Adapter implementing core contract |
| Does application logic refer to JPA model types? | Controller uses them | Service uses them | Core does not |
| Who specifies storage needs? | Existing repository/model arrangement | Service consumes existing repository API | Core defines `VisitStore` |
| Where is operation transaction scope explicit? | Not at controller level | Managed service method | Managed outer decorator |
| What new maintenance appears? | Baseline | Command, policy and error mapping | Additional contract, mapping and composition |

The Layered design already supports another caller. Our Clean design additionally keeps database and web types out of the booking core, allowing its rules to be tested without those technologies. The cost is more interfaces, data translation and configuration. For a small operation with no need for that separation, the Layered design may be sufficient. Clean does not guarantee cheap database replacement or make business requirements stable. Changing ownership semantics can still require edits to core contracts, adapters and callers.

## References

<a id="ref-1"></a>
**[1]** Robert C. Martin, “The Clean Architecture,” 13 August 2012, “The Dependency Rule,” “Entities,” “Use Cases,” “Interface Adapters,” “Frameworks and Drivers,” “Only Four Circles?,” “Crossing boundaries” and “What data crosses the boundaries.” Author's original article. Accessed 2 November 2026, revisited 4 November 2026.

<a id="ref-2"></a>
**[2]** Spring Projects contributors, *Spring PetClinic*, commit `500158f732419217507c7656904b8e6aa1bcc0d6`, `src/main/java/org/springframework/samples/petclinic/owner/`: VisitController.java, booking rule and save. Owner.java, `getPet`. Pet.java, cascade. Visit.java, field constraints. Accessed 2 November 2026. These sources support the baseline, not our added classes.

<a id="ref-3"></a>
**[3]** Oracle, *Java Platform SE: java.time.Clock*. Clock API. Accessed 2 November 2026.

<a id="ref-4"></a>
**[4]** Spring Framework team, *Reference Documentation: Using @Transactional*. Managed proxies, configuration and rollback defaults. Accessed 2 November 2026. The documentation explains the transaction mechanism. Transaction propagation, section on PROPAGATION_REQUIRED. Accessed 4 November 2026.

Return to [Layered Architecture](../layered-architecture/). Continue with [Hexagonal Architecture / Ports and Adapters](../hexagonal-architecture/).
