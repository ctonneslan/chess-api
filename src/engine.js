import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// resolve binary relative to project root
const stockfishPath = path.join(__dirname, "../bin/stockfish");

export async function evaluatePosition(fen, depth = 12) {
  return new Promise((resolve, reject) => {
    const engine = spawn(stockfishPath);
    let evalScore = 0;

    engine.stdout.on("data", (data) => {
      const line = data.toString();

      // capture centipawn evaluations
      if (line.includes("info depth")) {
        const match = line.match(/score cp (-?\d+)/);
        if (match) evalScore = parseInt(match[1]);
      }

      // when Stockfish outputs "bestmove", it's done
      if (line.includes("bestmove")) {
        engine.kill();
        resolve(evalScore);
      }
    });

    engine.stderr.on("data", (err) => {
      console.error("Stockfish error:", err.toString());
    });

    engine.on("error", (err) => {
      reject(err);
    });

    // standard UCI protocol commands
    engine.stdin.write("uci\n");
    engine.stdin.write(`position fen ${fen}\n`);
    engine.stdin.write(`go depth ${depth}\n`);
  });
}
