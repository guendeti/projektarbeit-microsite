---
layout: ../../layouts/ChapterLayout.astro
title: 'Modular Monolith'
---

In the [Monolith chapter](../monolith/), we saw how booking visits and looking up vets can run in the same application. Now imagine adding reminders to our clinic example. To send a reminder, the application needs the owner's contact details. One way to get them is to load the owner's record and read the relevant fields. That works while the details are stored there. But what happens if the clinic starts keeping contact details separately?

## TL;DR

A modular monolith is organised into modules that run and ship as one application. In our example, the owner module could offer a contact lookup. The reminder code can keep calling it even if the owner module changes how it stores those details.

## What makes a useful module boundary?

To see what a change in storage would mean for our reminder, let's trace how it gets the owner's contact details. In both designs the reminder needs the same information. The difference is which part of the application needs to know where to find it.

<figure class="architecture-figure">
<div class="diagram-scroll" tabindex="0" role="region" aria-label="Two reminder designs. Scroll horizontally to see the complete figure.">
<img src="../../diagrams/modular-reminder-designs.svg" alt="Two possible reminder designs. On the left, the reminder gets an owner record and reads its contact fields. On the right, the reminder asks the owner module for contact details, and the owner module reads them from storage." style="max-width:100%;height:auto" />
</div>
<figcaption>Two possible designs for the same reminder feature.</figcaption>
</figure>

On the left, the reminder relies on the fields it finds in the owner's record. If those fields move, the reminder code has to change too. On the right, the reminder passes an owner ID and receives the contact details it needs. As long as that lookup stays the same, the owner module can fetch the details from wherever it keeps them. This is **information hiding**. The module keeps a decision about storage to itself. <sup><a href="#ref-1">[1]</a></sup>

From the owner module's point of view, the lookup is part of its **provided interface**. From the reminder module's point of view, it is part of its **required interface**. Both modules run in one application, so the reminder can make the request through an ordinary Java method call. <sup><a href="#ref-2">[2]</a></sup>

## Where the boundaries fall in Spring PetClinic

With that example in mind, let's look at how the [original Spring PetClinic](../what-is-software-architecture/#about-the-spring-petclinic-example) is organised. The `owner` package handles owners, pets and visits, while `vet` handles the vet directory. Neither package imports classes from the other. Both use the shared `Person` class in `model`. <sup><a href="#ref-3">[3]</a></sup>

Read each arrow in the diagram as “uses code from”. All four packages run in the same application.

<figure class="architecture-figure">
<div class="diagram-scroll" tabindex="0" role="region" aria-label="Architecture diagram. Scroll horizontally to see the complete figure.">
<img src="../../diagrams/modular-structure.svg" alt="Four packages in the original Spring PetClinic. Arrows from owner and vet point to model. There are no imports between owner and vet, or between system and the other three packages." style="max-width:100%;height:auto" />
</div>
<figcaption>Imports between the four packages directly below the main application package. Each arrow points to the package whose code is used. Own diagram based on the original Spring PetClinic code. <sup><a href="#ref-3">[3]</a></sup></figcaption>
</figure>

The package structure gives us a place to draw the boundary. What crosses it depends on the types the package exposes. For instance, `VisitController` is package-private, while `OwnerRepository` is public and lets callers load and save owners. If we added the reminder from our example, it would only need the contact lookup. Giving it that operation would let the owner module keep control of how it reads and stores those details. <sup><a href="#ref-1">[1]</a></sup> <sup><a href="#ref-3">[3]</a></sup>

## When one deployment still fits

Back in our clinic example, the team can change how it stores contact details and keep the reminder working through the same lookup. Both features still ship together. If the clinic starts a second instance to handle more bookings, that instance also runs the vet directory. What would it take to run more copies of booking alone? That's the question we pick up in [Microservices](../microservices/). <sup><a href="#ref-4">[4]</a></sup>

## References

<a id="ref-1"></a>
**[1]** Paul Clements, Felix Bachmann, Len Bass, David Garlan, James Ivers, Reed Little, Paulo Merson, Robert Nord and Judith Stafford, *Documenting Software Architectures: Views and Beyond*, 2nd ed., Addison-Wesley Professional, 2010, ISBN 978-0-321-55268-6. [Publisher-hosted chapter excerpt](https://ptgmedia.pearsoncmg.com/images/9780321552686/samplepages/0321552687.pdf#page=54), prologue, section P.4.1, p. 30. Accessed 18 November 2026.

<a id="ref-2"></a>
**[2]** Spring Modulith team, *Spring Modulith Reference Documentation*, version 2.1.1, "[Fundamentals](https://github.com/spring-projects/spring-modulith/blob/2.1.1/src/docs/antora/modules/ROOT/pages/fundamentals.adoc)" (provided and required interfaces). Accessed 17 November 2026.

<a id="ref-3"></a>
**[3]** Spring Projects contributors, *Spring PetClinic*, commit `500158f732419217507c7656904b8e6aa1bcc0d6`. <a href="https://github.com/guendeti/spring-petclinic/tree/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/java/org/springframework/samples/petclinic" target="_blank" rel="noopener noreferrer">Application packages</a>, <a href="https://github.com/guendeti/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/java/org/springframework/samples/petclinic/owner/Owner.java#L50" target="_blank" rel="noopener noreferrer">Owner</a>, <a href="https://github.com/guendeti/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/java/org/springframework/samples/petclinic/vet/Vet.java#L45" target="_blank" rel="noopener noreferrer">Vet</a>, <a href="https://github.com/guendeti/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/java/org/springframework/samples/petclinic/owner/VisitController.java#L43" target="_blank" rel="noopener noreferrer">VisitController</a> and <a href="https://github.com/guendeti/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/java/org/springframework/samples/petclinic/owner/OwnerRepository.java#L36" target="_blank" rel="noopener noreferrer">OwnerRepository</a>. Accessed 17 November 2026.

<a id="ref-4"></a>
**[4]** James Lewis and Martin Fowler, "[Microservices](https://martinfowler.com/articles/microservices.html)," 25 March 2014, introduction and "Componentization via Services." Accessed 17 November 2026.
