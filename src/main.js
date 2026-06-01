import {
  AnimatedSprite,
  Application,
  Assets,
  Container,
  Sprite,
  Ticker,
  Text,
} from "pixi.js";

import { loadSpriteSheet } from "./utils/loadSpriteSheet";
import { randomPointInRing } from "./utils/getCoords.js";
import { showHint } from "./utils/hint.js";
import { showWinMessage } from "./utils/winMessage.js";

import {
  DESIGN,
  MULTIPLIERS,
  TARGET_CENTER,
  RINGS,
  ARROW_FLIGHT_MS,
  ARROW_LIFETIME_AFTER_HIT_MS,
  gameState,
  SOUNDS,
} from "./core/constants.js";
import targetImg from "./assets/target.png";
import birdImg from "./assets/bird/bird.png";
import birdJsonRaw from "./assets/bird/spritesheet.json?raw";
import arrowGreenImg from "./assets/arrow-g.png";
import arrowPurpleImg from "./assets/arrow-p.png";
import arrowRedImg from "./assets/arrow-r.png";
import arrowWhiteImg from "./assets/arrow-w.png";
import arrowYellowImg from "./assets/arrow-y.png";
import holeImg from "./assets/hole.png";
import fireImg from "./assets/flame/flame.png";
import fireJsonRaw from "./assets/flame/spritesheet.json?raw";

export let musicEnabled = false;

