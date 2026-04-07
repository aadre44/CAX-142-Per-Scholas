# FlashCard Lab

A browser-based flashcard study app built with vanilla HTML, CSS, and JavaScript — no build tools, no frameworks.

## Purpose

An interactive single-page app for creating and studying flashcard decks. Built as a coding challenge to explore AI-assisted development with GitHub Copilot/Claude, while practicing critical review of AI-generated code.

## Features

- **Multiple decks** — create, rename, and delete decks
- **Card CRUD** — add, edit, and delete cards with front/back text per deck
- **Study mode** — 3D flip animation, Prev/Next navigation, Shuffle
- **Search/filter** — case-insensitive, debounced (300ms), view-only (never mutates data)
- **LocalStorage persistence** — decks, cards, and last active deck survive page reload
- **Import/Export** — exchange decks as JSON files
- **Keyboard shortcuts** — `Space` flip · `←`/`→` navigate · `Esc` close modal
- **Accessible** — ARIA labels, focus trap in modals, visible focus rings, live regions
- **Dark mode** — automatic via `prefers-color-scheme`
- **Responsive** — desktop sidebar layout; mobile horizontal strip

## Architecture

```
index.html   — HTML shell: header, sidebar, main, 3 modals, footer
styles.css   — CSS custom properties, grid layout, 3D flip animation, dark mode
app.js       — Single IIFE containing all app logic (no global scope pollution)
```

### Data Model

```
AppState = {
  decks:          Array<{ id, name, createdAt }>
  cardsByDeckId:  Record<deckId, Array<{ id, front, back, updatedAt }>>
  activeDeckId:   string | null
  ui: {
    // persisted: (none — all ui is runtime-only)
    isFlipped, activeCardIndex, searchQuery, shuffledOrder,
    isModalOpen, editingDeckId, editingCardId,
    pendingDeleteType, pendingDeleteId, modalOpener
  }
}
```

### Key file map

| Location | Purpose |
|----------|---------|
| `app.js` §2 | State declaration |
| `app.js` §3 | LocalStorage load/save with safe fallback |
| `app.js` §4 | State mutation functions (createDeck, deleteCard, …) |
| `app.js` §5 | Render functions (renderSidebar, renderCard, …) |
| `app.js` §6 | ModalManager singleton (open/close) |
| `app.js` §7 | `installFocusTrap` — returns cleanup function |
| `app.js` §8 | `initEventListeners` — all listeners attached once; delegation for dynamic content |
| `app.js` §9 | Global keyboard shortcuts handler |
| `app.js` §10 | Import / Export JSON |

## How to Run

```bash
# Option A — Python (no install needed)
python3 -m http.server 8080
# then open http://localhost:8080

# Option B — convenience script
bash init.sh

# Option C — open index.html directly in browser (file:// mode)
```

> LocalStorage works on `file://` in most browsers, but a local server is recommended.

## Reflection (AI-Assisted Development)

**Where AI saved time:**  
AI scaffolded the HTML structure, CSS custom properties, and modal skeleton in seconds — work that would have taken 30–40 minutes manually. The focus trap pattern and Fisher-Yates shuffle were also generated correctly on the first prompt.

**AI bug identified and fixed:**  
The AI-generated flip animation placed the `is-flipped` class on `.card-inner` instead of the outer `.card` wrapper. This meant the `perspective` context was inside the rotating element, causing a flat (non-3D) flip. Fixed by restructuring: `.card` holds `perspective`, `.card-inner` rotates, and `.card.is-flipped .card-inner` is the CSS selector.

**Code snippet refactored for clarity:**  
The original AI-generated `navigate()` function only updated the index — it did not reset `isFlipped` or remove `.is-flipped` from the DOM. After navigation, cards appeared pre-flipped. Refactored to a single authoritative location that always resets flip state:

```js
function navigate(direction) {
  const cards = getVisibleCards();
  if (cards.length === 0) return;
  state.ui.activeCardIndex =
    (state.ui.activeCardIndex + direction + cards.length) % cards.length;
  // CRITICAL: reset flip on every navigation
  state.ui.isFlipped = false;
  document.getElementById('flashcard').classList.remove('is-flipped');
  renderCard();
}
```

**Accessibility improvement added:**  
The AI-generated modal did not implement a focus trap — pressing Tab moved focus outside the modal to background content. Added `installFocusTrap(modalEl)` scoped to the modal element (not `document`) that intercepts Tab/Shift+Tab to cycle within focusable elements, and returns a cleanup function to remove the listener when the modal closes.

**Prompt change that improved AI output:**  
Generic prompt: *"Make a flashcard flip animation"* — produced flat CSS transitions without `preserve-3d`.  
Improved prompt: *"Add a CSS 3D flip animation with perspective on the outer container, transform-style: preserve-3d on the inner wrapper, backface-visibility: hidden on both faces, and the back face pre-rotated 180deg. Toggle with .is-flipped on the outer card."* — produced correct 3D flip immediately.
