const scenarios = {
  microservices: {
    found: {
      lookup: '200 OK. The pet belongs to this owner.',
      outcome: 'Visit saved',
      message: 'The receptionist sees a booking confirmation.',
    },
    notFound: {
      lookup: '404 Not Found. Owners could not find that owner and pet together.',
      outcome: 'Booking stopped · No visit saved',
      message: 'The receptionist is asked to check the selected owner and pet.',
    },
    timeout: {
      lookup: 'Timeout. Visits stops waiting for a reply from Owners.',
      outcome: 'Booking stopped · No visit saved',
      message: 'The receptionist is asked to try again later.',
    },
  },
  scs: {
    before: {
      owners: 'Owner 42 · version 7',
      visits: 'Owner 42 · version 7',
      delivery: 'Visits has applied version 7.',
      owner42: 'Accepted',
      owner56: 'Rejected',
    },
    transferred: {
      owners: 'Owner 56 · version 8',
      visits: 'Owner 42 · version 7',
      delivery: 'Owners recorded the transfer. Visits still uses version 7.',
      owner42: 'Accepted',
      owner56: 'Rejected',
    },
    applied: {
      owners: 'Owner 56 · version 8',
      visits: 'Owner 56 · version 8',
      delivery: 'Visits has applied version 8.',
      owner42: 'Rejected',
      owner56: 'Accepted',
    },
  },
};

for (const section of document.querySelectorAll('[data-booking-scenario]')) {
  const states = scenarios[section.dataset.bookingScenario];
  const buttons = section.querySelectorAll('[data-scenario]');
  const fields = section.querySelectorAll('[data-field]');

  function showScenario(button) {
    const selected = button.dataset.scenario;
    const state = states[selected];

    for (const field of fields) {
      field.textContent = state[field.dataset.field];
    }
    for (const option of buttons) {
      option.setAttribute('aria-pressed', String(option === button));
    }
    section.dataset.activeScenario = selected;
  }

  for (const button of buttons) {
    button.addEventListener('click', () => showScenario(button));
  }

  showScenario(buttons[0]);
  const fallback = section.dataset.scenarioFallback;
  if (fallback) document.getElementById(fallback).hidden = true;
  section.hidden = false;
}
