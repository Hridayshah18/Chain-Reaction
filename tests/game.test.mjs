import assert from "node:assert/strict";
import {
  capacity,
  chooseAiMove,
  createBoard,
  scoreMove,
  isLegal,
  resolveMove,
} from "../lib/game.ts";

assert.equal(capacity(), 4, "every cell should react when its fourth atom arrives");
assert.equal(createBoard(6).length, 6, "quick matches should use a 6 by 6 board");
assert.equal(createBoard(8).length, 8, "strategic matches should use an 8 by 8 board");

const primedCorner = createBoard();
primedCorner[0][0] = { owner: "red", count: 3 };
const cornerReaction = resolveMove(primedCorner, 0, 0, "red");
assert.equal(cornerReaction.exploded, 1);
assert.deepEqual(cornerReaction.final[0][0], { owner: null, count: 0 });
assert.deepEqual(cornerReaction.final[0][1], { owner: "red", count: 1 });
assert.deepEqual(cornerReaction.final[1][0], { owner: "red", count: 1 });
assert.equal(cornerReaction.frames[0].trails.filter((trail) => trail.lost).length, 2, "two corner projectiles should visibly leave the board");

const captureBoard = createBoard();
captureBoard[0][0] = { owner: "red", count: 3 };
captureBoard[0][1] = { owner: "blue", count: 1 };
const captured = resolveMove(captureBoard, 0, 0, "red");
assert.deepEqual(captured.final[0][1], { owner: "red", count: 2 });
assert.equal(captured.captured, 1);
assert.equal(isLegal(captured.final, 0, 1, "blue", true), false);
assert.equal(isLegal(captured.final, 2, 2, "blue", true), false, "neutral cells lock after a player's opening placement");
assert.equal(isLegal(captured.final, 2, 2, "blue", false), true, "a player's opening placement may use any neutral cell");

for (const difficulty of ["easy", "medium", "hard"]) {
  const move = chooseAiMove(captured.final, difficulty, false);
  assert.equal(isLegal(captured.final, move.row, move.col, "blue", false), true, `${difficulty} AI must choose a legal opening move`);
}

const originalRandom = Math.random;
try {
  const openingBoard = createBoard();
  openingBoard[3][3] = { owner: "red", count: 1 };
  Math.random = () => 0.99;
  const easyOpening = chooseAiMove(openingBoard, "easy", false);
  assert.deepEqual(easyOpening, { row: 6, col: 6 }, "easy AI should choose varied neutral cells instead of always mirroring beside the player");
  assert.equal(isLegal(openingBoard, easyOpening.row, easyOpening.col, "blue", false), true);

  const captureChance = createBoard();
  captureChance[1][1] = { owner: "blue", count: 3 };
  captureChance[1][2] = { owner: "red", count: 2 };
  captureChance[5][5] = { owner: "blue", count: 1 };
  Math.random = () => 0;
  const hardAttack = chooseAiMove(captureChance, "hard", true);
  assert.deepEqual(hardAttack, { row: 1, col: 1 }, "hard AI should prefer a simulated beneficial chain reaction");
  assert.ok(
    scoreMove(captureChance, { row: 1, col: 1 }, "medium") > scoreMove(captureChance, { row: 5, col: 5 }, "medium"),
    "medium scoring should value pressure and captures over passive reinforcement",
  );

  const dangerBoard = createBoard();
  dangerBoard[0][0] = { owner: "blue", count: 1 };
  dangerBoard[3][3] = { owner: "blue", count: 1 };
  dangerBoard[3][4] = { owner: "red", count: 3 };
  const safeScore = scoreMove(dangerBoard, { row: 0, col: 0 }, "hard");
  const dangerousScore = scoreMove(dangerBoard, { row: 3, col: 3 }, "hard");
  assert.ok(safeScore > dangerousScore, "hard AI should penalize moves that give red an immediate strong reply");
  const hardSafe = chooseAiMove(dangerBoard, "hard", true);
  assert.deepEqual(hardSafe, { row: 0, col: 0 }, "hard AI should avoid blindly clustering next to a critical red cell");
} finally {
  Math.random = originalRandom;
}

console.log("Game rules verified: capacities, cascades, captures, AI legality, and AI strategy.");
