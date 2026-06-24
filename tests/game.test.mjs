import assert from "node:assert/strict";
import {
  capacity,
  chooseAiMove,
  createBoard,
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

console.log("Game rules verified: capacities, cascades, captures, and AI legality.");
