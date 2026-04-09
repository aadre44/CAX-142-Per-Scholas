An AI Coding Challenge
Scenario
You are tasked with building a browser-based Flashcards Study App in 2 hours. You know HTML/CSS/JS, but some features (modals, animations, keyboard accessibility, data persistence) may be time-consuming. You will leverage AI coding assistants (GitHub Copilot, Windsurf, Cursor) to move faster while actively reviewing and refining AI output. AI can be inconsistent, so you must understand and fix the code it generates.

Learning Objectives
Use AI assistants to scaffold and implement non-trivial UI features quickly.
Critically review AI-generated code for correctness, accessibility, and consistency.
Implement core web app features using HTML, CSS, and JS with LocalStorage.
Practice debugging and refactoring AI-written code.
Instructions
Using the information provided in this lab, build a Flashcards web app. The app should be a single-page app, with no build tools required. Your app should be able to create, edit, delete decks and cards, and study the cards in a deck. The app should be responsive and accessible.

This task is open-ended, so you are free to implement the app in any way you see fit. However, you should use the information provided in this lab to help you build the app.

At this stage, building an app like this within the time constraint is not feasible. You should use AI assistants to help you build the app. Throughout this process, you should be actively reviewing and refining the AI-generated code. AI-generated code is not always correct, nor is it always the best way to implement a feature. You should be critical of the code and improve it as needed.

The expectation is not to build a fully functional app. You should explore the capabilities, and pitfalls, of using AI to build a web app quickly. As you continue to learn, you will build more complex applications. It is important to understand the capabilities and limitations of AI-assisted development before using it in more complex scenarios.

Deliverables
Flashcards web app (single-page, no build tools required).
Repository link (GitHub).
Reflection (5 bullets): what AI produced, what you fixed, key insights.
Tools
VS Code with GitHub Copilot (primary). Optional: Windsurf or Cursor.
Browser devtools.
No frameworks required. Optional libraries allowed. Avoid large UI frameworks.
Requirements
App supports multiple decks. Each deck has cards with front/back text.
Create, edit, delete decks and cards.
Study mode: flip cards, next/previous, shuffle.
Search/filter within a deck by keyword.
Persist data using LocalStorage (decks, cards, last active deck).
Responsive layout; basic accessibility (labels, focus, keyboard navigation).
Clean, readable UI.
Stretch Goals (optional)
Import/export deck JSON.
Spaced repetition (simple “Again/Good/Easy” intervals).
Keyboard shortcuts (ArrowLeft/Right, Space to flip, Enter to submit).
Progress and stats per deck.
Starter Setup
Create a new folder flashcards-app.
Files:
index.html, styles.css, app.js
Optional: assets/ for icons.
Link files in index.html.
Prompts to try:

Create a minimal HTML skeleton for a Flashcards app with header, sidebar for decks, main area for cards, and a footer.

Write base styles with CSS variables and responsive grid.

Quality checks:

Semantic structure (header, nav, main, section, button).
Scales on mobile/desktop.
Part 1: Base UI & Layout
Build the shell:

Header with app name + “New Deck” button.
Sidebar: list of decks; active deck highlighted.
Main: deck title, toolbar (search, shuffle, “New Card”), card area (card front/back), and controls (prev/next/flip).
Footer: short instructions.
Prompts to try:

Generate responsive CSS grid layout: fixed-width sidebar, fluid main; prefers-color-scheme support; focus styles for buttons/links.

AI inconsistency watch:

Inconsistent class names between HTML/CSS.
Missing accessible names (aria-label, for/id mismatch).
Part 2: Deck CRUD (Create/Read/Update/Delete)
Implement “New Deck” modal with name field.
Add deck to sidebar; select to switch active deck.
Edit deck name and delete deck (confirm dialog).
Prompts to try:

Create an accessible modal component in plain JS with focus trap, ESC to close, and return focus to opener.

Implement deck CRUD with in-memory array first; wire to UI updates.

AI inconsistency watch:

Modal focus trap often incomplete; test with keyboard only.
Event listeners duplicated after re-render; ensure single bindings or delegated listeners.
Quality checks:

