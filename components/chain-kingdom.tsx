"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import GameBoard from "./game-board";
import {
  Board,
  Difficulty,
  Player,
  Point,
  ReactionFrame,
  chooseAiMove,
  countCells,
  createBoard,
  isLegal,
  otherPlayer,
  resolveMove,
  winnerFor,
} from "@/lib/game";

type Screen = "home" | "mode" | "difficulty" | "board" | "game";
type GameMode = "local" | "ai";

const playerName = (player: Player) => (player === "red" ? "Crimson" : "Azure");
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function Icon({ name, size = 18 }: { name: "spark" | "users" | "cpu" | "arrow" | "gear" | "refresh" | "sound" | "motion" | "eye" | "close"; size?: number }) {
  const paths: Record<typeof name, React.ReactNode> = {
    spark: <><path d="M12 2l1.3 5.7L19 9l-5.7 1.3L12 16l-1.3-5.7L5 9l5.7-1.3L12 2z"/><path d="M5 16l.7 2.3L8 19l-2.3.7L5 22l-.7-2.3L2 19l2.3-.7L5 16z"/></>,
    users: <><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></>,
    cpu: <><rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9 9h6v6H9zM9 1v4M15 1v4M9 19v4M15 19v4M1 9h4M19 9h4M1 15h4M19 15h4"/></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    gear: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 00-1.88-.34 1.7 1.7 0 00-1 1.55V21h-4v-.08a1.7 1.7 0 00-1-1.55 1.7 1.7 0 00-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 004.6 15a1.7 1.7 0 00-1.55-1H3v-4h.08a1.7 1.7 0 001.55-1 1.7 1.7 0 00-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 009 4.6a1.7 1.7 0 001-1.55V3h4v.08a1.7 1.7 0 001 1.55 1.7 1.7 0 001.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0019.4 9a1.7 1.7 0 001.55 1H21v4h-.08a1.7 1.7 0 00-1.52 1z"/></>,
    refresh: <><path d="M20 11a8.1 8.1 0 00-15.5-2M4 4v5h5M4 13a8.1 8.1 0 0015.5 2M20 20v-5h-5"/></>,
    sound: <><path d="M11 5L6 9H2v6h4l5 4V5zM15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13"/></>,
    motion: <><path d="M3 12h4l2-7 4 14 2-7h6"/></>,
    eye: <><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></>,
    close: <><path d="M18 6L6 18M6 6l12 12"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{paths[name]}</svg>;
}

function Brand({ small = false }: { small?: boolean }) {
  return (
    <div className={small ? "brand brand-small" : "brand"}>
      <div className="brand-mark"><span/><i/><b/></div>
      <span>CHAIN <strong>KINGDOM</strong></span>
    </div>
  );
}

function Background() {
  return <div className="atmosphere" aria-hidden><div className="aura aura-red"/><div className="aura aura-blue"/><div className="grid-plane"/><div className="noise"/></div>;
}

function ScreenTransition({ children, keyName }: { children: React.ReactNode; keyName: string }) {
  return (
    <motion.div
      key={keyName}
      initial={{ opacity: 0, y: 14, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.99 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      className="screen-layer"
    >{children}</motion.div>
  );
}

export default function ChainKingdom() {
  const [screen, setScreen] = useState<Screen>("home");
  const [mode, setMode] = useState<GameMode>("local");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [boardSize, setBoardSize] = useState(7);
  const [board, setBoard] = useState<Board>(() => createBoard(7));
  const [player, setPlayer] = useState<Player>("red");
  const [hasPlaced, setHasPlaced] = useState<Record<Player, boolean>>({ red: false, blue: false });
  const [turns, setTurns] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [largestChain, setLargestChain] = useState(0);
  const [effects, setEffects] = useState<ReactionFrame | null>(null);
  const [chainSize, setChainSize] = useState(0);
  const [aiSelection, setAiSelection] = useState<Point | null>(null);
  const [animating, setAnimating] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [turnBanner, setTurnBanner] = useState<{ label: string; player: Player } | null>(null);
  const [winner, setWinner] = useState<Player | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sound, setSound] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [colorblind, setColorblind] = useState(false);
  const audioContext = useRef<AudioContext | null>(null);
  const gameId = useRef(0);

  useEffect(() => {
    const saved = Number(window.localStorage.getItem("chain-kingdom-board-size"));
    if ([6, 7, 8].includes(saved)) setBoardSize(saved);
  }, []);

  const playTone = useCallback((kind: "place" | "burst" | "win", intensity = 1) => {
    if (!sound || typeof window === "undefined") return;
    try {
      const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = audioContext.current || new AudioCtor();
      audioContext.current = ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      osc.type = kind === "burst" ? "triangle" : "sine";
      osc.frequency.setValueAtTime(kind === "place" ? 210 : kind === "burst" ? 115 + intensity * 8 : 330, now);
      if (kind === "win") osc.frequency.exponentialRampToValueAtTime(660, now + 0.42);
      if (kind === "burst") osc.frequency.exponentialRampToValueAtTime(70, now + 0.16);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(kind === "place" ? 0.035 : 0.06, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === "win" ? 0.55 : 0.2));
      osc.start(now);
      osc.stop(now + (kind === "win" ? 0.56 : 0.21));
    } catch { /* Audio remains an optional enhancement. */ }
  }, [sound]);

  useEffect(() => {
    if (screen !== "game" || winner) return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [screen, winner]);

  const presentTurnBanner = useCallback(async (label: string, bannerPlayer: Player, id: number, delay = 0) => {
    setTransitioning(true);
    if (delay) await sleep(delay);
    if (id !== gameId.current) return;
    setTurnBanner({ label, player: bannerPlayer });
    await sleep(800);
    if (id !== gameId.current) return;
    setTurnBanner(null);
    setTransitioning(false);
  }, []);

  const startGame = useCallback((selectedMode: GameMode, selectedDifficulty = difficulty, selectedSize = boardSize) => {
    gameId.current += 1;
    const id = gameId.current;
    setMode(selectedMode);
    setDifficulty(selectedDifficulty);
    setBoardSize(selectedSize);
    window.localStorage.setItem("chain-kingdom-board-size", String(selectedSize));
    setBoard(createBoard(selectedSize));
    setPlayer("red");
    setHasPlaced({ red: false, blue: false });
    setTurns(0);
    setSeconds(0);
    setLargestChain(0);
    setEffects(null);
    setChainSize(0);
    setAiSelection(null);
    setAnimating(false);
    setThinking(false);
    setTransitioning(true);
    setTurnBanner(null);
    setWinner(null);
    setScreen("game");
    window.setTimeout(() => void presentTurnBanner("PLAYER 1 TURN", "red", id), 120);
  }, [boardSize, difficulty, presentTurnBanner]);

  const finishTurn = useCallback(async (row: number, col: number, movingPlayer: Player) => {
    if (animating || transitioning || winner || !isLegal(board, row, col, movingPlayer, hasPlaced[movingPlayer])) return;
    const thisGame = gameId.current;
    setAnimating(true);
    playTone("place");
    const result = resolveMove(board, row, col, movingPlayer);
    setHasPlaced((current) => ({ ...current, [movingPlayer]: true }));
    setBoard(result.placed);
    setChainSize(result.exploded);
    setLargestChain((current) => Math.max(current, result.exploded));

    const frameDelay = reduceMotion ? 590 : result.exploded >= 10 ? 940 : 850;
    for (const frame of result.frames) {
      if (thisGame !== gameId.current) return;
      setEffects(frame);
      playTone("burst", frame.sources.length);
      await sleep(frameDelay);
      setBoard(frame.after);
    }
    setEffects(null);
    setBoard(result.final);
    setChainSize(0);
    const nextTurns = turns + 1;
    setTurns(nextTurns);
    const resultWinner = winnerFor(result.final, nextTurns);
    if (resultWinner) {
      setWinner(resultWinner);
      playTone("win");
      setAnimating(false);
      return;
    }
    const nextPlayer = otherPlayer(movingPlayer);
    setPlayer(nextPlayer);
    setAnimating(false);
    const bannerLabel = mode === "ai" && nextPlayer === "blue"
      ? "AI TURN"
      : mode === "ai"
        ? "YOUR TURN"
        : nextPlayer === "red" ? "PLAYER 1 TURN" : "PLAYER 2 TURN";
    await presentTurnBanner(bannerLabel, nextPlayer, thisGame, mode === "ai" && movingPlayer === "blue" ? 800 : 0);
  }, [animating, board, hasPlaced, mode, playTone, presentTurnBanner, reduceMotion, transitioning, turns, winner]);

  useEffect(() => {
    if (screen !== "game" || mode !== "ai" || player !== "blue" || animating || transitioning || winner || thinking) return;
    const thisGame = gameId.current;
    setThinking(true);
    let selectTimeout = 0;
    const timeout = window.setTimeout(() => {
      if (thisGame !== gameId.current) return;
      const move = chooseAiMove(board, difficulty, hasPlaced.blue);
      setThinking(false);
      setAiSelection(move);
      selectTimeout = window.setTimeout(() => {
        if (thisGame !== gameId.current) return;
        setAiSelection(null);
        void finishTurn(move.row, move.col, "blue");
      }, reduceMotion ? 300 : 500);
    }, reduceMotion ? 360 : 600);
    return () => { window.clearTimeout(timeout); window.clearTimeout(selectTimeout); };
  }, [animating, board, difficulty, finishTurn, hasPlaced.blue, mode, player, reduceMotion, screen, transitioning, winner]);

  const time = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const totalOwned = countCells(board, "red") + countCells(board, "blue");
  const winnerControl = winner ? Math.round((countCells(board, winner) / Math.max(1, totalOwned)) * 100) : 0;
  const currentLabel = mode === "ai" && player === "blue" ? "Neural AI" : `${playerName(player)} Player`;

  const settings = (
    <AnimatePresence>
      {settingsOpen && (
        <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSettingsOpen(false)}>
          <motion.div className="settings-card" initial={{ opacity: 0, y: 20, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: .98 }} onClick={(event) => event.stopPropagation()}>
            <div className="modal-heading"><div><span className="eyebrow">PREFERENCES</span><h2>Experience settings</h2></div><button className="icon-button" onClick={() => setSettingsOpen(false)} aria-label="Close settings"><Icon name="close"/></button></div>
            <SettingRow icon="sound" title="Adaptive sound" detail="Subtle reactions and spatial energy cues" value={sound} onChange={setSound}/>
            <SettingRow icon="motion" title="Reduced motion" detail="Shortens chain-reaction animation timing" value={reduceMotion} onChange={setReduceMotion}/>
            <SettingRow icon="eye" title="Color-safe symbols" detail="Amber diamonds versus cyan circles" value={colorblind} onChange={setColorblind}/>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <main className={`app-shell ${colorblind ? "colorblind" : ""}`}>
      <Background />
      <AnimatePresence mode="wait">
        {screen === "home" && (
          <ScreenTransition keyName="home">
            <section className="landing">
              <header className="landing-nav"><Brand/><button className="ghost-button" onClick={() => setSettingsOpen(true)}><Icon name="gear"/><span>Settings</span></button></header>
              <div className="hero-content">
                <motion.div className="hero-orbit" initial={{ scale: .8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: .18, duration: .8 }} aria-hidden>
                  <div className="orbit-ring ring-one"/><div className="orbit-ring ring-two"/><div className="hero-core red-core"/><div className="hero-core blue-core"/><div className="core-flare"/>
                </motion.div>
                <div className="hero-copy">
                  <motion.div className="status-pill" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .1 }}><span/> STRATEGY, AMPLIFIED</motion.div>
                  <h1>Build the pressure.<br/><em>Own the chain.</em></h1>
                  <p>A quiet game of territory that turns electric in a single move. Place energy cores, engineer cascading reactions, and outthink your opponent.</p>
                  <div className="hero-actions">
                    <button className="primary-button" onClick={() => setScreen("mode")}><span>Enter the kingdom</span><Icon name="arrow"/></button>
                    <div className="micro-proof"><div className="mini-cells"><i/><i/><i/></div><span>Three tactical arena scales</span></div>
                  </div>
                </div>
              </div>
              <footer className="landing-footer"><span>TACTICAL · TURN-BASED · ZERO LUCK</span><div className="scroll-cue"><i/> DISCOVER</div></footer>
            </section>
          </ScreenTransition>
        )}

        {screen === "mode" && (
          <ScreenTransition keyName="mode">
            <section className="selection-screen">
              <header className="simple-nav"><Brand small/><button className="ghost-button" onClick={() => setScreen("home")}>Back</button></header>
              <div className="selection-content">
                <div className="step-label"><span>01</span><i/><span>CHOOSE YOUR ARENA</span></div>
                <h1>How will you play?</h1>
                <p className="selection-lead">Every match is a contest of timing, pressure, and nerve.</p>
                <div className="mode-grid">
                  <button className="mode-card red-mode" onClick={() => { setMode("local"); setScreen("board"); }}>
                    <span className="mode-icon"><Icon name="users" size={25}/></span>
                    <div className="mode-card-copy"><span className="card-kicker">SHARED ARENA</span><h2>Two players</h2><p>Face a friend on the same device. Take turns and settle the kingdom between you.</p></div>
                    <div className="mode-meta"><span>CRIMSON</span><b>VS</b><span>AZURE</span></div>
                    <span className="card-arrow"><Icon name="arrow"/></span>
                  </button>
                  <button className="mode-card blue-mode" onClick={() => setScreen("difficulty")}>
                    <span className="mode-icon"><Icon name="cpu" size={25}/></span>
                    <div className="mode-card-copy"><span className="card-kicker">NEURAL OPPONENT</span><h2>Challenge the AI</h2><p>Test your pattern recognition against an opponent that adapts to the board.</p></div>
                    <div className="mode-meta"><span>3 DIFFICULTIES</span><b>·</b><span>YOUR PACE</span></div>
                    <span className="card-arrow"><Icon name="arrow"/></span>
                  </button>
                </div>
              </div>
              <div className="selection-tip"><Icon name="spark"/><span><b>The first law:</b> every cell reacts when its fourth atom arrives.</span></div>
            </section>
          </ScreenTransition>
        )}

        {screen === "difficulty" && (
          <ScreenTransition keyName="difficulty">
            <section className="selection-screen difficulty-screen">
              <header className="simple-nav"><Brand small/><button className="ghost-button" onClick={() => setScreen("mode")}>Back</button></header>
              <div className="selection-content difficulty-content">
                <div className="step-label"><span>02</span><i/><span>CALIBRATE OPPONENT</span></div>
                <h1>Choose your challenge.</h1>
                <p className="selection-lead">Each opponent sees the same board. What changes is how far ahead they look.</p>
                <div className="difficulty-grid">
                  {([
                    { id: "easy", number: "I", title: "Explorer", copy: "A forgiving opponent learning the shape of the board.", tags: ["AGES 8+", "RELAXED"] },
                    { id: "medium", number: "II", title: "Strategist", copy: "Reads chain reactions and applies pressure with purpose.", tags: ["BALANCED", "1–2 MOVES"] },
                    { id: "hard", number: "III", title: "Architect", copy: "Anticipates replies and fights for long-term control.", tags: ["ADVANCED", "ADAPTIVE"] },
                  ] as const).map((item) => (
                    <button key={item.id} className={`difficulty-card ${item.id === "medium" ? "featured" : ""}`} onClick={() => { setMode("ai"); setDifficulty(item.id); setScreen("board"); }}>
                      {item.id === "medium" && <span className="recommended">RECOMMENDED</span>}
                      <span className="difficulty-number">{item.number}</span><span className="difficulty-orb"/><h2>{item.title}</h2><p>{item.copy}</p>
                      <div className="tag-row">{item.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
                      <div className="select-line">Select opponent <Icon name="arrow"/></div>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </ScreenTransition>
        )}

        {screen === "board" && (
          <ScreenTransition keyName="board">
            <section className="selection-screen board-selection-screen">
              <header className="simple-nav"><Brand small/><button className="ghost-button" onClick={() => setScreen(mode === "ai" ? "difficulty" : "mode")}>Back</button></header>
              <div className="selection-content board-selection-content">
                <div className="step-label"><span>{mode === "ai" ? "03" : "02"}</span><i/><span>CHOOSE ARENA SCALE</span></div>
                <h1>Set the battlefield.</h1>
                <p className="selection-lead">Your preference is remembered for the next match.</p>
                <div className="board-size-grid">
                  {([
                    { size: 6, title: "Quick Match", detail: "Fast pressure. Sharp decisions.", time: "4–6 MIN" },
                    { size: 7, title: "Balanced Match", detail: "The ideal mix of space and tension.", time: "6–8 MIN" },
                    { size: 8, title: "Strategic Match", detail: "Long arcs and deeper territory play.", time: "8–10 MIN" },
                  ] as const).map((choice) => (
                    <button key={choice.size} className={`board-size-card ${boardSize === choice.size ? "selected" : ""}`} onClick={() => startGame(mode, difficulty, choice.size)}>
                      {choice.size === 7 && <span className="recommended">RECOMMENDED</span>}
                      <span className="size-visual" aria-hidden>{Array.from({ length: 9 }, (_, index) => <i key={index}/>)}</span>
                      <strong>{choice.size}<small>×</small>{choice.size}</strong>
                      <h2>{choice.title}</h2>
                      <p>{choice.detail}</p>
                      <span className="match-time">{choice.time}</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </ScreenTransition>
        )}

        {screen === "game" && (
          <ScreenTransition keyName="game">
            <section className={`game-screen turn-${player}`}>
              <header className="game-topbar">
                <Brand small/>
                <div className="match-stats">
                  <div><span>MOVE</span><b>{String(turns + 1).padStart(2, "0")}</b></div><i/><div><span>TIME</span><b>{time}</b></div>
                </div>
                <button className="icon-button" onClick={() => setSettingsOpen(true)} aria-label="Open settings"><Icon name="gear"/></button>
              </header>
              <div className="game-layout">
                <aside className="player-rail red-rail">
                  <div className={`player-node ${player === "red" && !winner ? "active" : ""}`}><span className="rail-orb"/><div><small>PLAYER ONE</small><strong>Crimson</strong></div><b>{countCells(board, "red")}</b></div>
                  <div className="control-track"><span style={{ height: `${Math.max(4, (countCells(board, "red") / (board.length * board.length)) * 100)}%` }}/></div>
                </aside>
                <div className="arena-column">
                  <div className="turn-display">
                    <div className="turn-copy"><span className="turn-pip"/><div><small>{thinking ? "CALCULATING PATH" : animating ? "REACTION IN PROGRESS" : "CURRENT TURN"}</small><strong>{thinking ? "Neural AI is thinking" : animating ? "Watch the chain" : currentLabel}</strong></div></div>
                    <span className="turn-hint">{animating ? "Atoms are in motion" : !hasPlaced[player] ? "Choose any neutral starting cell" : "Place only on your own cells"}</span>
                  </div>
                  <div className={`board-stage ${effects ? "reacting" : ""} ${chainSize >= 10 ? "major-chain" : ""} ${chainSize >= 15 ? "epic-chain" : ""}`}>
                    <div className="board-corner tl"/><div className="board-corner tr"/><div className="board-corner bl"/><div className="board-corner br"/>
                    <GameBoard board={board} currentPlayer={player} effects={effects} disabled={animating || thinking || transitioning || Boolean(winner) || (mode === "ai" && player === "blue")} reduceMotion={reduceMotion} colorblind={colorblind} hasPlaced={hasPlaced[player]} aiSelection={aiSelection} chainSize={chainSize} onCellClick={(row, col) => void finishTurn(row, col, player)}/>
                  </div>
                  <div className="mobile-players"><span><i className="red-dot"/>Crimson <b>{countCells(board, "red")}</b></span><span><i className="blue-dot"/>Azure <b>{countCells(board, "blue")}</b></span></div>
                  <div className="game-actions">
                    <button className="text-button" onClick={() => startGame(mode, difficulty, boardSize)}><Icon name="refresh"/> Restart match</button>
                    <span>CHAIN PEAK <b>{largestChain || "—"}</b></span>
                    <button className="text-button" onClick={() => { gameId.current += 1; setScreen("mode"); }}><Icon name="arrow"/> New game</button>
                  </div>
                </div>
                <aside className="player-rail blue-rail">
                  <div className={`player-node ${player === "blue" && !winner ? "active" : ""}`}><b>{countCells(board, "blue")}</b><div><small>{mode === "ai" ? `${difficulty.toUpperCase()} AI` : "PLAYER TWO"}</small><strong>Azure</strong></div><span className="rail-orb"/></div>
                  <div className="control-track"><span style={{ height: `${Math.max(4, (countCells(board, "blue") / (board.length * board.length)) * 100)}%` }}/></div>
                </aside>
              </div>
              <AnimatePresence>
                {turnBanner && (
                  <motion.div className={`turn-banner banner-${turnBanner.player}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <motion.i initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} exit={{ scaleX: 0 }} transition={{ duration: .35 }}/>
                    <motion.strong initial={{ opacity: 0, scale: .9, letterSpacing: ".34em" }} animate={{ opacity: 1, scale: 1, letterSpacing: ".22em" }} exit={{ opacity: 0, scale: 1.05 }} transition={{ duration: .4 }}>{turnBanner.label}</motion.strong>
                    <motion.i initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} exit={{ scaleX: 0 }} transition={{ duration: .35 }}/>
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {winner && (
                  <motion.div className="modal-backdrop victory-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <motion.div className={`victory-card winner-${winner}`} initial={{ y: 32, scale: .94, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} transition={{ type: "spring", damping: 22, stiffness: 220 }}>
                      <div className="victory-rings"><i/><i/><i/><span className="victory-core"/></div>
                      <span className="eyebrow">KINGDOM SECURED</span><h2>{playerName(winner)} prevails.</h2><p>One chain changed the shape of the entire arena.</p>
                      <div className="victory-stats"><div><span>TURNS</span><b>{turns}</b></div><div><span>LARGEST CHAIN</span><b>{largestChain}</b></div><div><span>CONTROL</span><b>{winnerControl}%</b></div></div>
                      <div className="victory-actions"><button className="primary-button" onClick={() => startGame(mode, difficulty, boardSize)}>Play again <Icon name="refresh"/></button><button className="ghost-button" onClick={() => { gameId.current += 1; setScreen("mode"); }}>Change mode</button></div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          </ScreenTransition>
        )}
      </AnimatePresence>
      {settings}
    </main>
  );
}

function SettingRow({ icon, title, detail, value, onChange }: { icon: "sound" | "motion" | "eye"; title: string; detail: string; value: boolean; onChange: (value: boolean) => void }) {
  return <button className="setting-row" onClick={() => onChange(!value)}><span className="setting-icon"><Icon name={icon}/></span><span className="setting-copy"><b>{title}</b><small>{detail}</small></span><span className={`toggle ${value ? "on" : ""}`}><i/></span></button>;
}
