import { api } from "./prediction.js";
import { game, applySettings, persist, resetProgress, showToast, updateHud } from "./gameState.js";
import { bindNavigation, showScreen } from "./navigation.js";
import { bindLab, fillKnownSelect } from "./specimenLab.js";
import { bindArchive, renderArchive } from "./archive.js";
import { bindExperiment } from "./experimentLab.js";
import { renderSanctuary } from "./sanctuary.js";
import { renderObservatory } from "./observatory.js";
import { renderJournal, syncQuests } from "./progression.js";
import { startFireflies } from "./visualEffects.js";
import { bindPatternGarden } from "./patternGarden.js";
import { audio } from "./audio.js";

function openDialog(id) {
  document.getElementById(id).classList.add("open");
}
function closeDialogs() {
  document.querySelectorAll(".dialog-backdrop.open").forEach((el) => el.classList.remove("open"));
}

async function boot() {
  applySettings();
  updateHud();
  bindNavigation();
  startFireflies(document.getElementById("fx-intro"));
  startFireflies(document.getElementById("fx-sanctuary"));
  bindPatternGarden();

  document.getElementById("enter-archive").addEventListener("click", () => {
    showScreen("station");
    openDialog("tutorial-dialog");
  });
  document.getElementById("how-it-works").addEventListener("click", () => openDialog("how-dialog"));
  document.getElementById("sound-toggle").addEventListener("click", () => {
    game.save.settings.soundEnabled = !game.save.settings.soundEnabled;
    persist();
    applySettings();
    audio.click();
  });
  document.getElementById("journal-btn").addEventListener("click", () => {
    renderJournal();
    openDialog("journal-dialog");
  });
  document.getElementById("settings-btn").addEventListener("click", () => openDialog("settings-dialog"));
  document.querySelectorAll("[data-close]").forEach((btn) => btn.addEventListener("click", closeDialogs));
  document.getElementById("reset-progress").addEventListener("click", () => {
    if (window.confirm("Reset all research progress? Settings will be kept.")) {
      resetProgress();
      renderArchive();
      renderSanctuary();
      renderJournal();
      showToast("Progress cleared.");
    }
  });
  document.getElementById("reduced-motion").addEventListener("change", (e) => {
    game.save.settings.reducedMotion = e.target.checked;
    persist();
    applySettings();
  });
  document.getElementById("reduced-motion").checked = game.save.settings.reducedMotion;

  document.querySelectorAll("[data-nav='sanctuary']").forEach((el) =>
    el.addEventListener("click", () => renderSanctuary())
  );
  document.querySelectorAll("[data-nav='observatory']").forEach((el) =>
    el.addEventListener("click", () => renderObservatory())
  );
  document.querySelectorAll("[data-nav='archive']").forEach((el) =>
    el.addEventListener("click", () => renderArchive())
  );

  try {
    const health = await api.health();
    if (!health.model_ready) showToast(health.error || "Model is not ready.", true);
    game.metadata = await api.metadata();
    const rec = await api.records();
    game.records = rec.records;
    fillKnownSelect();
    bindLab();
    bindArchive();
    bindExperiment();
    renderArchive();
    renderSanctuary();
    renderJournal();
    syncQuests();
    if (game.save.lastScreen && game.save.lastScreen !== "intro") {
      showScreen(game.save.lastScreen);
    }
  } catch (error) {
    showToast(error.message, true);
  }
}

boot();
