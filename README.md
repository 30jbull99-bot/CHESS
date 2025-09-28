# HyperNova Chess Arena

A visually-charged chess experience with local competitive play, a tactical AI gauntlet, achievements, and an ELO-inspired leaderboard. Everything runs in the browser—no server required.

## Features

- 🌐 **Dual Arena & AI Gauntlet** — toggle between hot-seat multiplayer or a minimax-powered AI opponent.
- 🕒 **Competitive clock** — five-minute timers with automatic wins on time.
- 🏆 **Persistent leaderboard** — local storage keeps track of top contenders with rating adjustments.
- 🎯 **Achievement system** — unlock flashy badges for skillful feats and streaks.
- 📜 **Move log & highlights** — track moves, captures, checks, and last-move glows.
- ✨ **Neon aesthetics** — high-energy presentation designed to feel like a sci-fi arena.

## Getting Started

Open `public/index.html` in any modern browser. The app stores progress (leaderboard, achievements, streaks) in `localStorage`.

## Development Notes

- Game rules and validation rely on an embedded copy of [chess.js](https://github.com/jhlywa/chess.js) (MIT License).
- The AI uses a depth-2 minimax search with alpha-beta pruning and simple material evaluation.
- Styling is pure CSS with responsive layout and dynamic highlights.

Enjoy the arena!
