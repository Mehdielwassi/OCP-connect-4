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

// Game state
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
  turnTextEl.textContent = `Player ${currentPlayer}'s turn`;
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

// Main reset
function resetGame() {
  initGrid();
  isGameOver = false;
  currentPlayer = 1;
  clearBoardUI();
  resetHover();
  updateTurnIndicator();
  setMessage("Player 1 starts. Connect four in a row.");
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
    setMessage(`Player ${currentPlayer} wins!`);
    playTone(720, 260, 0.25);
    playTone(880, 260, 0.2);
    turnTextEl.textContent = `Player ${currentPlayer} wins!`;
    updateTurnIndicator();
    disableAllCells();
    resetHover();
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
  setMessage(`Player ${currentPlayer}'s turn.`);
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
}

// --- Boot ---

createHoverRow();
createBoard();
setupEvents();
resetGame();
updateTurnIndicator();