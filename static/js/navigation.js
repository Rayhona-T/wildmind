import { game, persist } from "./gameState.js";
import { audio } from "./audio.js";

const screens = [
  "intro",
  "station",
  "lab",
  "archive",
  "experiment",
  "sanctuary",
  "observatory",
];

export function showScreen(id) {
  screens.forEach((name) => {
    const el = document.getElementById(`screen-${name}`);
    if (el) el.classList.toggle("active", name === id);
  });
  game.save.lastScreen = id;
  persist();
  audio.click();
  const hud = document.getElementById("game-hud");
  if (hud) hud.style.visibility = id === "intro" ? "hidden" : "visible";
  document.getElementById("screen-" + id)?.focus();
  if (id === "observatory") {
    import("./observatory.js").then((mod) => mod.renderObservatory());
  }
  if (id === "sanctuary") {
    import("./sanctuary.js").then((mod) => mod.renderSanctuary());
  }
  if (id === "archive") {
    import("./archive.js").then((mod) => mod.renderArchive());
  }
}

export function confirmLeaveLab() {
  if (game.dirtyLab && game.save.lastScreen === "lab") {
    return window.confirm("Leave the specimen lab? Unsubmitted trait changes will stay in this session, but you can return.");
  }
  return true;
}

export function bindNavigation() {
  document.querySelectorAll("[data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-nav");
      if (target !== "lab" && !confirmLeaveLab()) return;
      showScreen(target);
    });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      const open = document.querySelector(".dialog-backdrop.open");
      if (open) {
        open.classList.remove("open");
        return;
      }
      if (game.save.lastScreen !== "intro") showScreen("station");
    }
  });
}
