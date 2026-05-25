const canvas = document.getElementById("game-board");
const context = canvas.getContext("2d");
const scoreElement = document.getElementById("score");
const highScoreElement = document.getElementById("high-score");
const gameOverElement = document.getElementById("game-over");
const finalScoreElement = document.getElementById("final-score");
const restartButton = document.getElementById("restart-button");

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
  context.fillStyle = "#172416";
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < tileCount; y += 1) {
    for (let x = 0; x < tileCount; x += 1) {
      context.fillStyle = (x + y) % 2 === 0 ? "#1c2c1a" : "#21351f";
      context.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
    }
  }
}

function drawSnake() {
  snake.forEach((segment, index) => {
    const inset = index === 0 ? 2 : 3;
    context.fillStyle = index === 0 ? "#9bf06e" : "#79d45b";
    context.fillRect(
      segment.x * tileSize + inset,
      segment.y * tileSize + inset,
      tileSize - inset * 2,
      tileSize - inset * 2
    );

    context.fillStyle = "#2f8f43";
    context.fillRect(segment.x * tileSize + inset, segment.y * tileSize + tileSize - 5, tileSize - inset * 2, 3);
  });
}

function drawFood() {
  context.fillStyle = "#ff4d4d";
  context.fillRect(food.x * tileSize + 4, food.y * tileSize + 4, tileSize - 8, tileSize - 8);
  context.fillStyle = "#ffd166";
  context.fillRect(food.x * tileSize + 7, food.y * tileSize + 7, 5, 5);
}

function endGame() {
  clearInterval(gameLoop);
  isGameOver = true;

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
    nextDirection = requestedDirection;
  }
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && isGameOver) {
    startGame();
    return;
  }

  changeDirection(event);
});

restartButton.addEventListener("click", startGame);

startGame();
