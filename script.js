// --- Configuration ---
const ROWS = 6;
const COLS = 7;

// DOM elements
const boardEl = document.getElementById("board");
const hoverRowEl = document.getElementById("hover-row");
const restartBtn = document.getElementById("restart-btn");
const turnIndicatorEl = document.getElementById("turn-indicator");
const turnTextEl = document.getElementById("turn-text");
const messageEl = document.getElementById("message");

// Intro / setup elements
const introViewEl = document.getElementById("intro-view");
const gameViewEl = document.getElementById("game-view");
const p1Input = document.getElementById("p1-name");
const p2Input = document.getElementById("p2-name");
const p1ColorInput = document.getElementById("p1-color");
const p2ColorInput = document.getElementById("p2-color");
const p1Swatch = document.getElementById("p1-swatch");
const p2Swatch = document.getElementById("p2-swatch");
const startBtn = document.getElementById("start-game-btn");
const colorWarningEl = document.getElementById("color-warning");

// Game state
let player1Name = "Player 1";
let player2Name = "Player 2";
let currentPlayer = 1; // 1 or 2
let grid = [];
let isGameOver = false;
let cellEls = []; // 2D array of cell elements
let hoverCells = [];

// Simple, subtle sound effects
let audioCtx = null;
function playTone(freq, durationMs = 120, volume = 0.18) {
  try {
    if (!audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      audioCtx = new AudioCtx();
    }
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(volume, now);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + durationMs / 1000);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000);
  } catch (_) {
    // Fail silently if audio is not allowed
  }
}

// --- Initialization ---

function initGrid() {
  grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function createHoverRow() {
  hoverRowEl.innerHTML = "";
  hoverCells = [];
  for (let col = 0; col < COLS; col++) {
    const hoverCell = document.createElement("div");
    hoverCell.className = "hover-cell";
    hoverCell.dataset.col = col;
    hoverRowEl.appendChild(hoverCell);
    hoverCells[col] = hoverCell;
  }
}

function createBoard() {
  boardEl.innerHTML = "";
  cellEls = Array.from({ length: ROWS }, () => Array(COLS).fill(null));

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      boardEl.appendChild(cell);
      cellEls[row][col] = cell;
    }
  }
}

function updateTurnIndicator() {
  turnIndicatorEl.classList.remove("player1", "player2", "finished");
  if (isGameOver) {
    turnIndicatorEl.classList.add("finished");
    return;
  }
  const cls = currentPlayer === 1 ? "player1" : "player2";
  turnIndicatorEl.classList.add(cls);
  const name = currentPlayer === 1 ? player1Name : player2Name;
  turnTextEl.textContent = `${name}'s turn`;
}

function setMessage(text) {
  messageEl.textContent = text;
}

function clearBoardUI() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = cellEls[r][c];
      if (!cell) continue;
      cell.innerHTML = "";
      cell.classList.remove("disabled");
    }
  }
}

function resetHover() {
  hoverCells.forEach((cell) => {
    cell.classList.remove("active", "player1", "player2");
  });
}

function applyPlayerColorsFromInputs() {
  if (!p1ColorInput || !p2ColorInput) return;
  const rootStyle = document.documentElement.style;
  const p1Color = p1ColorInput.value || "#008f4c";
  const p2Color = p2ColorInput.value || "#00b894";
  rootStyle.setProperty("--player1-color", p1Color);
  rootStyle.setProperty("--player2-color", p2Color);
}

function validatePlayerColors() {
  if (!p1ColorInput || !p2ColorInput || !startBtn || !colorWarningEl) return;
  const same =
    p1ColorInput.value.toLowerCase() === p2ColorInput.value.toLowerCase();
  if (same) {
    colorWarningEl.classList.remove("hidden");
    startBtn.disabled = true;
  } else {
    colorWarningEl.classList.add("hidden");
    startBtn.disabled = false;
  }
}

