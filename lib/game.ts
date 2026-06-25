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

export function getValidMoves(board: Board, player: Player, hasPlaced = true): Point[] {
  return legalMoves(board, player, hasPlaced);
}

export function simulateMove(board: Board, move: Point, player: Player): MoveResult {
  return resolveMove(board, move.row, move.col, player);
}

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function positionValue(size: number, row: number, col: number) {
  const edgeCount = Number(row === 0 || row === size - 1) + Number(col === 0 || col === size - 1);
  return edgeCount === 2 ? 2.2 : edgeCount === 1 ? 1.15 : 0;
}

function adjacentCells(board: Board, row: number, col: number): Cell[] {
  return neighbors(board.length, row, col).map((point) => board[point.row][point.col]);
}

function adjacentOwned(board: Board, row: number, col: number, player: Player) {
  return adjacentCells(board, row, col).filter((cell) => cell.owner === player);
}

function adjacentCritical(board: Board, row: number, col: number, player: Player) {
  return adjacentOwned(board, row, col, player).filter((cell) => cell.count >= capacity() - 1).length;
}

function adjacentPressure(board: Board, row: number, col: number, player: Player) {
  return adjacentOwned(board, row, col, player).reduce((score, cell) => score + cell.count, 0);
}

export function evaluateBoard(board: Board, aiPlayer: Player, humanPlayer = otherPlayer(aiPlayer)): number {
  let score = 0;

  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board.length; col += 1) {
      const cell = board[row][col];
      if (!cell.owner) continue;

      const sign = cell.owner === aiPlayer ? 1 : -1;
      const criticalBonus = cell.count >= capacity() - 1 ? 5.2 : 0;
      const ownedNeighbors = adjacentOwned(board, row, col, cell.owner).length;
      const enemyCritical = adjacentCritical(board, row, col, otherPlayer(cell.owner));

      score += sign * (
        9 +
        cell.count * 2.4 +
        criticalBonus +
        positionValue(board.length, row, col) +
        ownedNeighbors * 0.55 -
        enemyCritical * 4.4
      );
    }
  }

  score += (countCells(board, aiPlayer) - countCells(board, humanPlayer)) * 5.5;
  score += (countOrbs(board, aiPlayer) - countOrbs(board, humanPlayer)) * 1.6;
  return score;
}

function immediateTacticalValue(board: Board, move: Point, player: Player, result: MoveResult) {
  const opponent = otherPlayer(player);
  const beforeCell = board[move.row][move.col];
  const nearOpponentPressure = adjacentPressure(board, move.row, move.col, opponent);
  const nearOpponentCritical = adjacentCritical(board, move.row, move.col, opponent);
  const nearOwnCritical = adjacentCritical(board, move.row, move.col, player);
  const reinforcement = beforeCell.owner === player ? beforeCell.count * 2.8 : 0;
  const triggerBonus = result.exploded > 0 ? 18 + result.exploded * 7 : 0;

  return (
    triggerBonus +
    result.captured * 15 +
    nearOwnCritical * 4.5 +
    nearOpponentPressure * 1.2 +
    reinforcement +
    positionValue(board.length, move.row, move.col) -
    nearOpponentCritical * 8
  );
}

function opponentReplyThreat(board: Board, opponent: Player) {
  const replies = getValidMoves(board, opponent, true);
  if (!replies.length) return 0;

  return Math.max(...replies.map((reply) => {
    const result = simulateMove(board, reply, opponent);
    const player = otherPlayer(opponent);
    const elimination = countCells(result.final, player) === 0 && countCells(result.final, opponent) > 0 ? 240 : 0;
    return result.exploded * 12 + result.captured * 18 + evaluateBoard(result.final, opponent, player) * 0.38 + elimination;
  }));
}

export function wouldBeDangerousMove(board: Board, move: Point, player: Player) {
  const result = simulateMove(board, move, player);
  const opponent = otherPlayer(player);
  const replyThreat = opponentReplyThreat(result.final, opponent);
  const lostControl = countCells(result.final, player) < countCells(board, player);
  return replyThreat > 58 || lostControl;
}

export function scoreMove(board: Board, move: Point, difficulty: Difficulty, player: Player = "blue") {
  const opponent = otherPlayer(player);
  const result = simulateMove(board, move, player);
  const boardGain = evaluateBoard(result.final, player, opponent) - evaluateBoard(board, player, opponent);
  const tactical = immediateTacticalValue(board, move, player, result);
  const replyThreat = opponentReplyThreat(result.final, opponent);
  const winNow = countCells(result.final, opponent) === 0 && countCells(result.final, player) > 0 ? 420 : 0;

  if (difficulty === "medium") {
    // Medium plays a one-ply heuristic: improve control, pressure weak enemy cells, and avoid obvious replies.
    return boardGain * 0.85 + tactical - replyThreat * 0.42 + winNow;
  }

  if (difficulty === "hard") {
    // Hard simulates the move and then prices in the opponent's strongest visible reply.
    const ownCritical = result.final.flat().filter((cell) => cell.owner === player && cell.count >= capacity() - 1).length;
    const enemyCritical = result.final.flat().filter((cell) => cell.owner === opponent && cell.count >= capacity() - 1).length;
    return boardGain * 1.2 + tactical * 1.15 + ownCritical * 4 - enemyCritical * 5 - replyThreat * 0.78 + winNow;
  }

  return boardGain * 0.35 + tactical * 0.25 - replyThreat * 0.15;
}

function rankedMoves(board: Board, player: Player, hasPlaced: boolean, difficulty: Difficulty): { move: Point; score: number }[] {
  return getValidMoves(board, player, hasPlaced)
    .map((move) => ({ move, score: scoreMove(board, move, difficulty, player) }))
    .sort((a, b) => b.score - a.score);
}

function chooseEasyMove(board: Board, player: Player, hasPlaced: boolean): Point {
  const moves = getValidMoves(board, player, hasPlaced);
  if (!moves.length) return { row: 0, col: 0 };

  if (!hasPlaced) return randomItem(moves);

  const safeMoves = moves.filter((move) => !wouldBeDangerousMove(board, move, player));
  return randomItem(safeMoves.length ? safeMoves : moves);
}

function chooseMediumMove(board: Board, player: Player, hasPlaced: boolean): Point {
  const ranked = rankedMoves(board, player, hasPlaced, "medium");
  if (!ranked.length) return { row: 0, col: 0 };

  const pool = ranked.slice(0, Math.min(5, ranked.length));
  return Math.random() < 0.74 ? pool[0].move : randomItem(pool).move;
}

function chooseHardMove(board: Board, player: Player, hasPlaced: boolean): Point {
  const ranked = rankedMoves(board, player, hasPlaced, "hard");
  if (!ranked.length) return { row: 0, col: 0 };

  const pool = ranked.slice(0, Math.min(3, ranked.length));
  return Math.random() < 0.88 ? pool[0].move : randomItem(pool).move;
}

export function chooseAiMove(board: Board, difficulty: Difficulty, hasPlaced = true): Point {
  if (difficulty === "easy") return chooseEasyMove(board, "blue", hasPlaced);
  if (difficulty === "medium") return chooseMediumMove(board, "blue", hasPlaced);
  return chooseHardMove(board, "blue", hasPlaced);
}
