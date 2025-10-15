import "./style.css";

const header = document.createElement("h1");
header.textContent = "Sticker Canvas";
document.body.appendChild(header);

const canvas = document.createElement("canvas");
canvas.width = 256;
canvas.height = 256;
canvas.style.border = "2px solid black";
canvas.id = "sticker-canvas";
document.body.appendChild(canvas);
