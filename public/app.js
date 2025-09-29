import { Chess } from './lib/chess.js';

const chess = new Chess();
window.hypernovaChess = chess;
const boardElement = document.getElementById('chess-board');
const statusBanner = document.getElementById('status-banner');
const moveListElement = document.getElementById('move-list');
const leaderboardElement = document.getElementById('leaderboard-list');
const achievementGrid = document.getElementById('achievement-grid');
const localModeButton = document.getElementById('local-mode');
const aiModeButton = document.getElementById('ai-mode');
const resetButton = document.getElementById('reset-button');
const undoButton = document.getElementById('undo-button');
const startMatchButton = document.getElementById('start-match');
const whiteTimerElement = document.getElementById('white-timer');
const blackTimerElement = document.getElementById('black-timer');
const whiteNameInput = document.getElementById('white-name');
const blackNameInput = document.getElementById('black-name');

const INITIAL_CLOCK_SECONDS = 5 * 60;

let gameMode = 'local';
let selectedSquare = null;
let possibleMoves = [];
let lastMove = null;
let timers = {
  white: INITIAL_CLOCK_SECONDS,
  black: INITIAL_CLOCK_SECONDS,
  interval: null,
  active: 'white',
};
let players = {
  white: 'White Warrior',
  black: 'Dark Challenger',
};
let leaderboard = loadFromStorage('hypernova_leaderboard', []);
let achievements = loadFromStorage('hypernova_achievements', {});
let stats = loadFromStorage('hypernova_stats', { vsAI: { wins: 0, losses: 0 }, hotStreak: 0 });

const pieceToIcon = {
  pw: '♙',
  pb: '♟',
  nw: '♘',
  nb: '♞',
  bw: '♗',
  bb: '♝',
  rw: '♖',
  rb: '♜',
  qw: '♕',
  qb: '♛',
  kw: '♔',
  kb: '♚',
};

const achievementDefinitions = [
  { id: 'first_win', title: 'First Spark', desc: 'Claim your first victory in the arena.' },
  { id: 'ai_slayer', title: 'AI Slayer', desc: 'Defeat the AI Gauntlet at least once.' },
  { id: 'comeback', title: 'Comeback Kid', desc: 'Win a match with under 30 seconds remaining.' },
  { id: 'flawless', title: 'Flawless', desc: 'Win without losing a single piece (no captures against you).'},
  { id: 'streak', title: 'Overdrive', desc: 'Win three matches in a row.' },
  { id: 'speedster', title: 'Bullet Mind', desc: 'Win a game in under 60 moves.' },
];

function loadFromStorage(key, fallback) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch (err) {
    console.warn('Storage unavailable, using fallback for', key);
    return fallback;
  }
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('Unable to persist', key, err);
  }
}

function init() {
  renderBoard();
  renderLeaderboard();
  renderAchievements();
  attachEventListeners();
  updateTimers();
  updateStatus('Welcome challenger! Enter names and press Launch Match.');
}

function attachEventListeners() {
  localModeButton.addEventListener('click', () => switchMode('local'));
  aiModeButton.addEventListener('click', () => switchMode('ai'));
  resetButton.addEventListener('click', resetGame);
  undoButton.addEventListener('click', undoMove);
  startMatchButton.addEventListener('click', startMatch);
}

function switchMode(mode) {
  gameMode = mode;
  localModeButton.classList.toggle('active', mode === 'local');
  aiModeButton.classList.toggle('active', mode === 'ai');
  updateStatus(mode === 'local' ? 'Dual Arena: hot-seat multiplayer engaged.' : 'AI Gauntlet: survive the silicon mind.');
  resetGame();
}

function startMatch() {
  players.white = whiteNameInput.value.trim() || 'White Warrior';
  players.black = blackNameInput.value.trim() || (gameMode === 'ai' ? 'HyperNova AI' : 'Dark Challenger');
  chess.reset();
  selectedSquare = null;
  possibleMoves = [];
  lastMove = null;
  timers.white = INITIAL_CLOCK_SECONDS;
  timers.black = INITIAL_CLOCK_SECONDS;
  timers.active = 'white';
  clearInterval(timers.interval);
  timers.interval = setInterval(tickClock, 1000);
  moveListElement.innerHTML = '';
  updateStatus(`${players.white} vs ${players.black} — battle initiated!`);
  renderBoard();
  updateTimers();
}

