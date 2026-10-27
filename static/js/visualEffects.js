export function startFireflies(canvas) {
  if (!canvas) return () => {};
  const ctx = canvas.getContext("2d");
  const dots = Array.from({ length: 28 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: 1 + Math.random() * 1.5,
    s: 0.001 + Math.random() * 0.003,
    a: Math.random(),
  }));
  let frame = 0;
  let running = true;

  function resize() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  function tick() {
    if (!running) return;
    const reduced = document.body.classList.contains("reduced-motion");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!reduced) {
      dots.forEach((dot) => {
        dot.y -= dot.s;
        if (dot.y < 0) dot.y = 1;
        const alpha = 0.25 + Math.abs(Math.sin(frame / 40 + dot.a)) * 0.6;
        ctx.fillStyle = `rgba(255, 209, 122, ${alpha})`;
        ctx.fillRect(dot.x * canvas.width, dot.y * canvas.height, dot.r, dot.r);
      });
      frame += 1;
    }
    requestAnimationFrame(tick);
  }
  tick();
  return () => {
    running = false;
    window.removeEventListener("resize", resize);
  };
}

export function categorySilhouette(slug) {
  const colors = {
    mammals: "#FFD17A",
    birds: "#A7DDF5",
    reptiles: "#8CA889",
    fish: "#8BCBC3",
    amphibians: "#B6A4E8",
    insects: "#F5EBD5",
    invertebrates: "#635C9B",
  };
  const fill = colors[slug] || "#F5EBD5";
  return `<svg class="silhouette" viewBox="0 0 16 16" aria-hidden="true" shape-rendering="crispEdges">
    <rect width="16" height="16" fill="#10131F"/>
    <rect x="4" y="4" width="8" height="8" fill="${fill}"/>
    <rect x="6" y="6" width="4" height="4" fill="#10131F"/>
  </svg>`;
}
