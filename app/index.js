import document from "document";
import clock from "clock";
import * as fs from "fs";
import { me } from "appbit";
import * as messaging from "messaging";
import { display } from "display"; 

// EKRAN KAPANMASIN
display.autoOff = false;

// AYARLAR
const GRID_SIZE = 15; 
const ROWS = 20;      
const COLS = 21;      
const X_OFFSET = 10;
const Y_OFFSET = 25;  
const MAX_SNAKE_LENGTH = 50; 

const HIGH_SCORE_FILE = "highscore_v2.json";
const STATE_FILE = "gamestate.json";

// DEĞİŞKENLER
let snake = [{x: 10, y: 10}, {x: 10, y: 11}, {x: 10, y: 12}];
let food = {x: 5, y: 5};
let dir = {x: 0, y: -1}; 
let score = 0;
let gameLoop = null;
let isGameRunning = false;
let isWallWrapEnabled = false; 
let lastTapTime = 0; // Çift dokunuş için zamanlayıcı

// SKORLAR
let highScoreClassic = 0;
let dateClassic = "";
let highScoreNoWall = 0;
let dateNoWall = "";

// ELEMENTLER
const clockLabel = document.getElementById("clock-label");
const menuClock = document.getElementById("menu-clock");
const foodEl = document.getElementById("food");
const scoreEl = document.getElementById("score-text");
const menuContainer = document.getElementById("menu-container");

const textRecordClassic = document.getElementById("record-classic");
const textRecordNoWall = document.getElementById("record-nowall");
const lastScoreText = document.getElementById("last-score-text");

const btnText = document.getElementById("btn-text");
const btnStart = document.getElementById("btn-start");
const btnMode = document.getElementById("btn-mode");
const modeValueText = document.getElementById("mode-value");

// --- SKOR YÖNETİMİ ---
function loadLocalHighScores() {
  try {
    if (fs.existsSync(HIGH_SCORE_FILE)) {
      const data = fs.readFileSync(HIGH_SCORE_FILE, "json");
      highScoreClassic = data.classic?.score || 0;
      dateClassic = data.classic?.date || "";
      highScoreNoWall = data.nowall?.score || 0;
      dateNoWall = data.nowall?.date || "";
    }
  } catch (e) { 
    highScoreClassic = 0; highScoreNoWall = 0; 
  }
  updateHighScoreDisplay();
}

loadLocalHighScores();

messaging.peerSocket.onopen = () => {
  messaging.peerSocket.send({ command: "GET_HIGHSCORE" });
};

messaging.peerSocket.onmessage = (evt) => {
  if (evt.data && evt.data.command === "RESTORE_HIGHSCORE") {
    if (evt.data.classic.score > highScoreClassic) {
      highScoreClassic = evt.data.classic.score;
      dateClassic = evt.data.classic.date;
    }
    if (evt.data.nowall.score > highScoreNoWall) {
      highScoreNoWall = evt.data.nowall.score;
      dateNoWall = evt.data.nowall.date;
    }
    saveHighScoresLocal();
    updateHighScoreDisplay();
  }
};

function saveHighScoresLocal() {
  const data = {
    classic: { score: highScoreClassic, date: dateClassic },
    nowall: { score: highScoreNoWall, date: dateNoWall }
  };
  try {
    fs.writeFileSync(HIGH_SCORE_FILE, data, "json");
  } catch (e) {}
}

function sendScoreToPhone(score, date, mode) {
  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    messaging.peerSocket.send({
      command: "SAVE_HIGHSCORE",
      score: score,
      date: date,
      mode: mode 
    });
  }
}

