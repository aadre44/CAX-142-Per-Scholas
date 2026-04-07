/**
 * FlashCard Lab — app.js
 * Single IIFE; no global pollution.
 *
 * Sections:
 *  1. Constants & Config
 *  2. State
 *  3. Storage (load / save)
 *  4. State Mutations
 *  5. Render Functions
 *  6. Modal Manager
 *  7. Focus Trap
 *  8. Event Listeners (initEventListeners — called once at boot)
 *  9. Keyboard Shortcuts
 * 10. Import / Export
 * 11. Bootstrap / Init
 */
(function () {
  'use strict';

  /* ── 1. CONSTANTS & CONFIG ─────────────────────────────── */

  const STORAGE_KEY = 'flashcard-app-v1';

  /* ── 2. STATE ──────────────────────────────────────────── */

  /**
   * Persisted: decks, cardsByDeckId, activeDeckId
   * Runtime-only (never written to LocalStorage):
   *   isFlipped, searchQuery, shuffledOrder, modalOpener,
   *   editingDeckId, editingCardId, pendingDeleteType, pendingDeleteId
   */
  let state = {
    decks: [],
    cardsByDeckId: {},
    activeDeckId: null,
    ui: {
      isModalOpen:       false,
      activeCardIndex:   0,
      isFlipped:         false,
      searchQuery:       '',
      shuffledOrder:     null,   // Array<number> | null
      editingDeckId:     null,
      editingCardId:     null,
      pendingDeleteType: null,   // 'deck' | 'card'
      pendingDeleteId:   null,
      modalOpener:       null,   // element that opened the current modal
    },
  };

  /* ── 3. STORAGE ────────────────────────────────────────── */

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.decks)) {
        state.decks         = parsed.decks;
        state.cardsByDeckId = parsed.cardsByDeckId || {};
        state.activeDeckId  = parsed.activeDeckId  || null;
      }
    } catch (e) {
      console.warn('FlashCard: failed to load state from LocalStorage', e);
      // Safe fallback: fresh state already set in declaration above
    }
  }

  function saveState() {
    try {
      const toSave = {
        decks:          state.decks,
        cardsByDeckId:  state.cardsByDeckId,
        activeDeckId:   state.activeDeckId,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
      console.warn('FlashCard: failed to save state', e);
    }
  }

  /* ── 4. STATE MUTATIONS ────────────────────────────────── */

  function generateId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function createDeck(name) {
    const deck = { id: generateId(), name: name.trim(), createdAt: Date.now() };
    state.decks.push(deck);
    state.cardsByDeckId[deck.id] = [];
    state.activeDeckId = deck.id;
    resetStudyUi();
    saveState();
    return deck;
  }

  function updateDeck(id, name) {
    const deck = state.decks.find(d => d.id === id);
    if (deck) deck.name = name.trim();
    saveState();
  }

  function deleteDeck(id) {
    state.decks = state.decks.filter(d => d.id !== id);
    delete state.cardsByDeckId[id];
    if (state.activeDeckId === id) {
      state.activeDeckId = state.decks.length > 0 ? state.decks[0].id : null;
    }
    resetStudyUi();
    saveState();
  }

  function setActiveDeck(id) {
    state.activeDeckId = id;
    resetStudyUi();
    saveState();
  }

  function createCard(deckId, front, back) {
    const card = {
      id:        generateId(),
      front:     front.trim(),
      back:      back.trim(),
      updatedAt: Date.now(),
    };
    if (!state.cardsByDeckId[deckId]) state.cardsByDeckId[deckId] = [];
    state.cardsByDeckId[deckId].push(card);
    saveState();
    return card;
  }

  function updateCard(deckId, cardId, front, back) {
    const cards = state.cardsByDeckId[deckId] || [];
    const card  = cards.find(c => c.id === cardId);
    if (card) {
      card.front     = front.trim();
      card.back      = back.trim();
      card.updatedAt = Date.now();
    }
    saveState();
  }

  function deleteCard(deckId, cardId) {
    if (!state.cardsByDeckId[deckId]) return;
    const idx = state.cardsByDeckId[deckId].findIndex(c => c.id === cardId);
    if (idx === -1) return;
    state.cardsByDeckId[deckId].splice(idx, 1);
    // Clamp activeCardIndex so it stays in bounds
    const total = getVisibleCards().length;
    if (state.ui.activeCardIndex >= total) {
      state.ui.activeCardIndex = Math.max(0, total - 1);
    }
    saveState();
  }

  function resetStudyUi() {
    state.ui.activeCardIndex = 0;
    state.ui.isFlipped       = false;
    state.ui.shuffledOrder   = null;
    state.ui.searchQuery     = '';
    const searchEl = document.getElementById('search-input');
    if (searchEl) searchEl.value = '';
  }

  /* ── 5. RENDER FUNCTIONS ───────────────────────────────── */

  /** Returns the filtered (and possibly shuffled) cards for the active deck.
   *  NEVER mutates state.cardsByDeckId. */
  function getVisibleCards() {
    if (!state.activeDeckId) return [];
    const allCards = state.cardsByDeckId[state.activeDeckId] || [];
    const q = state.ui.searchQuery.trim().toLowerCase();

    let filtered = q
      ? allCards.filter(c =>
          c.front.toLowerCase().includes(q) ||
          c.back.toLowerCase().includes(q)
        )
      : allCards;

    // Apply shuffle order if active
    if (state.ui.shuffledOrder && !q) {
      // shuffledOrder holds indices into allCards
      filtered = state.ui.shuffledOrder
        .filter(i => i < allCards.length)
        .map(i => allCards[i]);
    }

    return filtered;
  }

  function renderSidebar() {
    const listEl = document.getElementById('deck-list');

    if (state.decks.length === 0) {
      listEl.innerHTML = `<li class="sidebar-empty">No decks yet.<br>Create your first deck!</li>`;
      return;
    }

    listEl.innerHTML = state.decks
      .map(deck => {
        const cardCount = (state.cardsByDeckId[deck.id] || []).length;
        const isActive  = deck.id === state.activeDeckId;
        return `<li
          class="deck-item"
          data-deck-id="${escHtml(deck.id)}"
          role="button"
          tabindex="0"
          aria-current="${isActive ? 'true' : 'false'}"
          aria-label="Deck: ${escHtml(deck.name)}, ${cardCount} card${cardCount !== 1 ? 's' : ''}"
        >
          <span class="deck-item-icon" aria-hidden="true">&#128218;</span>
          <span class="deck-item-name">${escHtml(deck.name)}</span>
          <span class="deck-item-count" aria-hidden="true">${cardCount}</span>
        </li>`;
      })
      .join('');
  }

  function renderDeckView() {
    const emptyState = document.getElementById('empty-deck-state');
    const deckView   = document.getElementById('deck-view');

    if (!state.activeDeckId) {
      emptyState.hidden = false;
      deckView.hidden   = true;
      return;
    }

    emptyState.hidden = true;
    deckView.hidden   = false;

    // Deck title
    const deck = state.decks.find(d => d.id === state.activeDeckId);
    document.getElementById('deck-title').textContent = deck ? deck.name : '';

    renderCard();
    renderCardList();
  }

  function renderCard() {
    const cards = getVisibleCards();
    const noCards   = document.getElementById('no-cards-state');
    const noResults = document.getElementById('no-results-state');
    const flashcard = document.getElementById('flashcard');
    const counter   = document.getElementById('card-counter');

    const allCards = state.cardsByDeckId[state.activeDeckId] || [];
    const hasCards  = allCards.length > 0;
    const hasResults = cards.length > 0;

    // Empty states
    if (!hasCards) {
      noCards.hidden   = false;
      noResults.hidden = true;
      flashcard.hidden = true;
      counter.textContent = '';
      updateNavButtons(false);
      return;
    }

    if (!hasResults) {
      noCards.hidden   = true;
      noResults.hidden = false;
      flashcard.hidden = true;
      counter.textContent = '';
      updateNavButtons(false);
      return;
    }

    // Show card
    noCards.hidden   = true;
    noResults.hidden = true;
    flashcard.hidden = false;

    // Clamp index
    if (state.ui.activeCardIndex >= cards.length) {
      state.ui.activeCardIndex = 0;
    }

    const card = cards[state.ui.activeCardIndex];
    document.getElementById('card-front-text').textContent = card.front;
    document.getElementById('card-back-text').textContent  = card.back;

    // Reset flip — critical: must happen on every card render
    state.ui.isFlipped = false;
    flashcard.classList.remove('is-flipped');
    flashcard.setAttribute('aria-label', 'Flashcard front — press Space or click to flip');

    // Update counter
    counter.textContent = `${state.ui.activeCardIndex + 1} / ${cards.length}`;

    updateNavButtons(true);
  }

  function updateNavButtons(enabled) {
    const cards  = getVisibleCards();
    const prevEl = document.getElementById('btn-prev');
    const nextEl = document.getElementById('btn-next');
    const flipEl = document.getElementById('btn-flip');
    [prevEl, nextEl, flipEl].forEach(el => {
      el.disabled = !enabled;
    });
    if (enabled && cards.length > 0) {
      prevEl.disabled = false;
      nextEl.disabled = false;
    }
  }

  function renderCardList() {
    const listEl    = document.getElementById('card-list');
    const badgeEl   = document.getElementById('card-count-badge');
    const countEl   = document.getElementById('search-count');
    const allCards  = state.cardsByDeckId[state.activeDeckId] || [];
    const visible   = getVisibleCards();

    badgeEl.textContent = allCards.length;

    // Search count feedback
    if (state.ui.searchQuery.trim()) {
      countEl.textContent = `${visible.length} result${visible.length !== 1 ? 's' : ''}`;
    } else {
      countEl.textContent = '';
    }

    if (visible.length === 0) {
      listEl.innerHTML = '';
      return;
    }

    listEl.innerHTML = visible
      .map(card => `
        <li class="card-list-item" data-card-id="${escHtml(card.id)}">
          <div class="card-list-content">
            <div class="card-list-front">${escHtml(card.front)}</div>
            <div class="card-list-back">${escHtml(card.back)}</div>
          </div>
          <div class="card-list-actions">
            <button
              class="btn btn-secondary btn-sm"
              data-action="edit-card"
              data-card-id="${escHtml(card.id)}"
              aria-label="Edit card: ${escHtml(card.front.slice(0, 40))}"
            >Edit</button>
            <button
              class="btn btn-danger btn-sm"
              data-action="delete-card"
              data-card-id="${escHtml(card.id)}"
              aria-label="Delete card: ${escHtml(card.front.slice(0, 40))}"
            >Delete</button>
          </div>
        </li>
      `)
      .join('');
  }

  /** Simple HTML escaping to prevent XSS in dynamic innerHTML */
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /* ── 6. MODAL MANAGER ──────────────────────────────────── */

  const ModalManager = {
    _currentModal: null,
    _trapCleanup:  null,

    open(modalEl, openerEl) {
      // Close any open modal first (safety)
      if (this._currentModal) this.close();

      state.ui.modalOpener  = openerEl || null;
      state.ui.isModalOpen  = true;

      modalEl.hidden = false;

      // Focus first focusable inside modal
      const first = getFirstFocusable(modalEl);
      if (first) {
        // Small timeout lets the browser paint the modal before focus
        setTimeout(() => first.focus(), 30);
      }

      // Install focus trap (returns cleanup fn)
      this._trapCleanup = installFocusTrap(modalEl);
      this._currentModal = modalEl;
    },

    close() {
      if (!this._currentModal) return;

      this._currentModal.hidden = true;
      state.ui.isModalOpen = false;

      // Remove focus trap
      if (this._trapCleanup) {
        this._trapCleanup();
        this._trapCleanup = null;
      }

      // Return focus to opener
      if (state.ui.modalOpener) {
        state.ui.modalOpener.focus();
        state.ui.modalOpener = null;
      }

      this._currentModal = null;
    },
  };

  /* ── 7. FOCUS TRAP ─────────────────────────────────────── */

  function getFocusableElements(container) {
    return Array.from(container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), ' +
      'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(el => !el.closest('[hidden]') && !el.hidden);
  }

  function getFirstFocusable(container) {
    return getFocusableElements(container)[0] || null;
  }

  /**
   * Installs a keydown-based focus trap on the given modal element.
   * Returns a cleanup function that removes the listener.
   * Scoped to the modal element (not document) to avoid cross-contamination.
   */
  function installFocusTrap(modalEl) {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        ModalManager.close();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusable = getFocusableElements(modalEl);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last  = focusable[focusable.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: if on first element, wrap to last
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab: if on last element, wrap to first
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    modalEl.addEventListener('keydown', handleKeyDown);
    return () => modalEl.removeEventListener('keydown', handleKeyDown);
  }

  /* ── 8. EVENT LISTENERS ────────────────────────────────── */

  /**
   * All listeners attached ONCE at boot.
   * Dynamic content uses event delegation — no listeners inside render functions.
   */
  function initEventListeners() {

    // ── New Deck button (header)
    document.getElementById('btn-new-deck').addEventListener('click', function () {
      openDeckModal(null, this);
    });

    // ── New Deck button (empty state)
    document.getElementById('btn-new-deck-empty').addEventListener('click', function () {
      openDeckModal(null, this);
    });

    // ── Edit deck
    document.getElementById('btn-edit-deck').addEventListener('click', function () {
      openDeckModal(state.activeDeckId, this);
    });

    // ── Delete deck
    document.getElementById('btn-delete-deck').addEventListener('click', function () {
      openConfirmModal('deck', state.activeDeckId, this);
    });

    // ── New Card
    document.getElementById('btn-new-card').addEventListener('click', function () {
      openCardModal(null, this);
    });

    // ── Flip (button)
    document.getElementById('btn-flip').addEventListener('click', flipCard);

    // ── Flip (card click)
    document.getElementById('flashcard').addEventListener('click', flipCard);

    // ── Flip (card keyboard: Space or Enter)
    document.getElementById('flashcard').addEventListener('keydown', function (e) {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        flipCard();
      }
    });

    // ── Prev / Next
    document.getElementById('btn-prev').addEventListener('click', () => navigate(-1));
    document.getElementById('btn-next').addEventListener('click', () => navigate(1));

    // ── Shuffle
    document.getElementById('btn-shuffle').addEventListener('click', shuffleCards);

    // ── Search (debounced 300 ms)
    document.getElementById('search-input').addEventListener('input', debounce(function (e) {
      state.ui.searchQuery     = e.target.value;
      state.ui.activeCardIndex = 0;
      state.ui.shuffledOrder   = null; // clear shuffle when searching
      renderCard();
      renderCardList();
    }, 300));

    // ── Deck form submit
    document.getElementById('form-deck').addEventListener('submit', handleDeckFormSubmit);
    document.getElementById('btn-deck-cancel').addEventListener('click', () => ModalManager.close());

    // ── Card form submit
    document.getElementById('form-card').addEventListener('submit', handleCardFormSubmit);
    document.getElementById('btn-card-cancel').addEventListener('click', () => ModalManager.close());

    // ── Confirm modal
    document.getElementById('btn-confirm-yes').addEventListener('click', handleConfirmDelete);
    document.getElementById('btn-confirm-no').addEventListener('click', () => ModalManager.close());

    // ── Click-outside to close modals
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) ModalManager.close();
      });
    });

    // ── Delegated: sidebar deck selection (and keyboard enter on deck items)
    document.getElementById('deck-list').addEventListener('click', function (e) {
      const item = e.target.closest('[data-deck-id]');
      if (!item) return;
      setActiveDeck(item.dataset.deckId);
      renderSidebar();
      renderDeckView();
    });

    document.getElementById('deck-list').addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const item = e.target.closest('[data-deck-id]');
      if (!item) return;
      e.preventDefault();
      setActiveDeck(item.dataset.deckId);
      renderSidebar();
      renderDeckView();
    });

    // ── Delegated: card list edit / delete
    document.getElementById('card-list').addEventListener('click', function (e) {
      const editBtn   = e.target.closest('[data-action="edit-card"]');
      const deleteBtn = e.target.closest('[data-action="delete-card"]');
      if (editBtn)   openCardModal(editBtn.dataset.cardId, editBtn);
      if (deleteBtn) openConfirmModal('card', deleteBtn.dataset.cardId, deleteBtn);
    });

    // ── Export
    document.getElementById('btn-export-deck').addEventListener('click', exportDeck);

    // ── Import (button triggers hidden file input)
    document.getElementById('btn-import-deck').addEventListener('click', () => {
      document.getElementById('import-file-input').click();
    });

    document.getElementById('import-file-input').addEventListener('change', handleImport);

    // ── Global keyboard shortcuts
    document.addEventListener('keydown', handleGlobalKeyDown);
  }

  /* ── 9. KEYBOARD SHORTCUTS ─────────────────────────────── */

  function handleGlobalKeyDown(e) {
    // Skip if modal is open
    if (state.ui.isModalOpen) return;
    // Skip if user is typing in a text field
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    switch (e.key) {
      case ' ':
        e.preventDefault();
        flipCard();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        navigate(-1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        navigate(1);
        break;
    }
  }

  /* ── MODAL OPENERS ─────────────────────────────────────── */

  function openDeckModal(deckId, openerEl) {
    state.ui.editingDeckId = deckId;

    const modalEl   = document.getElementById('modal-deck');
    const titleEl   = document.getElementById('modal-deck-title');
    const inputEl   = document.getElementById('deck-name-input');
    const errorEl   = document.getElementById('deck-name-error');

    titleEl.textContent = deckId ? 'Edit Deck' : 'New Deck';
    inputEl.value       = deckId
      ? (state.decks.find(d => d.id === deckId) || {}).name || ''
      : '';
    hideError(errorEl);

    ModalManager.open(modalEl, openerEl);
  }

  function openCardModal(cardId, openerEl) {
    state.ui.editingCardId = cardId;

    const modalEl   = document.getElementById('modal-card');
    const titleEl   = document.getElementById('modal-card-title');
    const frontEl   = document.getElementById('card-front-input');
    const backEl    = document.getElementById('card-back-input');
    const frontErr  = document.getElementById('card-front-error');
    const backErr   = document.getElementById('card-back-error');

    if (cardId) {
      const cards = state.cardsByDeckId[state.activeDeckId] || [];
      const card  = cards.find(c => c.id === cardId);
      titleEl.textContent = 'Edit Card';
      frontEl.value = card ? card.front : '';
      backEl.value  = card ? card.back  : '';
    } else {
      titleEl.textContent = 'New Card';
      frontEl.value = '';
      backEl.value  = '';
    }

    hideError(frontErr);
    hideError(backErr);
    ModalManager.open(modalEl, openerEl);
  }

  function openConfirmModal(type, id, openerEl) {
    state.ui.pendingDeleteType = type;
    state.ui.pendingDeleteId   = id;

    const modalEl  = document.getElementById('modal-confirm');
    const titleEl  = document.getElementById('modal-confirm-title');
    const descEl   = document.getElementById('modal-confirm-desc');

    if (type === 'deck') {
      const deck = state.decks.find(d => d.id === id);
      titleEl.textContent = 'Delete Deck';
      descEl.textContent  = `Delete "${deck ? deck.name : 'this deck'}" and all its cards? This cannot be undone.`;
    } else {
      const cards = state.cardsByDeckId[state.activeDeckId] || [];
      const card  = cards.find(c => c.id === id);
      titleEl.textContent = 'Delete Card';
      descEl.textContent  = `Delete this card ("${card ? card.front.slice(0, 60) : ''}")? This cannot be undone.`;
    }

    ModalManager.open(modalEl, openerEl);
  }

  /* ── FORM HANDLERS ─────────────────────────────────────── */

  function handleDeckFormSubmit(e) {
    e.preventDefault();
    const nameEl  = document.getElementById('deck-name-input');
    const errorEl = document.getElementById('deck-name-error');
    const name    = nameEl.value.trim();

    if (!name) {
      showError(errorEl, 'Deck name cannot be empty.');
      nameEl.focus();
      return;
    }

    if (state.ui.editingDeckId) {
      updateDeck(state.ui.editingDeckId, name);
    } else {
      createDeck(name);
    }

    ModalManager.close();
    renderSidebar();
    renderDeckView();
  }

  function handleCardFormSubmit(e) {
    e.preventDefault();
    const frontEl  = document.getElementById('card-front-input');
    const backEl   = document.getElementById('card-back-input');
    const frontErr = document.getElementById('card-front-error');
    const backErr  = document.getElementById('card-back-error');

    let valid = true;
    if (!frontEl.value.trim()) {
      showError(frontErr, 'Front text cannot be empty.');
      frontEl.focus();
      valid = false;
    } else {
      hideError(frontErr);
    }
    if (!backEl.value.trim()) {
      showError(backErr, 'Back text cannot be empty.');
      if (valid) backEl.focus();
      valid = false;
    } else {
      hideError(backErr);
    }
    if (!valid) return;

    const deckId = state.activeDeckId;
    if (!deckId) return;

    if (state.ui.editingCardId) {
      updateCard(deckId, state.ui.editingCardId, frontEl.value, backEl.value);
    } else {
      createCard(deckId, frontEl.value, backEl.value);
    }

    ModalManager.close();
    renderCard();
    renderCardList();
    renderSidebar(); // update card count badge in sidebar
  }

  function handleConfirmDelete() {
    const { pendingDeleteType, pendingDeleteId } = state.ui;
    ModalManager.close();

    if (pendingDeleteType === 'deck') {
      deleteDeck(pendingDeleteId);
      renderSidebar();
      renderDeckView();
    } else if (pendingDeleteType === 'card') {
      deleteCard(state.activeDeckId, pendingDeleteId);
      renderCard();
      renderCardList();
      renderSidebar();
    }

    state.ui.pendingDeleteType = null;
    state.ui.pendingDeleteId   = null;
  }

  /* ── FORM ERROR HELPERS ────────────────────────────────── */

  function showError(el, message) {
    el.textContent = message;
    el.hidden = false;
  }

  function hideError(el) {
    el.textContent = '';
    el.hidden = true;
  }

  /* ── STUDY MODE HELPERS ────────────────────────────────── */

  function flipCard() {
    const cards = getVisibleCards();
    if (cards.length === 0) return;

    state.ui.isFlipped = !state.ui.isFlipped;
    const cardEl = document.getElementById('flashcard');
    cardEl.classList.toggle('is-flipped', state.ui.isFlipped);

    // Update ARIA label to reflect current face
    const face = state.ui.isFlipped ? 'back' : 'front';
    cardEl.setAttribute('aria-label', `Flashcard ${face} — press Space or click to flip`);
  }

  function navigate(direction) {
    const cards = getVisibleCards();
    if (cards.length === 0) return;

    state.ui.activeCardIndex =
      (state.ui.activeCardIndex + direction + cards.length) % cards.length;

    // CRITICAL: reset flip state on every navigation
    state.ui.isFlipped = false;
    document.getElementById('flashcard').classList.remove('is-flipped');

    renderCard();
  }

  function shuffleCards() {
    const allCards = state.cardsByDeckId[state.activeDeckId] || [];
    if (allCards.length === 0) return;

    // Fisher-Yates shuffle on index array
    const indices = allCards.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    state.ui.shuffledOrder   = indices;
    state.ui.activeCardIndex = 0;
    state.ui.isFlipped       = false;
    state.ui.searchQuery     = '';
    const searchEl = document.getElementById('search-input');
    if (searchEl) searchEl.value = '';

    renderCard();
    renderCardList();
  }

  /* ── DEBOUNCE ──────────────────────────────────────────── */

  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  /* ── 10. IMPORT / EXPORT ───────────────────────────────── */

  function exportDeck() {
    if (!state.activeDeckId) return;
    const deck  = state.decks.find(d => d.id === state.activeDeckId);
    const cards = state.cardsByDeckId[state.activeDeckId] || [];
    if (!deck) return;

    const payload = { deck, cards };
    const blob    = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url     = URL.createObjectURL(blob);
    const a       = document.createElement('a');
    a.href        = url;
    a.download    = `${deck.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (ev) {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.deck || !Array.isArray(data.cards)) {
          throw new Error('Invalid format: missing deck or cards array.');
        }

        // Assign new IDs to avoid collisions with existing data
        const newDeckId = generateId();
        const newDeck   = {
          id:        newDeckId,
          name:      data.deck.name || 'Imported Deck',
          createdAt: Date.now(),
        };

        state.decks.push(newDeck);
        state.cardsByDeckId[newDeckId] = data.cards.map(c => ({
          id:        generateId(),
          front:     c.front || '',
          back:      c.back  || '',
          updatedAt: Date.now(),
        }));

        saveState();
        setActiveDeck(newDeckId);
        renderSidebar();
        renderDeckView();
      } catch (err) {
        alert(`Import failed: ${err.message}`);
      }
    };

    reader.readAsText(file);
    // Reset input so the same file can be re-imported
    e.target.value = '';
  }

  /* ── 11. BOOTSTRAP / INIT ──────────────────────────────── */

  function init() {
    loadState();
    renderSidebar();
    renderDeckView();
    initEventListeners();
  }

  init();

})();
