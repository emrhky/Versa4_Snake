import document from "document";
import clock from "clock";
import * as fs from "fs";

// Izgara Yapılandırması
const GRID_SIZE = 15; 
const ROWS = 19;      
const COLS = 21;      
const X_OFFSET = 10;
const Y_OFFSET = 40;  

const HIGH_SCORE_FILE = "highscore.json";

let snake = [{x: 10, y: 10}, {x: 10, y: 11}, {x: 10, y: 12}];
let food = {x: 5, y: 5};
let dir = {x: 0, y: -1}; 
let score = 0;
let highScore = 0;
let gameLoop = null;

const clockLabel = document.getElementById("clock-label");
const foodEl = document.getElementById("food");
const scoreEl = document.getElementById("score-text");

// Menü Elemanları
const menuContainer = document.getElementById("menu-container");
const menuTitle = document.getElementById("menu-title");
const highScoreText = document.getElementById("high-score-text");
const lastScoreText = document.getElementById("last-score-text");
const btnText = document.getElementById("btn-text");
const btnStart = document.getElementById("btn-start");

// Yüksek Skoru Dosyadan Yükle
try {
  if (fs.existsSync(HIGH_SCORE_FILE)) {
    const data = fs.readFileSync(HIGH_SCORE_FILE, "json");
    highScore = data.score || 0;
  }
} catch (e) {
  highScore = 0;
}
highScoreText.text = `EN YÜKSEK: ${highScore}`;

// Saat Fonksiyonu
clock.granularity = "minutes";
clock.ontick = (evt) => {
  let today = evt.date;
  clockLabel.text = ("0" + today.getHours()).slice(-2) + ":" + ("0" + today.getMinutes()).slice(-2);
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

// Başlat Butonu
btnStart.onclick = () => {
  resetGame();
};

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
  
  // Yüksek Skor Kontrolü ve Kaydetme
  if (score > highScore) {
    highScore = score;
    try {
      fs.writeFileSync(HIGH_SCORE_FILE, { score: highScore }, "json");
    } catch (e) {}
  }

  menuTitle.text = "OYUN BİTTİ";
  highScoreText.text = `EN YÜKSEK: ${highScore}`;
  lastScoreText.text = `SKORUN: ${score}`;
  lastScoreText.style.display = "inline";
  btnText.text = "YENİDEN DENE";
  menuContainer.style.display = "inline";
}

function resetGame() {
  snake = [{x: 10, y: 10}, {x: 10, y: 11}, {x: 10, y: 12}];
  dir = {x: 0, y: -1};
  score = 0;
  scoreEl.text = "SKOR: 0";
  menuContainer.style.display = "none";
  spawnFood();
  if (gameLoop) clearInterval(gameLoop);
  gameLoop = setInterval(update, 250);
}

// Başlangıçta sadece saati güncelle ve menüyü göster (update/resetGame çağrılmıyor)
spawnFood(); 
draw();
