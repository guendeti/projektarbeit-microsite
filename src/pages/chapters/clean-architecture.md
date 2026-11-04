---
layout: ../../layouts/ChapterLayout.astro
title: 'Clean Architecture'
---

A booking service can be shared by several callers while still depending directly on database-mapped objects. Clean Architecture takes the separation further by keeping application rules independent of those external types and making outer code adapt to the core's contracts. <sup><a href="#ref-1">[1]</a></sup>

## TL;DR

Clean Architecture keeps application rules independent of external technologies. Our Visit use case defines the storage operation it needs, and an adapter connects that operation to JPA. The running code can reach the database while the core code refers only to its own contract. Translating data and setting up transactions still take work.

## The question after extracting a service

Our [Layered design](../layered-architecture/) centralises booking, but its service still refers to `OwnerRepository` and objects mapped to the database through Jakarta Persistence (JPA). Suppose we want to reuse the booking rules without Spring MVC or those mapped objects. Which dependencies would we have to bring along?

The Dependency Rule keeps source dependencies pointing toward the core, the code that holds application rules. Entities hold business concepts and rules, use cases coordinate operations, and adapters connect them to technologies such as web frameworks and databases. The circles describe these responsibilities rather than prescribe an exact number of layers. Data crossing a boundary should not force the core to use an external technology's types. <sup><a href="#ref-1">[1]</a></sup>

Our proposed refactoring applies the rule to the same booking operation as Layered. The original PetClinic model is reused only inside the persistence adapter. Its relationships are documented in the [baseline](../visit-use-case/). <sup><a href="#ref-2">[2]</a></sup>

## Choose the contract before the adapter

For this use case, success needs no generated Visit ID because the web caller redirects to the Owner page. We therefore choose a void booking operation. Returning a newly generated ID would require an explicit result contract and careful handling of the persist/merge behaviour documented by Spring Data JPA. <sup><a href="#ref-3">[3]</a></sup>

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
  persistence/
    JpaVisitStore.java
  configuration/
    TransactionalBookVisit.java
    BookingConfiguration.java
```

The core defines the operation, its values and its possible failures. Outer code translates web input, stores data and connects the objects that perform the work. These packages are our design convention, not a mandated Clean folder structure.

<figure class="architecture-figure">
<div class="diagram-scroll" tabindex="0" role="region" aria-label="Architecture diagram. Scroll horizontally to see the complete figure.">
<img src="../../diagrams/clean-dependencies.svg" alt="Controller depends on core BookVisit. BookingVisit implements it and uses core VisitStore. JpaVisitStore implements that contract. VisitDetails is core policy." style="max-width:100%;height:auto" />
</div>
<figcaption>Source dependencies in our proposal. Dashed implementation arrows point to the contract. The core has no MVC or JPA imports.</figcaption>
</figure>

## Accepted booking details

`BookVisitCommand` groups the same input values as in Layered, the owner ID, pet ID, date and description. `BookingRejected` still carries an error code. It is an unchecked exception, so Java does not require callers to catch or declare it. We place both in the core rather than importing them from a web or persistence package.

The policy now protects a value type, which groups the date and description and checks them together. It uses `java.time.LocalDate` and our core rejection type.

```java
// Proposed core value. Constructor also guards direct construction.
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

Why is the future-date condition in a booking factory rather than permanently in the constructor? A Visit scheduled for tomorrow becomes historical when time passes. It must remain representable afterwards. **Valid to store as historical data** and **valid to book now** are different conditions in this design.

The factory provides the latter check at the use-case boundary. The constructor still enforces the rules that must always hold, such as having a date and a nonblank description. Those rules are invariants. Construction alone does not establish that booking is allowed today. Callers should enter through `BookVisit`, not directly invoke persistence. Enforcing that architectural restriction is additional implementation work.

Requiring a date deliberately strengthens the baseline's nullable-date edge case. The other checks follow the source's controller rule and description constraints. <sup><a href="#ref-2">[2]</a></sup>

## Core-owned contracts

```java
// Proposed core input boundary.
public interface BookVisit {
    void book(BookVisitCommand command);
}

// Proposed core output boundary.
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

The operation does **not** guarantee that repeating a command avoids a second booking, lock out all concurrent owner changes or coordinate data in remote systems. Those would require stronger contracts and implementations.

An interface that exposes `JpaRepository`, JPA `Owner` or MVC `BindingResult` would still require the core to depend on those external types. Our contract instead uses plain IDs and core values. This is our concrete application of the dependency rule. <sup><a href="#ref-1">[1]</a></sup>

## Booking without a framework

```java
// Proposed core use case; java.time.Clock and LocalDate.
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

The caller must supply a non-null command. The outer configuration supplies a clock with the clinic's zone. A fixed clock makes the midnight scenario repeatable. Java's Clock API explicitly supports that substitution. <sup><a href="#ref-4">[4]</a></sup>

This use case is intentionally small. Its job is to apply booking policy and request storage. The demonstrated rules do not need a larger hierarchy of business objects.

## Adapting the PetClinic model

The persistence adapter imports the original Owner/Pet/Visit and repository types. It implements `VisitStore`, the interface defined by the core.

| Layered code | Clean code | What changes |
| --- | --- | --- |
| Service holds `OwnerRepository` | Use case holds `VisitStore` | The core defines the operation it needs |
| Service builds a JPA `Visit` | Adapter builds a JPA `Visit` | Database mapping stays outside the core |
| Service calls `owners.save(owner)` | Use case calls `visits.appendForOwner(...)` | The use case describes its intent without referring to a JPA entity |

