import { loadSave, writeSave, clearSave, defaultSave } from "./saveSystem.js";
import { audio } from "./audio.js";

export const game = {
  save: loadSave(),
  metadata: null,
  records: [],
  dirtyLab: false,
};

export function persist() {
  writeSave(game.save);
}

export function applySettings() {
  document.body.classList.toggle("reduced-motion", game.save.settings.reducedMotion);
  audio.setEnabled(game.save.settings.soundEnabled);
  audio.volume = game.save.settings.volume;
  const soundBtn = document.getElementById("sound-toggle");
  if (soundBtn) soundBtn.textContent = game.save.settings.soundEnabled ? "Sound on" : "Sound off";
}

export function rankFor(points) {
  if (points >= 40) return "Archive Keeper";
  if (points >= 20) return "Field Naturalist";
  if (points >= 8) return "Junior Researcher";
  return "Field Intern";
}

export function updateHud() {
  const s = game.save;
  const rank = document.getElementById("hud-rank");
  const disc = document.getElementById("hud-discoveries");
  const pts = document.getElementById("hud-points");
  if (rank) rank.textContent = rankFor(s.researchPoints);
  if (disc) disc.textContent = `${s.discoveries.length} discoveries`;
  if (pts) pts.textContent = `${s.researchPoints} rp`;
}

export function showToast(message, isError = false) {
  const el = document.getElementById("status-banner");
  if (!el) return;
  el.textContent = message;
  el.classList.add("show");
  el.style.borderColor = isError ? "#b6a4e8" : "#ffd17a";
  if (isError) audio.error();
  setTimeout(() => el.classList.remove("show"), 3200);
}

export function resetProgress() {
  const settings = { ...game.save.settings };
  clearSave();
  game.save = defaultSave();
  game.save.settings = settings;
  persist();
  updateHud();
}

export function addInvestigation(entry) {
  game.save.investigations.push(entry);
  if (entry.categoryId && !game.save.categoriesEncountered.includes(entry.categoryId)) {
    game.save.categoriesEncountered.push(entry.categoryId);
  }
  if (entry.recordId && !game.save.discoveries.includes(entry.recordId)) {
    game.save.discoveries.push(entry.recordId);
    game.save.researchPoints += 2;
  } else {
    game.save.researchPoints += 1;
  }
  persist();
  updateHud();
}
