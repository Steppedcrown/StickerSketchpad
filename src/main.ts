import "./style.css";

// #region Create Document and Canvas Elements
const header = document.createElement("h1");
header.textContent = "Sticker Canvas";
document.body.appendChild(header);

const canvas = document.createElement("canvas");
canvas.id = "sticker-canvas";
canvas.width = 256;
canvas.height = 256;
document.body.appendChild(canvas);

const ctx = canvas.getContext("2d");
// #endregion

// #region Command Implementations
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
// #endregion

// #region Application State and Variables
const commands: Command[] = [];
const redoCommands: Command[] = [];
let currentLineCommand: LineCommand | null = null;
// previewCommand is used for cursor preview or sticker preview
let previewCommand: CursorCommand | StickerCommand | null = null;

// currently selected sticker emoji (null means drawing tool)
let selectedSticker: string | null = null;
const stickerSize: number = 32;

const thinWidth = 2;
const thickWidth = 8;
let currentThickness = thinWidth; // default thickness for new lines
// #endregion

// #region Event Handling and Drawing Logic
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
    previewCommand = new StickerCommand(
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
  currentLineCommand = null;
  notify("tool-moved");
});

canvas.addEventListener("mousemove", (e: MouseEvent) => {
  if (selectedSticker) {
    // update sticker preview position
    previewCommand = new StickerCommand(
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
    } else if (selectedSticker) {
      (previewCommand as StickerCommand).drag(e.offsetX, e.offsetY);
    }
    notify("drawing-changed");
  }
});

canvas.addEventListener("mousedown", (e: MouseEvent) => {
  if (!selectedSticker) {
    currentLineCommand = new LineCommand(
      e.offsetX,
      e.offsetY,
      currentThickness,
    );
    commands.push(currentLineCommand);
    previewCommand = null;
  }

  redoCommands.splice(0, redoCommands.length);
  notify("drawing-changed");
});

canvas.addEventListener("mouseup", (e: MouseEvent) => {
  currentLineCommand = null;
  if (selectedSticker) {
    // place a sticker command
    const sticker = new StickerCommand(
      e.offsetX,
      e.offsetY,
      selectedSticker,
      stickerSize,
    );
    commands.push(sticker);

    previewCommand = new StickerCommand(
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
// #endregion

// #region Setup UI Elements
// Set up tool divs
const modeContainer = document.createElement("div");
modeContainer.className = "modes";

const drawingContainer = document.createElement("div");
drawingContainer.className = "tools";

const stickersContainer = document.createElement("div");
stickersContainer.className = "tools stickers";
stickersContainer.classList.add("collapsed");

// Mode selection buttons
const drawingButton = document.createElement("button");
drawingButton.textContent = "Draw";
drawingButton.className = "tool-button selectedTool";
modeContainer.append(drawingButton);

const stickerButton = document.createElement("button");
stickerButton.textContent = "Stickers";
stickerButton.className = "tool-button";
modeContainer.append(stickerButton);

drawingButton.addEventListener("click", () => {
  selectedSticker = null;
  for (const btn of Array.from(modeContainer.querySelectorAll("button"))) {
    btn.classList.remove("selectedTool");
  }
  stickersContainer.classList.add("collapsed");
  drawingContainer.classList.remove("collapsed");
  drawingButton.classList.add("selectedTool");
  notify("tool-moved");
});

stickerButton.addEventListener("click", () => {
  selectedSticker = null;
  for (const btn of Array.from(modeContainer.querySelectorAll("button"))) {
    btn.classList.remove("selectedTool");
  }
  drawingContainer.classList.add("collapsed");
  stickersContainer.classList.remove("collapsed");
  stickerButton.classList.add("selectedTool");
  notify("tool-moved");
});

document.body.append(modeContainer);

// Tool buttons: thin / thick
const thinButton = document.createElement("button");
thinButton.textContent = "Thin";
thinButton.className = "tool-button";

const thickButton = document.createElement("button");
thickButton.textContent = "Thick";
thickButton.className = "tool-button";

drawingContainer.append(thinButton, thickButton);
document.body.append(drawingContainer);

// Sticker tool buttons
const addSticker = document.createElement("button");
addSticker.textContent = "+";
addSticker.className = "tool-button";
addSticker.addEventListener("click", () => {
  const newEmojis = prompt("Enter one or more emojis to add to the palette");
  if (newEmojis) {
    // Using Array.from() or the spread operator `...` correctly handles
    // multi-codepoint emoji characters.
    for (const emoji of [...newEmojis]) {
      addStickerButton(emoji);
    }
  }
});
stickersContainer.append(addSticker);

function addStickerButton(emoji: string) {
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
  stickersContainer.insertBefore(b, addSticker);
  return b;
}

const stickerEmojis = ["🐱", "🌵", "🍕"]; // three favorite emojis
let first = true;
for (const emoji of stickerEmojis) {
  const sticker = addStickerButton(emoji);
  if (first) {
    sticker.classList.add("selectedTool");
    first = false;
  }
}

document.body.append(stickersContainer);

function selectTool(button: HTMLButtonElement, thickness: number) {
  // update visual state
  for (const b of Array.from(drawingContainer.querySelectorAll("button"))) {
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
// #endregion

// #region Button Event Listeners and Logic
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
// #endregion
