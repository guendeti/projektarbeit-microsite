export const learningAreas = [
  {
    title: '01 Grundlagen',
    chapters: [
      { slug: 'softwarearchitektur', title: 'Was ist Softwarearchitektur?' },
      { slug: 'system-und-codeebene', title: 'System- und Anwendungsebene' },
    ],
  },
  {
    title: '02 Spring PetClinic',
    chapters: [
      { slug: 'spring-petclinic', title: 'Spring PetClinic kennenlernen' },
    ],
  },
  {
    title: '03 Systemarchitektur',
    chapters: [
      { slug: 'monolith', title: 'Monolith' },
      { slug: 'modular-monolith', title: 'Modular Monolith' },
      { slug: 'microservices', title: 'Microservices' },
      { slug: 'scs-isa', title: 'Self-contained Systems und ISA' },
    ],
  },
  {
    title: '04 Anwendungsarchitektur',
    chapters: [
      { slug: 'visit-use-case', title: 'Visit-Use-Case' },
      { slug: 'layered-architecture', title: 'Layered Architecture' },
      { slug: 'clean-architecture', title: 'Clean Architecture' },
      { slug: 'hexagonal-architecture', title: 'Hexagonal Architecture' },
      { slug: 'onion-architecture', title: 'Onion Architecture' },
      { slug: 'vergleich', title: 'Architekturvergleich' },
    ],
  },
];

export const base = import.meta.env.BASE_URL.replace(/\/$/, '');