(async () => {
  // Create a new application
  const app = new Application();

  globalThis.__PIXI_APP__ = app; //Extension enabled for debugging in browser

  // Initialize the application
  await app.init({
    backgroundAlpha: 0,
    width: DESIGN.w,
    height: DESIGN.h,
  });

  // Append the application canvas to the document body
  document.getElementById("pixi-container").appendChild(app.canvas);

  const betContainer = document.querySelector(".bet__amount");
  const balanceContainer = document.querySelector(".balance__amount");

  // Scene init
  const scene = new Container();
  app.stage.addChild(scene);

  // Bird
  const birdSheet = await loadSpriteSheet(birdJsonRaw, birdImg);
  const flyingFrames = birdSheet.animations.flying;

  function flyingBird() {
    const rand = Math.floor(Math.random() * 2);
    const birdContainer = new Container();
    birdContainer.y = 180 - Math.random() * 50;
    scene.addChild(birdContainer);

    const bird = new AnimatedSprite(flyingFrames);
    birdContainer.addChild(bird);

    bird.scale.set(0.12);
    bird.loop = true;
    bird.animationSpeed = 0.35;
    bird.play();

    const angleDeg = rand ? -(Math.random() * 10) : Math.random() * 10;
    const angleRad = (angleDeg * Math.PI) / 180;
    const speed = 2.5 + Math.random() * 0.3;

    if (rand) {
      birdContainer.x = -80;
      birdContainer.rotation = angleRad;
    } else {
      birdContainer.x = 500;
      bird.scale.x = -0.12;
      birdContainer.rotation = -angleRad;
    }

    const dirX = Math.cos(angleRad) * (rand ? 1 : -1);
    const dirY = -Math.sin(angleRad);

    const birdTicker = new Ticker();

    birdTicker.add((ticker) => {
      birdContainer.x += speed * dirX;
      birdContainer.y += speed * dirY;

      if (birdContainer.x < -100 || birdContainer.x > 500) {
        birdTicker.stop();
        birdTicker.destroy();
        scene.removeChild(birdContainer);
      }
    });
    birdTicker.start();
  }

  let timer = 0;
  let delay = getNextDelay();

  function getNextDelay() {
    return 5000 + Math.random() * 3000;
  }

  const birdSpawnTicker = new Ticker();

  birdSpawnTicker.add((ticker) => {
    timer += ticker.deltaMS;

    if (timer >= delay) {
      flyingBird();
      timer = 0;
      delay = getNextDelay();
    }
  });
  birdSpawnTicker.start();

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) birdSpawnTicker.stop();
    else birdSpawnTicker.start();
  });

  // Target
  const targetContainer = new Container();
  targetContainer.zIndex = 10;
  scene.addChild(targetContainer);

  const targetTexture = await Assets.load(targetImg);
  const target = new Sprite(targetTexture);
  targetContainer.addChild(target);

  target.anchor.set(-0.14, -0.25);
  target.scale.set(0.5185185185185185);

  for (let i = 0; i < MULTIPLIERS.values.length; i++) {
    const label = new Text({
      text: `X${MULTIPLIERS.values[i]}`,
      style: {
        fill: MULTIPLIERS.colors[i],
        fontSize: 19,
        fontWeight: "bold",
        stroke: { color: "#000000", width: 2 },
        dropShadow: {
          color: "#000000",
          blur: 2,
          distance: 1,
        },
      },
      textureStyle: {
        scaleMode: "nearest",
      },
    });

    label.x = targetContainer.width / 2 + 50 - label.width / 2;

    switch (i) {
      case 1:
        label.y = targetContainer.height / 2 - 55;
        break;
      case 2:
        label.y = targetContainer.height / 2 - 12;
        break;
      case 3:
        label.y = targetContainer.height / 2 + 45;
        break;
      default:
        label.y = targetContainer.height / 2 - 95;
    }

    targetContainer.addChild(label);
  }

  // Arrows
  const arrowTextures = {
    green: await Assets.load(arrowGreenImg),
    purple: await Assets.load(arrowPurpleImg),
    red: await Assets.load(arrowRedImg),
    white: await Assets.load(arrowWhiteImg),
    yellow: await Assets.load(arrowYellowImg),
  };

  const arrowEffectTextures = {
    hole: await Assets.load(holeImg),
    fire: await Assets.load(fireImg),
  };

  let shotIndex = 0;
  let isShooting = false;
  let isGameFinished = false;

  function getHitOffsetByShotIndex(index) {
    if (index <= 2) {
      return randomPointInRing(RINGS.outer.min, RINGS.outer.max);
    }

    if (index >= 3 && index <= 5) {
      const useSecondRing = Math.random() < 0.5;

      return useSecondRing
        ? randomPointInRing(RINGS.mid1.min, RINGS.mid1.max)
        : randomPointInRing(RINGS.mid2.min, RINGS.mid2.max);
    }

    if (index === 6) {
      return randomPointInRing(RINGS.center.min, RINGS.center.max);
    }
    return null;
  }

  function getRingByDistance(d) {
    if (d >= RINGS.outer.min && d <= RINGS.outer.max) return "outer";
    if (d >= RINGS.mid1.min && d <= RINGS.mid1.max) return "mid1";
    if (d >= RINGS.mid2.min && d <= RINGS.mid2.max) return "mid2";
    if (d >= RINGS.center.min && d <= RINGS.center.max) return "center";
    return null;
  }

  const fireSheet = await loadSpriteSheet(fireJsonRaw, fireImg);
  const burningFrames = fireSheet.animations.burning;

  function shootArrow() {
    if (isShooting || isGameFinished) return;

    const offset = getHitOffsetByShotIndex(shotIndex);

    isShooting = true;

    gameState.balance -= gameState.bet;
    balanceContainer.textContent = gameState.balance;

    // Arrows and Arrow hole setup
    const rand = Math.floor(Math.random() * 5);
    const arrowContainer = new Container();
    arrowContainer.zIndex = 15 + shotIndex;
    scene.addChild(arrowContainer);

    const hole = new Sprite(arrowEffectTextures.hole);
    arrowContainer.addChild(hole);

    const arrow = new Sprite(Object.values(arrowTextures)[rand]);
    arrow.scale.set(0.5);
    arrow.zIndex = 3;
    arrowContainer.addChild(arrow);

    const fire = new AnimatedSprite(burningFrames);
    arrow.addChild(fire);

    hole.anchor.set(0);
    hole.y = -5;
    hole.x = 21;
    hole.zIndex = 1;
    hole.scale.set(0.8);
    hole.visible = false;

    fire.scale = 0.4;
    fire.alpha = 0;
    fire.animationSpeed = 0.2;
    fire.visible = false;

    const hitX = TARGET_CENTER.x + offset.x;
    const hitY = TARGET_CENTER.y + offset.y;

    const distFromCenter = Math.hypot(offset.x, offset.y);
    const ring = getRingByDistance(distFromCenter);
    const mult = ring ? MULTIPLIERS.values[MULTIPLIERS.names.indexOf(ring)] : 0;
    const winAmount = +(gameState.bet * mult);

    const winText = new Text({
      text: `+${winAmount}$`,
      style: {
        fill: "#fbff20ff",
        fontSize: 19,
        fontWeight: "bold",
        stroke: { color: "#ff0000ff", width: 2 },
        dropShadow: {
          color: "#000000",
          blur: 2,
          distance: 1,
        },
      },
      textureStyle: {
        scaleMode: "nearest",
      },
    });
    winText.x = arrowContainer.width / 2 - winText.width / 2;
    winText.y = -35;
    winText.alpha = 0;
    arrowContainer.addChild(winText);

    const startY = scene.height + 160;
    const startX = TARGET_CENTER.x + (Math.random() - 0.5) * (RINGS.outer.max * 1.6);

    arrowContainer.x = startX;
    arrowContainer.y = startY;

    //Flight Vector
    const dx = hitX - startX;
    const dy = hitY - startY;

    arrowContainer.rotation = Math.atan2(dy, dx) + Math.PI / 2;

    winText.rotation = -arrowContainer.rotation;

    fire.rotation = -arrowContainer.rotation;

    // Animation
    SOUNDS.arrow.currentTime = 0;
    if (musicEnabled) {
      SOUNDS.arrow.play();
    }

    const startTime = performance.now();
    const ticker = new Ticker();

    ticker.add(() => {
      const t = (performance.now() - startTime) / ARROW_FLIGHT_MS;

      if (t >= 1) {
        arrowContainer.x = hitX;
        arrowContainer.y = hitY;

        hole.visible = true;
        winText.alpha = 1;

        if (ring === "center") {
          fire.anchor.set(-0.5, 1);
          fire.y = 11;
          const fireOpacityTicker = new Ticker();
          fireOpacityTicker.add((ticker) => {
            fire.alpha += ticker.deltaTime * 0.03;
            if (fire.alpha >= 1) {
              fire.alpha = 1;
              fireOpacityTicker.destroy();
            }
          });
          setTimeout(() => {
            fireOpacityTicker.start();
          }, 500);
          fire.zIndex = 4;
          fire.visible = true;
          fire.play();
        }

        gameState.balance += winAmount;
        balanceContainer.innerText = gameState.balance;

        // Shaking Animation
        function wobbleOnHit(
          displayObject,
          { duration = 350, amplitude = 0.5, frequency = 5 } = {}
        ) {
          const baseRot = displayObject.rotation;
          const t0 = performance.now();

          const wobbleTicker = new Ticker();
          wobbleTicker.add(() => {
            const elapsed = performance.now() - t0;
            const p = elapsed / duration;

            if (p >= 1) {
              displayObject.rotation = baseRot;
              wobbleTicker.stop();
              wobbleTicker.destroy();
              return;
            }

            const damp = 1 - p;

            const s = Math.sin((elapsed / 1000) * Math.PI * 2 * frequency);

            displayObject.rotation = baseRot + s * amplitude * damp;
          });

          wobbleTicker.start();
        }

        const textStartY = winText.y;
        const popT0 = performance.now();
        const popDur = 700;

        const popTicker = new Ticker();

        popTicker.add((ticker) => {
          const p = (performance.now() - popT0) / popDur;
          if (p >= 1) {
            winText.y = textStartY - 18;
            popTicker.stop();
            popTicker.destroy();
            return;
          }
          winText.y = textStartY - 18 * p;
          winText.alpha = 1 - p;
        });
        popTicker.start();
        if (shotIndex == 6) {
          wobbleOnHit(arrow, {
            duration: 450,
            amplitude: 0.16,
            frequency: 11,
          });
        } else {
          wobbleOnHit(arrow, {
            duration: 350,
            amplitude: 0.08,
            frequency: 5,
          });
        }

        ticker.stop();
        ticker.destroy();

        shotIndex++;
        isShooting = false;

        if (shotIndex >= 7) {
          isGameFinished = true;
          gameState.finalWin = gameState.balance - 1000;
          setTimeout(() => showWinMessage(), 1300);
        }

        setTimeout(() => {
          if (arrowContainer.parent) {
            scene.removeChild(arrowContainer);
            arrowContainer.destroy({ children: true });
          }
        }, ARROW_LIFETIME_AFTER_HIT_MS);

        return;
      }

      arrowContainer.x = startX + dx * t;
      arrowContainer.y = startY + dy * t;
    });

    ticker.start();

    if (shotIndex == 2) {
      document.getElementById("tap").disabled = true;
      setTimeout(() => {
        showHint();
      }, 1000);
    }
  }

  document.getElementById("tap").addEventListener("click", () => {
    if (musicEnabled) {
      SOUNDS.tap.play();
    }
    shootArrow();
  });

  const MUSIC_ON_ICON =
    "data:image/svg+xml;base64," +
    btoa(`
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-volume2 lucide-volume-2" aria-hidden="true"><path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"></path><path d="M16 9a5 5 0 0 1 0 6"></path><path d="M19.364 18.364a9 9 0 0 0 0-12.728"></path></svg>
`);

  const MUSIC_OFF_ICON =
    "data:image/svg+xml;base64," +
    btoa(`
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-volume-off" aria-hidden="true"><path d="M16 9a5 5 0 0 1 .95 2.293"></path><path d="M19.364 5.636a9 9 0 0 1 1.889 9.96"></path><path d="m2 2 20 20"></path><path d="m7 7-.587.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298V11"></path><path d="M9.828 4.172A.686.686 0 0 1 11 4.657v.686"></path></svg>
`);

  const soundsControls = document.querySelector(".sound__controls");
  soundsControls.src = MUSIC_OFF_ICON;

  soundsControls.addEventListener("click", () => {
    musicEnabled = !musicEnabled;

    if (musicEnabled) {
      SOUNDS.ambient.volume = 0.6;
      SOUNDS.ambient.play();
      SOUNDS.ambient.loop = true;
      soundsControls.src = MUSIC_ON_ICON;
    } else {
      SOUNDS.ambient.pause();
      soundsControls.src = MUSIC_OFF_ICON;
    }
  });
})();

document.addEventListener("DOMContentLoaded", () => {
  const loadingScreen = document.getElementById("loading-screen");
  const loadingText = document.getElementById("loading-text");
  const loadingProgress = document.getElementById("loading-progress");

  let i = 0;
  loadingProgress.style.width = "0%";
  const loading = setInterval(() => {
    i += Math.floor(Math.random() * 5);
    if (i >= 100) {
      loadingText.innerText = "100%";
      loadingProgress.style.width = `100%`;
      loadingScreen.className += " fading";
      setTimeout(() => {
        loadingScreen.style.opacity = 0;
        loadingScreen.remove();
      }, 700);
      clearInterval(loading);
      return;
    }

    loadingProgress.style.width = `${i}%`;
    loadingText.innerText = `${i}%`;
  }, 25);
});
