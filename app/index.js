import document from "document";
import clock from "clock";
import * as fs from "fs";
import { me } from "appbit";
import * as messaging from "messaging";

// AYARLAR
const GRID_SIZE = 15; 
const ROWS = 19;      
const COLS = 21;      
const X_OFFSET = 10;
const Y_OFFSET = 40;  
const MAX_SNAKE_LENGTH = 50; 

const HIGH_SCORE_FILE = "highscore.json";
const STATE_FILE = "gamestate.json";

// DEĞİŞKENLER
let snake = [{x: 10, y: 10}, {x: 10, y: 11}, {x: 10, y: 12}];
let food = {x: 5, y: 5};
let dir = {x: 0, y: -1}; 
let score = 0;
let highScore = 0;
let highScoreDate = "";
let gameLoop = null;
let isGameRunning = false;
let isWallWrapEnabled = false; // Duvar Yok modu aktif mi?

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

// Yeni Mod Elementleri
const btnMode = document.getElementById("btn-mode");
const modeCheck = document.getElementById("mode-check");

// --- SKOR YÖNETİMİ ---
function loadLocalHighScore() {
  try {
    if (fs.existsSync(HIGH_SCORE_FILE)) {
      const data = fs.readFileSync(HIGH_SCORE_FILE, "json");
      highScore = data.score || 0;
      highScoreDate = data.date || "";
    }
  } catch (e) { highScore = 0; highScoreDate = ""; }
  updateHighScoreDisplay();
}

loadLocalHighScore();

messaging.peerSocket.onopen = () => {
  messaging.peerSocket.send({ command: "GET_HIGHSCORE" });
};

messaging.peerSocket.onmessage = (evt) => {
  if (evt.data && evt.data.command === "RESTORE_HIGHSCORE") {
    if (evt.data.score > highScore) {
      highScore = evt.data.score;
      highScoreDate = evt.data.date;
      saveHighScoreLocal();
      updateHighScoreDisplay();
    }
  }
};

function saveHighScoreLocal() {
  try {
    fs.writeFileSync(HIGH_SCORE_FILE, { score: highScore, date: highScoreDate }, "json");
  } catch (e) {}
}

function sendHighScoreToPhone() {
  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    messaging.peerSocket.send({
      command: "SAVE_HIGHSCORE",
      score: highScore,
      date: highScoreDate
    });
  }
}

function updateHighScoreDisplay() {
  if (highScoreText) {
    highScoreText.text = "EN YÜKSEK: " + highScore + (highScoreDate ? " (" + highScoreDate + ")" : "");
  }
}

// SAAT
clock.granularity = "minutes";
clock.ontick = (evt) => {
  let timeStr = ("0" + evt.date.getHours()).slice(-2) + ":" + ("0" + evt.date.getMinutes()).slice(-2);
  if (clockLabel) clockLabel.text = timeStr;
  if (menuClock) menuClock.text = timeStr;
};

// YILAN PARÇALARI
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

// MOD BUTONU TIKLAMA
if (btnMode) {
  btnMode.onclick = () => {
    // Sadece oyun oynanmıyorken (menüdeyken) değiştirilebilir
    if (!isGameRunning) {
      isWallWrapEnabled = !isWallWrapEnabled;
      updateModeVisual();
    }
  };
}

function updateModeVisual() {
  if (modeCheck) {
    modeCheck.style.display = isWallWrapEnabled ? "inline" : "none";
  }
}

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
  let nextX = snake[0].x + dir.x;
  let nextY = snake[0].y + dir.y;
  
  // DUVAR YOK MODU KONTROLÜ
  if (isWallWrapEnabled) {
    // Haritanın dışına çıkarsa diğer taraftan gir
    if (nextX < 0) nextX = COLS - 1;
    else if (nextX >= COLS) nextX = 0;
    
    if (nextY < 0) nextY = ROWS - 1;
    else if (nextY >= ROWS) nextY = 0;
  } else {
    // Klasik Mod: Duvara çarpınca öl
    if (nextX < 0 || nextX >= COLS || nextY < 0 || nextY >= ROWS) return endGame();
  }

  const head = { x: nextX, y: nextY };
  
  // Kendine çarpma kontrolü
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

// OYUN DURUMUNU KAYDET (Bildirim gelirse diye)
function saveState() {
  if (isGameRunning) {
    const gameState = {
      snake: snake,
      food: food,
      dir: dir,
      score: score,
      wallMode: isWallWrapEnabled // Modu da kaydet
    };
    try {
      fs.writeFileSync(STATE_FILE, gameState, "json");
    } catch (e) { console.log("Kayıt hatası: " + e); }
  } else {
    try {
      if (fs.existsSync(STATE_FILE)) fs.unlinkSync(STATE_FILE);
    } catch (e) {}
  }
}

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = fs.readFileSync(STATE_FILE, "json");
      snake = data.snake;
      food = data.food;
      dir = data.dir;
      score = data.score;
      isWallWrapEnabled = data.wallMode || false; // Modu geri yükle
      
      updateModeVisual(); // Kutucuğu güncelle
      
      if (scoreEl) scoreEl.text = "SKOR: " + score;
      if (menuContainer) menuContainer.style.display = "none";
      
      isGameRunning = true;
      spawnFood(false); 
      draw();
      
      if (gameLoop) clearInterval(gameLoop);
      gameLoop = setInterval(update, 250);
      return true;
    }
  } catch (e) { console.log("Yükleme hatası: " + e); }
  return false;
}

me.onunload = () => {
  saveState();
};

function endGame() {
  isGameRunning = false; 
  if (gameLoop) { clearInterval(gameLoop); gameLoop = null; }
  
  try {
    if (fs.existsSync(STATE_FILE)) fs.unlinkSync(STATE_FILE);
  } catch (e) {}

  if (score > highScore) {
    highScore = score;
    const now = new Date();
    highScoreDate = ("0" + now.getDate()).slice(-2) + "/" + ("0" + (now.getMonth() + 1)).slice(-2) + "/" + now.getFullYear();
    
    saveHighScoreLocal();
    sendHighScoreToPhone();
  }

  updateHighScoreDisplay();
  if (lastScoreText) {
    lastScoreText.text = "SKORUN: " + score;
    lastScoreText.style.display = "inline";
  }
  
  // Oyun bittiğinde menüyü göster
  if (btnText) btnText.text = "YENİ OYUN"; 
  if (menuContainer) menuContainer.style.display = "inline";
  
  // Kutucuğun durumunu menüye yansıt (kullanıcı değiştirebilsin diye)
  updateModeVisual();
}

function resetGame() {
  try {
    if (fs.existsSync(STATE_FILE)) fs.unlinkSync(STATE_FILE);
  } catch (e) {}

  snake = [{x: 10, y: 10}, {x: 10, y: 11}, {x: 10, y: 12}];
  dir = {x: 0, y: -1};
  score = 0;
  isGameRunning = true;
  
  // Seçili modu koruyoruz (değiştirmiyoruz, kullanıcı menüde ne seçtiyse o)
  
  if (scoreEl) scoreEl.text = "SKOR: 0";
  if (menuContainer) menuContainer.style.display = "none";
  
  spawnFood();
  if (gameLoop) clearInterval(gameLoop);
  gameLoop = setInterval(update, 250);
}

if (!loadState()) {
  updateModeVisual(); // Varsayılan durumu göster (Boş kutu)
  spawnFood(); 
  draw();
}
