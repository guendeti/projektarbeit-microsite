---
layout: ../../layouts/ChapterLayout.astro
title: 'The original Visit use case'
---

Recording a visit connects a simple form to several responsibilities. PetClinic loads the selected owner and pet, checks the submitted details and stores the visit. Following that operation gives us a concrete starting point for deciding which responsibilities to move in a refactoring. <sup><a href="#ref-1">[1]</a></sup>

## TL;DR

The original Visit flow puts request handling, the future-date check and the call to `OwnerRepository` in the web controller. Owner, Pet and Visit are connected through JPA relationships. Extracting a shared booking operation will require moving responsibilities as well as changing the controller's calls.

## The operation and its scope

We examine the official PetClinic version linked in the references. Each code link identifies the exact revision so the described behaviour can be checked against the same files.

A use case describes a goal and the steps needed to achieve it. Here the goal is to book a Visit for an existing Pet belonging to an Owner. Although a visit could mean a historical encounter in another product, this controller requires a supplied date to be in the future. The model has no Visit-to-Vet association, so veterinarian assignment is outside this operation. <sup><a href="#ref-1">[1]</a></sup> <sup><a href="#ref-2">[2]</a></sup>

## Read the collaboration through the files

Spring MVC handles web requests using Model, View and Controller roles. Here the controller coordinates request handling and supplies objects for the view to display. A repository provides access to stored objects, while Jakarta Persistence, usually called JPA, maps those objects to database records. The table shows where those responsibilities meet. <sup><a href="#ref-1">[1]</a></sup>, <sup><a href="#ref-3">[3]</a></sup>, <sup><a href="#ref-4">[4]</a></sup>

Paths in this table are relative to `src/main/java/org/springframework/samples/petclinic/` unless stated otherwise.

| File / member | Relevant observation | Evidence |
| --- | --- | --- |
| `owner/VisitController.java` constructor | Receives `OwnerRepository` directly | <sup><a href="#ref-1">[1]</a></sup> |
| `loadPetWithVisit` | Loads Owner, finds its Pet, attaches a new Visit and populates the model | <sup><a href="#ref-1">[1]</a></sup> |
| `processNewVisitForm` | Checks input, saves on success and redirects | <sup><a href="#ref-1">[1]</a></sup> |
| `owner/OwnerRepository.java` | Extends `JpaRepository<Owner, Integer>` | <sup><a href="#ref-3">[3]</a></sup> |
| `owner/Owner.java` members `pets`, `getPet`, `addVisit` | Holds Pets and delegates adding a Visit to the selected Pet | <sup><a href="#ref-4">[4]</a></sup> |
| `owner/Pet.java` members `visits`, `addVisit` | Holds a `LinkedHashSet` of Visits with cascading persistence | <sup><a href="#ref-4">[4]</a></sup> |
| `owner/Visit.java` | JPA entity with date, description and validation annotations | <sup><a href="#ref-2">[2]</a></sup> |
| `src/main/resources/templates/pets/createOrUpdateVisitForm.html` | Date/description inputs and a hidden pet ID | <sup><a href="#ref-5">[5]</a></sup> |

<figure class="architecture-figure">
<div class="diagram-scroll" tabindex="0" role="region" aria-label="Architecture diagram. Scroll horizontally to see the complete figure.">
<img src="../../diagrams/visit-dependencies.svg" alt="Selected original dependencies. MVC controller uses OwnerRepository and model types. repository uses Owner. Owner contains Pets and Pet contains Visits." style="max-width:100%;height:auto" />
</div>
<figcaption>Selected source dependencies and model relationships in the original implementation. The controller calls the repository directly. Base classes and some direct model references are omitted. <sup><a href="#ref-1">[1]</a></sup> <sup><a href="#ref-3">[3]</a></sup> <sup><a href="#ref-4">[4]</a></sup> <sup><a href="#ref-2">[2]</a></sup></figcaption>
</figure>

## Follow requests, not just methods

The form route is `/owners/{ownerId}/pets/{petId}/visits/new`. GET retrieves the form, while POST submits the input. Before either request handler runs, MVC calls the model preparation method. Submission therefore reloads the Owner/Pet information rather than relying on what was displayed earlier. <sup><a href="#ref-1">[1]</a></sup>

<figure class="architecture-figure">
<div class="diagram-scroll" tabindex="0" role="region" aria-label="Architecture diagram. Scroll horizontally to see the complete figure.">
<img src="../../diagrams/visit-flow.svg" alt="GET prepares and renders. POST prepares again and validates. invalid input redisplays the form, while valid input is saved and followed by a redirect." style="max-width:100%;height:auto" />
</div>
<figcaption>Handler order in the original Visit flow <sup><a href="#ref-1">[1]</a></sup>. Invalid input returns to the form, while valid input follows the persistence branch.</figcaption>
</figure>

Preparation creates a Visit and attaches it in memory. The successful POST adds that same instance through Owner and calls `save`. Because Pet stores Visits in a set, the two association calls do not imply that two separate Visit objects were created. <sup><a href="#ref-1">[1]</a></sup> <sup><a href="#ref-4">[4]</a></sup>

### A rule hiding in the web controller

The following unchanged excerpt contains the date rule.

```java
if (visit.getDate() != null && !visit.getDate().isAfter(LocalDate.now())) {
    result.rejectValue("date", "typeMismatch.visitDate");
}
```

The source is `VisitController.processNewVisitForm` <sup><a href="#ref-1">[1]</a></sup>. Copyright 2012–2025 the original authors. [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0).

