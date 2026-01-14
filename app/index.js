import document from "document";
import clock from "clock";

// Izgara Yapılandırması (336x336 Ekran İçin)
const GRID_SIZE = 15; 
const ROWS = 18;      
const COLS = 20;      
const X_OFFSET = 18;
const Y_OFFSET = 50;

let snake = [{x: 10, y: 10}, {x: 10, y: 11}, {x: 10, y: 12}];
let food = {x: 5, y: 5};
let dir = {x: 0, y: -1}; 
let score = 0;
let gameLoop = null;

const clockLabel = document.getElementById("clock-label");
const foodEl = document.getElementById("food");
const scoreEl = document.getElementById("score-text");
const gameOverContainer = document.getElementById("game-over-container");
const finalScoreEl = document.getElementById("final-score");

// Saat Fonksiyonu
clock.granularity = "minutes";
clock.ontick = (evt) => {
  let today = evt.date;
  let hours = today.getHours();
  let mins = today.getMinutes();
  clockLabel.text = `${("0" + hours).slice(-2)}:${("0" + mins).slice(-2)}`;
};

const bodySegments = [];
for (let i = 0; i < 30; i++) {
  bodySegments.push(document.getElementById(`s${i}`));
}

// Kontroller
document.getElementById("up").onclick = () => { if(dir.y === 0) dir = {x: 0, y: -1}; };
document.getElementById("down").onclick = () => { if(dir.y === 0) dir = {x: 0, y: 1}; };
document.getElementById("left").onclick = () => { if(dir.x === 0) dir = {x: -1, y: 0}; };
document.getElementById("right").onclick = () => { if(dir.x === 0) dir = {x: 1, y: 0}; };
document.getElementById("btn-restart").onclick = () => { resetGame(); };

function spawnFood() {
  food.x = Math.floor(Math.random() * COLS);
  food.y = Math.floor(Math.random() * ROWS);
  foodEl.x = X_OFFSET + (food.x * GRID_SIZE);
  foodEl.y = Y_OFFSET + (food.y * GRID_SIZE);
}

function update() {
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

  if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) return endGame();
  for (let i = 0; i < snake.length; i++) {
    if (snake[i].x === head.x && snake[i].y === head.y) return endGame();
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score += 10;
    scoreEl.text = `SKOR: ${score}`;
    spawnFood();
  } else {
    snake.pop();
  }
  draw();
}

function draw() {
  bodySegments.forEach(seg => { if(seg) seg.style.display = "none"; });
  
  snake.forEach((part, i) => {
    if (bodySegments[i]) {
      bodySegments[i].style.display = "inline";
      bodySegments[i].x = X_OFFSET + (part.x * GRID_SIZE);
      bodySegments[i].y = Y_OFFSET + (part.y * GRID_SIZE);
    }
  });
}

function endGame() {
  if (gameLoop) clearInterval(gameLoop);
  finalScoreEl.text = `SKOR: ${score}`;
  gameOverContainer.style.display = "inline";
}

function resetGame() {
  snake = [{x: 10, y: 10}, {x: 10, y: 11}, {x: 10, y: 12}];
  dir = {x: 0, y: -1};
  score = 0;
  scoreEl.text = "SKOR: 0";
  gameOverContainer.style.display = "none";
  spawnFood();
  if (gameLoop) clearInterval(gameLoop);
  gameLoop = setInterval(update, 250);
}

resetGame();