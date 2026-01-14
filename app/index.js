import document from "document";

// Oyun Ayarları
const GRID_SIZE = 15; // Hücre boyutu
const ROWS = 18;      // Dikey hücre sayısı
const COLS = 21;      // Yatay hücre sayısı
const X_OFFSET = 10;
const Y_OFFSET = 42;

let snake = [{x: 10, y: 10}, {x: 10, y: 11}, {x: 10, y: 12}];
let food = {x: 5, y: 5};
let dir = {x: 0, y: -1}; // Başlangıç yönü: Yukarı
let score = 0;
let gameLoop = null;

// Elementleri Bağla
const foodEl = document.getElementById("food");
const scoreEl = document.getElementById("score-text");
const gameOverEl = document.getElementById("game-over");
const finalScoreEl = document.getElementById("final-score");

// Vücut Parçalarını Diziye Al
const bodySegments = [];
for (let i = 0; i < 20; i++) { // XML'de tanımladığınız kadar
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

  // Çarpışma Kontrolleri (Duvar ve Kendisi)
  if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) return endGame();
  for (let s of snake) if (s.x === head.x && s.y === head.y) return endGame();

  snake.unshift(head);

  // Yem Yeme
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
  // Tüm gövdeyi temizle/gizle
  bodySegments.forEach(seg => { if(seg) seg.style.display = "none"; });

  // Yılanı çiz
  snake.forEach((part, i) => {
    if (bodySegments[i]) {
      bodySegments[i].style.display = "inline";
      bodySegments[i].x = X_OFFSET + (part.x * GRID_SIZE);
      bodySegments[i].y = Y_OFFSET + (part.y * GRID_SIZE);
    }
  });
}

function endGame() {
  clearInterval(gameLoop);
  finalScoreEl.text = `SKOR: ${score}`;
  gameOverEl.style.display = "inline";
}

function resetGame() {
  snake = [{x: 10, y: 10}, {x: 10, y: 11}, {x: 10, y: 12}];
  dir = {x: 0, y: -1};
  score = 0;
  scoreEl.text = "SKOR: 0";
  gameOverEl.style.display = "none";
  spawnFood();
  if (gameLoop) clearInterval(gameLoop);
  gameLoop = setInterval(update, 250); // Hız (250ms ideal)
}

// Başlat
resetGame();
