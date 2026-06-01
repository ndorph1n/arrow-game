import { gameState } from "../core/constants";
import { SOUNDS } from "../core/constants";
import { musicEnabled } from "../main";
import { confetti } from "@tsparticles/confetti";

const overlay = document.createElement("div");
overlay.className = "overlay";

const modal = document.createElement("div");
modal.className = "modal-final";

const title = document.createElement("p");
title.textContent = "Mega win";
title.className = "modal__title-final";

const text = document.createElement("p");
text.textContent = "+1$";
text.className = "modal__text-final";

const button = document.createElement("button");
button.innerText = "play now";
button.className = "modal__button-final";

modal.append(title, text, button);

export function showWinMessage() {
  document.getElementById("app").appendChild(overlay);
  confetti("confetti", {
    position: {
      x: 50,
      y: 10,
    },
    count: 100,
    scalar: 1.4,
    angle: -90,
    spread: 160,
    zIndex: 9999,
  });
  if (musicEnabled) {
    SOUNDS.crowd.play();
    fadeOut(SOUNDS.crowd, 2000);
  }

  setTimeout(() => {
    document.getElementById("app").appendChild(modal);

    winCount();
  }, 200);
  button.addEventListener("click", () => {
    FbPlayableAd.onCTAClick();
  });
}

function winCount() {
  let i = 1;

  const count = setInterval(() => {
    i += Math.floor(Math.random() * 53);
    if (i >= gameState.finalWin) {
      text.innerText = `+${gameState.finalWin}$`;
      clearInterval(count);
      return;
    }
    text.innerText = `+${i}$`;
  }, 10);
}

function fadeOut(audio, duration = 1000) {
  const step = 50;
  const volumeStep = audio.volume / (duration / step);

  const fade = setInterval(() => {
    if (audio.volume > volumeStep) {
      audio.volume -= volumeStep;
    } else {
      audio.volume = 0;
      audio.pause();
      clearInterval(fade);
    }
  }, step);
}
