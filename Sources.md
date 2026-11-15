# Sources used on the microsite

This list collects the external sources cited across the current chapters. Numbered references and precise locations remain in the individual chapters. The PetClinic links identify the fixed revisions used for the code comparisons.

## Software architecture and design

- Paul Clements, Felix Bachmann, Len Bass, David Garlan, James Ivers, Reed Little, Paulo Merson, Robert Nord and Judith Stafford, *Documenting Software Architectures: Views and Beyond*, 2nd ed., Addison-Wesley Professional, 2010. [Publisher-hosted chapter excerpt](https://ptgmedia.pearsoncmg.com/images/9780321552686/samplepages/0321552687.pdf).
- Martin Fowler, [*Software Architecture Guide*](https://martinfowler.com/architecture/), 2019.
- Martin Fowler, [*Presentation Domain Data Layering*](https://martinfowler.com/bliki/PresentationDomainDataLayering.html), 2015.
- Simon Brown, *The C4 model*, ["Abstractions"](https://c4model.com/abstractions).
- James Lewis and Martin Fowler, [*Microservices*](https://martinfowler.com/articles/microservices.html), 2014.
- Martin Fowler, [*Monolith First*](https://martinfowler.com/bliki/MonolithFirst.html), 2015.
- D. L. Parnas, *On the Criteria To Be Used in Decomposing Systems into Modules*, *Communications of the ACM* 15(12), 1972. [Digitised article](https://www.cs.lafayette.edu/~gexia/cs301/resources/parnas.html), [DOI](https://doi.org/10.1145/361598.361623).
- Randy Stafford, [*Service Layer*](https://martinfowler.com/eaaCatalog/serviceLayer.html), in Martin Fowler's *Patterns of Enterprise Application Architecture*, 2003.
- Robert C. Martin, [*The Clean Architecture*](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html), 2012.
- Alistair Cockburn, [*Hexagonal Architecture*](https://alistair.cockburn.us/hexagonal-architecture/), 2005.
- INNOQ and the SCS community, [*Self-contained Systems*](https://scs-architecture.org/).
- ISA contributors, [*Independent Systems Architecture*](https://isa-principles.org/).
- Chris Richardson, [*Pattern: Transactional outbox*](https://microservices.io/patterns/data/transactional-outbox.html).

## Framework and Java documentation

- Oracle, [*Java SE 17 API: java.time.Clock*](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/time/Clock.html).
- Spring Data, [*Spring Data JPA Reference: Transactionality*](https://docs.spring.io/spring-data/jpa/reference/jpa/transactions.html).
- Spring Framework, [*Using @Transactional*](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/annotations.html) and [*Transaction Propagation*](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/tx-propagation.html).
- Spring Modulith, [*Fundamentals*](https://docs.spring.io/spring-modulith/reference/fundamentals.html), [*Working with Application Events*](https://docs.spring.io/spring-modulith/reference/events.html) and [*Verifying Application Module Structure*](https://docs.spring.io/spring-modulith/reference/verification.html). The chapters cite version 2.1.1.

## Spring PetClinic codebases

- Spring Projects contributors, [*Spring PetClinic*](https://github.com/spring-projects/spring-petclinic/tree/500158f732419217507c7656904b8e6aa1bcc0d6), commit `500158f732419217507c7656904b8e6aa1bcc0d6`. The chapters use the README, visit form, database schema and code in the `owner` package, especially `VisitController`, `Visit`, `Pet`, `Owner` and `OwnerRepository`.
- Spring PetClinic Community, [*Spring PetClinic Modulith*](https://github.com/spring-petclinic/spring-petclinic-modulith/tree/58c3310e36c7d827959df6af4d64bdeb8d81f1ea), commit `58c3310e36c7d827959df6af4d64bdeb8d81f1ea`. The modular-monolith chapter cites `VisitScheduler`, `VetEventListener` and `VetRoster`.
- Spring PetClinic Community, [*Spring PetClinic Microservices*](https://github.com/spring-petclinic/spring-petclinic-microservices/tree/1d76b00d683e86b62867a6bf59530f8ab301244f), commit `1d76b00d683e86b62867a6bf59530f8ab301244f`. The microservices chapter cites its Compose configuration, visits service, API gateway and configuration server.

## Licence cited with original code excerpts

- Apache Software Foundation, [*Apache License 2.0*](https://www.apache.org/licenses/LICENSE-2.0).
