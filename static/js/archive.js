import { game, persist } from "./gameState.js";
import { api } from "./prediction.js";
import { categorySilhouette } from "./visualEffects.js";
import { showScreen } from "./navigation.js";
import { syncQuests } from "./progression.js";

export function renderArchive(filter = "") {
  const cats = document.getElementById("archive-cats");
  const list = document.getElementById("archive-list");
  if (!cats) return;
  cats.innerHTML = game.metadata.categories
    .map((cat) => {
      const count = game.records.filter((r) => r.class_type === cat.id).length;
      const seen = game.save.investigations.filter((i) => i.categoryId === cat.id).length;
      return `<button class="panel cat-tile" data-cat="${cat.id}" style="--accent:${cat.accent}">
        ${categorySilhouette(cat.slug)}
        <strong>${cat.name}</strong>
        <p class="muted">${count} records · ${seen} investigated</p>
      </button>`;
    })
    .join("");
  const q = filter.toLowerCase();
  list.innerHTML = game.records
    .filter((r) => !q || r.display_name.toLowerCase().includes(q))
    .map((r) => {
      const found = game.save.discoveries.includes(r.record_id);
      return `<button class="panel spec-tile ${found ? "discovered" : ""}" data-spec="${r.record_id}">
        <span class="kicker">#${String(r.record_id).padStart(3, "0")}</span>
        <strong>${r.display_name}</strong>
        <p class="muted">${r.category.name}</p>
      </button>`;
    })
    .join("");
}

export function bindArchive() {
  document.getElementById("archive-search").addEventListener("input", (e) => renderArchive(e.target.value));
  document.getElementById("archive-cats").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-cat]");
    if (!btn) return;
    const id = Number(btn.dataset.cat);
    if (!game.save.archiveInspected.includes(id)) game.save.archiveInspected.push(id);
    persist();
    syncQuests();
    const cat = game.metadata.categories.find((c) => c.id === id);
    document.getElementById("archive-detail").innerHTML = `<h3>${cat.name}</h3>
      <p>${cat.description}</p>
      <p class="muted">Examples: ${cat.examples.join(", ")}. Habitat scene: ${cat.habitat}.</p>
      <p class="muted">These labels follow the Zoo dataset, not a complete taxonomy.</p>`;
    renderArchive(document.getElementById("archive-search").value);
  });
  document.getElementById("archive-list").addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-spec]");
    if (!btn) return;
    const body = await api.record(Number(btn.dataset.spec));
    const rec = body.record;
    document.getElementById("archive-detail").innerHTML = `<h3>${rec.display_name}</h3>
      <p>Known dataset category: ${rec.category.name}.</p>
      <pre class="muted">${JSON.stringify(rec.features, null, 2)}</pre>
      <button class="pixel-btn" id="open-in-lab">Open in specimen lab</button>`;
    document.getElementById("open-in-lab").addEventListener("click", () => {
      const select = document.getElementById("known-select");
      select.value = String(rec.record_id);
      select.dispatchEvent(new Event("change"));
      showScreen("lab");
    });
  });
}
