import { game } from "./gameState.js";

export function renderSanctuary() {
  document.querySelectorAll("[data-habitat]").forEach((el) => {
    const key = el.dataset.habitat;
    el.classList.toggle("unlocked", game.save.unlockedRegions.includes(key) || key === "base");
  });
  const n = new Set(game.save.categoriesEncountered).size;
  document.getElementById("sanctuary-progress").textContent = `${n} / 7 families visited · ${game.save.discoveries.length} dataset animals logged`;
}
