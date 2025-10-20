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

class CursorCommand implements Command {
  x: number;
  y: number;
  width: number;

  constructor(x: number, y: number, width = 2) {
    this.x = x;
    this.y = y;
    this.width = width;
  }

  display(ctx: CanvasRenderingContext2D): void {
    // draw a filled circle matching the current tool thickness
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,1)";
    const radius = Math.max(1, this.width / 2);
    ctx.beginPath();
    ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// Preview for a sticker while the user is positioning it
class StickerPreviewCommand implements Command {
  x: number;
  y: number;
  emoji: string;
  size: number;

  constructor(x: number, y: number, emoji: string, size = 32) {
    this.x = x;
    this.y = y;
    this.emoji = emoji;
    this.size = size;
  }

  display(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${this.size}px serif`;
    ctx.fillText(this.emoji, this.x, this.y);
    ctx.restore();
  }
}

// A placed sticker in the drawing. Dragging repositions the sticker.
class StickerCommand implements Command {
  x: number;
  y: number;
  emoji: string;
  size: number;

  constructor(x: number, y: number, emoji: string, size = 32) {
    this.x = x;
    this.y = y;
    this.emoji = emoji;
    this.size = size;
  }

  // reposition the sticker
  drag(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  display(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${this.size}px serif`;
    ctx.fillText(this.emoji, this.x, this.y);
    ctx.restore();
  }
}

const commands: Command[] = [];
const redoCommands: Command[] = [];
let currentLineCommand: LineCommand | null = null;
// previewCommand is used for cursor preview or sticker preview
let previewCommand: Command | null = null;

// currently selected sticker emoji (null means drawing tool)
let selectedSticker: string | null = null;
const stickerSize: number = 32;

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
  if (previewCommand) previewCommand.display(ctx);
}

bus.addEventListener("drawing-changed", redraw);
bus.addEventListener("tool-moved", redraw);

canvas.addEventListener("mouseenter", (e: MouseEvent) => {
  if (selectedSticker) {
    previewCommand = new StickerPreviewCommand(
      e.offsetX,
      e.offsetY,
      selectedSticker,
      stickerSize,
    );
  } else {
    previewCommand = new CursorCommand(e.offsetX, e.offsetY, currentThickness);
  }
  notify("tool-moved");
});

canvas.addEventListener("mouseout", () => {
  previewCommand = null;
  notify("tool-moved");
});

canvas.addEventListener("mousemove", (e: MouseEvent) => {
  if (selectedSticker) {
    // update sticker preview position
    previewCommand = new StickerPreviewCommand(
      e.offsetX,
      e.offsetY,
      selectedSticker,
      stickerSize,
    );
  } else {
    previewCommand = new CursorCommand(e.offsetX, e.offsetY, currentThickness);
  }
  notify("tool-moved");

  if (e.buttons === 1) {
    if (currentLineCommand) {
      currentLineCommand.drag(e.offsetX, e.offsetY);
      previewCommand = null;
      notify("drawing-changed");
    } else {
      // dragging a placed sticker — check last clicked sticker under cursor
      // find a StickerCommand near the mouse and drag it
      for (let i = commands.length - 1; i >= 0; i--) {
        const c = commands[i];
        if (c instanceof StickerCommand) {
          const dx = (c as StickerCommand).x - e.offsetX;
          const dy = (c as StickerCommand).y - e.offsetY;
          const dist = Math.hypot(dx, dy);
          if (dist < (c as StickerCommand).size) {
            (c as StickerCommand).drag(e.offsetX, e.offsetY);
            notify("drawing-changed");
            break;
          }
        }
      }
    }
  }
});

canvas.addEventListener("mousedown", (e: MouseEvent) => {
  if (selectedSticker) {
    // place a sticker command
    const sticker = new StickerCommand(
      e.offsetX,
      e.offsetY,
      selectedSticker,
      stickerSize,
    );
    commands.push(sticker);
  } else {
    currentLineCommand = new LineCommand(
      e.offsetX,
      e.offsetY,
      currentThickness,
    );
    commands.push(currentLineCommand);
  }
  previewCommand = null;
  redoCommands.splice(0, redoCommands.length);
  notify("drawing-changed");
});

canvas.addEventListener("mouseup", (e: MouseEvent) => {
  currentLineCommand = null;
  if (selectedSticker) {
    previewCommand = new StickerPreviewCommand(
      e.offsetX,
      e.offsetY,
      selectedSticker,
      stickerSize,
    );
  } else {
    previewCommand = new CursorCommand(e.offsetX, e.offsetY, currentThickness);
  }
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

// Sticker tool buttons
const stickersContainer = document.createElement("div");
stickersContainer.className = "tools stickers";

const stickerEmojis = ["🐱", "🌵", "🍕"]; // three favorite emojis

const drawingButton = document.createElement("button");
drawingButton.textContent = "Draw";
drawingButton.className = "tool-button selectedTool";
stickersContainer.append(drawingButton);

for (const emoji of stickerEmojis) {
  const b = document.createElement("button");
  b.textContent = emoji;
  b.className = "tool-button";
  b.addEventListener("click", () => {
    // select this sticker
    selectedSticker = emoji;
    // update visual state
    for (
      const btn of Array.from(stickersContainer.querySelectorAll("button"))
    ) {
      btn.classList.remove("selectedTool");
    }
    b.classList.add("selectedTool");
    // fire tool-moved so preview updates
    notify("tool-moved");
  });
  stickersContainer.append(b);
}

// clicking Draw deselects stickers and returns to drawing tool
drawingButton.addEventListener("click", () => {
  selectedSticker = null;
  for (const btn of Array.from(stickersContainer.querySelectorAll("button"))) {
    btn.classList.remove("selectedTool");
  }
  drawingButton.classList.add("selectedTool");
  notify("tool-moved");
});

document.body.append(stickersContainer);

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