function syncColorSwatches() {
  if (p1Swatch && p1ColorInput) {
    p1Swatch.style.backgroundColor = p1ColorInput.value;
  }
  if (p2Swatch && p2ColorInput) {
    p2Swatch.style.backgroundColor = p2ColorInput.value;
  }
}

// Main reset
function resetGame() {
  initGrid();
  isGameOver = false;
  currentPlayer = 1;
  clearBoardUI();
  resetHover();
  updateTurnIndicator();
  setMessage(`${player1Name} starts. Connect four in a row.`);
}

// --- Win detection ---

/**
 * Find winning line starting from (row, col) for player.
 * Returns array of [row, col] positions if win, or null.
 */
function findWinningCells(row, col, player) {
  const directions = [
    [0, 1], // horizontal
    [1, 0], // vertical
    [1, 1], // diag down-right
    [1, -1], // diag down-left
  ];

  for (const [dr, dc] of directions) {
    const line = [[row, col]];

    // Forward direction
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r < ROWS && c >= 0 && c < COLS && grid[r][c] === player) {
      line.push([r, c]);
      r += dr;
      c += dc;
    }

    // Backward direction
    r = row - dr;
    c = col - dc;
    while (r >= 0 && r < ROWS && c >= 0 && c < COLS && grid[r][c] === player) {
      line.unshift([r, c]);
      r -= dr;
      c -= dc;
    }

    if (line.length >= 4) {
      return line;
    }
  }
  return null;
}

function isBoardFull() {
  for (let c = 0; c < COLS; c++) {
    if (grid[0][c] === 0) return false;
  }
  return true;
}

// --- UI helpers ---

function applyWinningHighlight(cells) {
  cells.forEach(([r, c]) => {
    const cell = cellEls[r][c];
    if (!cell) return;
    const disc = cell.querySelector(".disc");
    if (disc) {
      disc.classList.add("winning");
    }
  });
}

function setHoverColumn(col) {
  if (isGameOver) {
    resetHover();
    return;
  }
  const cls = currentPlayer === 1 ? "player1" : "player2";
  hoverCells.forEach((cell, index) => {
    cell.classList.remove("active", "player1", "player2");
    if (index === col) {
      cell.classList.add("active", cls);
    }
  });
}

// --- Game logic ---

function getLowestAvailableRow(col) {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (grid[row][col] === 0) {
      return row;
    }
  }
  return -1; // column full
}

function placeDisc(row, col, player) {
  grid[row][col] = player;

  const cell = cellEls[row][col];
  if (!cell) return;

  const disc = document.createElement("div");
  disc.classList.add("disc");
  disc.classList.add(player === 1 ? "player1" : "player2");

  // Start slightly above the cell; we'll animate down
  const depthFactor = (ROWS - 1 - row) / (ROWS - 1 || 1); // 0..1
  const durationMs = 190 + depthFactor * 200;

  disc.style.transform = "translateY(-250%)";
  disc.style.transition = `transform ${durationMs}ms cubic-bezier(0.18, 0.89, 0.32, 1.28)`;

  cell.appendChild(disc);

  // Trigger animation on next frame
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      disc.style.transform = "translateY(0)";
    });
  });

  // Subtle different tones per player
  if (player === 1) {
    playTone(480);
  } else {
    playTone(560);
  }
}

function disableAllCells() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = cellEls[r][c];
      if (cell) {
        cell.classList.add("disabled");
      }
    }
  }
}

function shakeBoardBriefly() {
  boardEl.classList.add("shake");
  setTimeout(() => boardEl.classList.remove("shake"), 220);
}

