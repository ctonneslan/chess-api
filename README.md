# Chess Puzzle Generator

A full-stack web application that fetches your Chess.com games, analyzes them for mistakes, and generates interactive puzzles to help you learn from those mistakes.

## Project Structure

```
chess-api/
├── src/
│   ├── server.js      # Express backend with API endpoints
│   └── analyzer.js    # Chess analysis logic
├── public/
│   ├── index.html     # Frontend HTML structure
│   ├── styles.css     # Styling with modern CSS
│   └── script.js      # Vanilla JavaScript for interactivity
└── package.json       # Project dependencies
```

## Features

1. **Fetch Chess.com Games** - Enter any Chess.com username to fetch their recent games
2. **Game Analysis** - Analyzes games to detect blunders and mistakes
3. **Puzzle Generation** - Creates puzzles from positions where mistakes occurred
4. **Interactive Solving** - Solve puzzles directly in the browser with a chess board

## Tech Stack

### Backend
- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **chess.js** - Chess game logic and validation
- **axios** - HTTP client for Chess.com API

### Frontend
- **Vanilla HTML** - Structure
- **Vanilla CSS** - Styling with gradients and animations
- **Vanilla JavaScript** - All interactions, no frameworks!

## API Endpoints

### GET `/api/health`
Health check endpoint

### GET `/api/games/:username`
Fetches games for a Chess.com user
- **Parameters**: `username` - Chess.com username
- **Returns**: List of games from current month

### POST `/api/analyze`
Analyzes a game for mistakes
- **Body**: `{ pgn: string, playerColor?: 'white' | 'black' }`
- **Returns**: List of mistakes found

### POST `/api/puzzles`
Generates puzzles from a game
- **Body**: `{ pgn: string, playerColor?: 'white' | 'black' }`
- **Returns**: Array of puzzles with FEN positions

## How It Works

### Analysis Logic
1. Parses PGN (chess game notation)
2. Replays game move by move
3. Detects blunders:
   - **Hanging pieces** - Pieces left undefended
   - **Bad trades** - Trading valuable pieces for less valuable ones
4. Stores position before mistake for puzzle

### Puzzle Generation
1. Takes mistake position (FEN notation)
2. Finds better alternative moves
3. Creates puzzle with:
   - Starting position
   - The blunder that was played
   - Correct alternatives
   - Difficulty rating

### Frontend Flow
1. User enters Chess.com username
2. Fetches games via Chess.com API
3. User selects a game
4. Backend analyzes and generates puzzles
5. User solves puzzles on interactive board

## Running the Project

```bash
# Install dependencies
npm install

# Run in development mode (auto-restart)
npm run dev

# Run in production mode
npm start
```

Then open http://localhost:3000 in your browser.

## Learning Concepts Demonstrated

### Backend
- RESTful API design
- Async/await for asynchronous operations
- Error handling with try/catch
- Express middleware (CORS, JSON parsing)
- Module organization (separate files)

### Frontend
- DOM manipulation
- Fetch API for HTTP requests
- Event listeners and handlers
- State management without frameworks
- Responsive CSS with Grid and Flexbox

### Chess Programming
- FEN (Forsyth–Edwards Notation) parsing
- PGN (Portable Game Notation) parsing
- Move validation
- Position evaluation (simplified)

## Future Improvements

- [ ] Integrate actual Stockfish engine for deeper analysis
- [ ] Add move history/undo functionality
- [ ] Support drag-and-drop for pieces
- [ ] Add user accounts and save progress
- [ ] Support analyzing multiple months of games
- [ ] Add difficulty levels and filtering
- [ ] Implement spaced repetition for puzzles
- [ ] Add puzzle statistics and progress tracking

## License

MIT

---

Built as a learning project for full-stack web development!
