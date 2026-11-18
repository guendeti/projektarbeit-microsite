---
layout: ../../layouts/ChapterLayout.astro
title: 'What is software architecture?'
---

Software architecture is about how a software system is organised. It describes how responsibilities are divided and how different parts work together. These choices affect more than the appearance of the code. They influence how well the system meets its requirements and how much work future changes require. <sup><a href="#ref-1">[1]</a></sup> <sup><a href="#ref-2">[2]</a></sup>

## TL;DR

Architecture shapes where responsibilities sit and how parts of the software depend on one another. Separating a rule can make it easier to reuse, but the extra boundary adds work. The goal is to organise the software around its real requirements while understanding what each choice costs.

## What makes a decision architectural?

Imagine we are building an application for a pet clinic. Receptionists use a form to book visits for pets. They select a pet, enter a date and provide a short description, and the application checks the information before saving the visit.

Now the owner of the clinic asks us to prevent bookings on days when the clinic is closed. We could add that check directly to the code that handles the form, but what if the clinic later wants to let staff reschedule existing visits? Since the same rule would apply to both operations, we need to decide where it belongs.

We could repeat the check in both places or keep it in a part of the application that both operations use. Either choice affects how the code is organised and where a later change to the rule must be made. Whether we call this an architectural decision depends on how important the rule is and how much of the application the choice affects. There is no strict dividing line between architecture and other design decisions. <sup><a href="#ref-2">[2]</a></sup>

## Responsibilities, boundaries and dependencies

In our pet clinic example, the application receives the booking details, checks whether the clinic is open on the selected date and saves the visit. Each of these tasks is a **responsibility**. The form code may handle all three, but keeping the booking rule in one place becomes more useful when rescheduling must follow it too. <sup><a href="#ref-3">[3]</a></sup>

A **boundary** separates the parts of an application that have different responsibilities. In our example, we could separate form handling and booking rules. Both parts would still work together through a call to the rule-checking code. The form handler would pass the selected date to that code instead of checking the date itself. The rescheduling operation could then use the same rules. <sup><a href="#ref-3">[3]</a></sup>

A **dependency** exists when one part of an application relies on another. In our example, the form handler depends on the booking rule because it uses that rule to check the selected date. However, the booking rule does not need to know anything about the form. It can receive the selected date without depending on form-handling code, allowing other operations, such as rescheduling visits, to use the same rule. <sup><a href="#ref-3">[3]</a></sup>

## Understanding architectural trade-offs

How should we decide where to place the booking rule? The answer depends on the application's requirements and the consequences of each approach.

Separating the booking rule from the form makes it easier to reuse, but also adds code to maintain. If the form is the only place that needs the rule, this extra structure may offer little benefit. Once rescheduling must follow the same rules, the separation becomes more useful. This is a **trade-off**, where gaining one benefit comes with certain costs.

Other requirements raise different questions. The clinic may need to protect sensitive information, handle storage failures or keep booking responsive when many staff members use it. Security, reliability and performance can matter just as much as making the code easy to change. <sup><a href="#ref-1">[1]</a></sup>

So far, we have looked at responsibilities and dependencies within one application. These are questions of application architecture. System architecture considers the wider arrangement of applications and how they communicate. The next chapter examines this distinction more closely. <sup><a href="#ref-4">[4]</a></sup>

## About the Spring PetClinic example

Spring PetClinic is an open-source sample application for a pet clinic. In our examples, a receptionist opens an owner's page, chooses a pet and records a visit with a date and a short description. The original application checks the visit date and saves the visit. The rule about clinic opening days above is a hypothetical change. <sup><a href="#ref-5">[5]</a></sup>

Throughout the site, **Original Spring PetClinic** identifies code from the [official project](https://github.com/spring-projects/spring-petclinic). **Our refactoring** and **Our tests** identify code we added. The code links open the matching revision in <a href="https://github.com/guendeti/spring-petclinic" target="_blank" rel="noopener noreferrer">our PetClinic fork</a>. A **proposed design** shows how the pet clinic could work with different boundaries, for example if booking ran as a separate application. You can follow the [original booking from form to database](../visit-use-case/) for more detail.

## References

<a id="ref-1"></a>
**[1]** Paul Clements, Felix Bachmann, Len Bass, David Garlan, James Ivers, Reed Little, Paulo Merson, Robert Nord and Judith Stafford, *Documenting Software Architectures: Views and Beyond*, 2nd ed., Addison-Wesley Professional, 2010, ISBN 978-0-321-55268-6. [Publisher-hosted chapter excerpt](https://ptgmedia.pearsoncmg.com/images/9780321552686/samplepages/0321552687.pdf), prologue, sections P.1.1 and P.1.2. Accessed 4 November 2026.

<a id="ref-2"></a>
**[2]** Martin Fowler, "[Software Architecture Guide](https://martinfowler.com/architecture/)," 1 August 2019, sections "What is architecture?", "Why does architecture matter?" and "Application Architecture". Accessed 3 November 2026.

<a id="ref-3"></a>
**[3]** Martin Fowler, "[Presentation Domain Data Layering](https://martinfowler.com/bliki/PresentationDomainDataLayering.html)," 26 August 2015, discussion of presentation, domain logic and data access, and module interfaces. Accessed 3 November 2026.

<a id="ref-4"></a>
**[4]** Simon Brown, *The C4 model*, ["Abstractions"](https://c4model.com/abstractions), overview of software systems, containers, components and code. Accessed 15 November 2026.

<a id="ref-5"></a>
**[5]** Spring Projects contributors, *Spring PetClinic*, repository `spring-projects/spring-petclinic`, commit `500158f732419217507c7656904b8e6aa1bcc0d6`, <a href="https://github.com/guendeti/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/README.md" target="_blank" rel="noopener noreferrer">README.md</a>, sample application, and <a href="https://github.com/guendeti/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/java/org/springframework/samples/petclinic/owner/VisitController.java#L95-L109" target="_blank" rel="noopener noreferrer">VisitController.java</a> for the date check and save. Pinned source. Accessed in the local checkout, 3 November 2026.
