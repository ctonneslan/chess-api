// Import required packages
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { Chess } from 'chess.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractMovesFromPGN } from './analyzer.js';

// Get current directory (needed for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express application
const app = express();
const PORT = 3000;

// Middleware setup
app.use(cors()); // Enable CORS for frontend communication
app.use(express.json()); // Parse JSON request bodies
app.use(express.static(path.join(__dirname, '../public'))); // Serve static files from public folder

// Test endpoint to verify server is running
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running!' });
});

// Fetch user's game history from Chess.com
app.get('/api/games/:username', async (req, res) => {
  try {
    // Get username from URL parameter
    const { username } = req.params;

    // Get current year and month for Chess.com API
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed

    // Chess.com API URL for monthly archives
    const url = `https://api.chess.com/pub/player/${username}/games/${year}/${month}`;

    // Make request to Chess.com API
    const response = await axios.get(url);

    // Return the games data
    res.json({
      username,
      gamesCount: response.data.games.length,
      games: response.data.games
    });

  } catch (error) {
    // Handle errors (user not found, network issues, etc.)
    res.status(500).json({
      error: 'Failed to fetch games',
      message: error.message
    });
  }
});

// Analyze a specific game and find mistakes/blunders
app.post('/api/analyze', async (req, res) => {
  try {
    // Get PGN from request body
    const { pgn, playerColor } = req.body;

    if (!pgn) {
      return res.status(400).json({ error: 'PGN is required' });
    }

    // Parse the game
    const game = new Chess();
    game.loadPgn(pgn);

    // Get move history
    const moves = game.history({ verbose: true });

    // Analyze each move and find mistakes
    const mistakes = [];
    const gameAnalysis = new Chess(); // Fresh game for replay

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      const moveNumber = Math.floor(i / 2) + 1;
      const side = move.color === 'w' ? 'white' : 'black';

      // Only analyze moves for the specified player color if provided
      if (playerColor && side !== playerColor) {
        gameAnalysis.move(move.san);
        continue;
      }

      // Store position before move
      const fenBefore = gameAnalysis.fen();

      // Make the move
      gameAnalysis.move(move.san);

      // Detect obvious blunders (hanging pieces, missing checkmate, etc.)
      const blunderType = detectBlunder(gameAnalysis, move);

      if (blunderType) {
        mistakes.push({
          moveNumber,
          side,
          move: move.san,
          fen: fenBefore,
          type: blunderType,
          description: getBlunderDescription(blunderType)
        });
      }
    }

    res.json({
      totalMoves: moves.length,
      mistakesFound: mistakes.length,
      mistakes
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to analyze game',
      message: error.message
    });
  }
});

// Helper function to detect basic blunders
function detectBlunder(game, move) {
  // Check if opponent is in checkmate (you won!)
  if (game.isCheckmate()) {
    return null; // Not a blunder, you won!
  }

  // Check if move hangs a piece (captured piece is more valuable than capturing piece)
  if (move.captured) {
    const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    const capturedValue = pieceValues[move.captured];
    const movedValue = pieceValues[move.piece];

    // If you captured with a more valuable piece, might be a blunder
    if (movedValue > capturedValue + 1) {
      return 'bad_trade';
    }
  }

  // Check if the moved piece is now under attack and undefended
  // This is a simplified check - real engine would be more accurate
  const threats = getThreats(game, move.to);
  if (threats.length > 0) {
    return 'hanging_piece';
  }

  return null;
}

// Helper function to get threats to a square
function getThreats(game, square) {
  const threats = [];
  const turn = game.turn();

  // Get all possible moves for the opponent
  const moves = game.moves({ verbose: true });

  for (const move of moves) {
    if (move.to === square && move.captured) {
      threats.push(move);
    }
  }

  return threats;
}

// Helper function to describe blunder types
function getBlunderDescription(type) {
  const descriptions = {
    'hanging_piece': 'Piece left undefended and can be captured',
    'bad_trade': 'Traded a more valuable piece for a less valuable one',
    'missed_checkmate': 'Missed an opportunity for checkmate',
    'allows_checkmate': 'Move allows opponent to deliver checkmate'
  };

  return descriptions[type] || 'Mistake detected';
}

// Generate puzzles from a game's mistakes
app.post('/api/puzzles', async (req, res) => {
  try {
    const { pgn, playerColor } = req.body;

    if (!pgn) {
      return res.status(400).json({ error: 'PGN is required' });
    }

    // First, analyze the game to find mistakes
    const game = new Chess();
    game.loadPgn(pgn);
    const moves = game.history({ verbose: true });

    const puzzles = [];
    const gameReplay = new Chess();

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      const side = move.color === 'w' ? 'white' : 'black';

      // Only create puzzles for specified player's mistakes
      if (playerColor && side !== playerColor) {
        gameReplay.move(move.san);
        continue;
      }

      // Store position before the mistake
      const fenBefore = gameReplay.fen();

      // Make the move
      gameReplay.move(move.san);

      // Detect if this was a blunder
      const blunderType = detectBlunder(gameReplay, move);

      if (blunderType) {
        // Get the best moves in this position (legal moves)
        const chessCopy = new Chess(fenBefore);
        const legalMoves = chessCopy.moves({ verbose: true });

        // Find better alternatives (not the blunder)
        const alternatives = legalMoves
          .filter(m => m.san !== move.san)
          .slice(0, 3) // Top 3 alternatives
          .map(m => m.san);

        // Create puzzle
        puzzles.push({
          id: puzzles.length + 1,
          fen: fenBefore, // Starting position for puzzle
          blunderMove: move.san,
          correctMoves: alternatives,
          side: side,
          difficulty: blunderType === 'hanging_piece' ? 'easy' : 'medium',
          description: `Find a better move than ${move.san}`,
          blunderType,
          moveNumber: Math.floor(i / 2) + 1
        });
      }

      // Limit to 10 puzzles max
      if (puzzles.length >= 10) break;
    }

    res.json({
      puzzlesGenerated: puzzles.length,
      puzzles
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate puzzles',
      message: error.message
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Chess Puzzle API running on http://localhost:${PORT}`);
});
