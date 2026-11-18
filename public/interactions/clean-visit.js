const example = document.querySelector('[data-clean-booking-views]');
const exercise = example?.querySelector('[data-clean-visit]');
const fallback = example?.querySelector('#clean-visit-fallback');
const coreRelation = exercise?.querySelector('[data-core-relation]');
const boundaryRelation = exercise?.querySelector('[data-boundary-relation]');

if (exercise && fallback && coreRelation && boundaryRelation) {
  const buttons = exercise.querySelectorAll('[data-show-view]');
  const evidence = exercise.querySelectorAll('[data-evidence]');

  for (const button of buttons) {
    button.addEventListener('click', () => {
      const view = button.dataset.showView;
      const runtime = view === 'runtime';
      exercise.dataset.view = view;
      coreRelation.textContent = runtime ? 'calls through' : 'uses';
      boundaryRelation.textContent = runtime ? 'dispatches to' : 'implements';

      for (const option of buttons) {
        option.setAttribute('aria-pressed', String(option === button));
      }
      for (const panel of evidence) {
        panel.hidden = panel.dataset.evidence !== view;
      }
    });
  }

  fallback.hidden = true;
  exercise.hidden = false;
}
