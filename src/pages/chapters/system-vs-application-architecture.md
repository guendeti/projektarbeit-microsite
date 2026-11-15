---
layout: ../../layouts/ChapterLayout.astro
title: 'System vs. application architecture'
---

When examining software architecture, we can distinguish between two perspectives. **System architecture** looks at how applications and data stores are arranged and interact, while **application architecture** focuses on how responsibilities and dependencies are organised within an application.

## TL;DR

System architecture concerns application boundaries, communication and deployment. Application architecture concerns internal responsibilities and dependencies. A system built from microservices can use Clean, Hexagonal or Onion Architecture inside its services.

## System architecture

At the system level, we look at which applications and data stores make up a system and how they interact. The C4 model helps us understand this structure by describing software at different levels of detail, from the overall system down to its code.

In the C4 model, a software system consists of one or more containers, such as applications and data stores. Within an application, components group related functionality, while code elements, such as classes and interfaces, implement those components. This allows us to understand both how the system is organised as a whole and how its individual applications are structured. <sup><a href="#ref-1">[1]</a></sup>

Consider the pet clinic from the previous chapter. Visit booking and owner management could remain in one application or be separated into independently deployable services. This decision affects how changes are released and how the services communicate. While separate services offer more independence, communication between them can fail or time out, and changes to their interfaces may still require coordination between teams. <sup><a href="#ref-2">[2]</a></sup>

## Application architecture

At the application level, we focus on how the code within an application is organised. Which part handles incoming requests? Where are business rules implemented? How is data stored and retrieved? Application architecture concerns how these responsibilities are divided and how the different parts of the code depend on one another.

For example, the code that receives a request may rely on another part to apply business rules and access stored data. How we separate these responsibilities affects how easily we can modify or test them. These decisions concern the internal structure of the application and do not require separate deployments. <sup><a href="#ref-3">[3]</a></sup>

There are different ways to organise this structure, including Layered, Clean, Hexagonal and Onion Architecture. Each approach provides its own way of arranging responsibilities and dependencies, which we will examine in the following chapters. <sup><a href="#ref-3">[3]</a></sup> <sup><a href="#ref-4">[4]</a></sup>

## How the two perspectives relate

System and application architecture describe different aspects of the same software. System architecture concerns how functionality is divided between applications, while application architecture focuses on how the code inside each application is organised. These decisions are related, but one does not determine the other.

For example, a monolith can use Clean Architecture to organise its code, while an individual microservice can use Layered Architecture. Having separate services does not automatically mean that their internal code is well organised. <sup><a href="#ref-2">[2]</a></sup> <sup><a href="#ref-3">[3]</a></sup> <sup><a href="#ref-4">[4]</a></sup>

The following questions help distinguish the two perspectives.

| Question | Architectural view |
| --- | --- |
| Which functions belong in the same application or in separate services? | System architecture |
| How do applications communicate with one another? | System architecture |
| How are responsibilities divided within an application? | Application architecture |
| How do different parts of the code depend on one another? | Application architecture |

Understanding both perspectives helps us evaluate architectural decisions more carefully. A change that simplifies the code inside an application may introduce additional complexity elsewhere in the system. Considering both views allows us to recognise these trade-offs and make decisions based on their overall consequences.

## Applying both perspectives to the pet clinic

Consider a simplified design for recording visits at the pet clinic. At the system level, a browser sends a request to the clinic application, which accesses a data store. Looking inside the application, a web controller handles the request, a booking operation applies the rules and a persistence adapter provides access to stored data.

<figure class="architecture-figure">
<div class="diagram-scroll" tabindex="0" role="region" aria-label="Architecture diagram. Scroll horizontally to see the complete figure.">
<img src="../../diagrams/architecture-scales.svg" alt="In a proposed clinic system, a browser calls one clinic application, which accesses a data store. Inside the application, a web controller calls a booking operation, which calls a persistence adapter." style="max-width:100%;height:auto" />
</div>
<figcaption>Two views of a simplified clinic system. This is an illustrative example, not the actual Spring PetClinic implementation.</figcaption>
</figure>

We could change how these responsibilities are organised without affecting the overall system structure. However, moving visit booking into a separate service would introduce a new application that needs to communicate with the rest of the system. We would also need to consider how it accesses the required data and how communication failures are handled. <sup><a href="#ref-2">[2]</a></sup>

As we can see, separating functionality into services involves more than reorganising code. It also introduces new ways for the system to communicate and fail.

## References

<a id="ref-1"></a>
**[1]** Simon Brown, *The C4 model*, ["Abstractions"](https://c4model.com/abstractions), overview of software systems, containers, components and code. Accessed 3 November 2026.

<a id="ref-2"></a>
**[2]** James Lewis and Martin Fowler, ["Microservices"](https://martinfowler.com/articles/microservices.html), 25 March 2014, introduction and sections "Componentization via Services" and "Design for failure." Original article. Accessed 3 November 2026.

<a id="ref-3"></a>
**[3]** Martin Fowler, ["Presentation Domain Data Layering"](https://martinfowler.com/bliki/PresentationDomainDataLayering.html), 26 August 2015, discussion of responsibilities, dependency direction and logical layers versus physical tiers. Original article. Accessed 3 November 2026.

<a id="ref-4"></a>
**[4]** Robert C. Martin, ["The Clean Architecture"](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html), 13 August 2012, introduction and section "The Dependency Rule." Original article. Accessed 3 November 2026.

Return to [What is software architecture?](../what-is-software-architecture/). Continue with [Monolith](../monolith/).
