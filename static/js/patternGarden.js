export function bindPatternGarden() {
  const pad = document.getElementById("garden-pad");
  if (!pad) return;
  const flowers = [...pad.querySelectorAll("[data-flower]")];
  let sequence = [];
  let input = [];
  let locked = false;

  function glow(index) {
    flowers[index].classList.add("unlocked");
    setTimeout(() => flowers[index].classList.remove("unlocked"), 350);
  }

  async function playSeq() {
    locked = true;
    for (const i of sequence) {
      glow(i);
      await new Promise((r) => setTimeout(r, 450));
    }
    locked = false;
    input = [];
  }

  function nextRound() {
    sequence.push(Math.floor(Math.random() * flowers.length));
    document.getElementById("garden-status").textContent = `Round ${sequence.length}. Watch, then repeat.`;
    playSeq();
  }

  flowers.forEach((btn, index) => {
    btn.addEventListener("click", () => {
      if (locked) return;
      glow(index);
      input.push(index);
      if (input[input.length - 1] !== sequence[input.length - 1]) {
        document.getElementById("garden-status").textContent =
          "Sequence missed. This is a pattern-memory game, not an intelligence test. Press restart.";
        locked = true;
        return;
      }
      if (input.length === sequence.length) nextRound();
    });
  });

  document.getElementById("garden-start").addEventListener("click", () => {
    sequence = [];
    nextRound();
  });
}
