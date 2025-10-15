// Chess analysis module using Stockfish engine
import { Chess } from 'chess.js';

/**
 * Analyze a single chess position using evaluation
 * @param {Chess} game - Chess.js game instance
 * @param {string} move - The move in SAN notation (e.g., "Nf3")
 * @returns {Object} Analysis result with evaluation and classification
 */
export function analyzeMoveBasic(game, move) {
  // Store the position before the move
  const fenBefore = game.fen();

  // Try to make the move
  const result = game.move(move);

  if (!result) {
    return { error: 'Invalid move' };
  }

  // Simple heuristic-based evaluation
  // In a real implementation, we'd use Stockfish engine
  // For now, we'll use chess.js built-in features

  // Check if move leads to checkmate
  if (game.isCheckmate()) {
    return {
      move: result.san,
      evaluation: game.turn() === 'w' ? -1000 : 1000, // Black/White wins
      type: 'checkmate'
    };
  }

  // Check if move is a capture
  const isCapture = result.captured ? true : false;

  // Check if move gives check
  const isCheck = game.isCheck();

  // Basic classification (we'll improve this with Stockfish later)
  return {
    move: result.san,
    evaluation: 0, // Placeholder - will use engine later
    isCapture,
    isCheck,
    type: 'normal'
  };
}

/**
 * Parse PGN and extract all moves
 * @param {string} pgn - Chess game in PGN format
 * @returns {Array} Array of moves in SAN notation
 */
export function extractMovesFromPGN(pgn) {
  const game = new Chess();

  try {
    // Load the PGN
    game.loadPgn(pgn);

    // Get the move history
    const moves = game.history();

    return moves;
  } catch (error) {
    console.error('Error parsing PGN:', error);
    return [];
  }
}

/**
 * Classify mistake severity based on evaluation change
 * @param {number} evalBefore - Evaluation before move
 * @param {number} evalAfter - Evaluation after move
 * @param {string} side - 'white' or 'black'
 * @returns {string|null} Mistake type: 'blunder', 'mistake', 'inaccuracy', or null
 */
export function classifyMistake(evalBefore, evalAfter, side) {
  // Calculate centipawn loss
  // For white, losing evaluation is bad (e.g., +2 to 0 = -200 centipawns)
  // For black, gaining evaluation is bad (e.g., -2 to 0 = +200 centipawns)

  let loss;
  if (side === 'white') {
    loss = evalBefore - evalAfter;
  } else {
    loss = evalAfter - evalBefore;
  }

  // Chess.com style classification
  if (loss >= 300) {
    return 'blunder';  // Lost 3+ pawns worth
  } else if (loss >= 200) {
    return 'mistake';  // Lost 2-3 pawns worth
  } else if (loss >= 100) {
    return 'inaccuracy';  // Lost 1-2 pawns worth
  }

  return null; // Good move
}
