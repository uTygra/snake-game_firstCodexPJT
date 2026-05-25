const canvas = document.getElementById("game-board");
const context = canvas.getContext("2d");
const scoreElement = document.getElementById("score");
const highScoreElement = document.getElementById("high-score");
const gameOverElement = document.getElementById("game-over");
const finalScoreElement = document.getElementById("final-score");
const restartButton = document.getElementById("restart-button");
const soundToggle = document.getElementById("sound-toggle");

const tileCount = 24;
const tileSize = canvas.width / tileCount;
const moveDelay = 115;
const highScoreKey = "retro-snake-high-score";

let snake;
let food;
let direction;
let nextDirection;
let score;
let highScore;
let gameLoop;
let isGameOver;
let audioContext;
let masterGain;
let isSoundOn = true;

function setupAudio() {
  if (audioContext) {
    return;
  }

  const AudioContext = window.AudioContext || window.webkitAudioContext;

  if (!AudioContext) {
    isSoundOn = false;
    soundToggle.textContent = "No Audio";
    soundToggle.setAttribute("aria-pressed", "false");
    soundToggle.disabled = true;
    return;
  }

  audioContext = new AudioContext();
  masterGain = audioContext.createGain();
  masterGain.gain.value = 0.18;
  masterGain.connect(audioContext.destination);
}

function unlockAudio() {
  setupAudio();

  if (audioContext && audioContext.state === "suspended") {
    audioContext.resume();
  }
}

function playTone({ frequency, duration = 0.08, type = "square", delay = 0, volume = 0.5, slideTo }) {
  if (!isSoundOn || !audioContext || !masterGain) {
    return;
  }

  const startAt = audioContext.currentTime + delay;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startAt);

  if (slideTo) {
    oscillator.frequency.exponentialRampToValueAtTime(slideTo, startAt + duration);
  }

  gain.gain.setValueAtTime(0.001, startAt);
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);

  oscillator.connect(gain);
  gain.connect(masterGain);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.03);
}

function playNoiseBurst() {
  if (!isSoundOn || !audioContext || !masterGain) {
    return;
  }

  const sampleCount = audioContext.sampleRate * 0.22;
  const buffer = audioContext.createBuffer(1, sampleCount, audioContext.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < sampleCount; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / sampleCount);
  }

  const source = audioContext.createBufferSource();
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();
  const startAt = audioContext.currentTime;

  filter.type = "bandpass";
  filter.frequency.value = 260;
  filter.Q.value = 1.2;
  gain.gain.setValueAtTime(0.18, startAt);
  gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.22);

  source.buffer = buffer;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  source.start(startAt);
}

function playEatSound() {
  playTone({ frequency: 520, duration: 0.06, delay: 0, volume: 0.42 });
  playTone({ frequency: 780, duration: 0.07, delay: 0.055, volume: 0.48 });
  playTone({ frequency: 1040, duration: 0.08, delay: 0.11, volume: 0.36 });
}

function playTurnSound() {
  playTone({ frequency: 360, duration: 0.045, type: "triangle", volume: 0.22, slideTo: 520 });
}

function playCrashSound() {
  playTone({ frequency: 180, duration: 0.22, type: "sawtooth", volume: 0.42, slideTo: 55 });
  playTone({ frequency: 90, duration: 0.18, type: "square", delay: 0.08, volume: 0.25, slideTo: 42 });
  playNoiseBurst();
}

function playStartSound() {
  playTone({ frequency: 220, duration: 0.05, type: "triangle", volume: 0.25 });
  playTone({ frequency: 330, duration: 0.05, type: "triangle", delay: 0.055, volume: 0.25 });
  playTone({ frequency: 440, duration: 0.07, type: "triangle", delay: 0.11, volume: 0.32 });
}

function updateSoundToggle() {
  soundToggle.textContent = isSoundOn ? "Sound On" : "Sound Off";
  soundToggle.setAttribute("aria-pressed", String(isSoundOn));
}

function loadHighScore() {
  return Number(localStorage.getItem(highScoreKey)) || 0;
}

function saveHighScore(value) {
  localStorage.setItem(highScoreKey, String(value));
}

function startGame() {
  snake = [
    { x: 11, y: 12 },
    { x: 10, y: 12 },
    { x: 9, y: 12 },
  ];
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  score = 0;
  highScore = loadHighScore();
  isGameOver = false;

  scoreElement.textContent = score;
  highScoreElement.textContent = highScore;
  gameOverElement.classList.add("hidden");
  food = createFood();

  clearInterval(gameLoop);
  draw();
  gameLoop = setInterval(tick, moveDelay);
  playStartSound();
}

