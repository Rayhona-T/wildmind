const KEY = "wildmind-save-v1";

export const defaultSave = () => ({
  version: 1,
  discoveries: [],
  investigations: [],
  completedQuests: [],
  unlockedRegions: [],
  savedExperiments: [],
  categoriesEncountered: [],
  archiveInspected: [],
  knownEvaluations: [],
  mismatches: 0,
  researchPoints: 0,
  lastScreen: "intro",
  settings: {
    soundEnabled: false,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    volume: 0.4,
  },
});

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1) return defaultSave();
    return { ...defaultSave(), ...parsed, settings: { ...defaultSave().settings, ...(parsed.settings || {}) } };
  } catch {
    return defaultSave();
  }
}

export function writeSave(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function clearSave() {
  localStorage.removeItem(KEY);
}
