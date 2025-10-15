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

let drawing = false;

function getPos(evt: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: Math.round((evt.clientX - rect.left) * (canvas.width / rect.width)),
    y: Math.round((evt.clientY - rect.top) * (canvas.height / rect.height)),
  };
}

canvas.addEventListener("mousedown", (e) => {
  if (!ctx) return;
  drawing = true;
  const p = getPos(e);
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
});

canvas.addEventListener("mousemove", (e) => {
  if (!drawing || !ctx) return;
  const p = getPos(e);
  ctx.lineTo(p.x, p.y);
  ctx.stroke();
});

["mouseup", "mouseleave"].forEach((name) =>
  canvas.addEventListener(name, () => {
    drawing = false;
  })
);

const clearBtn = document.createElement("button");
clearBtn.textContent = "Clear";
clearBtn.addEventListener("click", () => {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});
document.body.appendChild(clearBtn);
