/**
 * Lightweight progression rules used by the game.
 * Run with: node tests/test_progression.js
 */
const quests = {
  firstContact: (state) => state.investigations.length >= 1,
  sevenFamilies: (state) => new Set(state.categoriesEncountered).size >= 7,
  curiousMind: (state) => state.savedExperiments.length >= 3,
  blindSpots: (state) => state.mismatches >= 1,
  archivist: (state) => new Set(state.archiveInspected).size >= 4,
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const empty = {
  investigations: [],
  categoriesEncountered: [],
  savedExperiments: [],
  mismatches: 0,
  archiveInspected: [],
};

assert(!quests.firstContact(empty), "empty should not complete first contact");
assert(
  quests.firstContact({ ...empty, investigations: [{}] }),
  "one investigation completes first contact"
);
assert(
  quests.sevenFamilies({ ...empty, categoriesEncountered: [1, 2, 3, 4, 5, 6, 7] }),
  "seven families"
);
assert(
  !quests.curiousMind({ ...empty, savedExperiments: [{}, {}] }),
  "two experiments are not enough"
);
assert(quests.blindSpots({ ...empty, mismatches: 1 }), "mismatch quest");
assert(
  quests.archivist({ ...empty, archiveInspected: [1, 2, 3, 4] }),
  "archivist quest"
);

console.log("progression rules ok");