function resetGame() {
  chess.reset();
  selectedSquare = null;
  possibleMoves = [];
  lastMove = null;
  timers.white = INITIAL_CLOCK_SECONDS;
  timers.black = INITIAL_CLOCK_SECONDS;
  timers.active = 'white';
  clearInterval(timers.interval);
  moveListElement.innerHTML = '';
  updateStatus('Board reset. Configure your next showdown.');
  renderBoard();
  updateTimers();
}

function tickClock() {
  const activeColor = timers.active;
  timers[activeColor] = Math.max(0, timers[activeColor] - 1);
  updateTimers();

  if (timers[activeColor] === 0) {
    clearInterval(timers.interval);
    const winnerColor = activeColor === 'white' ? 'black' : 'white';
    finishGame(`${players[winnerColor]} wins on time!`, winnerColor);
  }
}

function updateTimers() {
  whiteTimerElement.textContent = `${players.white.split(' ')[0]} • ${formatClock(timers.white)}`;
  blackTimerElement.textContent = `${players.black.split(' ')[0]} • ${formatClock(timers.black)}`;
  whiteTimerElement.classList.toggle('active', timers.active === 'white');
  blackTimerElement.classList.toggle('active', timers.active === 'black');
}

function formatClock(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${secs}`;
}

function renderBoard() {
  boardElement.innerHTML = '';
  const board = chess.board();
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const squareColor = (rank + file) % 2 === 0 ? 'light' : 'dark';
      const square = document.createElement('button');
      square.classList.add('square', squareColor);
      const squareName = String.fromCharCode(97 + file) + (8 - rank);
      square.dataset.square = squareName;
      square.addEventListener('click', () => onSquareClick(squareName));

      const piece = board[rank][file];
      if (piece) {
        square.textContent = pieceToIcon[piece.type + piece.color];
      }

      if (selectedSquare === squareName) {
        square.classList.add('highlight');
      }

      if (possibleMoves.some((m) => m.to === squareName)) {
        square.classList.add('move-option');
      }

      if (possibleMoves.some((m) => m.to === squareName && m.flags.includes('c'))) {
        square.classList.add('capture-option');
      }

      if (lastMove && (lastMove.from === squareName || lastMove.to === squareName)) {
        square.classList.add('last-move');
      }

      const inCheck = chess.inCheck();
      if (inCheck) {
        const kingSquare = findKingSquare(chess.turn());
        if (kingSquare === squareName) {
          square.classList.add('check');
        }
      }

      boardElement.appendChild(square);
    }
  }
}

function findKingSquare(color) {
  const board = chess.board();
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (piece && piece.type === 'k' && piece.color === color) {
        return String.fromCharCode(97 + file) + (8 - rank);
      }
    }
  }
  return null;
}

function onSquareClick(square) {
  const piece = chess.get(square);
  if (selectedSquare && possibleMoves.some((move) => move.to === square)) {
    performMove(selectedSquare, square, possibleMoves.find((m) => m.to === square));
    return;
  }

  if (!piece || piece.color !== chess.turn() || (gameMode === 'ai' && chess.turn() === 'b')) {
    selectedSquare = null;
    possibleMoves = [];
  } else {
    selectedSquare = square;
    possibleMoves = chess.moves({ square, verbose: true });
  }

  renderBoard();
}

function performMove(from, to, moveObj) {
  const move = chess.move({ from, to, promotion: 'q' });
  if (!move) return;

  lastMove = { from, to };
  logMove(move);
  toggleClock();
  renderBoard();
  checkEndConditions();
  if (!chess.isGameOver()) {
    updateStatusBarForTurn();
  }

  if (gameMode === 'ai' && chess.turn() === 'b' && !chess.isGameOver()) {
    setTimeout(makeAIMove, 300);
  }
}

function toggleClock() {
  timers.active = timers.active === 'white' ? 'black' : 'white';
  updateTimers();
}

function makeAIMove() {
  const bestMove = findBestMove(chess, 2);
  if (bestMove) {
    chess.move(bestMove);
    lastMove = { from: bestMove.from, to: bestMove.to };
    logMove(bestMove);
    toggleClock();
    renderBoard();
    checkEndConditions();
    if (!chess.isGameOver()) {
      updateStatusBarForTurn();
    }
  }
}

function findBestMove(game, depth) {
  const maximizingColor = game.turn();
  const moves = game.moves({ verbose: true });
  let bestMove = null;
  let bestValue = maximizingColor === 'w' ? -Infinity : Infinity;

  for (const move of moves) {
    game.move(move);
    const value = minimax(game, depth - 1, -Infinity, Infinity, maximizingColor === 'b');
    game.undo();

    if (maximizingColor === 'w' && value > bestValue) {
      bestValue = value;
      bestMove = move;
    }
    if (maximizingColor === 'b' && value < bestValue) {
      bestValue = value;
      bestMove = move;
    }
  }

  return bestMove || moves[Math.floor(Math.random() * moves.length)];
}

const pieceValues = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

function evaluateBoard(game) {
  const board = game.board();
  let score = 0;
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (piece) {
        const value = pieceValues[piece.type];
        score += piece.color === 'w' ? value : -value;
      }
    }
  }
  return score;
}

function minimax(game, depth, alpha, beta, isMaximizing) {
  if (depth === 0 || game.isGameOver()) {
    return evaluateBoard(game);
  }

  const moves = game.moves({ verbose: true });
  if (isMaximizing) {
    let value = -Infinity;
    for (const move of moves) {
      game.move(move);
      value = Math.max(value, minimax(game, depth - 1, alpha, beta, false));
      game.undo();
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }
    return value;
  } else {
    let value = Infinity;
    for (const move of moves) {
      game.move(move);
      value = Math.min(value, minimax(game, depth - 1, alpha, beta, true));
      game.undo();
      beta = Math.min(beta, value);
      if (alpha >= beta) break;
    }
    return value;
  }
}

function logMove(move) {
  const moveNumber = Math.ceil(chess.history().length / 2);
  const listItem = document.createElement('li');
  listItem.classList.add('move-item');
  const turnLabel = chess.turn() === 'b' ? `${moveNumber}.` : `${moveNumber}...`;
  listItem.innerHTML = `<span>${turnLabel}</span><span>${move.san}</span>`;
  moveListElement.appendChild(listItem);
  moveListElement.scrollTop = moveListElement.scrollHeight;
}

function undoMove() {
  if (gameMode === 'ai') {
    chess.undo();
    chess.undo();
  } else {
    chess.undo();
  }
  lastMove = null;
  selectedSquare = null;
  possibleMoves = [];
  renderBoard();
  moveListElement.innerHTML = '';
  chess.history({ verbose: true }).forEach((move, index) => {
    const listItem = document.createElement('li');
    listItem.classList.add('move-item');
    const moveNumber = Math.floor(index / 2) + 1;
    const prefix = index % 2 === 0 ? `${moveNumber}.` : `${moveNumber}...`;
    listItem.innerHTML = `<span>${prefix}</span><span>${move.san}</span>`;
    moveListElement.appendChild(listItem);
  });
}

function checkEndConditions() {
  if (chess.isCheckmate()) {
    const winner = chess.turn() === 'w' ? 'black' : 'white';
    finishGame(`${players[winner]} delivers checkmate!`, winner);
    return;
  }
  if (chess.isStalemate()) {
    finishGame('Stalemate — the arena falls silent.', null, 'draw');
    return;
  }
  if (chess.isInsufficientMaterial()) {
    finishGame('Draw by insufficient material.', null, 'draw');
    return;
  }
  if (chess.isThreefoldRepetition()) {
    finishGame('Draw by repetition. Balance restored.', null, 'draw');
    return;
  }
}

function finishGame(message, winnerColor, state = 'normal') {
  clearInterval(timers.interval);
  updateStatus(message, state === 'draw' ? 'draw' : winnerColor ? 'victory' : 'defeat');
  updateLeaderboard(winnerColor, state);
  updateAchievements(winnerColor, state);
  stats.hotStreak = winnerColor ? stats.hotStreak + 1 : 0;
  if (winnerColor) {
    saveToStorage('hypernova_stats', stats);
  }
}

function updateStatus(message, level = '') {
  statusBanner.textContent = message;
  statusBanner.classList.remove('victory', 'defeat', 'draw');
  if (level) {
    statusBanner.classList.add(level);
  }
}

function updateLeaderboard(winnerColor, state) {
  if (state === 'draw') {
    recordResult(players.white, 0.5);
    recordResult(players.black, 0.5);
  } else if (winnerColor) {
    const loserColor = winnerColor === 'white' ? 'black' : 'white';
    recordResult(players[winnerColor], 1);
    recordResult(players[loserColor], 0);
  }
  leaderboard.sort((a, b) => b.rating - a.rating);
  leaderboard = leaderboard.slice(0, 10);
  saveToStorage('hypernova_leaderboard', leaderboard);
  renderLeaderboard();
}

function recordResult(playerName, score) {
  if (!playerName) return;
  let entry = leaderboard.find((e) => e.name === playerName);
  if (!entry) {
    entry = { name: playerName, rating: 1200, games: 0, wins: 0, draws: 0, losses: 0 };
    leaderboard.push(entry);
  }

  const expectedScore = 1 / (1 + Math.pow(10, (averageOpponentRating(playerName) - entry.rating) / 400));
  const kFactor = entry.games < 15 ? 40 : 20;
  entry.rating = Math.round(entry.rating + kFactor * (score - expectedScore));
  entry.games += 1;
  if (score === 1) entry.wins += 1;
  if (score === 0) entry.losses += 1;
  if (score === 0.5) entry.draws += 1;
}

function averageOpponentRating(playerName) {
  const opponents = leaderboard.filter((entry) => entry.name !== playerName);
  if (opponents.length === 0) return 1200;
  const total = opponents.reduce((sum, entry) => sum + entry.rating, 0);
  return total / opponents.length;
}

function renderLeaderboard() {
  leaderboardElement.innerHTML = '';
  if (leaderboard.length === 0) {
    leaderboardElement.innerHTML = '<li class="leaderboard-entry"><span>No contenders yet.</span><span>—</span></li>';
    return;
  }
  leaderboard.forEach((entry, index) => {
    const item = document.createElement('li');
    item.classList.add('leaderboard-entry');
    item.innerHTML = `<span>${index + 1}. ${entry.name}</span><span>${entry.rating}</span>`;
    leaderboardElement.appendChild(item);
  });
}

function renderAchievements() {
  achievementGrid.innerHTML = '';
  const template = document.getElementById('achievement-template');
  achievementDefinitions.forEach((achievement) => {
    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('.achievement-card');
    card.classList.toggle('unlocked', achievements[achievement.id]);
    clone.querySelector('.achievement-title').textContent = achievement.title;
    clone.querySelector('.achievement-desc').textContent = achievement.desc;
    achievementGrid.appendChild(clone);
  });
}

function updateAchievements(winnerColor, state) {
  let unlocked = false;
  if (winnerColor && !achievements.first_win) {
    achievements.first_win = true;
    unlocked = true;
  }
  if (winnerColor && gameMode === 'ai' && winnerColor === 'white' && !achievements.ai_slayer) {
    achievements.ai_slayer = true;
    unlocked = true;
  }
  if (winnerColor) {
    const winnerTimer = winnerColor === 'white' ? timers.white : timers.black;
    if (winnerTimer < 30 && !achievements.comeback) {
      achievements.comeback = true;
      unlocked = true;
    }
  }
  if (winnerColor && noPiecesCapturedAgainst(winnerColor) && !achievements.flawless) {
    achievements.flawless = true;
    unlocked = true;
  }
  if (winnerColor && chess.history().length < 60 && !achievements.speedster) {
    achievements.speedster = true;
    unlocked = true;
  }
  if (stats.hotStreak >= 3 && !achievements.streak) {
    achievements.streak = true;
    unlocked = true;
  }
  if (state === 'draw') {
    stats.hotStreak = 0;
  }
  if (unlocked) {
    saveToStorage('hypernova_achievements', achievements);
    renderAchievements();
  }
}

function noPiecesCapturedAgainst(winnerColor) {
  const history = chess.history({ verbose: true });
  return !history.some((move) => move.color !== winnerColor && move.captured);
}

function updateStatusBarForTurn() {
  if (chess.turn() === 'w') {
    updateStatus(`${players.white}'s move.`);
  } else if (gameMode === 'ai') {
    updateStatus(`HyperNova AI is plotting...`);
  } else {
    updateStatus(`${players.black}'s move.`);
  }
}

boardElement.addEventListener('transitionend', updateStatusBarForTurn);

init();
