---
layout: ../../layouts/ChapterLayout.astro
title: 'Layered Architecture'
---

When a web controller handles input, applies booking rules and saves data, another caller has no clear operation to reuse. A layered design separates those responsibilities and gives callers a shared application operation. <sup><a href="#ref-1">[1]</a></sup> <sup><a href="#ref-2">[2]</a></sup>

## TL;DR

Layering separates what the user sees, the rules the application applies and how data is stored. Our PetClinic design moves booking out of the web controller while keeping the existing database-mapped objects. Another caller can reuse the rules, but the booking service still depends on Spring Data and those objects.

## Separate kinds of reasoning

Presentation handles user interaction, domain logic expresses business rules, and data access handles storage. Keeping these responsibilities separate allows each part to use a defined interface to the others. A service layer can expose and coordinate application operations for several callers. <sup><a href="#ref-1">[1]</a></sup> <sup><a href="#ref-2">[2]</a></sup>

These descriptions do not require every application to use exactly three packages, nor do they require business rules to live outside the objects they govern. For this example, a small application service coordinates booking and an independent policy checks the rules.

## Begin with the actual baseline

The [original Visit flow](../visit-use-case/) uses Spring MVC for web requests, Jakarta Persistence (JPA) for mapping Java objects to database records and a repository for data access. Its controller calls the repository directly, with no separate booking service. <sup><a href="#ref-3">[3]</a></sup>

Our refactoring introduces `VisitBookingService` so a second caller can book without a form or `BindingResult`, MVC's input-error container. We keep Owner/Pet/Visit persistence and move responsibility for booking. The following fragments explain that change. A complete web application also needs the revised controller and Spring configuration described below.

| Before in PetClinic | After in this design | Why it matters |
| --- | --- | --- |
| The controller checks the date using `BindingResult` | The service calls `VisitRules.requireBookable(...)` | A terminal caller can reach the same rule without MVC |
| The controller calls `owners.save(owner)` | The service creates and saves the Visit | Booking has one application entry point |
| Model preparation attaches a Visit before the handler | Form preparation reads data, while booking creates the Visit | Displaying a form and performing a booking have separate responsibilities |

<figure class="architecture-figure">
<div class="diagram-scroll" tabindex="0" role="region" aria-label="Architecture diagram. Scroll horizontally to see the complete figure.">
<img src="../../diagrams/layered-dependencies.svg" alt="Proposed controller uses VisitBookingService, which uses OwnerRepository and independent VisitRules. persistence entities remain shared." style="max-width:100%;height:auto" />
</div>
<figcaption>Selected source dependencies in our design. Shared model types make this a pragmatic layered variant, not a strict rule allowing references only to the adjacent layer.</figcaption>
</figure>

## Explicit booking input

Do not ask a caller to supply an Owner entity as proof of a valid association. Give the operation plain identifiers and values.

```java
// Proposed application input; java.time.LocalDate.
public record BookVisitCommand(
    int ownerId,
    int petId,
    LocalDate date,
    String description
) {}
```

The Java record groups the input values into one command. The command expresses a request. It does not establish that the owner exists or that the pet belongs to them. Those decisions require data loaded within the operation.

A small application exception represents rejected booking input.

```java
// Proposed type shared by the application entry points.
public final class BookingRejected extends RuntimeException {
    public BookingRejected(String code) {
        super(code);
    }
}
```

The code strings below are stable identifiers, not messages to display directly. A web caller maps them to field errors or an appropriate error response. A command-line interface, or CLI, can present the same outcome differently. Storage failures should not be caught and mislabeled as user input errors.

## Booking policy and a controllable clock

The independent policy uses `java.time.LocalDate` and ordinary Java string operations.

```java
// Proposed policy; not an original PetClinic class.
public final class VisitRules {
    private VisitRules() {}

    public static void requireBookable(
            LocalDate date, String description, LocalDate today) {
        if (date == null) {
            throw new BookingRejected("date.required");
        }
        if (!date.isAfter(today)) {
            throw new BookingRejected("date.mustBeFuture");
        }
        if (description == null || description.isBlank()) {
            throw new BookingRejected("description.required");
        }
        if (description.length() > 255) {
            throw new BookingRejected("description.tooLong");
        }
    }
}
```

The baseline has the future-date condition in the controller and description annotations on Visit. <sup><a href="#ref-3">[3]</a></sup> Our design re-expresses those rules so each entry point reaches the same application policy. Rejecting a null date intentionally strengthens the contract, since the baseline has no date `@NotNull` constraint. That edge case changes.

The description stays unchanged. Trimming or normalising it would be another behaviour decision. The length limit must fit the database column. This example uses Java string length, which need not match the number of characters a reader perceives in Unicode text.

### Booking across midnight

The operation receives a `Clock` through its constructor instead of choosing its own time source. This is dependency injection. That clock supplies one value of “today.” The outer configuration chooses the clinic zone, for example `Clock.system(ZoneId.of("Europe/Zurich"))`. Tests can supply a fixed clock. `Clock` is a Java standard-library time source designed to support alternate and fixed clocks. <sup><a href="#ref-4">[4]</a></sup>

If a form opened before midnight is submitted afterwards, booking uses the date at command execution. The caller cannot preserve a stale validation result from the earlier GET. That follows from evaluating the rule when booking is submitted.

## A transaction around booking

The service uses Spring `@Service` and `@Transactional`, Java `Clock` and the original model and repository types.

