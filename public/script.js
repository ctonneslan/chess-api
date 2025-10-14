async function fetchBoard() {
  const res = await fetch("http://localhost:3000/board");
  const data = await res.json();
  renderBoard(data.fen);
}

function renderBoard(fen) {
  const boardDiv = document.getElementById("board");
  boardDiv.innerHTML = "";
  const pieces = {
    p: "♟",
    r: "♜",
    n: "♞",
    b: "♝",
    q: "♛",
    k: "♚",
    P: "♙",
    R: "♖",
    N: "♘",
    B: "♗",
    Q: "♕",
    K: "♔",
  };
  const rows = fen.split(" ")[0].split("/");
  rows.forEach((row, rIdx) => {
    let col = 0;
    for (const ch of row) {
      if (isNaN(ch)) {
        const color = (rIdx + col) % 2 === 0 ? "light" : "dark";
        const square = document.createElement("div");
        square.className = `square ${color}`;
        square.textContent = pieces[ch] || "";
        boardDiv.appendChild(square);
        col++;
      } else {
        for (let i = 0; i < +ch; i++) {
          const color = (rIdx + col) % 2 === 0 ? "light" : "dark";
          const square = document.createElement("div");
          square.className = `square ${color}`;
          boardDiv.appendChild(square);
          col++;
        }
      }
    }
  });
}
fetchBoard();