function tick() {
  direction = nextDirection;

  const head = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y,
  };

  if (hasCollision(head)) {
    endGame();
    return;
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score += 10;
    scoreElement.textContent = score;
    food = createFood();
    playEatSound();
  } else {
    snake.pop();
  }

  draw();
}

function hasCollision(head) {
  const hitWall = head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount;
  const hitSnake = snake.some((segment) => segment.x === head.x && segment.y === head.y);
  return hitWall || hitSnake;
}

function createFood() {
  let position;

  do {
    position = {
      x: Math.floor(Math.random() * tileCount),
      y: Math.floor(Math.random() * tileCount),
    };
  } while (snake.some((segment) => segment.x === position.x && segment.y === position.y));

  return position;
}

function draw() {
  drawBoard();
  drawFood();
  drawSnake();
}

function drawBoard() {
  context.fillStyle = "#09141f";
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < tileCount; y += 1) {
    for (let x = 0; x < tileCount; x += 1) {
      context.fillStyle = (x + y) % 2 === 0 ? "#0d1b29" : "#10233a";
      context.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
    }
  }

  context.strokeStyle = "rgba(58, 246, 255, 0.16)";
  context.lineWidth = 1;

  for (let i = 0; i <= tileCount; i += 1) {
    const position = i * tileSize + 0.5;
    context.beginPath();
    context.moveTo(position, 0);
    context.lineTo(position, canvas.height);
    context.stroke();
    context.beginPath();
    context.moveTo(0, position);
    context.lineTo(canvas.width, position);
    context.stroke();
  }
}

function drawSnake() {
  snake.forEach((segment, index) => {
    const inset = index === 0 ? 2 : 3;
    const x = segment.x * tileSize + inset;
    const y = segment.y * tileSize + inset;
    const size = tileSize - inset * 2;

    context.shadowColor = index === 0 ? "#baffc7" : "#53ff76";
    context.shadowBlur = index === 0 ? 18 : 12;
    context.fillStyle = index === 0 ? "#baffc7" : "#53ff76";
    context.fillRect(
      x,
      y,
      size,
      size
    );

    context.shadowBlur = 0;
    context.fillStyle = "#0bbd49";
    context.fillRect(x, segment.y * tileSize + tileSize - 5, size, 3);

    if (index === 0) {
      context.fillStyle = "#f7fbff";
      context.fillRect(x + 4, y + 4, 3, 3);
      context.fillRect(x + size - 7, y + 4, 3, 3);
    }
  });
}

function drawFood() {
  const pulse = 1 + Math.sin(Date.now() / 120) * 1.5;
  context.shadowColor = "#ff3d8b";
  context.shadowBlur = 20;
  context.fillStyle = "#ff3d8b";
  context.fillRect(
    food.x * tileSize + 4 - pulse,
    food.y * tileSize + 4 - pulse,
    tileSize - 8 + pulse * 2,
    tileSize - 8 + pulse * 2
  );
  context.shadowBlur = 0;
  context.fillStyle = "#ffe66d";
  context.fillRect(food.x * tileSize + 7, food.y * tileSize + 7, 5, 5);
}

function endGame() {
  clearInterval(gameLoop);
  isGameOver = true;
  playCrashSound();

  if (score > highScore) {
    highScore = score;
    saveHighScore(highScore);
    highScoreElement.textContent = highScore;
  }

  finalScoreElement.textContent = `Score: ${score}`;
  gameOverElement.classList.remove("hidden");
  restartButton.focus();
}

function changeDirection(event) {
  const keyDirections = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
  };

  const requestedDirection = keyDirections[event.key];

  if (!requestedDirection) {
    return;
  }

  event.preventDefault();

  const isOppositeDirection =
    requestedDirection.x + direction.x === 0 && requestedDirection.y + direction.y === 0;

  if (!isOppositeDirection) {
    const isNewDirection = requestedDirection.x !== nextDirection.x || requestedDirection.y !== nextDirection.y;
    nextDirection = requestedDirection;

    if (isNewDirection) {
      playTurnSound();
    }
  }
}

document.addEventListener("keydown", (event) => {
  unlockAudio();

  if (event.key === "Enter" && isGameOver) {
    startGame();
    return;
  }

  changeDirection(event);
});

restartButton.addEventListener("click", () => {
  unlockAudio();
  startGame();
});

soundToggle.addEventListener("click", () => {
  unlockAudio();

  if (!audioContext) {
    return;
  }

  isSoundOn = !isSoundOn;
  updateSoundToggle();

  if (isSoundOn) {
    playStartSound();
  }
});

updateSoundToggle();
startGame();
