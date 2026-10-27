import { api } from "./prediction.js";
import { game, addInvestigation, showToast } from "./gameState.js";
import { categorySilhouette } from "./visualEffects.js";
import { syncQuests } from "./progression.js";
import { audio } from "./audio.js";

const binaryDefaults = () => {
  const values = {};
  (game.metadata?.binary_features || []).forEach((name) => {
    values[name] = 0;
  });
  values.legs = 4;
  return values;
};

let traits = binaryDefaults();
let mode = "unknown";
let currentRecord = null;
let baseline = binaryDefaults();
let busy = false;

function setTrait(name, value) {
  traits[name] = value;
  game.dirtyLab = JSON.stringify(traits) !== JSON.stringify(baseline);
  renderToggles();
}

function renderToggles() {
  const groups = game.metadata?.feature_groups || {};
  const labels = game.metadata?.feature_labels || {};
  const mount = document.getElementById("trait-mount");
  if (!mount) return;
  const sections = [
    ["BODY CHARACTERISTICS", groups.body || []],
    ["BIOLOGY AND BEHAVIOR", groups.biology || []],
    ["PHYSICAL CHARACTERISTICS", groups.physical || []],
  ];
  mount.innerHTML = sections
    .map(([title, names]) => {
      const controls = names
        .map((name) => {
          if (name === "legs") {
            return `<div><p class="muted">Legs</p><div class="legs-picker">${[0, 2, 4, 5, 6, 8]
              .map(
                (n) =>
                  `<button type="button" data-legs="${n}" aria-pressed="${traits.legs === n}">${n}</button>`
              )
              .join("")}</div></div>`;
          }
          return `<button type="button" class="toggle" data-trait="${name}" aria-pressed="${traits[name] === 1}">${
            labels[name] || name
          }</button>`;
        })
        .join("");
      return `<section class="trait-group"><h3>${title}</h3><div class="toggles">${controls}</div></section>`;
    })
    .join("");
}

function renderMeta() {
  const idEl = document.getElementById("specimen-id");
  const desc = document.getElementById("specimen-desc");
  const art = document.getElementById("specimen-art");
  if (mode === "known" && currentRecord) {
    idEl.textContent = `SPECIMEN #${String(currentRecord.record_id).padStart(3, "0")}`;
    desc.textContent = `${currentRecord.display_name}. Known dataset category: ${currentRecord.category.name}. This is an evaluation record, not an unknown animal.`;
    art.innerHTML = categorySilhouette(currentRecord.category.slug);
  } else {
    const n = Math.floor(Math.random() * 80) + 20;
    idEl.textContent = `SPECIMEN #${String(n).padStart(3, "0")}`;
    desc.textContent =
      "Hypothetical trait combination. There is no verified ground-truth label unless you load a dataset animal.";
    art.innerHTML = categorySilhouette("invertebrates");
  }
}

function collectFeatures() {
  const names = game.metadata.feature_names;
  const payload = {};
  names.forEach((name) => {
    payload[name] = traits[name];
  });
  return payload;
}

function showResult(payload, comparison) {
  const card = document.getElementById("lab-result");
  const conf = payload.supports_proba
    ? `Model-reported confidence: ${Math.round(payload.confidence * 100)}% (not necessarily calibrated).`
    : "This model output does not include a usable probability.";
  const compare = comparison
    ? `<p>Known label: ${comparison.actual_category.name}. ${
        comparison.match ? "Prediction matches the dataset label." : "Prediction differs from the dataset label."
      }</p>`
    : "";
  card.innerHTML = `<p class="kicker">Classification complete</p>
    <h3>${payload.category.name}</h3>
    <p>Predicted category ${payload.predicted_class}.</p>
    <p>The model classified this specimen as ${payload.category.name.toLowerCase()} based on the characteristics supplied.</p>
    <p>${conf}</p>
    ${compare}
    <p class="muted">${payload.disclaimer}</p>`;
  card.classList.add("visible");
}