The date policy uses MVC's `BindingResult`, which holds input errors, and reads the current date directly. A command-line caller could not reuse this method as a plain booking operation without also depending on web types. That gives our refactorings a concrete purpose beyond moving classes.

## Distinguish rules from assumptions

| Concern | Behaviour in the original implementation | Architectural implication |
| --- | --- | --- |
| Date | Constructor defaults to tomorrow. Non-null submitted dates must be after today | Requiring a date needs a separate rule |
| Description | `@NotBlank`, `@Size(max = 255)` | Other entry points must also invoke validation or enforce equivalent rules |
| Missing Owner / unrelated Pet | Model preparation throws `IllegalArgumentException` | User-facing error handling is a separate responsibility |
| Identity fields | Form binding excludes `id` and `*.id`. Preparation uses path IDs | Permissions still require server-side checks |
| Vet | No Visit-to-Vet relationship in this model/schema | This operation does not allocate a vet or check appointment availability |

These observations come from the controller, entity annotations and schema. <sup><a href="#ref-1">[1]</a></sup>, <sup><a href="#ref-2">[2]</a></sup>

A null date has no `@NotNull` constraint, and the manual future-date condition skips null. The H2 `visit_date` column is also nullable, so these checks do not require a date. <sup><a href="#ref-1">[1]</a></sup>, <sup><a href="#ref-2">[2]</a></sup> Our refactorings add that requirement, deliberately strengthening the contract for this edge case.

## Persistence is a relationship contract

Owner maps Pets with `CascadeType.ALL`. Pet maps Visits the same way, using `pet_id`. Cascading means JPA can apply the persistence operation to related objects too. These relationships explain why the code saves an Owner rather than calling a separate Visit repository. <sup><a href="#ref-4">[4]</a></sup>

Spring Data JPA gives inherited CRUD operations, meaning create, read, update and delete, default transaction settings. A service operation can define a wider transaction around several repository calls. Query declarations and any outer transaction must be considered separately when establishing the scope of a particular call. <sup><a href="#ref-3">[3]</a></sup> <sup><a href="#ref-6">[6]</a></sup>

Keep the following events separate when reading the flow.

- Adding a Visit to a collection is an object change.
- The repository participates in persistence and transaction handling.
- A commit completes the database transaction successfully.
- Repository transaction boundaries do not encompass the entire GET/POST interaction.

The cascade path describes how related objects participate in persistence. The SQL statements executed also depend on fetching, flush timing and transaction configuration.

## The midnight experiment

Consider a form opened on 2 November one minute before midnight, for a visit on 3 November. The request submitted after midnight is now booking “today,” so a fresh future-date check should reject it. Keeping a date valid merely because the form once displayed it would silently change the policy.

Our Layered and Clean designs address this case by evaluating “today” once per booking operation. They receive a clock configured for the clinic's time zone rather than reading the system clock directly.

## A common contract for the refactorings

The Layered, Clean and Hexagonal examples use the following booking contract. It makes the intended behaviour comparable and identifies where we deliberately strengthen the original rules.

| Case | Intended outcome in our designs |
| --- | --- |
| Existing owner/pet, tomorrow, nonblank description up to 255 characters | Append one Visit and confirm after commit |
| Today or earlier | Reject without storing a Visit |
| Null date | Reject, intentionally strengthening the baseline |
| Blank or overlong description | Reject |
| Missing owner or pet not belonging to owner | Reject with a defined application failure |
| Storage or commit failure | Do not return success |
| Repeated submission | No guarantee against duplicate booking unless added explicitly |

The last row concerns idempotency, which means repeating the same command has the same effect as executing it once. Extracting a service or introducing ports does not automatically prevent duplicate bookings. For example, a receptionist who retries after losing a confirmation might otherwise create a second Visit. Preventing that needs a way to identify and remember the command.

## References

<a id="ref-1"></a>
**[1]** Spring Projects contributors, *Spring PetClinic*, commit `500158f732419217507c7656904b8e6aa1bcc0d6`, `src/main/java/org/springframework/samples/petclinic/owner/VisitController.java`, `setAllowedFields`, `loadPetWithVisit`, `minVisitDate`, `initNewVisitForm`, `processNewVisitForm`. Pinned source. Accessed 2 November 2026.

<a id="ref-2"></a>
**[2]** Spring Projects contributors, same commit: Visit.java, constructor and field annotations. src/main/resources/db/h2/schema.sql, `visits` table. Accessed 2 November 2026.

<a id="ref-3"></a>
**[3]** Spring Projects contributors, same commit, `src/main/java/org/springframework/samples/petclinic/owner/OwnerRepository.java`, interface and `findById`. Pinned source. Accessed 2 November 2026.

<a id="ref-4"></a>
**[4]** Spring Projects contributors, same commit and package: Owner.java, `pets`, `getPet(Integer)`, `addVisit`. Pet.java, `visits`, `addVisit`. Accessed 2 November 2026.

<a id="ref-5"></a>
**[5]** Spring Projects contributors, same commit, `src/main/resources/templates/pets/createOrUpdateVisitForm.html`, form and history. Pinned template. Accessed 2 November 2026.

<a id="ref-6"></a>
**[6]** Spring Data team, *Spring Data JPA Reference: Transactionality*. CRUD defaults, declared queries and service facades. Accessed 2 November 2026. Used for general framework semantics, not to assert a sample dependency version.

Return to [SCS and ISA](../scs-and-isa/). Continue with [Layered Architecture](../layered-architecture/).
