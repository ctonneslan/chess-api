// Global state
const state = {
  games: [],
  selectedGame: null,
  puzzles: [],
  currentPuzzleIndex: 0,
  currentPosition: null
};

// API base URL
const API_URL = 'http://localhost:3000/api';

// DOM Elements
const fetchBtn = document.getElementById('fetch-btn');
const usernameInput = document.getElementById('username');
const gamesResult = document.getElementById('games-result');
const gamesSection = document.getElementById('select-section');
const gamesList = document.getElementById('games-list');
const puzzlesSection = document.getElementById('puzzles-section');
const puzzlesInfo = document.getElementById('puzzles-info');
const puzzlesList = document.getElementById('puzzles-list');
const solveSection = document.getElementById('solve-section');
const puzzleInfo = document.getElementById('puzzle-info');
const chessboard = document.getElementById('chessboard');
const feedback = document.getElementById('feedback');
const hintBtn = document.getElementById('hint-btn');
const nextPuzzleBtn = document.getElementById('next-puzzle-btn');

// Event Listeners
fetchBtn.addEventListener('click', fetchGames);
hintBtn.addEventListener('click', showHint);
nextPuzzleBtn.addEventListener('click', nextPuzzle);

// Allow pressing Enter in username input
usernameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') fetchGames();
});

/**
 * Step 1: Fetch games from Chess.com
 */
async function fetchGames() {
  const username = usernameInput.value.trim();

  if (!username) {
    alert('Please enter a username');
    return;
  }

  fetchBtn.disabled = true;
  fetchBtn.textContent = 'Fetching...';
  gamesResult.classList.remove('show');

  try {
    const response = await fetch(`${API_URL}/games/${username}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch games');
    }

    state.games = data.games;

    // Show results
    gamesResult.innerHTML = `
      <p><strong>Found ${data.gamesCount} games for ${data.username}</strong></p>
      <p>Scroll down to select a game to analyze</p>
    `;
    gamesResult.classList.add('show');

    // Display games
    displayGames(data.games);

  } catch (error) {
    gamesResult.innerHTML = `
      <p style="color: red;"><strong>Error:</strong> ${error.message}</p>
      <p>Make sure the username exists on Chess.com</p>
    `;
    gamesResult.classList.add('show');
  } finally {
    fetchBtn.disabled = false;
    fetchBtn.textContent = 'Fetch Games';
  }
}

/**
 * Step 2: Display games list
 */
function displayGames(games) {
  gamesList.innerHTML = '';

  // Show only first 20 games to avoid overwhelming UI
  const gamesToShow = games.slice(0, 20);

  gamesToShow.forEach((game, index) => {
    const gameCard = document.createElement('div');
    gameCard.className = 'game-card';

    // Extract game info
    const white = game.white.username;
    const black = game.black.username;
    const result = game.white.result;
    const timeClass = game.time_class;

    gameCard.innerHTML = `
      <h3>${white} vs ${black}</h3>
      <p><strong>Result:</strong> ${result}</p>
      <p><strong>Time:</strong> ${timeClass}</p>
      <p><strong>Accuracy:</strong> W: ${game.accuracies?.white || 'N/A'}% | B: ${game.accuracies?.black || 'N/A'}%</p>
    `;

    gameCard.addEventListener('click', () => selectGame(game));
    gamesList.appendChild(gameCard);
  });

  // Show the games section
  gamesSection.style.display = 'block';
  gamesSection.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Step 3: Select a game and generate puzzles
 */
async function selectGame(game) {
  state.selectedGame = game;

  // Show loading
  puzzlesInfo.innerHTML = '<p>Analyzing game and generating puzzles...</p>';
  puzzlesSection.style.display = 'block';
  puzzlesSection.scrollIntoView({ behavior: 'smooth' });
  puzzlesList.innerHTML = '';

  try {
    // Call API to generate puzzles
    const response = await fetch(`${API_URL}/puzzles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pgn: game.pgn,
        playerColor: null // Analyze both colors
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to generate puzzles');
    }

    state.puzzles = data.puzzles;

    if (data.puzzles.length === 0) {
      puzzlesInfo.innerHTML = `
        <p><strong>Great news!</strong> No major blunders detected in this game.</p>
        <p>Try selecting another game to practice.</p>
      `;
      return;
    }

    // Display puzzle summary
    puzzlesInfo.innerHTML = `
      <p><strong>Found ${data.puzzlesGenerated} puzzles from this game!</strong></p>
      <p>Click on any puzzle below to solve it.</p>
    `;

    // Display puzzles
    displayPuzzles(data.puzzles);

  } catch (error) {
    puzzlesInfo.innerHTML = `
      <p style="color: red;"><strong>Error:</strong> ${error.message}</p>
    `;
  }
}

/**
 * Display puzzles grid
 */
function displayPuzzles(puzzles) {
  puzzlesList.innerHTML = '';

  puzzles.forEach((puzzle, index) => {
    const puzzleCard = document.createElement('div');
    puzzleCard.className = 'puzzle-card';

    puzzleCard.innerHTML = `
      <h3>Puzzle #${puzzle.id}</h3>
      <p>Move ${puzzle.moveNumber} - ${puzzle.side}</p>
      <p>${puzzle.description}</p>
      <span class="badge">${puzzle.difficulty}</span>
    `;

    puzzleCard.addEventListener('click', () => startPuzzle(index));
    puzzlesList.appendChild(puzzleCard);
  });
}

