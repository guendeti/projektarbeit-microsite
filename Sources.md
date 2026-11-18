# Sources used on the microsite

This list collects the external sources cited across the current chapters. Numbered references and precise locations remain in the individual chapters. The PetClinic links identify the fixed revisions used for the code comparisons.

## Software architecture and design

- Paul Clements, Felix Bachmann, Len Bass, David Garlan, James Ivers, Reed Little, Paulo Merson, Robert Nord and Judith Stafford, *Documenting Software Architectures: Views and Beyond*, 2nd ed., Addison-Wesley Professional, 2010. [Publisher-hosted chapter excerpt](https://ptgmedia.pearsoncmg.com/images/9780321552686/samplepages/0321552687.pdf).
- Martin Fowler, [*Software Architecture Guide*](https://martinfowler.com/architecture/), 2019.
- Martin Fowler, [*Presentation Domain Data Layering*](https://martinfowler.com/bliki/PresentationDomainDataLayering.html), 2015.
- Simon Brown, *The C4 model*, ["Abstractions"](https://c4model.com/abstractions).
- James Lewis and Martin Fowler, [*Microservices*](https://martinfowler.com/articles/microservices.html), 2014.
- Martin Fowler, [*Monolith First*](https://martinfowler.com/bliki/MonolithFirst.html), 2015.
- Jeffrey Palermo, [*The Onion Architecture: Part 1*](https://jeffreypalermo.com/2008/07/the-onion-architecture-part-1/) and [*Part 2*](https://jeffreypalermo.com/2008/07/the-onion-architecture-part-2/), 2008.
- Randy Stafford, [*Service Layer*](https://martinfowler.com/eaaCatalog/serviceLayer.html), in Martin Fowler's *Patterns of Enterprise Application Architecture*, 2003.
- Robert C. Martin, [*The Clean Architecture*](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html), 2012.
- Alistair Cockburn, [*Hexagonal Architecture*](https://alistair.cockburn.us/hexagonal-architecture/), 2005.
- INNOQ and the SCS community, [*Self-contained Systems*](https://scs-architecture.org/) and [*SCS vs. Microservices*](https://scs-architecture.org/vs-ms.html).
- ISA contributors, [*Independent Systems Architecture*](https://isa-principles.org/).
- Chris Richardson, [*Pattern: API Gateway*](https://microservices.io/patterns/apigateway.html).
- Chris Richardson, [*Pattern: Transactional outbox*](https://microservices.io/patterns/data/transactional-outbox.html).

## Framework documentation

- Spring Modulith team, *Spring Modulith Reference Documentation*, version 2.1.1. [*Fundamentals*](https://github.com/spring-projects/spring-modulith/blob/2.1.1/src/docs/antora/modules/ROOT/pages/fundamentals.adoc).

## Spring PetClinic codebases

- Spring Projects contributors, [*Spring PetClinic*](https://github.com/spring-projects/spring-petclinic). <a href="https://github.com/guendeti/spring-petclinic/tree/500158f732419217507c7656904b8e6aa1bcc0d6" target="_blank" rel="noopener noreferrer">Original revision in the fork</a>, commit `500158f732419217507c7656904b8e6aa1bcc0d6`. The chapters use the README, visit form, database schema and code in the `owner` package, especially `VisitController`, `Visit`, `Pet`, `Owner` and `OwnerRepository`.

- Project fork, <a href="https://github.com/guendeti/spring-petclinic/tree/bdd7783bf9c778882b7ec77e0f0a2f402e20b247" target="_blank" rel="noopener noreferrer">Spring PetClinic Visit examples</a>, commit `bdd7783bf9c778882b7ec77e0f0a2f402e20b247`. This revision contains the Layered, Clean and Onion variants and their tests. The Clean implementation also illustrates Ports and Adapters.

- Spring PetClinic Microservices contributors, *Spring PetClinic Microservices*, commit `e8b747ab522721076cacb5cf688eb8a54ba8c5c9`. The Microservices chapter cites <a href="https://github.com/spring-petclinic/spring-petclinic-microservices/blob/e8b747ab522721076cacb5cf688eb8a54ba8c5c9/spring-petclinic-api-gateway/src/main/java/org/springframework/samples/petclinic/api/boundary/web/ApiGatewayController.java#L54-L65" target="_blank" rel="noopener noreferrer"><code>ApiGatewayController.getOwnerDetails</code></a> as an example of gateway aggregation.

## Licence cited with original code excerpts

- Apache Software Foundation, [*Apache License 2.0*](https://www.apache.org/licenses/LICENSE-2.0).