export function bindLab() {
  traits = binaryDefaults();
  baseline = { ...traits };
  renderToggles();
  renderMeta();

  document.getElementById("trait-mount").addEventListener("click", (event) => {
    const traitBtn = event.target.closest("[data-trait]");
    const legsBtn = event.target.closest("[data-legs]");
    if (traitBtn) setTrait(traitBtn.dataset.trait, traits[traitBtn.dataset.trait] ? 0 : 1);
    if (legsBtn) setTrait("legs", Number(legsBtn.dataset.legs));
  });

  document.querySelectorAll("[data-mode]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      mode = btn.dataset.mode;
      document.querySelectorAll("[data-mode]").forEach((el) => el.setAttribute("aria-pressed", el === btn));
      if (mode === "known") {
        const pick = game.records[Math.floor(Math.random() * game.records.length)];
        const body = await api.record(pick.record_id);
        currentRecord = body.record;
        traits = { ...currentRecord.features };
      } else {
        currentRecord = null;
        traits = binaryDefaults();
      }
      baseline = { ...traits };
      game.dirtyLab = false;
      document.getElementById("lab-result").classList.remove("visible");
      renderToggles();
      renderMeta();
    });
  });

  document.getElementById("known-select").addEventListener("change", async (event) => {
    const id = Number(event.target.value);
    if (!id) return;
    mode = "known";
    const body = await api.record(id);
    currentRecord = body.record;
    traits = { ...currentRecord.features };
    baseline = { ...traits };
    renderToggles();
    renderMeta();
  });

  document.getElementById("analyze-btn").addEventListener("click", analyze);
  document.getElementById("reset-traits").addEventListener("click", () => {
    traits = { ...baseline };
    document.getElementById("lab-result").classList.remove("visible");
    game.dirtyLab = false;
    renderToggles();
  });
  document.getElementById("random-specimen").addEventListener("click", async () => {
    if (mode === "known") {
      const pick = game.records[Math.floor(Math.random() * game.records.length)];
      const body = await api.record(pick.record_id);
      currentRecord = body.record;
      traits = { ...currentRecord.features };
    } else {
      currentRecord = null;
      game.metadata.binary_features.forEach((name) => {
        traits[name] = Math.random() > 0.5 ? 1 : 0;
      });
      const legs = game.metadata.legs_values;
      traits.legs = legs[Math.floor(Math.random() * legs.length)];
    }
    baseline = { ...traits };
    document.getElementById("lab-result").classList.remove("visible");
    renderToggles();
    renderMeta();
  });
}

async function analyze() {
  if (busy) return;
  const btn = document.getElementById("analyze-btn");
  busy = true;
  btn.disabled = true;
  document.getElementById("screen-lab").classList.add("analyzing");
  try {
    const features = collectFeatures();
    let comparison = null;
    let payload;
    if (mode === "known" && currentRecord) {
      const evaluated = await api.evaluateRecord(currentRecord.record_id);
      payload = evaluated.prediction;
      comparison = evaluated;
      game.save.knownEvaluations.push(currentRecord.record_id);
      if (!evaluated.match) game.save.mismatches += 1;
    } else {
      payload = await api.predict(features);
    }
    addInvestigation({
      at: Date.now(),
      categoryId: payload.predicted_class,
      recordId: currentRecord ? currentRecord.record_id : null,
      known: Boolean(currentRecord),
    });
    showResult(payload, comparison);
    syncQuests();
    audio.discover();
    game.dirtyLab = false;
  } catch (error) {
    showToast(error.message, true);
  } finally {
    busy = false;
    btn.disabled = false;
    document.getElementById("screen-lab").classList.remove("analyzing");
  }
}

export function fillKnownSelect() {
  const select = document.getElementById("known-select");
  select.innerHTML =
    `<option value="">Load a known animal</option>` +
    game.records
      .map((item) => `<option value="${item.record_id}">${item.display_name}</option>`)
      .join("");
}
