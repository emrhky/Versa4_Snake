import { settingsStorage } from "settings";
import * as messaging from "messaging";

console.log("Companion (Telefon) tarafı çalışıyor.");

messaging.peerSocket.onopen = () => {
  restoreHighScores();
};

messaging.peerSocket.onmessage = (evt) => {
  if (evt.data && evt.data.command === "SAVE_HIGHSCORE") {
    // Gelen veri hangi moda ait?
    const modeKey = evt.data.mode === "nowall" ? "highScoreNoWall" : "highScoreClassic";
    const dateKey = evt.data.mode === "nowall" ? "dateNoWall" : "dateClassic";
    
    let currentSaved = parseInt(settingsStorage.getItem(modeKey)) || 0;
    
    // Eğer yeni gelen skor telefondakinden büyükse kaydet
    if (evt.data.score > currentSaved) {
      settingsStorage.setItem(modeKey, evt.data.score.toString());
      settingsStorage.setItem(dateKey, evt.data.date);
    }
  } else if (evt.data && evt.data.command === "GET_HIGHSCORE") {
    restoreHighScores();
  }
};

function restoreHighScores() {
  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    messaging.peerSocket.send({
      command: "RESTORE_HIGHSCORE",
      classic: {
        score: parseInt(settingsStorage.getItem("highScoreClassic")) || 0,
        date: settingsStorage.getItem("dateClassic") || ""
      },
      nowall: {
        score: parseInt(settingsStorage.getItem("highScoreNoWall")) || 0,
        date: settingsStorage.getItem("dateNoWall") || ""
      }
    });
  }
}
