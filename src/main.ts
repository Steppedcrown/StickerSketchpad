import "./style.css";

const header = document.createElement("h1");
header.textContent = "Sticker Canvas";
document.body.appendChild(header);

const canvas = document.createElement("canvas");
canvas.id = "sticker-canvas";
canvas.width = 256;
canvas.height = 256;
document.body.appendChild(canvas);

const ctx = canvas.getContext("2d");
if (ctx) {
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#000";
}

type Point = { x: number; y: number; drag: boolean };
const points: Point[] = [];

let drawing = false;

function getPos(evt: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: Math.round((evt.clientX - rect.left) * (canvas.width / rect.width)),
    y: Math.round((evt.clientY - rect.top) * (canvas.height / rect.height)),
  };
}

function render() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (points.length === 0) return;

  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    const p = points[i] as Point;
    if (!p.drag || i === 0) {
      // start a new stroke
      ctx.moveTo(p.x, p.y);
    } else {
      ctx.lineTo(p.x, p.y);
    }
  }
  ctx.stroke();
}

canvas.addEventListener("mousedown", (e) => {
  drawing = true;
  const p = getPos(e);
  points.push({ x: p.x, y: p.y, drag: false });
  render();
});

canvas.addEventListener("mousemove", (e) => {
  if (!drawing) return;
  const p = getPos(e);
  points.push({ x: p.x, y: p.y, drag: true });
  render();
});

["mouseup", "mouseleave"].forEach((name) =>
  canvas.addEventListener(name, () => {
    drawing = false;
  })
);

const clearBtn = document.createElement("button");
clearBtn.textContent = "Clear";
clearBtn.addEventListener("click", () => {
  points.length = 0;
  render();
});
document.body.appendChild(clearBtn);
