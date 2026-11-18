---
layout: ../../layouts/ChapterLayout.astro
title: 'The Visit use case'
---

Consider a familiar task at the pet clinic. A receptionist opens an owner's page, chooses a pet and clicks “Add Visit”. In [Spring PetClinic](../what-is-software-architecture/#about-the-spring-petclinic-example), where does the code decide whether the booking can go ahead, and how does the visit reach the database? Following one booking gives us a starting point for comparing four ways to organise the application code.

## TL;DR

In the original Spring PetClinic, one web controller handles the booking form, checks that the visit date lies in the future and saves the visit through the owner repository. Another entry point would need to extract the rule from the web controller to reuse it independently. Our fork rebuilds only this operation in three variants, one layered, one for Clean and Hexagonal Architecture and one in Onion style, and checks all of them against the same cases.

## What the receptionist does

The booking form shows the selected pet and asks for a date and a short description. The date starts at tomorrow, also the earliest date the field allows. The browser can stop the receptionist from submitting an earlier date. If a request with today's date or a past date reaches the server, the server checks it too and returns the form with the message “Visit date must be in the future”. When all checks pass, the receptionist returns to the owner's page and sees “Your visit has been booked”. <sup><a href="#ref-1">[1]</a></sup>

## What happens in the code

`VisitController` coordinates the request. Before displaying or processing the form, it loads the owner through `OwnerRepository`, finds the selected pet and attaches a new visit to it in memory. At this point the visit already has a date, but it has yet to be saved. When the form is submitted, the following method runs. <sup><a href="#ref-1">[1]</a></sup>

**Original Spring PetClinic · <a href="https://github.com/guendeti/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/java/org/springframework/samples/petclinic/owner/VisitController.java#L97-L112" target="_blank" rel="noopener noreferrer"><code>VisitController.java</code></a>**

```java
@PostMapping("/owners/{ownerId}/pets/{petId}/visits/new")
public String processNewVisitForm(@ModelAttribute Owner owner, @PathVariable int petId, @Valid Visit visit,
        BindingResult result, RedirectAttributes redirectAttributes) {
    if (visit.getDate() != null && !visit.getDate().isAfter(LocalDate.now())) {
        result.rejectValue("date", "typeMismatch.visitDate");
    }

    if (result.hasErrors()) {
        return "pets/createOrUpdateVisitForm";
    }

    owner.addVisit(petId, visit);
    this.owners.save(owner);
    redirectAttributes.addFlashAttribute("message", "Your visit has been booked");
    return "redirect:/owners/{ownerId}";
}
```

Copyright 2012–2025 the original authors, licensed under the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0).

Look at the two `if` statements. The first checks the date only when one was supplied. The second checks `result.hasErrors()`, which also includes errors from form binding and validation. For example, the annotations on `Visit` require the description to contain some text beyond whitespace and limit it to 255 characters. Any error sends the receptionist back to the form. Only the success path reaches `owners.save(owner)`. <sup><a href="#ref-1">[1]</a></sup>

<figure class="architecture-figure">
<div class="diagram-scroll" tabindex="0" role="region" aria-label="Architecture diagram. Scroll horizontally to see the complete figure.">
<img src="../../diagrams/visit-flow.svg" alt="GET prepares the owner, pet and a new visit dated tomorrow and renders the form. POST prepares again, binds and validates the input and checks that any supplied date is in the future. On errors the form is shown again. Otherwise the visit is added through the owner, saved, and the user is redirected." style="max-width:100%;height:auto" />
</div>
<figcaption>Order in which the original VisitController handles the two requests. Own diagram of the pinned source code. <sup><a href="#ref-1">[1]</a></sup></figcaption>
</figure>

The visit is not saved by a repository of its own. `Owner` holds its pets, and each `Pet` holds its visits. The relationships are configured so that saving the owner also saves new visits, which is why the controller calls `owners.save(owner)`. <sup><a href="#ref-1">[1]</a></sup>

<figure class="architecture-figure">
<div class="diagram-scroll" tabindex="0" role="region" aria-label="Architecture diagram. Scroll horizontally to see the complete figure.">
<img src="../../diagrams/visit-dependencies.svg" alt="VisitController uses OwnerRepository and the Visit type. OwnerRepository uses Owner. Owner contains Pets, and each Pet contains Visits." style="max-width:100%;height:auto" />
</div>
<figcaption>Source code dependencies and model relationships in the original code. Own diagram of the pinned source code. <sup><a href="#ref-1">[1]</a></sup></figcaption>
</figure>

## Why this is a good starting point

For a small form, this design is perfectly reasonable. It becomes a problem once the clinic wants to book visits in a second way, for example through an app for pet owners or an import from another system. The date rule lives inside a web controller and reports its result through `BindingResult`, a class of the web framework. A second entry point could not reuse the rule without also depending on the web layer. The rule can be exercised through the controller, while a storage integration test requires a database.

