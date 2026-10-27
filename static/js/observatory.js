import { api } from "./prediction.js";

export async function renderObservatory() {
  const root = document.getElementById("obs-root");
  try {
    const { evaluation } = await api.evaluation();
    const names = evaluation.confusion_matrix.label_names;
    const matrix = evaluation.confusion_matrix.matrix;
    const cells = matrix
      .map((row, i) =>
        row
          .map((value, j) => {
            const title = `Actual ${names[i]}, predicted ${names[j]}: ${value} test examples`;
            const alpha = value ? Math.min(0.15 + value / 8, 0.95) : 0.12;
            return `<button class="matrix-cell" title="${title}" style="background:rgba(182,164,232,${alpha})">${value}</button>`;
          })
          .join("")
      )
      .join("");
    const bars = evaluation.feature_importance
      .slice(0, 8)
      .map((item) => {
        const pct = Math.round(item.importance * 100);
        return `<div class="bar-row"><span>${item.feature}</span><div class="bar"><span style="width:${pct}%"></span></div><span>${pct}%</span></div>`;
      })
      .join("");
    const per = evaluation.per_class
      .map(
        (row) =>
          `<tr><td>${row.name}</td><td>${row.precision.toFixed(2)}</td><td>${row.recall.toFixed(2)}</td><td>${row.f1.toFixed(2)}</td><td>${row.support}</td></tr>`
      )
      .join("");
    root.innerHTML = `
      <p class="muted">${evaluation.evaluation_procedure}</p>
      <p class="muted">${evaluation.caveat}</p>
      <p>Records: ${evaluation.dataset_records} · Features: ${evaluation.feature_count} · Classes: ${evaluation.n_classes}</p>
      <p>Train: ${evaluation.train_size} · Test: ${evaluation.test_size} · Model: ${evaluation.model_name}</p>
      <p>Test accuracy: ${(evaluation.test_accuracy * 100).toFixed(1)}% · Train accuracy: ${(evaluation.train_accuracy * 100).toFixed(1)}% (not a test score)</p>
      <h3>Per-class scores on the held-out test set</h3>
      <table class="muted"><thead><tr><th>Class</th><th>P</th><th>R</th><th>F1</th><th>n</th></tr></thead><tbody>${per}</tbody></table>
      <h3>Confusion matrix (counts)</h3>
      <p class="muted">Rows are actual labels, columns are predicted labels, in category order 1–7. Cells are absolute test counts.</p>
      <div class="matrix" style="grid-template-columns: repeat(7, 1fr)">${cells}</div>
      <h3>Global feature importance</h3>
      <p class="muted">Gini importance from this decision tree. It is not an explanation of a single prediction.</p>
      <div class="bars">${bars}</div>
      <h3>How to read this observatory</h3>
      <p>Classification assigns each specimen to one of seven dataset families. The tree learns splits from training rows. It can be wrong, especially on rare classes. High train accuracy with a weaker test score is a reminder not to trust memorization.</p>`;
  } catch (error) {
    root.innerHTML = `<p>${error.message}</p>`;
  }
}
