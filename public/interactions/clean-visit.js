const exercise = document.querySelector('.clean-visit');
const viewButtons = exercise.querySelectorAll('[data-show-view]');
const coreRelation = exercise.querySelector('[data-core-relation]');
const boundaryRelation = exercise.querySelector('[data-boundary-relation]');
const evidence = exercise.querySelectorAll('[data-evidence]');

function showView(view) {
  const runtime = view === 'runtime';
  exercise.dataset.view = view;
  coreRelation.textContent = runtime ? 'calls through' : 'uses';
  boundaryRelation.textContent = runtime ? 'dispatches to' : 'implements';

  for (const button of viewButtons) {
    button.setAttribute('aria-pressed', String(button.dataset.showView === view));
  }
  for (const panel of evidence) {
    panel.hidden = panel.dataset.evidence !== view;
  }
}

for (const button of viewButtons) {
  button.addEventListener('click', () => showView(button.dataset.showView));
}

document.querySelector('#clean-visit-fallback').hidden = true;
exercise.hidden = false;