Pressing Tab cycles within modal.
Sidebar updates without reload.
Part 3: Card CRUD + Flip Animation
“New Card” button opens modal with “Front” and “Back” fields.
List/preview cards in deck (optional), but at minimum be able to cycle in Study mode.
Edit/delete card actions.
CSS flip animation for the study card.
Prompts to try:

Add a CSS 3D flip animation to a .card on .is-flipped class toggle. Implement card create/edit/delete with delegated events.

AI inconsistency watch:

Flip states desync (card stays flipped when next card loads). Ensure state reset on navigation.
IDs/keys reused incorrectly; ensure unique cardId.
Quality checks:

Smooth flip at 60fps on desktop and mobile.
Editing a card persists and updates the current view.
Part 4: Study Mode + Navigation
Buttons: Flip, Previous, Next, Shuffle.
Optionally randomize order per session.
Keyboard support: Space (flip), ArrowLeft/Right (prev/next).
Prompts to try:

Implement enterStudyMode(deckId) that initializes an index, renders current card, handles keyboard shortcuts, and cleans up listeners when exiting.

AI inconsistency watch:

Memory leaks: listeners added multiple times; remove on mode change.
Off-by-one errors at deck boundaries.
Quality checks:

No console errors during rapid navigation.
Keyboard-only usage is smooth.
Part 5: Persistence & Search
Save decks/cards to LocalStorage on changes.
Restore state on reload (including last active deck).
Add case-insensitive keyword search for cards in active deck.
Prompts to try:

Create storage.js helpers: loadState(), saveState(), with versioning and safe parse fallback. Implement debounced search (300ms) that filters cards; show count of matches.

AI inconsistency watch:

LocalStorage overwrite bugs.
Search should not mutate underlying data, only view.
Quality checks:

Refresh keeps decks/cards intact.
Clearing search restores full set.
Part 6: QA & Polish
Accessibility: labels on inputs; buttons have discernible text; visible focus styles.
Empty states: “No decks yet” / “No cards found” messages.
Error handling: invalid inputs, empty deck name, etc.
Basic theming: CSS variables; prefers dark mode.
Prompts to try:

Add accessible empty-state components with icons and instructions. Audit the app for a11y and fix issues (aria, roles, focus).

AI inconsistency watch:

Color contrast below WCAG AA; adjust variables.
Missing aria-live for dynamic updates (optional).
Minimal Data Model (for reference)
AppState:
decks: Array<{ id: string, name: string, createdAt: number }>
cardsByDeckId: Record<string, Array<{ id: string, front: string, back: string, updatedAt: number }>>
activeDeckId: string | null
ui: { isModalOpen: boolean; activeCardIndex: number }
Tip: Keep rendering logic in small functions; avoid global event chaos.

Rubric
This lab will be graded on a complete/incomplete basis. A compelte lab consists of a code package, working or not, that attempts to meet the requirements of the given task, as well as a reflection.

Reflection (required)
In 5 bullets, include:

Where AI saved time.
At least one AI bug you identified and how you fixed it.
A code snippet you refactored for clarity.
One accessibility improvement you added.
What prompt changes improved AI output.
Submission
Push code to GitHub.
Include your reflection in README.md.
Tips
Common AI Failure Modes You Must Catch
Inconsistent variable or class names across files.
Event listeners added multiple times; use delegation or cleanup.
Missing accessibility attributes and focus management.
Fragile DOM queries tied to generated markup; prefer stable selectors.
LocalStorage read/write errors on malformed data.
Animation states not reset on content change.
Example Seed Prompts (copy/paste)
“Scaffold an accessible modal in vanilla JS with focus trap and esc-to-close.”
“Build a responsive two-column layout: fixed sidebar, fluid main; CSS variables; dark mode.”
“Implement LocalStorage-backed state with versioning and safe defaults.”
“Create a 3D flip card animation toggled by a button; reset on next card.”
“Add keyboard shortcuts: Space to flip, ArrowLeft/Right navigate; clean up listeners on unload.”
