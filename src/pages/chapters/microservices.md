---
layout: ../../layouts/ChapterLayout.astro
title: 'Microservices'
---

Separate teams may need to release or scale different business functions at different times. Microservices address this by placing those functions in independently deployable services, with explicit communication between them. That independence also introduces network failures and coordination over shared contracts. <sup><a href="#ref-1">[1]</a></sup>

## TL;DR

The community PetClinic separates Customers, Visits and Vets into applications communicating over HTTP. Each owns its persistence model. This enables separate deployment boundaries, while data retrieval can depend on several services. In the inspected implementation, creating a Visit does not call Customers to check ownership.

## From internal modules to applications

Microservices organise software around business capabilities and independently deployable services. Keeping their contracts compatible is part of making independent releases practical. Separate processes alone do not remove that coordination. <sup><a href="#ref-1">[1]</a></sup>

The community PetClinic repository contains separate Customers, Visits and Vets applications. A gateway provides a shared entry point and routes requests to them. The Compose configuration defines separate images, containers and ports, even though the applications belong to one Maven build. Deployment boundaries therefore cannot be inferred from the number of repositories. <sup><a href="#ref-2">[2]</a></sup>

<figure class="architecture-figure">
<div class="diagram-scroll" tabindex="0" role="region" aria-label="Architecture diagram. Scroll horizontally to see the complete figure.">
<img src="../../diagrams/microservices-structure.svg" alt="Browser enters through the API gateway. Customers, Visits and Vets run as separate applications with their own persistence models." style="max-width:100%;height:auto" />
</div>
<figcaption>Application boundaries in the community PetClinic <sup><a href="#ref-2">[2]</a></sup>. Supporting infrastructure is omitted. Physical database placement depends on the deployment configuration.</figcaption>
</figure>

## Trace two operations separately

### Create a Visit

`VisitResource.create` accepts a Visit, assigns the path's `petId` and saves through `VisitRepository`. Its mapping uses `owners/*/pets/{petId}/visits`. The `*` matches the owner portion of the path without assigning it to an owner parameter. This method contains neither a Customers call nor an owner–pet membership check. <sup><a href="#ref-3">[3]</a></sup>

### Assemble Owner details

A different operation does contact multiple services. The gateway's `getOwnerDetails` first retrieves Owner/Pet information from Customers, then requests Visits for those pet IDs and combines the results. A circuit breaker handles failures in a remote call. Here its fallback, the alternative result used on failure, is an empty Visits list. <sup><a href="#ref-4">[4]</a></sup>

<figure class="architecture-figure">
<div class="diagram-scroll" tabindex="0" role="region" aria-label="Architecture diagram. Scroll horizontally to see the complete figure.">
<img src="../../diagrams/microservices-owner-flow.svg" alt="Gateway first retrieves an Owner from Customers, then Visits for the pet IDs, and combines the response. Visits failures use an empty-list fallback." style="max-width:100%;height:auto" />
</div>
<figcaption>Gateway read sequence <sup><a href="#ref-4">[4]</a></sup>. The gateway calls both services and combines their responses.</figcaption>
</figure>

An empty list can hide an important distinction. It may mean “no visits” or “visit history unavailable.” Our UI recommendation is to show those outcomes differently, so a receptionist does not mistake missing information for a complete history.

## A pet ID is a reference, not a consistency protocol

In this sample, the Visits model stores a pet identifier instead of sharing the Customers entity graph. <sup><a href="#ref-3">[3]</a></sup> Knowing that identifier does not establish who currently owns the pet. If booking must verify that relationship, the services need an explicit way to obtain or maintain the required information.

For that additional requirement, we could consider three alternatives.

| Option | Meaning for booking | New question |
| --- | --- | --- |
| Call Customers before saving | Check against an available remote answer | What if the call times out, or ownership changes just afterwards? |
| Keep a local copy of relevant pet data | Check locally known information | How old may the information be? |
| Accept and reconcile later | Treat booking as provisional | How is rejection or correction communicated? |

The [SCS design](../scs-and-isa/) explores the second option. These alternatives extend the inspected method. They do not imply that microservices must always make calls that wait for an immediate response.

## Deployment independence has prerequisites

In our change scenario, Visits needs a new optional field. A compatible rollout could allow old callers to omit it. Making it mandatory immediately would require coordination. Separate processes do not remove that contract decision.

Network delays and partial failures also need explicit treatment, alongside automated build and deployment processes. <sup><a href="#ref-1">[1]</a></sup> The gateway fallback makes that trade concrete. A failed Visits lookup yields a partial response instead of failing the entire Owner-details request.

Owning a persistence model is different from choosing which physical database server stores it. The source demonstrates application and model separation. Determining actual database instances or schemas requires the selected configuration profile and runtime settings. The overview diagram therefore leaves the server count open.

### Keep deployment inputs reproducible

The Compose file uses image names without digests, which identify exact image versions, and the Config Server refers to a separate configuration repository with `main` as its default label. <sup><a href="#ref-2">[2]</a></sup>, <sup><a href="#ref-5">[5]</a></sup> To reproduce a deployment, fix the image versions and external configuration as well as the source revision.

## Evaluate the trade

For a clinic platform with distinct teams and scaling needs, separate applications could be useful. In this example, however, even a simple Owner page crosses multiple applications. The product must explain a complete response, a response missing some information, and a failure.

If one team owns a small application and releases its features together, these extra boundaries may offer little benefit. They become more useful when independent delivery or scaling addresses a concrete need and the team can support the additional operational work.

## References

<a id="ref-1"></a>
**[1]** James Lewis and Martin Fowler, “Microservices,” 25 March 2014, “Componentization via Services,” “Infrastructure Automation” and “Design for failure.” Original article. Accessed 2 November 2026.

<a id="ref-2"></a>
**[2]** Spring PetClinic Community, *Spring PetClinic Microservices*, commit `1d76b00d683e86b62867a6bf59530f8ab301244f`, docker-compose.yml. Accessed 2 November 2026.

<a id="ref-3"></a>
**[3]** Spring PetClinic Community, same commit, `spring-petclinic-visits-service/src/main/java/org/springframework/samples/petclinic/visits/web/VisitResource.java`, `create` and `read`. Pinned source. Accessed 2 November 2026.

<a id="ref-4"></a>
**[4]** Spring PetClinic Community, same commit, `spring-petclinic-api-gateway/src/main/java/org/springframework/samples/petclinic/api/boundary/web/ApiGatewayController.java`, `getOwnerDetails`, `addVisitsToOwner`, `emptyVisitsForPets`. Pinned source. Accessed 2 November 2026.

<a id="ref-5"></a>
**[5]** Spring PetClinic Community, same commit, `spring-petclinic-config-server/src/main/resources/application.yml`. External configuration repository and default label. Accessed 2 November 2026.

Return to [Modular Monolith](../modular-monolith/). Continue with [Self-contained Systems and ISA](../scs-and-isa/).
