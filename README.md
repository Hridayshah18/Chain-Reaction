<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs" />
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=111" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-3-38B2AC?logo=tailwindcss&logoColor=white" />
  <img alt="Framer Motion" src="https://img.shields.io/badge/Framer_Motion-12-0055FF?logo=framer&logoColor=white" />
  <img alt="Canvas API" src="https://img.shields.io/badge/Canvas_API-Rendering-f7df1e" />
</p>

# ⚛️ Chain Reaction

**A polished turn-based chain-reaction strategy game built with Next.js, React, TypeScript, Canvas, Tailwind CSS, and Framer Motion.**

> *Build pressure, trigger cascades, and win the board one reaction at a time.*

Chain Reaction is a browser strategy game where players place energy cores onto a square arena and compete for territory. Each cell can hold up to three atoms before the fourth atom triggers a reaction, sending energy to neighboring cells, capturing enemy territory, and potentially starting larger cascades. The project includes local two-player play, an AI opponent with selectable difficulty, animated canvas rendering, optional sound, accessibility-minded settings, and automated rule tests for the core game logic.

The current source is a Next.js app, not a static `index.html` project. Next.js generates the browser HTML at runtime/build time from the React app entry in `app/page.tsx`.

---

## 📋 Table of Contents

* [Key Features](#-key-features)
* [Gameplay](#-gameplay)
* [Tech Stack](#-tech-stack)
* [Repository Structure](#-repository-structure)
* [Installation](#-installation)
* [How to Play](#-how-to-play)
* [Controls](#-controls)
* [Game Architecture](#-game-architecture)
* [Screenshots](#-screenshots)
* [Live Demo](#-live-demo)
* [Limitations & Future Work](#%EF%B8%8F-limitations--future-work)
* [Contributing](#-contributing)
* [License](#-license)
* [Authors](#-authors)
* [Acknowledgments](#-acknowledgments)
* [Manual Edits Before Publishing](#-manual-edits-before-publishing)

---

## ✨ Key Features

* **Turn-Based Strategy:** Crimson and Azure players alternate moves on a shared board.
* **Canvas-Rendered Board:** The game board, cells, atoms, trails, bursts, hover states, and reaction effects are drawn with the HTML Canvas API.
* **Chain Reaction Mechanics:** Cells react when their fourth atom arrives, distributing atoms up, down, left, and right.
* **Territory Capture:** Reactions can convert opponent-owned cells to the moving player's side.
* **Local and AI Modes:** Play against another person on the same device or challenge the built-in AI.
* **Three AI Difficulties:** Easy, medium, and hard modes use different move-selection strategies.
* **Responsive Interface:** CSS media queries adapt the landing, setup screens, board, controls, and player indicators for smaller screens.
* **Player Preferences:** Settings include adaptive sound, reduced motion, and color-safe symbols.

---

## 🎮 Gameplay

The objective is to eliminate your opponent's controlled cells. Each player starts by placing their first atom on any neutral cell. After that opening placement, a player may only place atoms on cells they already own.

The board can be played at three sizes:

* `6 x 6` for quick matches
* `7 x 7` for balanced matches
* `8 x 8` for longer strategic matches

Every cell has a capacity of `4`. When a move causes a cell to reach four atoms, that cell reacts. Four atoms leave the source cell in the cardinal directions. Atoms that travel outside the board are lost; atoms that land inside the board increase the target cell count and set the target owner to the moving player. If that target cell was owned by the opponent, it is captured.

Reactions can create additional overloaded cells, so a single move may trigger a cascade across the board. The game tracks total turns, elapsed time, current player, controlled-cell counts, and the largest chain of the match. A winner is declared after at least two turns once one player has no controlled cells while the other player still controls territory.

---

## 🛠️ Tech Stack

| Technology | Purpose |
| ---------- | ------- |
| Next.js | App framework, routing, metadata, and development/build scripts |
| React | Component-based UI and game screen state |
| TypeScript | Typed game rules, board state, React props, and project configuration |
| CSS3 | Global styling, responsive layout, visual effects, and animations |
| Tailwind CSS | CSS pipeline directives and utility framework configuration |
| Framer Motion | Screen transitions, modal animation, turn banners, and victory animations |
| Canvas API | Interactive board rendering, atom drawing, trails, bursts, hover feedback, and reaction animation |
| DOM events | Pointer movement, clicks, buttons, settings, and setup flow |
| Web Audio API | Optional generated tones for placements, bursts, and victories |
| localStorage | Persists the selected board size between sessions |

This project has npm dependencies and should be run with the included Next.js scripts. It is not dependency-free and is not currently structured as a plain static HTML/CSS/JavaScript game.

---

## 📂 Repository Structure

```text
chain-reaction/
|
|-- app/
|   |-- globals.css
|   |-- layout.tsx
|   `-- page.tsx
|-- components/
|   |-- chain-kingdom.tsx
|   `-- game-board.tsx
|-- lib/
|   `-- game.ts
|-- tests/
|   `-- game.test.mjs
|-- next.config.mjs
|-- package-lock.json
|-- package.json
|-- postcss.config.mjs
|-- tailwind.config.ts
|-- tsconfig.json
`-- README.md
```

No dedicated asset folder is present in the source tree. The visual atmosphere, brand mark, board, atoms, particles, and effects are implemented through CSS, React markup, inline SVG icons, Canvas drawing, and a small inline SVG data URI for noise texture.

| File / Folder | Purpose |
| ------------- | ------- |
| `app/page.tsx` | Next.js page entry that renders the game component |
| `app/layout.tsx` | Root HTML layout and page metadata |
| `app/globals.css` | Global styles, responsive layout, animations, board framing, modals, and settings UI |
| `components/chain-kingdom.tsx` | Main game shell, setup screens, modes, AI flow, settings, turn management, timers, sounds, and victory UI |
| `components/game-board.tsx` | Canvas board renderer and cell click/hover handling |
| `lib/game.ts` | Core board model, legal move checks, chain resolution, winner detection, scoring, and AI move selection |
| `tests/game.test.mjs` | Node-based tests for capacity, cascades, captures, legal moves, and AI legality |
| `package.json` | Project metadata, scripts, dependencies, and dev dependencies |
| `tailwind.config.ts` | Tailwind content scanning configuration |
| `next.config.mjs` | Next.js configuration with React Strict Mode enabled |
| `tsconfig.json` | TypeScript configuration and path alias setup |
| `postcss.config.mjs` | PostCSS plugins for Tailwind CSS and Autoprefixer |

---

## 🚀 Installation

Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/chain-reaction.git
cd chain-reaction
```

Install dependencies:

```bash
npm install
```

Start the local development server:

```bash
npm run dev
```

Open the local URL shown by Next.js, commonly:

```text
http://localhost:3000
```

Useful scripts:

```bash
npm run build
npm run start
npm test
npm run lint
```

---

## 🕹️ How to Play

1. Open the game in your browser.
2. Select a play mode: two players on the same device or AI opponent.
3. If playing against AI, choose a difficulty: Explorer, Strategist, or Architect.
4. Choose a board size: `6 x 6`, `7 x 7`, or `8 x 8`.
5. On your first turn, click any neutral cell to place your opening atom.
6. On later turns, click only cells you already control.
7. Build cells toward four atoms to trigger reactions and capture territory.
8. Continue until one player has no controlled cells remaining.
9. Use the restart or new game controls to play again or change mode.

---

## 🎯 Controls

| Action | Control |
| ------ | ------- |
| Start setup flow | Click `Enter the kingdom` |
| Select mode | Click a mode card |
| Select AI difficulty | Click a difficulty card |
| Select board size | Click a board-size card |
| Preview board cell | Move pointer over the canvas board |
| Place atom | Click a legal board cell |
| Restart current match | Click `Restart match` |
| Return to mode selection | Click `New game` |
| Open settings | Click the gear button |
| Toggle sound, reduced motion, or color-safe symbols | Click the relevant settings row |

The game is primarily mouse/pointer driven. The canvas also includes a screen-reader-only grid of buttons for playable cells.

---

## 🧠 Game Architecture

### 1. App Initialization

`app/page.tsx` renders the main game component. `app/layout.tsx` defines the root document structure and metadata. The top-level game state starts in `components/chain-kingdom.tsx`, with the first visible screen set to the landing page.

### 2. Screen and Match State

`components/chain-kingdom.tsx` manages the screen flow: home, mode selection, difficulty selection, board-size selection, and active game. It stores the current mode, difficulty, board size, board data, active player, turn count, match timer, largest chain, animation state, AI thinking state, settings, and winner state.

The selected board size is saved to `localStorage` under `chain-kingdom-board-size` and restored on load when it matches one of the supported sizes.

### 3. Core Board Rules

`lib/game.ts` contains the rules and data model:

* `createBoard()` builds a square board of neutral cells.
* `isLegal()` enforces opening moves on neutral cells and later moves on owned cells.
* `resolveMove()` places an atom, resolves overloaded cells, creates reaction frames, captures enemy cells, and stops after cascades complete.
* `winnerFor()` detects victory after the opening phase when one player has no cells.
* `chooseAiMove()` ranks legal moves for the blue AI player based on the selected difficulty.

### 4. Chain Resolution

The reaction capacity is fixed at `4`. When one or more cells reach capacity, `resolveMove()` processes them as sources. Each source loses four atoms, then sends atoms to neighboring coordinates. Out-of-bounds atoms are recorded as lost trails for animation, while in-bounds atoms update the target cell owner and count. The loop continues until no cell is overloaded.

### 5. AI Logic

The AI always plays as Azure/blue. Easy mode chooses from a broader pool of reasonable ranked moves. Medium favors the strongest ranked moves with some randomness. Hard evaluates candidate moves with a reply-aware lookahead and still keeps a small amount of imperfection.

### 6. Rendering and UI Updates

`components/game-board.tsx` renders the board with Canvas. It uses `ResizeObserver` to keep the canvas square and responsive, scales for device pixel ratio, draws cells and atoms, animates critical cells, shows legal hover states, renders reaction bursts, draws traveling atom trails, and displays AI move selection highlights.

Framer Motion handles high-level transitions such as screen changes, settings modals, turn banners, and the victory overlay. CSS handles the rest of the layout, responsive behavior, visual atmosphere, rails, buttons, and reduced-motion preferences.

### 7. Audio and Preferences

Generated tones use the Web Audio API. The settings panel can toggle sound, shorten motion timing, and switch to color-safe symbols. Audio is optional and wrapped in a guarded call so the game still works if audio initialization fails.

---

## 📸 Screenshots

<img width="1896" height="1078" alt="image" src="https://github.com/user-attachments/assets/d6584529-780b-47cd-8a1d-21369726ba0c" />


---

## 🌐 Live Demo

[[Play Chain Reaction here](https://YOUR_USERNAME.github.io/chain-reaction/)](https://expressit.online/games/chain-reaction)

---

## ⚠️ Limitations & Future Work

* [ ] Add production deployment configuration for GitHub Pages or another hosting target
* [ ] Add real project screenshots and/or gameplay GIFs
* [ ] Improve keyboard-first board interaction beyond the hidden accessibility grid
* [ ] Add saved match history or score summaries
* [ ] Add player customization
* [ ] Add online multiplayer
* [ ] Add more detailed AI difficulty tuning controls
* [ ] Improve accessibility documentation and test coverage
* [ ] Expand automated tests around winner detection, large cascades, and AI scoring

---

## 🤝 Contributing

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Test the game locally.
5. Submit a pull request.

```bash
git checkout -b feature/your-feature-name
```

Before opening a pull request, run:

```bash
npm test
npm run lint
```

---


## 👨‍💻 Authors

| Name | GitHub |
| ---- | ------ |
| [Hriday Shah] | [Hridayshah18](https://github.com/Hridayshah18) |
| [Hriday Shah] | [shethmokshesh08-jpg](https://github.com/shethmokshesh08-jpg) |
---

## 🙌 Acknowledgments

* Browser APIs used for Canvas rendering, generated audio, pointer interaction, and local storage.
* The React, Next.js, TypeScript, Tailwind CSS, and Framer Motion ecosystems.
* Classic grid-based strategy games and chain-reaction board mechanics.

---
