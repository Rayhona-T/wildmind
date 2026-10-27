import { api } from "./prediction.js";
import { game, persist, showToast } from "./gameState.js";
import { syncQuests } from "./progression.js";

let original = null;
let draft = null;
let originalPred = null;

function diff(a, b) {
  return Object.keys(a).filter((k) => a[k] !== b[k]);
}

export function bindExperiment() {
  const select = document.getElementById("exp-select");
  select.innerHTML = game.records
    .map((r) => `<option value="${r.record_id}">${r.display_name}</option>`)
    .join("");
  select.addEventListener("change", loadSpecimen);
  document.getElementById("run-experiment").addEventListener("click", runExperiment);
  document.getElementById("reset-experiment").addEventListener("click", () => {
    if (original) {
      draft = { ...original.features };
      renderDraft();
    }
  });
  document.getElementById("save-experiment").addEventListener("click", saveExperiment);
  document.getElementById("exp-traits").addEventListener("click", (e) => {
    const t = e.target.closest("[data-exp-trait]");
    const l = e.target.closest("[data-exp-legs]");
    if (!draft) return;
    if (t) draft[t.dataset.expTrait] = draft[t.dataset.expTrait] ? 0 : 1;
    if (l) draft.legs = Number(l.dataset.expLegs);
    renderDraft();
  });
  loadSpecimen();
}

async function loadSpecimen() {
  const id = Number(document.getElementById("exp-select").value);
  const body = await api.record(id);
  original = body.record;
  draft = { ...original.features };
  originalPred = await api.predict(original.features);
  renderDraft();
  document.getElementById("exp-compare").innerHTML = `<p>Original prediction: ${originalPred.category.name}</p>`;
}

function renderDraft() {
  const labels = game.metadata.feature_labels;
  const changed = original ? diff(original.features, draft) : [];
  document.getElementById("exp-traits").innerHTML = game.metadata.feature_names
    .map((name) => {
      if (name === "legs") {
        return `<div><p>Legs ${changed.includes("legs") ? "(changed)" : ""}</p><div class="legs-picker">${[0, 2, 4, 5, 6, 8]
          .map((n) => `<button data-exp-legs="${n}" aria-pressed="${draft.legs === n}">${n}</button>`)
          .join("")}</div></div>`;
      }
      return `<button class="toggle" data-exp-trait="${name}" aria-pressed="${draft[name] === 1}">${labels[name]}${
        changed.includes(name) ? " *" : ""
      }</button>`;
    })
    .join("");
  document.getElementById("exp-diff").textContent = changed.length
    ? `Changed: ${changed.join(", ")}`
    : "No characteristics changed yet.";
}

async function runExperiment() {
  try {
    const next = await api.predict(draft);
    const changed = originalPred.predicted_class !== next.predicted_class;
    document.getElementById("exp-compare").innerHTML = `
      <p>Original: ${originalPred.category.name}</p>
      <p>Modified: ${next.category.name}</p>
      <p>${
        changed
          ? "The prediction changed. That shows sensitivity to this input combination, not a causal biological proof."
          : "The prediction stayed the same for this modified combination."
      }</p>
      <p class="muted">This is a hypothetical specimen. It may not represent a real animal.</p>`;
    document.getElementById("run-experiment").dataset.last = JSON.stringify({
      originalName: originalPred.category.name,
      afterName: next.category.name,
      changed,
    });
  } catch (error) {
    showToast(error.message, true);
  }
}

function saveExperiment() {
  const raw = document.getElementById("run-experiment").dataset.last;
  if (!raw) {
    showToast("Run the experiment before saving.", true);
    return;
  }
  game.save.savedExperiments.push(JSON.parse(raw));
  persist();
  syncQuests();
  showToast("Experiment saved to the journal.");
}
