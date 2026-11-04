export const chapterGroups = [
  {
    title: '01 Foundations',
    chapters: [
      { slug: 'what-is-software-architecture', title: 'What is software architecture?' },
      { slug: 'system-vs-application-architecture', title: 'System vs. application architecture' },
    ],
  },
  {
    title: '02 System architecture',
    chapters: [
      { slug: 'monolith', title: 'Monolith' },
      { slug: 'modular-monolith', title: 'Modular Monolith' },
      { slug: 'microservices', title: 'Microservices' },
      { slug: 'scs-and-isa', title: 'Self-contained Systems and ISA' },
    ],
  },
  {
    title: '03 Application architecture',
    chapters: [
      { slug: 'visit-use-case', title: 'The Visit use case' },
      { slug: 'layered-architecture', title: 'Layered Architecture' },
      { slug: 'clean-architecture', title: 'Clean Architecture' },
      { slug: 'hexagonal-architecture', title: 'Hexagonal Architecture / Ports and Adapters' },
      { slug: 'onion-architecture', title: 'Onion Architecture' },
      { slug: 'architecture-comparison', title: 'Architecture comparison' },
    ],
  },
];

export const base = import.meta.env.BASE_URL.replace(/\/$/, '');
