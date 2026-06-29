const canvas =
  document.getElementById("geometry-canvas") ||
  document.getElementById("scene");

const ctx = canvas.getContext("2d");

let width = 0;
let height = 0;
let activeIndex = 0;
let visualIndex = 0;
let mouseX = 0.5;
let mouseY = 0.5;
let lastWheelAt = 0;

const cards = Array.from(document.querySelectorAll(".project-card"));
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.querySelectorAll(".links a").forEach((link) => {
  link.target = "_blank";
  link.rel = "noopener noreferrer";
});

const objects = [
  {
    points: [
      [-140, -80, 0], [140, -80, 0], [140, 80, 0], [-140, 80, 0],
      [-105, -52, 85], [105, -52, 85], [105, 52, 85], [-105, 52, 85],
      [-70, -24, 160], [70, -24, 160], [70, 24, 160], [-70, 24, 160],
    ],
    edges: [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [8, 9], [9, 10], [10, 11], [11, 8],
      [0, 4], [1, 5], [2, 6], [3, 7],
      [4, 8], [5, 9], [6, 10], [7, 11],
    ],
  },
  {
    points: [
      [-120, -120, -120], [120, -120, -120], [120, 120, -120], [-120, 120, -120],
      [-120, -120, 120], [120, -120, 120], [120, 120, 120], [-120, 120, 120],
      [0, -175, 0], [175, 0, 0], [0, 175, 0], [-175, 0, 0],
    ],
    edges: [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7],
      [8, 9], [9, 10], [10, 11], [11, 8],
      [8, 10], [9, 11],
    ],
  },
  {
    points: [
      [-175, -85, 0], [-90, -85, 0], [-90, 0, 0], [0, 0, 0],
      [0, 78, 0], [100, 78, 0], [100, -38, 0], [175, -38, 0],
      [-175, 90, 0], [-45, 90, 0], [45, -90, 0], [175, -90, 0],
      [-175, -85, 85], [-90, -85, 85], [-90, 0, 85], [0, 0, 85],
      [0, 78, 85], [100, 78, 85], [100, -38, 85], [175, -38, 85],
    ],
    edges: [
      [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7],
      [8, 9], [9, 3], [3, 10], [10, 11],
      [12, 13], [13, 14], [14, 15], [15, 16], [16, 17], [17, 18], [18, 19],
      [0, 12], [1, 13], [2, 14], [3, 15], [4, 16], [5, 17], [6, 18], [7, 19],
    ],
  },
];

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;

  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function relativeToCamera(index) {
  const count = cards.length;
  const copy = Math.round((visualIndex - index) / count);
  return index + copy * count - visualIndex;
}

function rotatePoint([x, y, z], time, rel) {
  const rx = time * 0.00035 + rel * 0.42;
  const ry = time * 0.00058 + mouseX * 0.28 + rel * 0.28;
  const rz = mouseY * 0.14 + rel * 0.08;

  let py = y * Math.cos(rx) - z * Math.sin(rx);
  let pz = y * Math.sin(rx) + z * Math.cos(rx);
  let px = x;

  const x2 = px * Math.cos(ry) + pz * Math.sin(ry);
  const z2 = -px * Math.sin(ry) + pz * Math.cos(ry);
  px = x2;
  pz = z2;

  const x3 = px * Math.cos(rz) - py * Math.sin(rz);
  const y3 = px * Math.sin(rz) + py * Math.cos(rz);

  return [x3, y3, pz];
}

function projectPoint([x, y, z], centerX, centerY, scaleBase) {
  const cameraDistance = 660;
  const scale = cameraDistance / (cameraDistance + z);

  return {
    x: centerX + x * scale * scaleBase,
    y: centerY + y * scale * scaleBase,
  };
}

function drawRail() {
  const x = width > 900 ? width * 0.78 : width * 0.5;

  ctx.strokeStyle = "rgba(145, 217, 255, 0.12)";
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(x - 44, height * 0.12);
  ctx.bezierCurveTo(x + 50, height * 0.34, x - 50, height * 0.66, x + 44, height * 0.88);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + 44, height * 0.12);
  ctx.bezierCurveTo(x - 50, height * 0.34, x + 50, height * 0.66, x - 44, height * 0.88);
  ctx.stroke();
}

function drawObject(object, rel, time) {
  const distance = Math.abs(rel);

  if (distance > 1.35) {
    return;
  }

  const focus = 1 - Math.min(distance, 1);
  const baseX = width > 900 ? width * 0.78 : width * 0.5;
  const centerX = baseX + Math.sin(rel * Math.PI * 0.72) * (width > 900 ? 92 : 42);
  const centerY = height * 0.5 + rel * height * 0.34;
  const scaleBase = (width > 900 ? 0.82 : 0.58) * (0.82 + focus * 0.38);
  const alpha = 0.2 + focus * 0.58;

  const projected = object.points.map((point) =>
    projectPoint(rotatePoint(point, time, rel), centerX, centerY, scaleBase)
  );

  ctx.lineWidth = 1.1 + focus * 1.7;
  ctx.strokeStyle = `rgba(145, 217, 255, ${alpha})`;

  for (const [a, b] of object.edges) {
    ctx.beginPath();
    ctx.moveTo(projected[a].x, projected[a].y);
    ctx.lineTo(projected[b].x, projected[b].y);
    ctx.stroke();
  }

  ctx.fillStyle = `rgba(205, 240, 255, ${0.2 + focus * 0.55})`;

  for (const p of projected) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2 + focus * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function updateCards() {
  cards.forEach((card, index) => {
    const rel = relativeToCamera(index);
    const distance = Math.abs(rel);

    card.classList.toggle("active", index === activeIndex);
    card.classList.toggle("above", rel < -0.05);

    card.style.opacity = Math.max(0, 1 - distance * 3.2).toString();
    card.style.pointerEvents = index === activeIndex ? "auto" : "none";
    card.style.transform = `translateY(${rel * height * 0.82}px) scale(${1 - Math.min(distance, 1) * 0.035})`;
  });
}

function animate(time = 0) {
  ctx.clearRect(0, 0, width, height);

  visualIndex += (activeIndex - visualIndex) * 0.2;

  drawRail();

  objects.forEach((object, index) => {
    drawObject(object, relativeToCamera(index), time);
  });

  updateCards();

  if (!prefersReducedMotion) {
    requestAnimationFrame(animate);
  }
}

function cycle(direction) {
  activeIndex = (activeIndex + direction + cards.length) % cards.length;

  if (direction > 0 && visualIndex > cards.length - 1.2 && activeIndex === 0) {
    visualIndex -= cards.length;
  }

  if (direction < 0 && visualIndex < 0.2 && activeIndex === cards.length - 1) {
    visualIndex += cards.length;
  }
}

window.addEventListener("resize", resize);

window.addEventListener("mousemove", (event) => {
  mouseX = event.clientX / window.innerWidth;
  mouseY = event.clientY / window.innerHeight;
});

window.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();

    const now = Date.now();

    if (now - lastWheelAt < 220 || Math.abs(event.deltaY) < 2) {
      return;
    }

    lastWheelAt = now;
    cycle(event.deltaY > 0 ? 1 : -1);
  },
  { passive: false }
);

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown" || event.key === "ArrowRight") {
    cycle(1);
  }

  if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
    cycle(-1);
  }
});

resize();
animate();
