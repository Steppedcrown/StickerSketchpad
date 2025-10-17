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

type Point = { x: number; y: number };
type Line = Point[];

const lines: Line[] = [];
const redoLines: Line[] = [];

let currentLine: Line = [];

const cursor = { active: false, x: 0, y: 0 };

const bus = new EventTarget();

function notify(name: string) {
  bus.dispatchEvent(new Event(name));
}

function redraw() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const line of lines) {
    if (line.length > 1 && line[0]) {
      const { x, y } = line[0];
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (const { x, y } of line) {
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
}

bus.addEventListener("drawing-changed", redraw);
bus.addEventListener("cursor-changed", redraw);

canvas.addEventListener("mousedown", (e) => {
  cursor.active = true;
  cursor.x = e.offsetX;
  cursor.y = e.offsetY;

  currentLine = [];
  lines.push(currentLine);
  redoLines.splice(0, redoLines.length);
  currentLine.push({ x: cursor.x, y: cursor.y });

  notify("cursor-changed");
});

canvas.addEventListener("mousemove", (e) => {
  if (cursor.active) {
    cursor.x = e.offsetX;
    cursor.y = e.offsetY;
    currentLine.push({ x: cursor.x, y: cursor.y });

    notify("cursor-changed");
  }
});

canvas.addEventListener("mouseup", () => {
  cursor.active = false;
  currentLine = [];

  notify("cursor-changed");
});

document.body.append(document.createElement("br"));

const clearButton = document.createElement("button");
clearButton.innerHTML = "clear";
document.body.append(clearButton);

clearButton.addEventListener("click", () => {
  lines.splice(0, lines.length);
  redraw();
});

const undoButton = document.createElement("button");
undoButton.innerHTML = "undo";
document.body.append(undoButton);

undoButton.addEventListener("click", () => {
  if (lines.length > 0) {
    const last = lines.pop();
    if (last !== undefined) {
      redoLines.push(last);
      notify("drawing-changed");
    }
  }
});

const redoButton = document.createElement("button");
redoButton.innerHTML = "redo";
document.body.append(redoButton);

redoButton.addEventListener("click", () => {
  if (redoLines.length > 0) {
    const restored = redoLines.pop();
    if (restored !== undefined) {
      lines.push(restored);
      notify("drawing-changed");
    }
  }
});
