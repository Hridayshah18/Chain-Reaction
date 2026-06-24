"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Board, Player, Point, ReactionFrame, capacity, isLegal } from "@/lib/game";

type Palette = { red: string; redGlow: string; blue: string; blueGlow: string };

type Props = {
  board: Board;
  currentPlayer: Player;
  effects: ReactionFrame | null;
  disabled: boolean;
  reduceMotion: boolean;
  colorblind: boolean;
  hasPlaced: boolean;
  aiSelection: Point | null;
  chainSize: number;
  onCellClick: (row: number, col: number) => void;
};

const palettes: Record<"standard" | "colorblind", Palette> = {
  standard: { red: "#ff4d67", redGlow: "rgba(255,61,91,.72)", blue: "#3d8bff", blueGlow: "rgba(47,126,255,.72)" },
  colorblind: { red: "#ffb000", redGlow: "rgba(255,176,0,.72)", blue: "#13c9e8", blueGlow: "rgba(19,201,232,.72)" },
};

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const easeOut = (value: number) => 1 - Math.pow(1 - value, 3);
const easeInOut = (value: number) => value < .5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;

export default function GameBoard({ board, currentPlayer, effects, disabled, reduceMotion, colorblind, hasPlaced, aiSelection, chainSize, onCellClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<Point | null>(null);
  const [size, setSize] = useState(720);
  const animationStart = useRef(performance.now());
  const boardSize = board.length;

  useEffect(() => {
    const element = wrapRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setSize(Math.floor(entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => { animationStart.current = performance.now(); }, [effects, aiSelection]);

  const getCell = useCallback((event: React.PointerEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      col: Math.min(boardSize - 1, Math.max(0, Math.floor(((event.clientX - rect.left) / rect.width) * boardSize))),
      row: Math.min(boardSize - 1, Math.max(0, Math.floor(((event.clientY - rect.top) / rect.height) * boardSize))),
    };
  }, [boardSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size <= 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const palette = palettes[colorblind ? "colorblind" : "standard"];
    let raf = 0;

    const timelineScale = reduceMotion ? .72 : 1;
    const overloadEnd = 150 * timelineScale;
    const burstEnd = 250 * timelineScale;
    const travelEnd = 550 * timelineScale;
    const impactEnd = 750 * timelineScale;

    const drawOrb = (x: number, y: number, radius: number, owner: Player, pulse = 0, alpha = 1) => {
      const color = palette[owner];
      const glow = owner === "red" ? palette.redGlow : palette.blueGlow;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowBlur = 14 + pulse * 14;
      ctx.shadowColor = glow;
      const gradient = ctx.createRadialGradient(x - radius * .35, y - radius * .4, 1, x, y, radius * 1.2);
      gradient.addColorStop(0, "#ffffff");
      gradient.addColorStop(.18, color);
      gradient.addColorStop(1, owner === "red" ? "#8f102c" : "#0c3e9b");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      if (colorblind && owner === "red") {
        ctx.moveTo(x, y - radius); ctx.lineTo(x + radius, y); ctx.lineTo(x, y + radius); ctx.lineTo(x - radius, y); ctx.closePath();
      } else ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.55)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    };

    const orbOffsets = (count: number): number[][] => count === 1
      ? [[0, 0]]
      : count === 2
        ? [[-.18, 0], [.18, 0]]
        : count === 3
          ? [[0, -.18], [-.2, .16], [.2, .16]]
          : [[-.17, -.17], [.17, -.17], [-.17, .17], [.17, .17]];

    const draw = (now: number) => {
      ctx.clearRect(0, 0, size, size);
      const cellSize = size / boardSize;
      const gap = Math.max(3, size * .006);
      const elapsed = now - animationStart.current;
      const pulse = reduceMotion ? .35 : (Math.sin(now / 190) + 1) / 2;
      const burstPhase = clamp((elapsed - overloadEnd) / Math.max(1, burstEnd - overloadEnd));
      const travelPhase = clamp((elapsed - burstEnd) / Math.max(1, travelEnd - burstEnd));
      const impactPhase = clamp((elapsed - travelEnd) / Math.max(1, impactEnd - travelEnd));
      const attackColor = palette[currentPlayer];
      const attackGlow = currentPlayer === "red" ? palette.redGlow : palette.blueGlow;

      for (let row = 0; row < boardSize; row += 1) {
        for (let col = 0; col < boardSize; col += 1) {
          const x = col * cellSize + gap / 2;
          const y = row * cellSize + gap / 2;
          const w = cellSize - gap;
          const beforeCell = effects?.before[row][col] ?? board[row][col];
          const afterCell = effects?.after[row][col] ?? board[row][col];
          const source = Boolean(effects?.sources.some((point) => point.row === row && point.col === col));
          const impactTarget = Boolean(effects?.trails.some((trail) => !trail.lost && trail.to.row === row && trail.to.col === col));
          const captured = Boolean(effects?.captured.some((point) => point.row === row && point.col === col));
          const selected = aiSelection?.row === row && aiSelection.col === col;
          const legalHover = hover?.row === row && hover.col === col && isLegal(board, row, col, currentPlayer, hasPlaced) && !disabled;
          const revealAfter = impactTarget && impactPhase > .42;
          const cell = revealAfter ? afterCell : beforeCell;
          const critical = cell.owner && cell.count === capacity() - 1;
          const shake = critical && !reduceMotion ? Math.sin(now / 32 + row * 2 + col) * .8 : 0;

          ctx.save();
          if (source || selected || (captured && impactPhase > 0)) {
            ctx.shadowBlur = selected ? 38 + pulse * 12 : 30;
            ctx.shadowColor = attackGlow;
          }
          ctx.beginPath();
          ctx.roundRect(x + shake, y, w, w, Math.max(7, size * .014));
          const bg = ctx.createLinearGradient(x, y, x + w, y + w);
          bg.addColorStop(0, legalHover || selected ? "rgba(255,255,255,.11)" : "rgba(255,255,255,.056)");
          bg.addColorStop(1, beforeCell.owner === "red" ? "rgba(255,61,91,.075)" : beforeCell.owner === "blue" ? "rgba(47,126,255,.075)" : "rgba(7,11,24,.5)");
          ctx.fillStyle = bg;
          ctx.fill();
          if (impactTarget && impactPhase > 0) {
            ctx.globalAlpha = easeOut(impactPhase) * .22;
            ctx.fillStyle = attackColor;
            ctx.fill();
            ctx.globalAlpha = 1;
          }
          ctx.strokeStyle = source || selected
            ? attackColor
            : critical
              ? (cell.owner === "red" ? palette.red : palette.blue)
              : legalHover ? "rgba(255,255,255,.25)" : "rgba(255,255,255,.09)";
          ctx.lineWidth = source || selected || critical ? 2 : 1;
          ctx.stroke();
          ctx.restore();

          if (!cell.owner || cell.count === 0) continue;
          const cx = x + w / 2 + shake;
          const cy = y + w / 2;
          const orbRadius = Math.max(4.5, cellSize * .102);
          const hideExploded = source && elapsed >= burstEnd && !revealAfter;
          if (!hideExploded) {
            const burstScale = source ? 1 + easeOut(burstPhase) * .42 : revealAfter ? .72 + easeOut((impactPhase - .42) / .58) * .28 : 1;
            const burstAlpha = source && burstPhase > 0 ? 1 - burstPhase : 1;
            orbOffsets(cell.count).forEach(([ox, oy]) => drawOrb(cx + ox * cellSize * burstScale, cy + oy * cellSize * burstScale, orbRadius * burstScale, cell.owner!, critical ? pulse : impactTarget ? 1 - impactPhase : 0, burstAlpha));
          }

          if (critical) {
            ctx.save();
            ctx.strokeStyle = cell.owner === "red" ? palette.redGlow : palette.blueGlow;
            ctx.globalAlpha = .3 + pulse * .58;
            ctx.lineWidth = 1.5;
            for (let arc = 0; arc < 3; arc += 1) {
              ctx.beginPath();
              ctx.arc(cx, cy, w * (.31 + arc * .04 + pulse * .025), now / 520 + arc * 2, now / 520 + arc * 2 + .7);
              ctx.stroke();
            }
            ctx.restore();
          }

          if (selected) {
            ctx.save();
            ctx.strokeStyle = attackColor;
            ctx.globalAlpha = .35 + pulse * .55;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, w * (.34 + pulse * .08), 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }

          if (impactTarget && impactPhase > 0) {
            ctx.save();
            ctx.strokeStyle = attackColor;
            ctx.globalAlpha = 1 - impactPhase;
            ctx.lineWidth = 2.5;
            ctx.shadowBlur = 18;
            ctx.shadowColor = attackGlow;
            ctx.beginPath();
            ctx.arc(cx, cy, cellSize * (.12 + easeOut(impactPhase) * .45), 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      if (effects) {
        if (burstPhase > 0 && burstPhase < 1) {
          effects.sources.forEach((source, sourceIndex) => {
            const cx = (source.col + .5) * cellSize;
            const cy = (source.row + .5) * cellSize;
            ctx.save();
            ctx.strokeStyle = attackColor;
            ctx.globalAlpha = 1 - burstPhase;
            ctx.lineWidth = 3 + Math.min(chainSize, 15) * .08;
            ctx.shadowBlur = 25 + Math.min(chainSize, 15);
            ctx.shadowColor = attackGlow;
            ctx.beginPath();
            ctx.arc(cx, cy, cellSize * (.12 + easeOut(burstPhase) * .58), 0, Math.PI * 2);
            ctx.stroke();
            const particles = chainSize >= 15 ? 20 : chainSize >= 5 ? 13 : 8;
            for (let index = 0; index < particles; index += 1) {
              const angle = (index / particles) * Math.PI * 2 + sourceIndex * .37;
              const distance = cellSize * easeOut(burstPhase) * (.2 + (index % 4) * .08);
              ctx.fillStyle = index % 3 === 0 ? "#fff" : attackColor;
              ctx.globalAlpha = 1 - burstPhase;
              ctx.beginPath();
              ctx.arc(cx + Math.cos(angle) * distance, cy + Math.sin(angle) * distance, 1.2 + (index % 2), 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();
          });
        }

        if (travelPhase > 0 && travelPhase < 1) {
          const progress = easeInOut(travelPhase);
          effects.trails.forEach((trail) => {
            const fromX = (trail.from.col + .5) * cellSize;
            const fromY = (trail.from.row + .5) * cellSize;
            const toX = (trail.to.col + .5) * cellSize;
            const toY = (trail.to.row + .5) * cellSize;
            const x = fromX + (toX - fromX) * progress;
            const y = fromY + (toY - fromY) * progress;
            const tailProgress = Math.max(0, progress - .24);
            const tailX = fromX + (toX - fromX) * tailProgress;
            const tailY = fromY + (toY - fromY) * tailProgress;
            ctx.save();
            const trailGradient = ctx.createLinearGradient(tailX, tailY, x, y);
            trailGradient.addColorStop(0, "rgba(255,255,255,0)");
            trailGradient.addColorStop(.55, attackColor);
            trailGradient.addColorStop(1, "#fff");
            ctx.strokeStyle = trailGradient;
            ctx.lineWidth = Math.max(2, size * .0055);
            ctx.shadowBlur = 18;
            ctx.shadowColor = attackColor;
            ctx.beginPath();
            ctx.moveTo(tailX, tailY);
            ctx.lineTo(x, y);
            ctx.stroke();
            drawOrb(x, y, Math.max(4, cellSize * .09), currentPlayer, 1);
            ctx.restore();
          });
        }

        if (chainSize >= 10 && elapsed > overloadEnd && elapsed < impactEnd) {
          const bloom = chainSize >= 15 ? .14 : .07;
          ctx.save();
          ctx.fillStyle = attackColor;
          ctx.globalAlpha = bloom * Math.sin(clamp(elapsed / impactEnd) * Math.PI);
          ctx.fillRect(0, 0, size, size);
          ctx.restore();
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [aiSelection, board, boardSize, chainSize, colorblind, currentPlayer, disabled, effects, hasPlaced, hover, reduceMotion, size]);

  return (
    <div ref={wrapRef} className="board-wrap" aria-label={`${boardSize} by ${boardSize} Chain Kingdom game board`}>
      <canvas
        ref={canvasRef}
        className={disabled ? "board-canvas disabled" : "board-canvas"}
        onPointerMove={(event) => setHover(getCell(event))}
        onPointerLeave={() => setHover(null)}
        onClick={(event) => {
          if (disabled) return;
          const { row, col } = getCell(event);
          if (isLegal(board, row, col, currentPlayer, hasPlaced)) onCellClick(row, col);
        }}
      />
      <div className="sr-only" role="grid" aria-label="Playable cells">
        {board.map((row, rowIndex) => row.map((cell, colIndex) => (
          <button
            role="gridcell"
            key={`${rowIndex}-${colIndex}`}
            disabled={disabled || !isLegal(board, rowIndex, colIndex, currentPlayer, hasPlaced)}
            aria-label={`Row ${rowIndex + 1}, column ${colIndex + 1}, ${cell.owner ? `${cell.owner}, ${cell.count} atoms` : "neutral"}`}
            onClick={() => onCellClick(rowIndex, colIndex)}
          />
        )))}
      </div>
    </div>
  );
}