```java
// Proposed service. Must be called through its managed Spring proxy.
@Service
public class VisitBookingService {
    private final OwnerRepository owners;
    private final Clock clock;

    public VisitBookingService(OwnerRepository owners, Clock clock) {
        this.owners = owners;
        this.clock = clock;
    }

    @Transactional
    public void book(BookVisitCommand command) {
        LocalDate today = LocalDate.now(clock);
        VisitRules.requireBookable(
            command.date(), command.description(), today);

        Owner owner = owners.findById(command.ownerId())
            .orElseThrow(() -> new BookingRejected("owner.notFound"));
        Pet pet = owner.getPet(command.petId());
        if (pet == null) {
            throw new BookingRejected("pet.notForOwner");
        }

        Visit visit = new Visit();
        visit.setDate(command.date());
        visit.setDescription(command.description());
        pet.addVisit(visit);
        owners.save(owner);
    }
}
```

Callers must supply a non-null command. Code handling incoming requests must check this before invoking the operation.

This code constructs one Visit after the checks and sets its date explicitly. Owner and Pet still provide the cascade path described in the baseline, so this proposal needs neither a new Visit repository nor a schema change. <sup><a href="#ref-3">[3]</a></sup>

Spring uses a proxy, a wrapper around the service, to apply transaction behaviour before and after the method call. The call must pass through that wrapper. An annotation on an object created outside Spring, or a direct call between methods on the same object, does not have the same effect. <sup><a href="#ref-5">[5]</a></sup>, <sup><a href="#ref-6">[6]</a></sup>

For this web flow, we assume that the controller has no existing transaction. The booking service then starts and completes the transaction before returning. With the default `REQUIRED` propagation, a call made inside another transaction would instead join it, and the actual commit would belong to that outer boundary. <sup><a href="#ref-6">[6]</a></sup>

An integration test can check this boundary by calling the managed service and reading the saved Visit in a separate transaction. A rollback test should trigger a failure after a write and check that the change was not committed. A mock repository can record a `save` call, but cannot establish either database outcome.

<figure class="architecture-figure">
<div class="diagram-scroll" tabindex="0" role="region" aria-label="Architecture diagram. Scroll horizontally to see the complete figure.">
<img src="../../diagrams/layered-flow.svg" alt="Proposed MVC command mapping, transactional service validation, Owner/Pet lookup, creation and save, then commit before success returns to the controller." style="max-width:100%;height:auto" />
</div>
<figcaption>Successful flow when the service owns the outermost transaction. The method body finishes before the transaction interceptor completes the commit.</figcaption>
</figure>

## The web adapter

The revised controller would perform transport parsing and form binding, call `book(command)`, then redirect after success. It would map `BookingRejected` codes into useful form errors and reload the display data when redisplaying the form. It would not keep the old model-preparation method that attaches a transient Visit during every GET and POST.

Extracting only the save lines would leave responsibilities duplicated. Form preparation should read the data to display. Booking should create and persist the Visit. The new error mapping must also preserve suitable responses for missing owners and unrelated pets.

Those controller changes are part of the refactoring, even though only the service is shown in full here.

## What has improved, and what remains coupled?

| Change scenario | Effect in our Layered design | Remaining work |
| --- | --- | --- |
| Add a terminal caller | It creates the same command and calls the service | Caller-specific parsing and error presentation |
| Change the future-date policy | Change the shared policy and check the boundary dates | Existing callers may need updated messaging |
| Replace JPA model types | Service and mappings are affected | The service still refers to persistence entities |
| Replace Spring Data | Repository dependency must be adapted | The service still knows its repository API |
| Retry an ambiguous failure | No automatic safe retry guarantee | Idempotency is a separate requirement |

A shared application service is therefore useful without being framework-independent. Passing dependencies into a constructor makes them replaceable, but the service still refers to their types. The [Clean design](../clean-architecture/) changes that contract ownership.

## Evaluate the trade

Our service adds a command, policy and rejection vocabulary plus web mapping work. For one tiny form, that is real overhead. Here it lets another entry point reuse the booking decision and lets us control time without MVC.

It does not provide an independent release, eliminate entity coupling or solve concurrent owner changes. Even one transaction needs an explicit concurrency strategy if the requirement demands a stable relationship under competing writes. Choose that strategy from actual requirements rather than infer it from `@Transactional`.

## References

<a id="ref-1"></a>
**[1]** Martin Fowler, “Presentation Domain Data Layering,” 26 August 2015. Original article. Accessed 2 November 2026.

<a id="ref-2"></a>
**[2]** Randy Stafford, “Service Layer,” in Martin Fowler's *Patterns of Enterprise Application Architecture* catalogue, 5 March 2003. Pattern description. Accessed 2 November 2026.

<a id="ref-3"></a>
**[3]** Spring Projects contributors, *Spring PetClinic*, commit `500158f732419217507c7656904b8e6aa1bcc0d6`, `src/main/java/org/springframework/samples/petclinic/owner/`: VisitController.java, `processNewVisitForm`. Visit.java, constructor and constraints. Owner.java, `getPet`. Pet.java, `visits`. Accessed 2 November 2026.

<a id="ref-4"></a>
**[4]** Oracle, *Java Platform SE: java.time.Clock*, API documentation. Clock and fixed time sources. Accessed 2 November 2026.

<a id="ref-5"></a>
**[5]** Spring Data team, *Spring Data JPA Reference: Transactionality*. Repository and facade transactions. Accessed 2 November 2026.

<a id="ref-6"></a>
**[6]** Spring Framework team, *Reference Documentation: Using @Transactional*. Proxy interception and configuration. Accessed 2 November 2026. The documentation explains the transaction mechanism. Transaction propagation, section on PROPAGATION_REQUIRED. Accessed 4 November 2026.

Return to [The original Visit use case](../visit-use-case/). Continue with [Clean Architecture](../clean-architecture/).
