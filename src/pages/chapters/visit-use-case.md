---
layout: ../../layouts/ChapterLayout.astro
title: 'The Visit use case'
---

Consider a familiar task at the pet clinic. A receptionist opens an owner's page, chooses a pet and clicks “Add Visit”. In [Spring PetClinic](../what-is-software-architecture/#about-the-spring-petclinic-example), where does the code decide whether the booking can go ahead, and how does the visit reach the database? Following one booking gives us a starting point for comparing four ways to organise the application code.

## TL;DR

In the original Spring PetClinic, one web controller handles the booking form, rejects dates of today or earlier and saves the visit through the owner repository. Another entry point would need to extract the rule from the web controller to reuse it independently. Our fork rebuilds only this operation in three variants, one layered, one for Clean and Hexagonal Architecture and one in Onion style, and checks all of them against the same cases.

## What the receptionist does

The booking form shows the selected pet and asks for a date and a short description. The date starts at tomorrow, also the earliest date the field allows. The browser can stop the receptionist from submitting an earlier date. If a request with today's date or a past date reaches the server, the server checks it too and returns the form with the message “Visit date must be in the future”. When all checks pass, the receptionist returns to the owner's page and sees “Your visit has been booked”. <sup><a href="#ref-1">[1]</a></sup>

## What happens in the code

Those two outcomes come from the same controller. To see where the paths split, follow the form from the first request through to submission. PetClinic prepares the owner, pet and a new visit before handling each request. The decision to save comes after the submitted values have been checked. <sup><a href="#ref-1">[1]</a></sup>

<figure class="architecture-figure">
<div class="diagram-scroll" tabindex="0" role="region" aria-label="Architecture diagram. Scroll horizontally to see the complete figure.">
<img src="../../diagrams/visit-flow.svg" alt="GET prepares the owner, pet and a new visit dated tomorrow and renders the form. POST prepares again, binds and validates the input and checks that the date is in the future if a date is present after binding. On errors the form is shown again. Otherwise the visit is added through the owner, saved, and the user is redirected." style="max-width:100%;height:auto" />
</div>
<figcaption>Order in which the original VisitController handles the two requests. Own diagram of the pinned source code. <sup><a href="#ref-1">[1]</a></sup></figcaption>
</figure>

The method below handles the second request. Its two `if` statements show where validation can send the receptionist back to the form, before the call to `owners.save(owner)`. <sup><a href="#ref-1">[1]</a></sup>

<p class="code-source"><span><strong>VisitController.java</strong><small>Original Spring PetClinic</small></span><a href="https://github.com/guendeti/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/java/org/springframework/samples/petclinic/owner/VisitController.java#L97-L112" target="_blank" rel="noopener noreferrer" aria-label="View VisitController.java on GitHub (opens in a new tab)">View on GitHub</a></p>

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

The first check runs if the visit has a date after Spring MVC binds the submitted values to it. The second also catches errors already recorded during binding and validation, including a blank description or one longer than 255 characters. <sup><a href="#ref-1">[1]</a></sup>

The visit is not saved by a repository of its own. `Owner` holds its pets, and each `Pet` holds its visits. The relationships are configured so that saving the owner also saves new visits, which is why the controller calls `owners.save(owner)`. <sup><a href="#ref-1">[1]</a></sup>

<figure class="architecture-figure">
<div class="diagram-scroll" tabindex="0" role="region" aria-label="Architecture diagram. Scroll horizontally to see the complete figure.">
<img src="../../diagrams/visit-dependencies.svg" alt="VisitController uses OwnerRepository and the Visit type. OwnerRepository uses Owner. Owner contains Pets, and each Pet contains Visits." style="max-width:100%;height:auto" />
</div>
<figcaption>Source code dependencies and model relationships in the original code. Own diagram of the pinned source code. <sup><a href="#ref-1">[1]</a></sup></figcaption>
</figure>

## Why this is a good starting point

For a small form, this design works well. Now suppose the clinic also wants to import upcoming visits from a file. The import needs the same date rule, but the original controller reports errors through the web framework's `BindingResult`. The following chapters explore where that rule can live so a second caller can use it, and how each booking operation reaches the same stored records.

