import express from "express";
import cors from "cors";
import { Chess } from "chess.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const game = new Chess();

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "chess-api" });
});

app.get("/board", (_req, res) => {
  res.json({ fen: game.fen(), turn: game.turn() });
});

app.post("/move", (req, res) => {
  const { from, to } = req.body;
  const move = game.move({ from, to });
  if (!move) return res.status(400).json({ error: "Invalid move" });
  res.json({ fen: game.fen(), move });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ chess-api running on http://localhost:${PORT}`);
});
