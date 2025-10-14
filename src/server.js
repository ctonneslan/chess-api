import express from "express";
import cors from "cors";
import { Chess } from "chess.js";
import { register, moveCounter, metricsMiddleware } from "./metrics.js";
import axios from "axios";
import { evaluatePosition } from "./engine.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use(metricsMiddleware);
app.use(express.static("public"));

const game = new Chess();

// Health
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "chess-api" });
});

// Fetch board
app.get("/board", (_req, res) => {
  res.json({ fen: game.fen(), turn: game.turn() });
});

// Make move
app.post("/move", (req, res) => {
  const { from, to } = req.body;
  const move = game.move({ from, to });
  if (!move) return res.status(400).json({ error: "Invalid move" });
  moveCounter.inc();
  res.json({ fen: game.fen(), move });
});

// Prometheus endpoint
app.get("/metrics", async (_req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

// Fetch history
app.get("/history/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const { data } = await axios.get(
      `https://api.chess.com/pub/player/${username}/games/archives`
    );

    // flatten all month URLs into one list of games
    const games = [];
    for (const monthUrl of data.archives.slice(-3)) {
      // latest 3 months
      const monthData = await axios.get(monthUrl);
      games.push(...monthData.data.games);
    }

    res.json({ count: games.length, games });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

function cleanPgn(pgn) {
  return (
    pgn
      // remove clock annotations and comments
      .replace(/\{[^}]*\}/g, "")
      // remove numeric annotation glyphs like $1, $2, etc.
      .replace(/\$\d+/g, "")
      .trim()
  );
}

app.get("/blunders/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const { data } = await axios.get(
      `https://api.chess.com/pub/player/${username}/games/archives`
    );

    const lastMonth = data.archives.slice(-1)[0];
    const { data: monthData } = await axios.get(lastMonth);
    const games = monthData.games.slice(0, 5); // analyze first 5 for now

    const results = [];

    for (const game of games) {
      if (!game.pgn) continue;
      const cleaned = cleanPgn(game.pgn);

      const board = new Chess();
      board.loadPgn(cleaned); // safe built-in parser

      const history = board.history({ verbose: true });
      let tempBoard = new Chess();

      for (const move of history) {
        const fenBefore = tempBoard.fen();
        tempBoard.move(move.san);
        const fenAfter = tempBoard.fen();

        const evalBefore = await evaluatePosition(fenBefore);
        const evalAfter = await evaluatePosition(fenAfter);

        const swing = evalAfter - evalBefore;

        if (swing < -150) {
          results.push({
            game_url: game.url,
            move: move.san,
            fen: fenBefore,
            eval_change: swing,
          });
        }
      }
    }

    res.json({ count: results.length, blunders: results });
  } catch (err) {
    console.error("Blunder analysis error:", err);
    res.status(500).json({ error: "Failed to analyze blunders" });
  }
});

app.use((req, _res, next) => {
  const err = new Error(`Not Found: ${req.method} ${req.originalUrl}`);
  err.status = 404;
  next(err);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ chess-api running on http://localhost:${PORT}`);
});