## Our refactorings

We refactored Spring PetClinic starting from the same official commit and kept the original booking route. All three variants sit alongside it in <a href="https://github.com/guendeti/spring-petclinic/tree/bdd7783bf9c778882b7ec77e0f0a2f402e20b247/src/main/java/org/springframework/samples/petclinic/visits" target="_blank" rel="noopener noreferrer">the visits package in our PetClinic fork</a>.

| Package | Used in the chapter |
| --- | --- |
| `visits.layered` | [Layered Architecture](../layered-architecture/) |
| `visits.clean` | [Clean Architecture](../clean-architecture/) and [Hexagonal Architecture](../hexagonal-architecture/) |
| `visits.onion` | [Onion Architecture](../onion-architecture/) |

The three variants sit side by side so we can compare the code that handles submission. They reuse the same form and the same helper to load owner and pet details when the form is shown. That helper uses `OwnerRepository` directly, so the controllers still depend on the repository for that part of the request. You can [try the original and each variant](../architecture-comparison/#trying-the-variants-yourself) using the routes in the comparison chapter.

### What if the request has no date?

The original controller prepares a `Visit` with tomorrow's date before Spring MVC binds the submitted values. If the request omits the `date` field, tomorrow stays in place. If the request sends the field with an empty value, binding sets the date to `null`. The original date check skips `null`, so the visit is saved without a date if the other checks pass. <sup><a href="#ref-1">[1]</a></sup>

All three variants show tomorrow's date when opening the form and require a date when booking. An omitted field or an empty value produces a date error when the form is submitted. The variants still check the description at the form.

## The same cases for every variant

We use the same cases for all three variants. The <a href="https://github.com/guendeti/spring-petclinic/blob/bdd7783bf9c778882b7ec77e0f0a2f402e20b247/src/test/java/org/springframework/samples/petclinic/visits/VisitBookingVariantsTests.java" target="_blank" rel="noopener noreferrer">booking tests</a> check what gets stored. For example, a valid booking for tomorrow is saved, while a booking for today is rejected. The <a href="https://github.com/guendeti/spring-petclinic/blob/bdd7783bf9c778882b7ec77e0f0a2f402e20b247/src/test/java/org/springframework/samples/petclinic/visits/VisitVariantControllersTests.java" target="_blank" rel="noopener noreferrer">controller tests</a> check what happens at the form, including the date error the receptionist sees.

## References

<a id="ref-1"></a>
**[1]** Spring Projects contributors, *Spring PetClinic*, repository `spring-projects/spring-petclinic`, commit `500158f732419217507c7656904b8e6aa1bcc0d6`, <a href="https://github.com/guendeti/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/java/org/springframework/samples/petclinic/owner/VisitController.java" target="_blank" rel="noopener noreferrer">VisitController.java</a>, <a href="https://github.com/guendeti/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/java/org/springframework/samples/petclinic/owner/Visit.java#L39-L52" target="_blank" rel="noopener noreferrer">Visit.java</a>, <a href="https://github.com/guendeti/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/java/org/springframework/samples/petclinic/owner/Owner.java" target="_blank" rel="noopener noreferrer">Owner.java</a>, <a href="https://github.com/guendeti/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/java/org/springframework/samples/petclinic/owner/Pet.java" target="_blank" rel="noopener noreferrer">Pet.java</a>, <a href="https://github.com/guendeti/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/resources/templates/pets/createOrUpdateVisitForm.html" target="_blank" rel="noopener noreferrer">createOrUpdateVisitForm.html</a>, <a href="https://github.com/guendeti/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/resources/templates/fragments/inputField.html#L14" target="_blank" rel="noopener noreferrer">inputField.html</a> and <a href="https://github.com/guendeti/spring-petclinic/blob/500158f732419217507c7656904b8e6aa1bcc0d6/src/main/resources/messages/messages.properties#L9" target="_blank" rel="noopener noreferrer">messages.properties</a>. Accessed 17 November 2026.
