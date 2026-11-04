---
layout: ../../layouts/ChapterLayout.astro
title: 'Hexagonal Architecture / Ports and Adapters'
---

An application may need to accept requests from a browser, a command-line tool or an automated test. Ports and Adapters gives those callers a common way to reach its operations, while keeping technology-specific input and storage code outside the application core. <sup><a href="#ref-1">[1]</a></sup>

## TL;DR

Ports describe conversations with an application. Adapters translate particular technologies into those conversations. Our Visit example can be driven through the same booking port by MVC, a terminal or a test, and can request storage through another port. A hexagon's sides do not prescribe a number of interfaces.

## The symmetry between incoming and outgoing technology

Ports and Adapters separates the application's operations from the technologies that invoke them or carry out its requests. An incoming adapter translates a request into an application operation. An outgoing adapter implements an operation the application needs, such as storing a Visit. The essential distinction is inside versus outside, rather than a fixed number of layers or interfaces. <sup><a href="#ref-1">[1]</a></sup>

Our example uses the [same booking design as Clean](../clean-architecture/), viewed through its ports and adapters. The underlying refactoring starts from the [original PetClinic Visit flow](../visit-use-case/). <sup><a href="#ref-2">[2]</a></sup> The shared design shows how both perspectives apply to the same responsibilities and dependencies.

## Find the conversations before drawing the shape

The incoming conversation asks the application to “Book a visit for this Owner/Pet using these details.” The outgoing conversation asks storage to “Append those details only for a valid Owner/Pet relationship.”

| Role in our design | Concrete example | Who starts the conversation? |
| --- | --- | --- |
| Driving adapter | Web controller, command-line adapter or test | External caller |
| Incoming port | `BookVisit.book(BookVisitCommand)` | Driving adapter |
| Application | `BookingVisit` and `VisitDetails` policy | Orchestrates the operation |
| Outgoing port | `VisitStore.appendForOwner(...)` | Application |
| Driven adapter | `JpaVisitStore` or a contract-respecting test fake | Responds to the application's request |

<figure class="architecture-figure">
<div class="diagram-scroll" tabindex="0" role="region" aria-label="Architecture diagram. Scroll horizontally to see the complete figure.">
<img src="../../diagrams/hexagonal-ports.svg" alt="MVC, CLI and tests drive the BookVisit port. BookingVisit requests storage through VisitStore, implemented by JPA or a fake. independent policy uses an injected Clock." style="max-width:100%;height:auto" />
</div>
<figcaption>Proposed Visit design. The central boundary contains the input port, use case, policy and output port. External adapters call or implement those ports. Solid arrows show runtime calls, while the dashed arrow shows a source dependency.</figcaption>
</figure>

A port need not correspond to a network port or a microservice. The incoming port here is a Java interface in one application. Clock is another replaceable dependency. We use the standard Java Clock abstraction rather than define a custom interface for it. <sup><a href="#ref-3">[3]</a></sup>

## A concrete alternative driving adapter

The incoming port describes the booking operation.

```java
// Proposed application contract; same as the Clean example.
public interface BookVisit {
    void book(BookVisitCommand command);
}
```

A terminal adapter can turn parsed command-line input into a call through that port.

```java
// Proposed adapter fragment. Parsing and display stay outside the core.
public final class TerminalBooking {
    private final BookVisit booking;

    public TerminalBooking(BookVisit booking) {
        this.booking = booking;
    }

    public void submit(int ownerId, int petId,
            LocalDate date, String description) {
        booking.book(new BookVisitCommand(
            ownerId, petId, date, description));
    }
}
```

`LocalDate` is a Java time type. The command and rejection vocabulary are defined in the preceding chapters. Actual command-line parsing, exit codes and messages are deliberately outside this fragment. The adapter must receive the configured booking object, including its transaction wrapper. Constructing its own use case would bypass that setup.

The method signature contains booking values rather than browser or terminal types. The application therefore does not need to know which client called it. A change to command-line syntax should stop at this adapter unless the requested business operation also changes.

## A port is a behavioural agreement

It would be easy to write a fake `VisitStore` that records any request. That helps check how the use case applies rules and requests storage, but it does not establish the full storage contract.

Our outgoing port includes the Owner/Pet check, failure propagation and participation in the transaction. A fake used to test those behaviours must model them. Testing the JPA adapter also requires the actual mappings and transaction configuration, so that its storage and rollback behaviour can be checked against the port's contract.

Replacing the local storage adapter with a remote one would need more thought. A remote call may complete while the reply is lost. Replacing local JPA with HTTP behind an identical `void` interface would not preserve the local transaction contract by itself. We would need explicit outcomes, safe handling of repeated commands and recovery after failure. **The same method signature does not guarantee the same behaviour.**

## When the clinic needs historical import

Suppose the clinic asks to import past visits. Can an import adapter simply call the current `BookVisit` port?

The current booking contract requires a future date, so an import of past visits needs a different operation. Bypassing the rule inside an adapter would split policy across technologies. We would consider an explicit `ImportHistoricalVisit` conversation with its own permissions, validation and duplicate policy.

This scenario explains why “one port per technology” is often the wrong starting question for our example. MVC and CLI can use the same booking conversation. Historical import may need a different conversation even if it also arrives over HTTP. The distinction follows from what the operations mean, not which technology calls them.

## Relationship to Clean Architecture

The same code can satisfy both perspectives. Clean Architecture emphasises the dependency rule around application and business policies. Ports and Adapters emphasises the boundary between the application and the technologies that drive it or fulfil its requests. Both seek to keep application rules independent of those technologies. <sup><a href="#ref-1">[1]</a></sup> <sup><a href="#ref-4">[4]</a></sup>

The useful comparison is whether the code protects that boundary. A port exposing `HttpServletRequest`, `BindingResult` or JPA entities would still require callers or core code to know about technologies that this design aims to keep outside.

## Applying the design

Use a port for a meaningful application conversation, rather than create one for every caller or technology. The terminal fragment accepts already-parsed values and reaches the same `BookVisit` operation as the proposed web adapter. Actual argument parsing, presentation and process exit codes remain the terminal application's responsibility.

The hexagon itself adds no implementation rule. Its purpose is to make the inside/outside boundary visible, with room for different ports. The original description does not require six ports. <sup><a href="#ref-1">[1]</a></sup> A diagram is useful when it makes those responsibilities and their dependencies easier to inspect.

## References

<a id="ref-1"></a>
**[1]** Alistair Cockburn, “Hexagonal architecture: the original 2005 article,” *HaT Technical Report 2005.02*, version 0.9, 4 September 2005. Author's original article. Accessed 2 November 2026.

<a id="ref-2"></a>
**[2]** Spring Projects contributors, *Spring PetClinic*, commit `500158f732419217507c7656904b8e6aa1bcc0d6`, `src/main/java/org/springframework/samples/petclinic/owner/VisitController.java`, `loadPetWithVisit` and `processNewVisitForm`. Verified baseline. Accessed 2 November 2026.

<a id="ref-3"></a>
**[3]** Oracle, *Java Platform SE: java.time.Clock*. Clock API. Accessed 2 November 2026.

<a id="ref-4"></a>
**[4]** Robert C. Martin, “The Clean Architecture,” 13 August 2012, opening discussion and boundary crossing. Author's article. Accessed 2 November 2026.

Return to [Clean Architecture](../clean-architecture/). Later chapters cover [Onion Architecture](../onion-architecture/) and the [comprehensive comparison](../architecture-comparison/).
