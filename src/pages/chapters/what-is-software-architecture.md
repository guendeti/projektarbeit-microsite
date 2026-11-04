---
layout: ../../layouts/ChapterLayout.astro
title: 'What is software architecture?'
---

Software architecture describes how a software system is organised and how its parts work together. It concerns the important decisions behind that organisation, including how responsibilities are divided, which parts depend on each other and how they communicate. Understanding these decisions helps a team assess what adding a feature or changing a requirement would involve. <sup><a href="#ref-1">[1]</a></sup> <sup><a href="#ref-2">[2]</a></sup>

## TL;DR

Architecture concerns the design decisions that matter most for a system and its development. Evaluating those decisions means asking which requirements they address, what they make possible and what costs they introduce.

## What makes a decision architectural?

Choosing a variable name usually affects a small piece of code. Deciding whether several parts of an application may access the same database tables can shape how those parts are developed and changed. Choosing to run them as separate services also raises questions about communication, deployment and failure handling.

These examples differ in how much of the software they affect, but there is no universal dividing line between architecture and other design decisions. Their importance depends on the system's requirements and context. <sup><a href="#ref-2">[2]</a></sup> A useful question is whether revisiting a decision would require changes across several parts of the system or affect an important requirement.

Architectural decisions can involve technology choices, such as selecting a framework, as well as questions about how the software is organised, including where business rules belong and how different parts communicate.

## Responsibilities, boundaries and dependencies

To describe how software is organised, we need a few terms. A **responsibility** is a part's job, such as handling user input, applying business rules or storing data. Deciding which part performs each job gives us a starting point for understanding the structure. <sup><a href="#ref-3">[3]</a></sup>

A **boundary** separates parts and defines how they may interact. For example, a part responsible for storing data might expose operations for saving and retrieving records. Other parts can call those operations without handling the database queries themselves.

In source code, a **dependency** exists when one part uses types or operations defined by another. Code that directly uses a database library depends on that library, so a change to the library's interface may require changes to the calling code. Tracing these dependencies helps us see which parts could be affected by a change. Separating data access from business rules is one way to keep database-specific details behind a boundary. <sup><a href="#ref-3">[3]</a></sup>

## Choosing a suitable architecture

These relationships become especially important when deciding how independently parts of a system should evolve. Suppose a team wants to release one part of its software without releasing the rest. It would need to examine dependencies on shared code and data, as well as how the parts are built and deployed.

Keeping the parts in one application allows them to call each other within the same process and be deployed together. Separating them into services can support independent releases, but also requires the team to handle network communication and operate the services separately. <sup><a href="#ref-4">[4]</a></sup> For a small application maintained and released by one team, that additional work may offer little benefit.

This is a **trade-off**, where a benefit comes with a cost. To evaluate the choice, we need to ask whether independent releases are important enough to justify the additional work.

## Spring PetClinic as a practical example

We use Spring PetClinic, a sample application for managing a veterinary practice, to illustrate architectural decisions. <sup><a href="#ref-5">[5]</a></sup> Its overall structure provides the system-level context, while recording a visit for a pet gives us a common operation for comparing application architectures.

## References

<a id="ref-1"></a>
**[1]** Paul Clements, Felix Bachmann, Len Bass, David Garlan, James Ivers, Reed Little, Paulo Merson, Robert Nord and Judith Stafford, *Documenting Software Architectures: Views and Beyond*, 2nd ed., Addison-Wesley Professional, 2010, ISBN 978-0-321-55268-6. Prologue, sections P.1.1 and P.1.2. Publisher-hosted chapter excerpt. Accessed 4 November 2026.

<a id="ref-2"></a>
**[2]** Martin Fowler, "Software Architecture Guide," 1 August 2019, sections "What is architecture?" and "Why does architecture matter?" Author's guide. Accessed 3 November 2026.

<a id="ref-3"></a>
**[3]** Martin Fowler, "Presentation Domain Data Layering," 26 August 2015, discussion of presentation, domain logic and data access, module interfaces and dependency direction. Original article. Accessed 3 November 2026.

<a id="ref-4"></a>
**[4]** James Lewis and Martin Fowler, "Microservices," 25 March 2014, introduction and sections "Componentization via Services," "Infrastructure Automation" and "Design for failure." Original article. Accessed 3 November 2026.

<a id="ref-5"></a>
**[5]** Spring Projects contributors, *Spring PetClinic*, repository `spring-projects/spring-petclinic`, commit `500158f732419217507c7656904b8e6aa1bcc0d6`, `README.md`, introductory description. Pinned README. Accessed in the local checkout, 3 November 2026.

Continue with [System vs. application architecture](../system-vs-application-architecture/).