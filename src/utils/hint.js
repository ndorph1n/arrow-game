import { gameState } from "../core/constants";

const controls = document.querySelector(".controls");
const betControls = document.getElementById("bet");

const overlay = document.createElement("div");
overlay.className = "overlay";

const modal = document.createElement("div");
modal.className = "modal";

const title = document.createElement("p");
title.textContent = "увеличение ставки повышает \n шанс победы";
title.className = "modal__title modal__title_white";

const button = document.createElement("button");
button.className = "modal__button";

modal.append(title, button);

export function showHint() {
  document.getElementById("app").appendChild(overlay);

  setTimeout(() => {
    betControls.appendChild(modal);
    controls.style.zIndex = 99;
  }, 100);
  button.addEventListener("click", closeHint);
}

function closeHint() {
  let i = 20;

  const count = setInterval(() => {
    i += Math.floor(Math.random() * 13);
    if (i >= 200) {
      document.querySelector(".bet__amount").innerText = `200`;
      clearInterval(count);
      return;
    }
    document.querySelector(".bet__amount").innerText = `${i}`;
  }, 10);
  gameState.bet *= 10;

  overlay.remove();
  modal.remove();
  document.getElementById("tap").disabled = false;
}