function handleColumnClick(col) {
  if (isGameOver) return;

  const numericCol = Number(col);
  const row = getLowestAvailableRow(numericCol);
  if (row === -1) {
    // Column full, small feedback
    shakeBoardBriefly();
    return;
  }

  placeDisc(row, numericCol, currentPlayer);

  const winningCells = findWinningCells(row, numericCol, currentPlayer);
  if (winningCells) {
    isGameOver = true;
    applyWinningHighlight(winningCells);
    const winnerName = currentPlayer === 1 ? player1Name : player2Name;
    setMessage(`${winnerName} wins!`);
    playTone(720, 260, 0.25);
    playTone(880, 260, 0.2);
    turnTextEl.textContent = `${winnerName} wins!`;
    updateTurnIndicator();
    disableAllCells();
    resetHover();
    triggerConfetti(winningCells, currentPlayer);
    return;
  }

  if (isBoardFull()) {
    isGameOver = true;
    setMessage("It's a draw. Board is full.");
    turnTextEl.textContent = "Draw";
    updateTurnIndicator();
    disableAllCells();
    resetHover();
    return;
  }

  // Switch player
  currentPlayer = currentPlayer === 1 ? 2 : 1;
  updateTurnIndicator();
  const nextName = currentPlayer === 1 ? player1Name : player2Name;
  setMessage(`${nextName}'s turn.`);
  // Update hover preview for new player on same column
  setHoverColumn(numericCol);
}

// --- Event wiring ---

function setupEvents() {
  // Click handling via event delegation
  boardEl.addEventListener("click", (event) => {
    const cell = event.target.closest(".cell");
    if (!cell || isGameOver) return;
    const col = Number(cell.dataset.col);
    if (Number.isNaN(col)) return;
    handleColumnClick(col);
  });

  // Hover preview
  boardEl.addEventListener("mousemove", (event) => {
    const cell = event.target.closest(".cell");
    if (!cell) {
      resetHover();
      return;
    }
    const col = Number(cell.dataset.col);
    if (Number.isNaN(col)) return;
    setHoverColumn(col);
  });

  boardEl.addEventListener("mouseleave", () => {
    resetHover();
  });

  // Restart button
  restartBtn.addEventListener("click", () => {
    resetGame();
  });

  // Color picker and validation
  if (p1ColorInput) {
    p1ColorInput.addEventListener("input", () => {
      syncColorSwatches();
      validatePlayerColors();
    });
  }
  if (p2ColorInput) {
    p2ColorInput.addEventListener("input", () => {
      syncColorSwatches();
      validatePlayerColors();
    });
  }

  // Start game button
  if (startBtn) {
    startBtn.addEventListener("click", () => {
      const p1 = p1Input.value.trim();
      const p2 = p2Input.value.trim();

      player1Name = p1 || "Player 1";
      player2Name = p2 || "Player 2";

      applyPlayerColorsFromInputs();

      if (introViewEl) introViewEl.classList.add("hidden");
      if (gameViewEl) gameViewEl.classList.remove("hidden");

      resetGame();
    });
  }
}

// --- Confetti ---

function triggerConfetti(winningCells, player) {
  if (!window.confetti) return;

  const styles = getComputedStyle(document.documentElement);
  const p1Color = (styles.getPropertyValue("--player1-color") || "#008f4c").trim();
  const p2Color = (styles.getPropertyValue("--player2-color") || "#00b894").trim();

  const colors = player === 1
    ? [p1Color, p2Color, "#a6f4c5"]
    : [p2Color, p1Color, "#e5fffb"];

  // Calculate average position of winning cells
  let totalX = 0;
  let totalY = 0;
  winningCells.forEach(([r, c]) => {
    const cell = cellEls[r][c];
    const rect = cell.getBoundingClientRect();
    totalX += rect.left + rect.width / 2;
    totalY += rect.top + rect.height / 2;
  });
  
  const avgX = totalX / winningCells.length;
  const avgY = totalY / winningCells.length;

  // Convert to 0-1 range relative to viewport
  const originX = avgX / window.innerWidth;
  const originY = avgY / window.innerHeight;

  confetti({
    particleCount: 150,
    spread: 80,
    origin: { x: originX, y: originY },
    colors: colors,
    disableForReducedMotion: true,
    zIndex: 2000,
  });
}

// --- Boot ---

createHoverRow();
createBoard();
setupEvents();
syncColorSwatches();
validatePlayerColors();
resetGame();
updateTurnIndicator();