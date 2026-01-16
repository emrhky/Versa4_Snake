import { settingsStorage } from "settings";
import * as messaging from "messaging";

// Telefon tarafı açıldığında çalışır
console.log("Companion (Telefon) tarafı çalışıyor.");

// Mesajlaşma soketi açıldığında
messaging.peerSocket.onopen = () => {
  restoreHighScore();
};

// Saatten mesaj geldiğinde (Yeni skor yapıldığında veya istek geldiğinde)
messaging.peerSocket.onmessage = (evt) => {
  if (evt.data && evt.data.command === "SAVE_HIGHSCORE") {
    // Gelen skoru telefon hafızasına kaydet
    let currentSaved = parseInt(settingsStorage.getItem("highScore")) || 0;
    
    if (evt.data.score > currentSaved) {
      settingsStorage.setItem("highScore", evt.data.score.toString());
      settingsStorage.setItem("highScoreDate", evt.data.date);
    }
  } else if (evt.data && evt.data.command === "GET_HIGHSCORE") {
    // Saat skor istediğinde gönder
    restoreHighScore();
  }
};

function restoreHighScore() {
  let savedScore = parseInt(settingsStorage.getItem("highScore")) || 0;
  let savedDate = settingsStorage.getItem("highScoreDate") || "";

  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    messaging.peerSocket.send({
      command: "RESTORE_HIGHSCORE",
      score: savedScore,
      date: savedDate
    });
  }
}
