export const DEFAULT_BOARD_SIZE = 7;

export type Player = "red" | "blue";
export type Difficulty = "easy" | "medium" | "hard";
export type Cell = { owner: Player | null; count: number };
export type Board = Cell[][];
export type Point = { row: number; col: number };
export type ReactionFrame = {
  before: Board;
  after: Board;
  sources: Point[];
  trails: { from: Point; to: Point; lost: boolean }[];
  captured: Point[];
};
export type MoveResult = {
  placed: Board;
  final: Board;
  frames: ReactionFrame[];
  exploded: number;
  captured: number;
};

export const otherPlayer = (player: Player): Player => (player === "red" ? "blue" : "red");

export function createBoard(size = DEFAULT_BOARD_SIZE): Board {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ owner: null, count: 0 })),
  );
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((cell) => ({ ...cell })));
}

export function capacity(): number {
  return 4;
}

function directions(row: number, col: number): Point[] {
  return [
    { row: row - 1, col },
    { row: row + 1, col },
    { row, col: col - 1 },
    { row, col: col + 1 },
  ];
}

export function neighbors(size: number, row: number, col: number): Point[] {
  return directions(row, col).filter((point) => point.row >= 0 && point.row < size && point.col >= 0 && point.col < size);
}

export function isLegal(board: Board, row: number, col: number, player: Player, hasPlaced = true) {
  const cell = board[row]?.[col];
  if (!cell) return false;
  return hasPlaced ? cell.owner === player : cell.owner === null;
}

export function legalMoves(board: Board, player: Player, hasPlaced = true): Point[] {
  const moves: Point[] = [];
  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board.length; col += 1) {
      if (isLegal(board, row, col, player, hasPlaced)) moves.push({ row, col });
    }
  }
  return moves;
}

export function resolveMove(board: Board, row: number, col: number, player: Player): MoveResult {
  const working = cloneBoard(board);
  working[row][col] = { owner: player, count: working[row][col].count + 1 };
  const placed = cloneBoard(working);
  const frames: ReactionFrame[] = [];
  let exploded = 0;
  let captured = 0;
  let guard = 0;

  while (guard < 256) {
    guard += 1;
    const sources: Point[] = [];
    for (let r = 0; r < working.length; r += 1) {
      for (let c = 0; c < working.length; c += 1) {
        if (working[r][c].count >= capacity()) sources.push({ row: r, col: c });
      }
    }
    if (!sources.length) break;

    const before = cloneBoard(working);
    const trails: ReactionFrame["trails"] = [];
    const capturedCells: Point[] = [];

    for (const source of sources) {
      const cell = working[source.row][source.col];
      cell.count -= capacity();
      if (cell.count <= 0) {
        cell.count = 0;
        cell.owner = null;
      }
    }

    for (const source of sources) {
      for (const target of directions(source.row, source.col)) {
        const lost = target.row < 0 || target.row >= working.length || target.col < 0 || target.col >= working.length;
        trails.push({ from: source, to: target, lost });
        if (lost) continue;
        const targetCell = working[target.row][target.col];
        if (targetCell.owner && targetCell.owner !== player) {
          captured += 1;
          capturedCells.push(target);
        }
        targetCell.owner = player;
        targetCell.count += 1;
      }
    }
    exploded += sources.length;
    frames.push({ before, after: cloneBoard(working), sources, trails, captured: capturedCells });
  }

  return { placed, final: cloneBoard(working), frames, exploded, captured };
}

export function countCells(board: Board, player: Player): number {
  return board.flat().filter((cell) => cell.owner === player).length;
}

export function countOrbs(board: Board, player: Player): number {
  return board.flat().reduce((sum, cell) => sum + (cell.owner === player ? cell.count : 0), 0);
}

export function winnerFor(board: Board, turns: number): Player | null {
  if (turns < 2) return null;
  const red = countCells(board, "red");
  const blue = countCells(board, "blue");
  if (red === 0 && blue > 0) return "blue";
  if (blue === 0 && red > 0) return "red";
  return null;
}

function positionalValue(size: number, row: number, col: number) {
  return neighbors(size, row, col).length * 0.65;
}

function evaluate(board: Board, player: Player): number {
  const opponent = otherPlayer(player);
  let score = 0;
  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board.length; col += 1) {
      const cell = board[row][col];
      if (!cell.owner) continue;
      const sign = cell.owner === player ? 1 : -1;
      const critical = cell.count === capacity() - 1 ? 2.6 : 0;
      score += sign * (cell.count * 1.2 + positionalValue(board.length, row, col) + critical);
      if (cell.owner === player) {
        for (const near of neighbors(board.length, row, col)) {
          const adjacent = board[near.row][near.col];
          if (adjacent.owner === opponent && adjacent.count === capacity() - 1) score -= 1.6;
        }
      }
    }
  }
  return score;
}

function rankMoves(board: Board, player: Player, hasPlaced = true): { move: Point; score: number }[] {
  return legalMoves(board, player, hasPlaced)
    .map((move) => {
      const result = resolveMove(board, move.row, move.col, player);
      const tactical = result.exploded * 4.5 + result.captured * 6;
      return { move, score: evaluate(result.final, player) + tactical };
    })
    .sort((a, b) => b.score - a.score);
}

export function chooseAiMove(board: Board, difficulty: Difficulty, hasPlaced = true): Point {
  const ranked = rankMoves(board, "blue", hasPlaced);
  if (!ranked.length) return { row: 0, col: 0 };

  if (difficulty === "easy") {
    const pool = ranked.slice(0, Math.max(8, Math.ceil(ranked.length * 0.65)));
    return pool[Math.floor(Math.random() * pool.length)].move;
  }

  if (difficulty === "medium") {
    const pool = ranked.slice(0, Math.min(4, ranked.length));
    const roll = Math.random();
    return pool[roll < 0.68 ? 0 : Math.min(1 + Math.floor(Math.random() * 3), pool.length - 1)].move;
  }

  const candidates = ranked.slice(0, Math.min(8, ranked.length));
  const lookahead = candidates.map(({ move, score }) => {
    const afterBlue = resolveMove(board, move.row, move.col, "blue").final;
    const redReply = rankMoves(afterBlue, "red").slice(0, 8);
    const worstReply = redReply.length
      ? Math.max(...redReply.map(({ move: reply }) => evaluate(resolveMove(afterBlue, reply.row, reply.col, "red").final, "red")))
      : 0;
    return { move, score: score - worstReply * 0.68 };
  }).sort((a, b) => b.score - a.score);

  // A little imperfection keeps the strongest mode challenging without becoming clinical.
  const pick = Math.random() < 0.82 ? 0 : Math.min(1 + Math.floor(Math.random() * 2), lookahead.length - 1);
  return lookahead[pick].move;
}
