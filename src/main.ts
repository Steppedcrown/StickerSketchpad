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
  display(ctx: CanvasRenderingContext2D): void;
}

class LineCommand implements Command {
  points: Point[];
  width: number;

  constructor(x: number, y: number, width = 4) {
    this.points = [{ x, y }];
    this.width = width;
  }
  drag(x: number, y: number) {
    this.points.push({ x, y });
  }

  display(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.strokeStyle = "black";
    ctx.lineWidth = this.width;
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

const thinWidth = 2;
const thickWidth = 8;
let currentThickness = thinWidth; // default thickness for new lines

const bus = new EventTarget();
function notify(name: string) {
  bus.dispatchEvent(new Event(name));
}

function redraw() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const cmd of commands) cmd.display(ctx);
}

bus.addEventListener("drawing-changed", redraw);
bus.addEventListener("cursor-changed", redraw);

canvas.addEventListener("mouseout", () => {
  notify("cursor-changed");
});

canvas.addEventListener("mouseenter", () => {
  notify("cursor-changed");
});

canvas.addEventListener("mousemove", (e: MouseEvent) => {
  notify("cursor-changed");

  if (e.buttons === 1) {
    currentLineCommand?.drag(e.offsetX, e.offsetY);
    notify("drawing-changed");
  }
});

canvas.addEventListener("mousedown", (e: MouseEvent) => {
  currentLineCommand = new LineCommand(e.offsetX, e.offsetY, currentThickness);
  commands.push(currentLineCommand);
  redoCommands.splice(0, redoCommands.length);
  notify("drawing-changed");
});

canvas.addEventListener("mouseup", () => {
  currentLineCommand = null;
  notify("drawing-changed");
});

document.body.append(document.createElement("br"));

// Tool buttons: thin / thick
const toolsContainer = document.createElement("div");
toolsContainer.className = "tools";

const thinButton = document.createElement("button");
thinButton.textContent = "Thin";
thinButton.className = "tool-button";

const thickButton = document.createElement("button");
thickButton.textContent = "Thick";
thickButton.className = "tool-button";

toolsContainer.append(thinButton, thickButton);
document.body.append(toolsContainer);

function selectTool(button: HTMLButtonElement, thickness: number) {
  // update visual state
  for (const b of Array.from(toolsContainer.querySelectorAll("button"))) {
    b.classList.remove("selectedTool");
  }
  button.classList.add("selectedTool");
  // set thickness for next lines
  currentThickness = thickness;
}

// default selection
selectTool(thinButton, thinWidth);

thinButton.addEventListener("click", () => selectTool(thinButton, thinWidth));
thickButton.addEventListener(
  "click",
  () => selectTool(thickButton, thickWidth),
);

const clearButton = document.createElement("button");
clearButton.innerHTML = "Clear";
clearButton.className = "tool-button";
document.body.append(clearButton);

clearButton.addEventListener("click", () => {
  commands.splice(0, commands.length);
  notify("drawing-changed");
});

const undoButton = document.createElement("button");
undoButton.innerHTML = "Undo";
undoButton.className = "tool-button";
document.body.append(undoButton);

undoButton.addEventListener("click", () => {
  const last = commands.pop();
  if (last !== undefined) {
    redoCommands.push(last);
    notify("drawing-changed");
  }
});

const redoButton = document.createElement("button");
redoButton.innerHTML = "Redo";
redoButton.className = "tool-button";
document.body.append(redoButton);

redoButton.addEventListener("click", () => {
  const restored = redoCommands.pop();
  if (restored !== undefined) {
    commands.push(restored);
    notify("drawing-changed");
  }
});
