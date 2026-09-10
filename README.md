# 🎮 FroKo.io

**FroKo.io** is a real-time multiplayer top-down shooter built with **HTML, CSS, JavaScript, Node.js, and Socket.IO**.

Create a room, invite your friends, choose a game mode, and fight to become the last player — or last team — standing!

---

## 🌐 Play FroKo.io

**Coming soon / GitHub Pages:**
`https://bunny98789.github.io/FroKo.io/`

> The multiplayer server is hosted separately and must be online for multiplayer games to work.

---

## 🕹️ Features

### 👥 Multiplayer

* Create and join multiplayer rooms
* Room codes for easy invites
* Up to **8 players** per room
* Host system
* Host transfer when the host leaves
* Players can join while a game is already running
* Spectator mode for eliminated players

### ⚔️ Game Modes

#### 🟢 Free For All

Every player fights for themselves.

Be the last surviving player to win the round!

#### 🔴🔵 Team Mode

Fight as **Red Team vs. Blue Team**.

* Players are assigned to Red or Blue
* Players can switch teams while in the lobby
* Teams lock when the game starts
* Friendly fire is disabled
* The last surviving team wins the round
* Winning team members receive a round win

---

## 🏆 Rounds

Games currently consist of **5 rounds**.

Each round follows this flow:

```text
3 Second Countdown
        ↓
     ROUND
        ↓
Last Player/Team Standing
        ↓
  3 Second Break
        ↓
   Next Round
```

After the final round, the game displays the final results.

---

## 🎯 Combat

The current baseline weapon is the **Pistol**.

### Pistol

* Damage: 25
* Magazine: 6 rounds
* Reload time: 2 seconds

Players can:

* Move with **WASD**
* Move with **Arrow Keys**
* Aim with the mouse
* Shoot with left click
* Reload with **R**

---

## 🧱 Maps & Obstacles

Each round generates a new arrangement of obstacles.

Obstacles:

* Block player movement
* Block bullets
* Have safe player spawning around them

This keeps each round slightly different.

---

## 📊 Player Stats

FroKo.io tracks statistics during a game, including:

* Kills
* Deaths
* Round Wins
* Survival Time
* Rounds Participated

---

## 💰 Currencies

FroKo.io has two planned currencies:

### 🪙 FroKoins (FK)

**FK** will be used for various purchases and unlocks.

### 💎 KoKash (KK)

**KK** will be another currency used for special items and equipment.

The economy and shop are currently in development.

---

## 🔫 Weapons

More weapons are planned for **0.8.0**.

Planned weapons include:

* 🔫 Pistol
* 💥 JackerRifle
* ⚡ FoFroBeam
* 💨 Knockback Cannon

Weapons will have different damage, ammo, reload times, fire rates, and special mechanics.

---

## 🧑‍🚀 Fighters

Unique playable Fighters are planned for a future update.

Fighters will eventually introduce unique abilities and playstyles.

Fighter development is currently planned for **1.1.0**.

---

## 🛠️ Built With

### Frontend

* HTML
* CSS
* JavaScript
* HTML5 Canvas

### Backend

* Node.js
* Socket.IO

### Hosting

* GitHub Pages — Frontend
* Railway — Multiplayer Server

---

## 📁 Project Structure

```text
FroKo.io/
│
├── index.html
├── style.css
├── game.js
├── gunData.js
├── icon.png
│
├── Assets/
│   └── ...
│
└── server/
    └── server.js
```

> The exact project structure may change as development continues.

---

## 🚧 Development Status

**Current Version: `v0.7.1-Alpha`**

FroKo.io is currently in active development.

The current focus is improving the multiplayer foundation and adding Team Mode before moving into weapons and the shop.

---

## 🗺️ Roadmap

| Version   | Planned Features                                 |
| --------- | ------------------------------------------------ |
| **0.7.x** | Multiplayer foundation, rounds, stats, Team Mode |
| **0.8.0** | 🔫 Weapons                                       |
| **0.9.0** | 🛒 Shop & Currencies                             |
| **1.0.0** | ✨ Polish & Release                               |
| **1.1.0** | 🧑‍🚀 Fighters                                   |
| **1.2.0** | 🔫 More Weapons & Fighters                       |

### 🎯 Goal

**FroKo.io v1.0.0 — September 30, 2026**

---

## 🧪 Testing

FroKo.io can be tested using multiple browser tabs.

For example:

```text
Tab 1 → 👑 Host / Red
Tab 2 → 🔵 Blue
Tab 3 → 🔴 Red
Tab 4 → 🔵 Blue
```

This allows Team Mode to be tested without needing multiple computers.

---

## 🐛 Known / Upcoming Work

FroKo.io is still an Alpha build, so bugs are expected.

Current development areas include:

* Team Mode testing
* More weapons
* Weapon fire-rate handling
* Shop system
* Currency system
* More Fighters
* UI polish
* Additional gameplay features

---

## 👨‍💻 Creator

**Custimoose Makers**

Created by **bunny98789**

FroKo.io is an independent game project created from scratch as a multiplayer browser game.

---

## 📜 License

FroKo.io is currently an independent development project.

Please do not redistribute, re-upload, or claim the game/code as your own without permission.

---

# 🐇 FroKo.io

**Create. Fight. Survive.**

> *The FroKo battle is just beginning.*
