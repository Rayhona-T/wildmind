import { game, persist, showToast, updateHud } from "./gameState.js";
import { audio } from "./audio.js";

export const QUESTS = [
  {
    id: "first-contact",
    title: "First Contact",
    detail: "Submit your first specimen to the model.",
    reward: "Researcher badge",
    check: (s) => s.investigations.length >= 1,
  },
  {
    id: "seven-families",
    title: "Seven Families",
    detail: "Investigate specimens from all seven categories.",
    reward: "Archive decoration",
    check: (s) => new Set(s.categoriesEncountered).size >= 7,
  },
  {
    id: "curious-mind",
    title: "Curious Mind",
    detail: "Save three feature-modification experiments.",
    reward: "Experiment chamber decoration",
    check: (s) => s.savedExperiments.length >= 3,
  },
  {
    id: "blind-spots",
    title: "The Model's Blind Spots",
    detail: "Find a known record where the prediction differs from the dataset label.",
    reward: "Research journal entry",
    check: (s) => s.mismatches >= 1,
  },
  {
    id: "archivist",
    title: "The Wildlife Archivist",
    detail: "Inspect at least four distinct archive categories.",
    reward: "Sanctuary upgrade",
    check: (s) => new Set(s.archiveInspected).size >= 4,
  },
];

const regionByClass = {
  1: "forest",
  2: "canopy",
  3: "rocks",
  4: "pond",
  5: "wetland",
  6: "meadow",
  7: "tide",
};

export function syncQuests() {
  const s = game.save;
  QUESTS.forEach((quest) => {
    if (!s.completedQuests.includes(quest.id) && quest.check(s)) {
      s.completedQuests.push(quest.id);
      s.researchPoints += 5;
      audio.discover();
      showToast(`Quest complete: ${quest.title}`);
    }
  });
  s.categoriesEncountered.forEach((id) => {
    const region = regionByClass[id];
    if (region && !s.unlockedRegions.includes(region)) s.unlockedRegions.push(region);
  });
  if (s.investigations.length >= 1 && !s.unlockedRegions.includes("lantern")) {
    s.unlockedRegions.push("lantern");
  }
  if (new Set(s.categoriesEncountered).size >= 7 && !s.unlockedRegions.includes("garden")) {
    s.unlockedRegions.push("garden");
  }
  persist();
  updateHud();
  renderJournal();
}

export function renderJournal() {
  const root = document.getElementById("journal-body");
  if (!root) return;
  root.innerHTML = QUESTS.map((quest) => {
    const done = game.save.completedQuests.includes(quest.id);
    return `<article class="panel quest ${done ? "done" : ""}">
      <h3>${quest.title}</h3>
      <p>${quest.detail}</p>
      <p class="muted">${done ? "Completed — " : "Reward: "}${quest.reward}</p>
    </article>`;
  }).join("");
  const notes = document.getElementById("journal-notes");
  if (notes) {
    notes.innerHTML = game.save.savedExperiments
      .slice(-5)
      .reverse()
      .map(
        (item) =>
          `<p class="muted">Experiment: ${item.originalName} → ${item.afterName}${
            item.changed ? " (prediction changed)" : " (unchanged)"
          }</p>`
      )
      .join("") || "<p class='muted'>No saved experiments yet.</p>";
  }
}