function updateHighScoreDisplay() {
  if (textRecordClassic) {
    // Tarih bilgisi eklendi
    textRecordClassic.text = "REKOR KLASİK: " + highScoreClassic + (dateClassic ? " (" + dateClassic + ")" : "");
  }
  if (textRecordNoWall) {
    // Tarih bilgisi eklendi
    textRecordNoWall.text = "REKOR DUVARSIZ: " + highScoreNoWall + (dateNoWall ? " (" + dateNoWall + ")" : "");
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

// YÖN KONTROLÜ VE ÇİFT DOKUNUŞ (PAUSE)
const setDir = (x, y) => {
  // Çift dokunuş kontrolü (300ms içinde ikinci tıklama)
  let now = Date.now();
  if (isGameRunning && (now - lastTapTime < 300)) {
    endGame(); // Bekleme ekranına (menüye) dön
    return;
  }
  lastTapTime = now;

  if (isGameRunning && dir.x !== -x && dir.y !== -y) dir = {x, y};
};

document.getElementById("up").onclick = () => setDir(0, -1);
document.getElementById("down").onclick = () => setDir(0, 1);
document.getElementById("left").onclick = () => setDir(-1, 0);
document.getElementById("right").onclick = () => setDir(1, 0);

if (btnStart) {
  btnStart.onclick = () => resetGame();
}

// MOD DEĞİŞTİRME
if (btnMode) {
  btnMode.onclick = () => {
    if (!isGameRunning) {
      isWallWrapEnabled = !isWallWrapEnabled;
      updateModeVisual();
    }
  };
}

function updateModeVisual() {
  if (modeValueText) {
    modeValueText.text = isWallWrapEnabled ? "< DUVAR YOK >" : "< KLASİK >";
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
  
  if (isWallWrapEnabled) {
    if (nextX < 0) nextX = COLS - 1;
    else if (nextX >= COLS) nextX = 0;
    if (nextY < 0) nextY = ROWS - 1;
    else if (nextY >= ROWS) nextY = 0;
  } else {
    if (nextX < 0 || nextX >= COLS || nextY < 0 || nextY >= ROWS) return endGame();
  }

  const head = { x: nextX, y: nextY };
  
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

// STATE
function saveState() {
  if (isGameRunning) {
    const gameState = {
      snake: snake,
      food: food,
      dir: dir,
      score: score,
      wallMode: isWallWrapEnabled
    };
    try {
      fs.writeFileSync(STATE_FILE, gameState, "json");
    } catch (e) {}
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
      isWallWrapEnabled = data.wallMode || false;
      
      updateModeVisual();
      updateHighScoreDisplay();
      
      if (scoreEl) scoreEl.text = "SKOR: " + score;
      if (menuContainer) menuContainer.style.display = "none";
      
      isGameRunning = true;
      spawnFood(false); 
      draw();
      
      if (gameLoop) clearInterval(gameLoop);
      gameLoop = setInterval(update, 250);
      return true;
    }
  } catch (e) { }
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

  const now = new Date();
  const dateStr = ("0" + now.getDate()).slice(-2) + "/" + ("0" + (now.getMonth() + 1)).slice(-2) + "/" + now.getFullYear();

  let updated = false;
  
  if (isWallWrapEnabled) {
    if (score > highScoreNoWall) {
      highScoreNoWall = score;
      dateNoWall = dateStr;
      sendScoreToPhone(score, dateStr, "nowall");
      updated = true;
    }
  } else {
    if (score > highScoreClassic) {
      highScoreClassic = score;
      dateClassic = dateStr;
      sendScoreToPhone(score, dateStr, "classic");
      updated = true;
    }
  }

  if (updated) saveHighScoresLocal();

  updateHighScoreDisplay();
  
  if (lastScoreText) {
    lastScoreText.text = "SKORUN: " + score;
    lastScoreText.style.display = "inline";
  }
  
  if (btnText) btnText.text = "YENİ OYUN"; 
  if (menuContainer) menuContainer.style.display = "inline";
  
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
  lastTapTime = 0;
  
  if (scoreEl) scoreEl.text = "SKOR: 0";
  if (menuContainer) menuContainer.style.display = "none";
  
  spawnFood();
  if (gameLoop) clearInterval(gameLoop);
  gameLoop = setInterval(update, 250);
}

if (!loadState()) {
  updateModeVisual();
  updateHighScoreDisplay();
  spawnFood(); 
  draw();
}
