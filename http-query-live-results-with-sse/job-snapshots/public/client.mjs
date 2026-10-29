import { watchJobs } from './watch-jobs.mjs';

let active;
const formEl = document.querySelector('form');
const statusEl = document.querySelector('#status');
const outputEl = document.querySelector('pre');
const projectEl = document.querySelector('#project');

formEl.addEventListener('submit', async event => {
  event.preventDefault();
  // Starting a new selection cancels the previous request and its body reader.
  active?.abort();
  const controller = active = new AbortController();
  // Capture the controls once; editing them affects the next Start, not the active stream.
  const filter = { 
    project: projectEl.value,
    statuses: [...document.querySelectorAll('input:checked')].map(input => input.value)};
  statusEl.textContent = 'Connecting…';
  try {
    await watchJobs('/jobs/live', filter, snapshot => {
      statusEl.textContent = 'Snapshot received';
      // Replace the entire displayed selection, including removing jobs that no longer match.
      outputEl.textContent = JSON.stringify(snapshot.matches, null, 2);
    }, controller.signal);
    // An older request may finish after a newer one starts; do not let it overwrite the status.
    if (active === controller) statusEl.textContent = 'Demo complete';
  } catch (error) {
    if (active === controller) statusEl.textContent = controller.signal.aborted ? 'Stopped' : error.message;
  }
});
document.querySelector('#stop').onclick = () => active?.abort();