```java
// Proposed outer adapter; transaction supplied by the outer decorator.
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

We reuse the baseline relationship and cascade path rather than introduce an unexplained Visit repository. <sup><a href="#ref-2">[2]</a></sup> Mapping is small here because the example has few fields. For a larger model, mapping cost and duplicated representations would need explicit evaluation.

The Owner/Pet check is an important design choice. The core-owned contract requires the relationship to hold, while the adapter checks the loaded records before appending. This keeps the core model small, but places enforcement inside each storage implementation. A fake that always accepts every pet would therefore fail to model the full contract.

An alternative would return relationship information to the use case and make the decision there. That makes the policy more visible in the core, while requiring another contract and an explicit strategy for changes between lookup and save. For this small proposal, we keep the check and append together. Neither arrangement makes concurrent ownership changes safe without a suitable transaction and concurrency policy.

## Transactions outside the core

The use case does not start its own transaction. An outer decorator wraps the use case, adds transaction behaviour and delegates the booking work. Spring manages this public, non-final wrapper class.

```java
// Proposed outer transaction decorator; configured as a Spring bean.
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

A method in the outer `@Configuration` class connects these objects.

```java
@Bean
BookVisit bookVisit(OwnerRepository owners, Clock clinicClock) {
    VisitStore store = new JpaVisitStore(owners);
    BookVisit useCase = new BookingVisit(store, clinicClock);
    return new TransactionalBookVisit(useCase);
}
```

`@Bean` tells Spring to manage the returned object, and `@Configuration` groups those setup methods. With transaction management configured, Spring adds a proxy, a wrapper that starts and completes the transaction around the call. Callers must receive that managed `BookVisit` rather than create and call the decorator directly. The setup exposes one `BookVisit` bean, so callers do not accidentally receive the undecorated use case. <sup><a href="#ref-5">[5]</a></sup>

<figure class="architecture-figure">
<div class="diagram-scroll" tabindex="0" role="region" aria-label="Architecture diagram. Scroll horizontally to see the complete figure.">
<img src="../../diagrams/clean-flow.svg" alt="Runtime. web maps command, transaction decorator enters the core, core calls VisitStore, JPA adapter maps and saves, then commit precedes success." style="max-width:100%;height:auto" />
</div>
<figcaption>Proposed runtime flow with an outermost transaction owned by the decorator. The storage call goes outward at runtime, while the adapter's source depends on the core-owned interface.</figcaption>
</figure>

For this web flow, the adapter enters without an existing transaction, so the decorator owns the outermost transaction. The method body can finish successfully and the commit can still fail. The web adapter therefore confirms only after the call through Spring's proxy returns successfully. Spring rolls back on runtime exceptions by default, which includes `BookingRejected`. Rolling back on checked exceptions would need explicit configuration. <sup><a href="#ref-5">[5]</a></sup>

With the default `REQUIRED` propagation, a call made inside an existing transaction would join it. Returning from the decorator would then not establish a completed commit, and confirmation would have to wait for the actual outer boundary. <sup><a href="#ref-5">[5]</a></sup>

Default transactions still do not establish a concurrency policy for competing changes to ownership. Isolation, locking and database constraints remain separate requirements.

## Compare the three designs

The table compares responsibilities in the original code and our two designs.

| Question | Original Visit flow | Our Layered design | Our Clean design |
| --- | --- | --- | --- |
| Where is the future-date decision? | MVC controller | Shared independent policy called by service | Core booking factory called by use case |
| What invokes persistence? | Controller | Application service | Adapter implementing core contract |
| Does application logic refer to JPA model types? | Controller uses them | Service uses them | Core does not |
| Who specifies storage needs? | Existing repository/model arrangement | Service consumes existing repository API | Core defines `VisitStore` |
| Where is operation transaction scope explicit? | Not at controller level | Managed service method | Managed outer decorator |
| What new maintenance appears? | Baseline | Command, policy and error mapping | Additional contract, mapping and composition |

The Layered design already supports another caller. Clean adds protection against external type dependencies. It does not uniquely “enable testing,” guarantee cheap database replacement or make business requirements stable. For example, changing ownership semantics can still require edits to core contracts, adapters and callers.

## References

<a id="ref-1"></a>
**[1]** Robert C. Martin, “The Clean Architecture,” 13 August 2012, “The Dependency Rule,” “Crossing boundaries” and “What data crosses the boundaries.” Author's original article. Accessed 2 November 2026.

<a id="ref-2"></a>
**[2]** Spring Projects contributors, *Spring PetClinic*, commit `500158f732419217507c7656904b8e6aa1bcc0d6`, `src/main/java/org/springframework/samples/petclinic/owner/`: VisitController.java, booking rule and save. Owner.java, `getPet`. Pet.java, cascade. Visit.java, field constraints. Accessed 2 November 2026. These sources support the baseline, not the proposed class names above.

<a id="ref-3"></a>
**[3]** Spring Data team, *Spring Data JPA Reference: Persisting Entities*. Persistence, merge and entity state detection. Accessed 2 November 2026.

<a id="ref-4"></a>
**[4]** Oracle, *Java Platform SE: java.time.Clock*. Clock API. Accessed 2 November 2026.

<a id="ref-5"></a>
**[5]** Spring Framework team, *Reference Documentation: Using @Transactional*. Managed proxies, configuration and rollback defaults. Accessed 2 November 2026. The documentation explains the transaction mechanism. Transaction propagation, section on PROPAGATION_REQUIRED. Accessed 4 November 2026.

Return to [Layered Architecture](../layered-architecture/). Continue with [Hexagonal Architecture / Ports and Adapters](../hexagonal-architecture/).