This is what the following chapters change. Each variant moves the rule and the storage into a different place and uses dependencies in a different way.

## Our refactorings

We refactored Spring PetClinic starting from the same official commit and kept the original booking route. All three variants sit alongside it in <a href="https://github.com/guendeti/spring-petclinic/tree/bdd7783bf9c778882b7ec77e0f0a2f402e20b247/src/main/java/org/springframework/samples/petclinic/visits" target="_blank" rel="noopener noreferrer">the visits package in our PetClinic fork</a>.

| Package | Used in the chapter | Address of the booking form |
| --- | --- | --- |
| `visits.layered` | [Layered Architecture](../layered-architecture/) | `/layered/owners/{ownerId}/pets/{petId}/visits/new` |
| `visits.clean` | [Clean Architecture](../clean-architecture/) and [Hexagonal Architecture](../hexagonal-architecture/) | `/clean/owners/{ownerId}/pets/{petId}/visits/new` |
| `visits.onion` | [Onion Architecture](../onion-architecture/) | `/onion/owners/{ownerId}/pets/{petId}/visits/new` |

Every variant uses the existing booking form and changes only what happens when it is submitted. Showing the form, with the owner and pet, uses the same small helper class in all variants, because it is not part of the comparison. This helper reads `OwnerRepository` directly. For displaying the form, the controllers of all variants therefore still depend on the repository, past the layers and ports of the following chapters. A real application would choose one structure. The variants sit side by side only so that they can be compared and tested together.

We deliberately changed one detail of the behaviour. The original code accepts a visit without a date, because the date rule skips empty values and no other check requires a date. All our variants reject a missing date. <sup><a href="#ref-1">[1]</a></sup> The web form checks that the description contains text and is at most 255 characters long. None of the three booking methods checks the description itself. In all three variants, loading and saving use separate repository calls, with no transaction around the whole booking operation.

## The same cases for every variant

To be sure that the variants really do the same thing, they all have to pass the same cases. The cases run as automated tests against all three variants and the real database mapping. A second test class sends form requests to each variant's controller for a valid booking, a date today and an empty description, and checks that each form can be displayed.

| Case | Expected result |
| --- | --- |
| Valid owner and pet, date tomorrow | The visit is stored |
| Date today | Rejected, nothing is stored |
| Date in the past | Rejected, nothing is stored |
| No date | Rejected, nothing is stored |
| Pet belongs to another owner | Rejected, nothing is stored |
| Owner does not exist | Rejected, nothing is stored |
| Empty description | The form shows an error |

All listed cases pass for the three variants. See <a href="https://github.com/guendeti/spring-petclinic/blob/bdd7783bf9c778882b7ec77e0f0a2f402e20b247/src/test/java/org/springframework/samples/petclinic/visits/VisitBookingVariantsTests.java" target="_blank" rel="noopener noreferrer"><code>VisitBookingVariantsTests</code></a> for the shared booking cases and <a href="https://github.com/guendeti/spring-petclinic/blob/bdd7783bf9c778882b7ec77e0f0a2f402e20b247/src/test/java/org/springframework/samples/petclinic/visits/VisitVariantControllersTests.java" target="_blank" rel="noopener noreferrer"><code>VisitVariantControllersTests</code></a> for the form requests.

## References

<a id="ref-1"></a>
**[1]** Spring Projects contributors, *Spring PetClinic*, repository `spring-projects/spring-petclinic`, commit `500158f732419217507c7656904b8e6aa1bcc0d6`, <a href="https://github.com/guendeti/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/java/org/springframework/samples/petclinic/owner/VisitController.java" target="_blank" rel="noopener noreferrer">VisitController.java</a>, <a href="https://github.com/guendeti/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/java/org/springframework/samples/petclinic/owner/Visit.java#L39-L52" target="_blank" rel="noopener noreferrer">Visit.java</a>, <a href="https://github.com/guendeti/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/java/org/springframework/samples/petclinic/owner/Owner.java" target="_blank" rel="noopener noreferrer">Owner.java</a>, <a href="https://github.com/guendeti/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/java/org/springframework/samples/petclinic/owner/Pet.java" target="_blank" rel="noopener noreferrer">Pet.java</a>, <a href="https://github.com/guendeti/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/resources/templates/pets/createOrUpdateVisitForm.html" target="_blank" rel="noopener noreferrer">createOrUpdateVisitForm.html</a>, <a href="https://github.com/guendeti/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/resources/templates/fragments/inputField.html#L14" target="_blank" rel="noopener noreferrer">inputField.html</a> and <a href="https://github.com/guendeti/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/resources/messages/messages.properties#L9" target="_blank" rel="noopener noreferrer">messages.properties</a>. Accessed 17 November 2026.

Return to [Self-contained Systems and ISA](../scs-and-isa/). Continue with [Layered Architecture](../layered-architecture/).
