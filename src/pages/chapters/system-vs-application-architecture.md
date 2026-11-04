---
layout: ../../layouts/ChapterLayout.astro
title: 'System vs. application architecture'
---

A software system can be described through the applications that run it or through the code inside those applications. Each view answers different questions. Here, we use **system architecture** for the overall arrangement of applications and data stores, and **application architecture** for the organisation of code within an application.

## TL;DR

System architecture concerns application boundaries, communication and deployment. Application architecture concerns internal responsibilities and dependencies. A system built from microservices can use Clean, Hexagonal or Onion Architecture inside its services.

## Looking across applications

At the system level, we ask which applications make up the system, how they communicate and where their data is stored. This is a different view from examining individual classes and interfaces. The C4 model makes a similar distinction between applications and data stores and the components and code within them. <sup><a href="#ref-1">[1]</a></sup>

For example, a team might keep several business functions in one application or separate them into services that can be deployed independently. This affects how releases are coordinated and how the system handles communication failures. Even with separate services, a change to a shared interface can still require coordination between teams. <sup><a href="#ref-2">[2]</a></sup>

## Looking inside an application

Within an application, the questions become more specific. Which code handles incoming requests? Where do business rules belong? Which part reads and writes data? Separating these responsibilities into presentation, business logic and data access is one common approach. These are logical divisions in the code and do not, by themselves, require separate deployments. <sup><a href="#ref-3">[3]</a></sup>

Clean, Hexagonal and Onion Architecture also address the internal organisation of software, with an emphasis on separating business rules from technologies such as user interfaces and databases. An important question is whether business rules directly reference user-interface or database code. The approaches share related goals, while differing in their terminology and structure. <sup><a href="#ref-4">[4]</a></sup>

## How the two views fit together

A monolith can organise its code using Clean Architecture, just as an individual microservice can use a layered structure. Separating applications and organising their internal code are related decisions, but one does not prescribe the other. <sup><a href="#ref-2">[2]</a></sup> <sup><a href="#ref-3">[3]</a></sup> <sup><a href="#ref-4">[4]</a></sup>

The following questions help identify which view is relevant when discussing a design.

| Question | Architectural view |
| --- | --- |
| Are business functions released together or as separate applications? | System architecture |
| How do applications exchange information? | System architecture |
| Where are business rules implemented inside an application? | Application architecture |
| Does business logic depend directly on database-specific types? | Application architecture |

Both views are needed to understand the consequences of a change. Moving code into a new package changes its internal organisation, but does not make it independently deployable. Separating it into another service introduces a runtime boundary and communication that the code must handle. <sup><a href="#ref-1">[1]</a></sup> <sup><a href="#ref-2">[2]</a></sup>

## PetClinic at both levels

Consider a proposed design for recording a visit. From outside the application, we see a browser sending a request to the clinic application. Looking inside, we see a web controller, a booking operation that applies the rules, and a persistence adapter that connects the operation to data storage.

<figure class="architecture-figure">
<div class="diagram-scroll" tabindex="0" role="region" aria-label="Architecture diagram. Scroll horizontally to see the complete figure.">
<img src="../../diagrams/architecture-scales.svg" alt="A browser calls one clinic application. A closer view shows a web controller calling a booking use case, which calls a persistence adapter." style="max-width:100%;height:auto" />
</div>
<figcaption>Two views of our proposed PetClinic design. Solid arrows show runtime calls. The dashed arrow indicates a closer view inside the application. The booking use-case class belongs to this proposal, not the original implementation.</figcaption>
</figure>

Suppose booking needs to be released independently from owner management. Moving it into a separate application could support that requirement, but we would need to decide how callers reach it and how it obtains the data it needs. Its internal separation of request handling, business rules and storage would still be a separate design choice.

The new boundary also changes how calls can fail. A request to another application can time out, leaving the caller without an answer. Handling that outcome is part of the additional work introduced by the system-level decision to separate applications. <sup><a href="#ref-2">[2]</a></sup>

## References

<a id="ref-1"></a>
**[1]** Simon Brown, *The C4 model*, n.d., "Abstractions," "Container" and "Component." Abstractions, applications and data stores, internal components. Accessed 3 November 2026.

<a id="ref-2"></a>
**[2]** James Lewis and Martin Fowler, "Microservices," 25 March 2014, introduction and sections "Componentization via Services" and "Design for failure." Original article. Accessed 3 November 2026.

<a id="ref-3"></a>
**[3]** Martin Fowler, "Presentation Domain Data Layering," 26 August 2015, discussion of responsibilities, dependency direction and logical layers versus physical tiers. Original article. Accessed 3 November 2026.

<a id="ref-4"></a>
**[4]** Robert C. Martin, "The Clean Architecture," 13 August 2012, introduction and section "The Dependency Rule." Original article. Accessed 3 November 2026.

Return to [What is software architecture?](../what-is-software-architecture/). Continue with [Monolith](../monolith/).
