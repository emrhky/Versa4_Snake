import document from "document";
import clock from "clock";
import * as fs from "fs";
import { me } from "appbit"; // Uygulama durumunu takip etmek için eklendi

// AYARLAR
const GRID_SIZE = 15; 
const ROWS = 19;      
const COLS = 21;      
const X_OFFSET = 10;
const Y_OFFSET = 40;  
const MAX_SNAKE_LENGTH = 50; 

const HIGH_SCORE_FILE = "highscore.json";
const STATE_FILE = "gamestate.json"; // Oyunun anlık durumunu tutacak dosya

// DEĞİŞKENLER
let snake = [{x: 10, y: 10}, {x: 10, y: 11}, {x: 10, y: 12}];
let food = {x: 5, y: 5};
let dir = {x: 0, y: -1}; 
let score = 0;
let highScore = 0;
let highScoreDate = "";
let gameLoop = null;
let isGameRunning = false; // Oyunun oynanıp oynanmadığını takip eder

// ELEMENTLER
const clockLabel = document.getElementById("clock-label");
const menuClock = document.getElementById("menu-clock");
const foodEl = document.getElementById("food");
const scoreEl = document.getElementById("score-text");
const menuContainer = document.getElementById("menu-container");
const highScoreText = document.getElementById("high-score-text");
const lastScoreText = document.getElementById("last-score-text");
const btnText = document.getElementById("btn-text");
const btnStart = document.getElementById("btn-start");

// EN YÜKSEK SKORU YÜKLE
try {
  if (fs.existsSync(HIGH_SCORE_FILE)) {
    const data = fs.readFileSync(HIGH_SCORE_FILE, "json");
    highScore = data.score || 0;
    highScoreDate = data.date || "";
  }
} catch (e) { highScore = 0; highScoreDate = ""; }

function updateHighScoreDisplay() {
  if (highScoreText) {
    highScoreText.text = "EN YÜKSEK: " + highScore + (highScoreDate ? " (" + highScoreDate + ")" : "");
  }
}
updateHighScoreDisplay();

// SAAT AYARLARI
clock.granularity = "minutes";
clock.ontick = (evt) => {
  let timeStr = ("0" + evt.date.getHours()).slice(-2) + ":" + ("0" + evt.date.getMinutes()).slice(-2);
  if (clockLabel) clockLabel.text = timeStr;
  if (menuClock) menuClock.text = timeStr;
};

// YILAN PARÇALARINI HAZIRLA
const bodySegments = [];
for (let i = 0; i < MAX_SNAKE_LENGTH; i++) {
  let seg = document.getElementById("s" + i);
  if (seg) bodySegments.push(seg);
}

// YÖN KONTROLÜ
const setDir = (x, y) => {
  if (isGameRunning && dir.x !== -x && dir.y !== -y) dir = {x, y};
};

document.getElementById("up").onclick = () => setDir(0, -1);
document.getElementById("down").onclick = () => setDir(0, 1);
document.getElementById("left").onclick = () => setDir(-1, 0);
document.getElementById("right").onclick = () => setDir(1, 0);

if (btnStart) btnStart.onclick = () => resetGame();

// YEM OLUŞTURMA
function spawnFood(newLocation = true) {
  if (newLocation) {
    let validPosition = false;
    while (!validPosition) {
      food.x = Math.floor(Math.random() * COLS);
      food.y = Math.floor(Math.random() * ROWS);
      validPosition = true;
      for (let part of snake) {
        if (part.x === food.x && part.y === food.y) {
          validPosition = false;
          break; 
        }
      }
    }
  }
  
  if (foodEl) {
    foodEl.x = X_OFFSET + (food.x * GRID_SIZE);
    foodEl.y = Y_OFFSET + (food.y * GRID_SIZE);
  }
}

// OYUN DÖNGÜSÜ
function update() {
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
  
  // Çarpışma Kontrolleri
  if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) return endGame();
  for (let i = 0; i < snake.length; i++) {
    if (snake[i].x === head.x && snake[i].y === head.y) return endGame();
  }
  
  snake.unshift(head); 
  
  if (head.x === food.x && head.y === food.y) {
    score += 1;
    if (scoreEl) scoreEl.text = "SKOR: " + score;
    spawnFood();
  } else { 
    snake.pop(); 
  }
  
  draw();
}

