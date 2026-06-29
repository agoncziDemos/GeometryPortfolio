const canvas = document.getElementById("geometry-canvas");
const ctx = canvas.getContext("2d");

let width = 0;
let height = 0;
let mouseX = 0.5;
let mouseY = 0.5;

let camera = 0;
let visualCamera = 0;
let wheelBuffer = 0;
let snapTimer = null;

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const cards = Array.from(document.querySelectorAll(".project-card"));

const objects = [
  {
    points: [
      [-140, -80, 0], [140, -80, 0], [140, 80, 0], [-140, 80, 0],
      [-105, -52, 80], [105, -52, 80], [105, 52, 80], [-105, 52, 80],
      [-70, -24, 150], [70, -24, 150], [70, 24, 150], [-70, 24, 150],
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
      [0, -170, 0], [170, 0, 0], [0, 170, 0], [-170, 0, 0],
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
      [-175, -85, 80], [-90, -85, 80], [-90, 0, 80], [0, 0, 80],
      [0, 78, 80], [100, 78, 80], [100, -38, 80], [175, -38, 80],
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

function loopRelative(index, position) {
  const loop = objects.length;
  const copy = Math.round((position - index) / loop);
  return index + copy * loop - position;
}

function rotatePoint([x, y, z], time, rel) {
  const rx = time * 0.00038 + rel * 0.45;
  const ry = time * 0.00062 + mouseX * 0.35 + rel * 0.32;
  const rz = mouseY * 0.16 + rel * 0.08;

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

function drawSceneRail() {
  const x = width > 900 ? width * 0.8 : width * 0.5;
  const top = height * 0.12;
  const bottom = height * 0.88;

  ctx.strokeStyle = "rgba(120, 205, 255, 0.12)";
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(x - 34, top);
  ctx.bezierCurveTo(x + 42, height * 0.34, x - 42, height * 0.66, x + 34, bottom);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + 34, top);
  ctx.bezierCurveTo(x - 42, height * 0.34, x + 42, height * 0.66, x - 34, bottom);
  ctx.stroke();
}

function drawObject(object, rel, time) {
  const distance = Math.abs(rel);

  if (distance > 1.35) {
    return;
  }

  const focus = 1 - Math.min(distance, 1);
  const baseX = width > 900 ? width * 0.8 : width * 0.5;
  const centerX = baseX + Math.sin(rel * Math.PI * 0.72) * (width > 900 ? 88 : 42);
  const centerY = height * 0.5 + rel * height * 0.34;
  const depthScale = 1 - distance * 0.16;
  const scaleBase = (width > 900 ? 0.82 : 0.58) * depthScale * (0.92 + focus * 0.28);
  const alpha = 0.2 + focus * 0.58;

  const projected = object.points.map((point) =>
    projectPoint(rotatePoint(point, time, rel), centerX, centerY, scaleBase)
  );

  ctx.lineWidth = 1.1 + focus * 1.7;
  ctx.strokeStyle = `rgba(120, 205, 255, ${alpha})`;

  for (const [a, b] of object.edges) {
    ctx.beginPath();
    ctx.moveTo(projected[a].x, projected[a].y);
    ctx.lineTo(projected[b].x, projected[b].y);
    ctx.stroke();
  }

  ctx.fillStyle = `rgba(190, 235, 255, ${0.2 + focus * 0.6})`;

  for (const p of projected) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2 + focus * 1.9, 0, Math.PI * 2);
    ctx.fill();
  }
}

function updateCards() {
  const activeIndex = ((Math.round(camera) % cards.length) + cards.length) % cards.length;

  cards.forEach((card, index) => {
    const rel = loopRelative(index, visualCamera);
    const distance = Math.abs(rel);

    card.classList.toggle("active", index === activeIndex);
    card.classList.toggle("above", rel < -0.05);
    card.classList.toggle("below", rel > 0.05);

    card.style.opacity = Math.max(0, 1 - distance * 3.6).toString();
    card.style.pointerEvents = distance < 0.18 ? "auto" : "none";
    card.style.transform = `translateY(${rel * height * 0.78}px) scale(${1 - Math.min(distance, 1) * 0.03})`;
  });
}

function animate(time = 0) {
  ctx.clearRect(0, 0, width, height);

  visualCamera += (camera - visualCamera) * 0.2;

  drawSceneRail();

  objects.forEach((object, index) => {
    drawObject(object, loopRelative(index, visualCamera), time);
  });

  updateCards();

  if (!prefersReducedMotion) {
    requestAnimationFrame(animate);
  }
}

function handleWheel(deltaY) {
  if (Math.abs(deltaY) < 2) {
    return;
  }

  camera = Math.round(camera) + (deltaY > 0 ? 1 : -1);
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
    handleWheel(event.deltaY);
  },
  { passive: false }
);

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown" || event.key === "ArrowRight") {
    camera = Math.round(camera) + 1;
  }

  if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
    camera = Math.round(camera) - 1;
  }
});

resize();
animate();

