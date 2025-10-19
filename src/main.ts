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

interface Command {
  execute(): void;
}

class LineCommand implements Command {
  points: Point[];

  constructor(x: number, y: number) {
    this.points = [{ x, y }];
  }

  grow(x: number, y: number) {
    this.points.push({ x, y });
  }

  execute(): void {
    if (!ctx) return;
    ctx.save();
    ctx.strokeStyle = "black";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";

    ctx.beginPath();
    const first = this.points[0];
    if (!first) {
      ctx.restore();
      return;
    }

    ctx.moveTo(first.x, first.y);

    for (const p of this.points) {
      ctx.lineTo(p.x, p.y);
    }

    ctx.stroke();
    ctx.restore();
  }
}

const commands: Command[] = [];
const redoCommands: Command[] = [];
let currentLineCommand: LineCommand | null = null;

const bus = new EventTarget();
function notify(name: string) {
  bus.dispatchEvent(new Event(name));
}

function redraw() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const cmd of commands) cmd.execute();
}

bus.addEventListener("drawing-changed", redraw);
bus.addEventListener("cursor-changed", redraw);

/*function tick() {
  redraw();
  requestAnimationFrame(tick);
}

tick();*/

canvas.addEventListener("mouseout", () => {
  notify("cursor-changed");
});

canvas.addEventListener("mouseenter", () => {
  notify("cursor-changed");
});

canvas.addEventListener("mousemove", (e: MouseEvent) => {
  notify("cursor-changed");

  if (e.buttons === 1) {
    currentLineCommand?.grow(e.offsetX, e.offsetY);
    notify("drawing-changed");
  }
});

canvas.addEventListener("mousedown", (e: MouseEvent) => {
  currentLineCommand = new LineCommand(e.offsetX, e.offsetY);
  commands.push(currentLineCommand);
  redoCommands.splice(0, redoCommands.length);
  notify("drawing-changed");
});

canvas.addEventListener("mouseup", () => {
  currentLineCommand = null;
  notify("drawing-changed");
});

document.body.append(document.createElement("br"));

const clearButton = document.createElement("button");
clearButton.innerHTML = "clear";
document.body.append(clearButton);

clearButton.addEventListener("click", () => {
  commands.splice(0, commands.length);
  notify("drawing-changed");
});

const undoButton = document.createElement("button");
undoButton.innerHTML = "undo";
document.body.append(undoButton);

undoButton.addEventListener("click", () => {
  const last = commands.pop();
  if (last !== undefined) {
    redoCommands.push(last);
    notify("drawing-changed");
  }
});

const redoButton = document.createElement("button");
redoButton.innerHTML = "redo";
document.body.append(redoButton);

redoButton.addEventListener("click", () => {
  const restored = redoCommands.pop();
  if (restored !== undefined) {
    commands.push(restored);
    notify("drawing-changed");
  }
});