function draw() {
  bodySegments.forEach((seg, i) => {
    if (i < snake.length) {
      seg.x = X_OFFSET + (snake[i].x * GRID_SIZE);
      seg.y = Y_OFFSET + (snake[i].y * GRID_SIZE);
      seg.style.display = "inline";
    } else { 
      seg.style.display = "none"; 
    }
  });
}

// OYUNU KAYDET (Bildirim gelince veya çıkınca çalışır)
function saveState() {
  if (isGameRunning) {
    // Sadece oyun devam ediyorsa kaydet
    const gameState = {
      snake: snake,
      food: food,
      dir: dir,
      score: score
    };
    try {
      fs.writeFileSync(STATE_FILE, gameState, "json");
    } catch (e) { console.log("Kayıt hatası: " + e); }
  } else {
    // Oyun zaten bitmişse kayıt dosyasını sil ki sonraki açılışta menü gelsin
    try {
      if (fs.existsSync(STATE_FILE)) fs.unlinkSync(STATE_FILE);
    } catch (e) {}
  }
}

// KAYITLI OYUNU YÜKLE
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = fs.readFileSync(STATE_FILE, "json");
      snake = data.snake;
      food = data.food;
      dir = data.dir;
      score = data.score;
      
      // Oyunu devam ettir
      if (scoreEl) scoreEl.text = "SKOR: " + score;
      if (menuContainer) menuContainer.style.display = "none";
      
      isGameRunning = true;
      spawnFood(false); // Yeni yem üretme, eskisini çiz
      draw();
      
      if (gameLoop) clearInterval(gameLoop);
      gameLoop = setInterval(update, 250);
      return true; // Başarıyla yüklendi
    }
  } catch (e) { console.log("Yükleme hatası: " + e); }
  return false; // Kayıt yok
}

// UYGULAMA KAPANDIĞINDA TETİKLENİR
me.onunload = () => {
  saveState();
};

function endGame() {
  isGameRunning = false; // Oyun bitti
  if (gameLoop) { clearInterval(gameLoop); gameLoop = null; }
  
  // Oyun bittiği için kayıt dosyasını temizle
  try {
    if (fs.existsSync(STATE_FILE)) fs.unlinkSync(STATE_FILE);
  } catch (e) {}

  if (score > highScore) {
    highScore = score;
    const now = new Date();
    highScoreDate = ("0" + now.getDate()).slice(-2) + "/" + ("0" + (now.getMonth() + 1)).slice(-2) + "/" + now.getFullYear();
    try {
      fs.writeFileSync(HIGH_SCORE_FILE, { score: highScore, date: highScoreDate }, "json");
    } catch (e) {}
  }

  updateHighScoreDisplay();
  if (lastScoreText) {
    lastScoreText.text = "SKORUN: " + score;
    lastScoreText.style.display = "inline";
  }
  
  if (btnText) btnText.text = "YENİ OYUN"; 
  if (menuContainer) menuContainer.style.display = "inline";
}

function resetGame() {
  // Eski kaydı sil
  try {
    if (fs.existsSync(STATE_FILE)) fs.unlinkSync(STATE_FILE);
  } catch (e) {}

  snake = [{x: 10, y: 10}, {x: 10, y: 11}, {x: 10, y: 12}];
  dir = {x: 0, y: -1};
  score = 0;
  isGameRunning = true;
  
  if (scoreEl) scoreEl.text = "SKOR: 0";
  if (menuContainer) menuContainer.style.display = "none";
  
  spawnFood();
  if (gameLoop) clearInterval(gameLoop);
  gameLoop = setInterval(update, 250);
}

// BAŞLANGIÇTA KONTROL ET
if (!loadState()) {
  // Eğer kayıtlı oyun yoksa normal menüyü ve yılanı çiz
  // Ancak gameLoop başlatma, menüde beklesin
  spawnFood(); 
  draw();
}
