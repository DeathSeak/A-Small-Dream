# A Small Dream✨

A minimalist maze exploration game where you navigate as a fading dream, collecting fragments of memory before the light goes quiet.

[![GitHub Pages – Play Now](https://img.shields.io/badge/Play_on-GitHub_Pages-181717?style=for-the-badge&logo=github)](https://DeathSeak.github.io/A-Small-Dream/)
[![itch.io – Play Now](https://img.shields.io/badge/Play_on-itch.io-FA5C5C?style=for-the-badge&logo=itch.io&logoColor=white)](https://deathseak.itch.io/a-small-dream)

Created for the [LittleJS Game Jam 2025](https://itch.io/jam/littlejs-game-jam-2025) Theme: **SMALL**

---

## About 🌙

_A Small Dream_ is a tiny game where you play as a small spark of a fading dream wandering through a mind. Trying to survive by turning into a memory.

This is meant to be a short, atmospheric break — something you can finish in a few minutes, then maybe sit with for a moment after.

**Genre:** Puzzle / Exploration 🧩
**Playtime:** ~3-8 minutes ⏳
**Engine:** [LittleJS](https://github.com/KilledByAPixel/LittleJS) by Frank Force 🚀

---

## How to Play 🎮

### Controls ⌨️

- **Move:** WASD or Arrow Keys
- **Interact/Continue:** Enter, Space, or Click
- **Restart Level:** R Key

### Objective 🎯

In each act, you have a small space of time to gather enough white memory orbs before the dream collapses.

If the timer hits zero, that act — and that version of the dream — is over.

### Hazards ⚠️

Red corruption orbs are scattered through the maze. Touching one will:

- Remove one collected memory orb
- Cut down your remaining time

---

## Play Locally 💻

### Quick Start (No Setup Required)

1. Download or clone this repository
2. Serve the files using any local web server:

**Using Python 3:**

```powershell
python -m http.server 8080
```

**Using Node.js:**

```powershell
npx http-server -p 8080
```

**Using VS Code:**

Install the "Live Server" or "Live Preview" extension and open `index.html`

1. Open `http://localhost:8080` in your browser

### System Requirements 🖥️

- Modern web browser (Chrome, Firefox, Edge, Safari)
- JavaScript enabled
- Minimum screen resolution: 800x600

---

## Technical Details ⚙️

- **Engine:** LittleJS - Ultra-lightweight HTML5 game engine
- **Rendering:** Canvas 2D API with particle effects
- **Maze Generation:** Recursive depth-first search algorithm
- **Physics:** Custom collision detection with LittleJS physics
- **State Management:** Finite state machine (Menu, Tutorial, Play, Ending, etc.)
- **Storage:** LocalStorage for tutorial completion tracking

---

## License ⚖️

### Code

This project's source code is licensed under the **Apache License 2.0**.
See [LICENSE](LICENSE) for full terms.

### Game Assets

Original art, narrative text, and game design are licensed under **Creative Commons Attribution 4.0 International (CC BY 4.0)**.
See [ASSETS-LICENSE](ASSETS-LICENSE) for full terms.

### Third-Party Components

- **LittleJS Engine:** MIT License Frank Force
- **Fonts:** SIL Open Font License 1.1
  - Cinzel Decorative
  - Cinzel
  - Nunito
  - Fira Code
    (Served via Google Fonts)

See [NOTICE](NOTICE) for complete third-party attribution.

---

## Credits 💖

**Design, Code & Writing:** Debmalya Pyne
**Engine:** LittleJS by [Frank Force](https://github.com/KilledByAPixel)
**Jam:** LittleJS Game Jam 2025

_A personal note: I made this for the "SMALL" theme, trying to capture a feeling that doesn’t always fit into big games — that quiet, in‑between sadness and comfort of getting a little lost. If it gives you even a moment of that, I’m genuinely happy you played it._

---

## Behind the Scenes 🧪

Hello everyone, I am Death Seak(aka Debmalya), this is my first project and my first proper game,this took quite a while to make, made me think alot about what dreams are, the game mechanics are simple, go around collecting the right orbs but I tried to implement my thought process, and I hope you can feel it while playing. Take a break, love yourself and love your dreams, even if they are small.

The maze generation, the fading timer, the little whispers — they all changed several times before they felt "right enough" to leave alone. There are still rough edges, but I wanted to keep some of that jam energy instead of polishing it into something it never was.

If you’re a dev poking through the code: it’s all in `src/game.js`. It’s not perfect, A.I. was also used at places, because I am still learning and learning is endless.

---

## Links 🔗

[![Repo – A Small Dream](https://img.shields.io/badge/GitHub-Repository-181717?style=flat-square&logo=github)](https://github.com/DeathSeak/A-Small-Dream)
[![Play – GitHub Pages](https://img.shields.io/badge/Play-GitHub_Pages-2088FF?style=flat-square&logo=github)](https://DeathSeak.github.io/A-Small-Dream/)
[![LittleJS Engine](https://img.shields.io/badge/Engine-LittleJS-00C853?style=flat-square)](https://github.com/KilledByAPixel/LittleJS)
[![Jam – LittleJS 2025](https://img.shields.io/badge/Game_Jam-LittleJS_2025-FFB300?style=flat-square)](https://itch.io/jam/littlejs-game-jam-2025)

---

_Tiny light. Vast night. A gentle exploration through fading memories._
