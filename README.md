## The Path — Karate Tracker

**The Path** is a personal karate progress tracker for Kathrin, Emily, and Isabel.  
It focuses on **belt progress**, **sparring attendance**, **training history**, **techniques**, and **goals**, with optional **Google Calendar** sync.

---

## 1. Features

- **Multi‑profile support**: track progress separately for **Kathrin (adult)**, **Emily (kids)**, and **Isabel (kids)**.
- **Belt timeline**: visual overview from white to black, including earned and promoted dates.
- **Stripe & sparring tracking**:
  - Adult and kids belt systems, with different stripe counts.
  - Sparring counts and “sparring stripe” requirements for higher belts.
- **Training log**:
  - Manual entries (focus, duration, how it felt, notes).
  - 16‑week **training heatmap**.
  - Optional sync with Google Calendar classes.
- **Techniques library**:
  - Store techniques/combinations/forms, grouped by category and belt.
  - Mark a technique as mastered.
- **Goals & notes**:
  - Belt‑linked goals with completed history.
  - Free‑form notes for ceremonies, milestones, or reflections.

---

## 2. Getting Started

**Prerequisites:** Node.js 18+

```bash
# 1. Install dependencies
npm install

# 2. (Optional) Set up your API key for Google Calendar sync
cp .env.example .env.local
# then edit .env.local and add your Anthropic API key

# 3. Start dev server
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 3. Google Calendar Sync

The app can pull classes from Google Calendar and log them automatically.

- It uses the **Anthropic API** with **Google Calendar MCP** (`src/utils/calendar.js`).
- Add your key to `.env.local`:

```bash
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

You can create a key in the Anthropic console (`https://console.anthropic.com`).

> ⚠️ In development, your API key is exposed in the browser.  
> This is meant for **personal local use only**; do not deploy this as a public web app.

In the UI:

- Use **“Sync Google Calendar”** in the **Training** view (or sidebar) to:
  - Choose a calendar.
  - Preview which events look like karate classes.
  - Import them into the training log.

Events are detected as karate classes using keywords from `KARATE_KEYWORDS` in `src/data/constants.js`.

---

## 4. Data Storage

- **Local development:** stored in `localStorage` in your browser under the key `karate-tracker-v7`.
- **Claude / artifact environment:** stored via `window.storage` if available.

The `useStorage` hook (`src/hooks/useStorage.js`) abstracts this, so the rest of the app just receives a JS object.

---

## 5. How to Use the App (Views)

All views live inside `App.jsx`. The top header shows:

- **Profile switcher** (Kathrin / Emily / Isabel).
- **Current belt pill**.
- **Week streak** badge (🔥) based on recent training log.

### 5.1 Overview

- Highlights the current profile, current belt, and whether you are in the **adult** or **kids** program.
- Shows:
  - Next blue‑belt test week (if applicable) using `BLUE_TEST_WEEKS`.
  - Belt progress bar from white to black.
  - Belt grid with stripes, sparring counts, and dates for each belt.
  - Summary stats: belts earned, total stripes, months training, total sessions.

### 5.2 My Belt

- Focused view of a **single belt** (selected by tabs).
- You can:
  - Add/remove stripes.
  - Toggle or adjust sparring counts (when that belt has sparring requirements).
  - Write a **ceremony note** for earned belts.
  - Trigger a **belt promotion** modal when all requirements are met.

### 5.3 Sparring

- Shows sparring requirements for blue, purple, and red belts.
- Progress bar for each belt, with a log of individual sparring sessions.
- You can add a sparring session (date, notes) or remove entries.

### 5.4 Techniques

- Library of techniques shared across all profiles (same dojo curriculum).
- Filter by category (`TECH_CATS`) and search by name/notes.
- For each technique:
  - Associate with a belt.
  - Add notes and a learned date.
  - Toggle “mastered”, edit, or delete.

### 5.5 Training

- Main **training log**:
  - 16‑week **training heatmap** (manual vs. calendar‑imported sessions).
  - List of all sessions with date, duration, intensity (1–5), notes, and GCal badge.
- Actions:
  - Sync Google Calendar (choose calendar + preview).
  - Schedule a new session (also creates a Calendar event).
  - Log a class manually.

### 5.6 Goals

- Creates belt‑linked or general training goals.
- Two sections:
  - **Open goals** (tap to mark done or delete).
  - **Completed goals** with completion date.

### 5.7 Activity Log

- Free‑form notes timeline (date + text).
- Good for recording:
  - Ceremonies, special classes, seminars.
  - Injuries, breaks, or feelings about training phases.

---

## 6. Project Structure (Code)

```text
src/
  App.jsx                 — main component, all views & logic
  main.jsx                — React entry point
  index.css               — global styles

  data/
    constants.js          — theme, belt configs, sparring requirements, keywords
    profiles.js           — profile factory, initial state, migration logic

  utils/
    index.js              — date formatting, IDs, monthsBetween, weekStreak
    calendar.js           — Anthropic API + Google Calendar MCP helpers

  hooks/
    useStorage.js         — localStorage / window.storage abstraction

  components/
    ui.jsx                — Btn, Card, BeltPill, ProgressBar, StripeDots
    TrainingHeatmap.jsx   — 16‑week training grid component
    modals.jsx            — all modal dialogs (promotion, training, goals, etc.)
```

---

## 7. Customizing

All of these live in `src/data/constants.js` and `src/data/profiles.js`:

- **Belt ladders (adult vs. kids)**:
  - Edit `ADULT_BELTS` / `KIDS_BELTS` to change belt order, stripe counts, and which belts require sparring.
- **Sparring attendance requirements**:
  - Edit `ADULT_SPARRING_REQ` / `KIDS_SPARRING_REQ`.
- **Blue‑belt test weeks**:
  - Edit `BLUE_TEST_WEEKS` to adjust upcoming test windows.
- **Calendar karate keywords**:
  - Edit `KARATE_KEYWORDS` to match how your dojo names classes.
- **Initial profiles**:
  - Edit `INITIAL_STATE.profiles` in `src/data/profiles.js` to add or remove family members.

---

## 8. Tech Stack

- **Frontend**: React 18 + Vite.
- **Styling**: inline styles with a shared theme (`T` in `src/data/constants.js`).
- **Storage**: browser `localStorage` or `window.storage`.
- **External integration**: Anthropic Messages API + Google Calendar MCP (for calendar sync).