/**
 * Step 4: Start solving a puzzle
 */
function startPuzzle(index) {
  state.currentPuzzleIndex = index;
  const puzzle = state.puzzles[index];

  // Show solve section
  solveSection.style.display = 'block';
  solveSection.scrollIntoView({ behavior: 'smooth' });

  // Display puzzle info
  puzzleInfo.innerHTML = `
    <h3>Puzzle #${puzzle.id} - ${puzzle.difficulty}</h3>
    <p><strong>${puzzle.side === 'white' ? 'White' : 'Black'} to move</strong></p>
    <p>${puzzle.description}</p>
    <p style="color: #888; font-size: 0.9rem;">Blunder was: ${puzzle.blunderMove}</p>
  `;

  // Clear feedback
  feedback.classList.remove('show', 'success', 'error', 'hint');

  // Initialize board with FEN position
  initializeBoard(puzzle.fen);
}

/**
 * Initialize chess board
 */
function initializeBoard(fen) {
  // Parse FEN to get board state
  const position = fenToBoard(fen);
  state.currentPosition = position;

  // Clear board
  chessboard.innerHTML = '';

  // Create 8x8 grid
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = document.createElement('div');
      square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
      square.dataset.row = row;
      square.dataset.col = col;

      // Add piece if present
      const piece = position[row][col];
      if (piece) {
        square.textContent = getPieceSymbol(piece);
      }

      square.addEventListener('click', () => handleSquareClick(row, col));
      chessboard.appendChild(square);
    }
  }
}

/**
 * Convert FEN notation to 2D board array
 */
function fenToBoard(fen) {
  const board = [];
  const rows = fen.split(' ')[0].split('/');

  for (let row = 0; row < 8; row++) {
    board[row] = [];
    let col = 0;

    for (const char of rows[row]) {
      if (isNaN(char)) {
        // It's a piece
        board[row][col] = char;
        col++;
      } else {
        // It's empty squares
        const emptySquares = parseInt(char);
        for (let i = 0; i < emptySquares; i++) {
          board[row][col] = null;
          col++;
        }
      }
    }
  }

  return board;
}

/**
 * Get Unicode chess piece symbol
 */
function getPieceSymbol(piece) {
  const symbols = {
    'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
    'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
  };
  return symbols[piece] || '';
}

/**
 * Handle square click for move input
 */
let selectedSquare = null;

function handleSquareClick(row, col) {
  const puzzle = state.puzzles[state.currentPuzzleIndex];

  if (!selectedSquare) {
    // Select piece
    const piece = state.currentPosition[row][col];
    if (piece) {
      selectedSquare = { row, col, piece };
      highlightSquare(row, col);
    }
  } else {
    // Try to make move
    const from = selectedSquare;
    const to = { row, col };

    // Convert to chess notation (simplified)
    const moveNotation = convertToNotation(from, to, from.piece);

    // Check if move is correct
    checkMove(moveNotation);

    // Clear selection
    clearHighlight();
    selectedSquare = null;
  }
}

/**
 * Highlight selected square
 */
function highlightSquare(row, col) {
  const squares = chessboard.querySelectorAll('.square');
  squares.forEach(sq => {
    const sqRow = parseInt(sq.dataset.row);
    const sqCol = parseInt(sq.dataset.col);
    if (sqRow === row && sqCol === col) {
      sq.classList.add('selected');
    }
  });
}

/**
 * Clear highlight
 */
function clearHighlight() {
  const squares = chessboard.querySelectorAll('.square');
  squares.forEach(sq => sq.classList.remove('selected'));
}

/**
 * Convert move to chess notation (simplified)
 */
function convertToNotation(from, to, piece) {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  const fromSquare = files[from.col] + ranks[from.row];
  const toSquare = files[to.col] + ranks[to.row];

  // Simple notation (this is simplified - real chess notation is more complex)
  const pieceSymbol = piece.toUpperCase() === 'P' ? '' : piece.toUpperCase();
  return pieceSymbol + toSquare;
}

/**
 * Check if move is correct
 */
function checkMove(move) {
  const puzzle = state.puzzles[state.currentPuzzleIndex];
  const correctMoves = puzzle.correctMoves;

  // Check if move is in correct moves list
  const isCorrect = correctMoves.some(correctMove =>
    correctMove.toLowerCase().includes(move.toLowerCase().slice(-2))
  );

  if (isCorrect) {
    showFeedback('Excellent! That\'s a better move!', 'success');
    setTimeout(() => {
      nextPuzzle();
    }, 2000);
  } else {
    showFeedback('Not quite. Try again or click hint!', 'error');
  }
}

/**
 * Show feedback message
 */
function showFeedback(message, type) {
  feedback.textContent = message;
  feedback.className = `feedback show ${type}`;
}

/**
 * Show hint
 */
function showHint() {
  const puzzle = state.puzzles[state.currentPuzzleIndex];
  const hints = puzzle.correctMoves.join(', ');
  showFeedback(`Hint: Try one of these moves: ${hints}`, 'hint');
}

/**
 * Next puzzle
 */
function nextPuzzle() {
  const nextIndex = state.currentPuzzleIndex + 1;

  if (nextIndex < state.puzzles.length) {
    startPuzzle(nextIndex);
  } else {
    showFeedback('Congratulations! You completed all puzzles!', 'success');
    setTimeout(() => {
      puzzlesSection.scrollIntoView({ behavior: 'smooth' });
    }, 2000);
  }
}
