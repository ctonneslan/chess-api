import express from "express";
import cors from "cors";
import { Chess } from "chess.js";
import { register, moveCounter, metricsMiddleware } from "./metrics.js";

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
  res.json({ fen: game.fen(), move });
});

// Prometheus endpoint
app.get("/metrics", async (_req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ chess-api running on http://localhost:${PORT}`);
});
