/**
 * PinBoard — script.js
 * Pinterest-style masonry gallery with:
 * - Live search
 * - Category filter
 * - Lightbox with prev/next, keyboard nav, thumbnail strip, swipe
 * - Scroll-triggered fade-in with stagger
 * - Save toggle
 * - Back to top
 */

/* ════════════════════════════════════
   1. ELEMENT REFERENCES
════════════════════════════════════ */
const masonry      = document.getElementById('masonry');
const filterPills  = document.querySelectorAll('.filter-pill');
const searchInput  = document.getElementById('searchInput');
const searchClear  = document.getElementById('searchClear');
const resultsCount = document.getElementById('resultsCount');
const resultsFilter= document.getElementById('resultsFilter');
const emptyState   = document.getElementById('emptyState');

// Lightbox
const lightbox  = document.getElementById('lightbox');
const lbImg     = document.getElementById('lbImg');
const lbTag     = document.getElementById('lbTag');
const lbTitle   = document.getElementById('lbTitle');
const lbCounter = document.getElementById('lbCounter');
const lbClose   = document.getElementById('lbClose');
const lbPrev    = document.getElementById('lbPrev');
const lbNext    = document.getElementById('lbNext');
const lbBackdrop= document.getElementById('lbBackdrop');
const lbLoader  = document.getElementById('lbLoader');
const lbThumbs  = document.getElementById('lbThumbs');

// Other
const backToTop = document.getElementById('backToTop');
const viewToggle= document.getElementById('viewToggle');

/* ════════════════════════════════════
   2. COLLECT ALL PINS FROM DOM
════════════════════════════════════ */
const allPins = Array.from(document.querySelectorAll('.pin'));

// Build metadata array from DOM (single source of truth)
const pinData = allPins.map((pin, i) => ({
  el:    pin,
  index: i,
  cat:   pin.dataset.cat,
  title: pin.dataset.title,
  src:   pin.querySelector('img').src,
  alt:   pin.querySelector('img').alt,
  tag:   pin.querySelector('.pin-tag').textContent,
}));

/* ════════════════════════════════════
   3. STATE
════════════════════════════════════ */
let activeFilter  = 'all';
let searchQuery   = '';
let lightboxIndex = 0;      // index into visiblePins[]
let visiblePins   = [];     // current filtered+searched subset
let isTransitioning = false;

/* ════════════════════════════════════
   4. SCROLL-TRIGGERED FADE IN
   IntersectionObserver adds .visible
   with a per-column stagger delay
════════════════════════════════════ */
const io = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const pin = entry.target;
    // Stagger: delay based on rough column position
    const delay = (pin._colIndex || 0) % 5 * 55;
    pin.style.transitionDelay = `${delay}ms`;
    pin.classList.add('visible');
    io.unobserve(pin);
  });
}, { threshold: 0.06 });

// Assign a rough column index so stagger works
function assignColumnIndices() {
  let col = 0;
  allPins.forEach((pin, i) => {
    if (!pin.classList.contains('filtered-out')) {
      pin._colIndex = col % getColumnCount();
      col++;
    }
  });
}

function getColumnCount() {
  const w = window.innerWidth;
  if (w >= 1400) return 5;
  if (w >= 1100) return 4;
  if (w >= 720)  return 3;
  if (w >= 400)  return 2;
  return 1;
}

function observeVisiblePins() {
  assignColumnIndices();
  allPins.forEach(pin => {
    if (!pin.classList.contains('filtered-out') && !pin.classList.contains('visible')) {
      io.observe(pin);
    }
  });
}

// Initial observe
observeVisiblePins();

/* ════════════════════════════════════
   5. FILTER & SEARCH
════════════════════════════════════ */
function applyFilters() {
  const q = searchQuery.toLowerCase().trim();

  visiblePins = [];

  pinData.forEach(p => {
    const matchesCat   = activeFilter === 'all' || p.cat === activeFilter;
    const matchesSearch = !q ||
      p.title.toLowerCase().includes(q) ||
      p.cat.toLowerCase().includes(q);

    if (matchesCat && matchesSearch) {
      p.el.classList.remove('filtered-out');
      p.el.classList.remove('visible');       // re-animate
      p.el.style.transitionDelay = '0ms';
      visiblePins.push(p);
    } else {
      p.el.classList.add('filtered-out');
      p.el.classList.remove('visible');
    }
  });

  // Re-observe so fade-in fires for newly shown items
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      observeVisiblePins();
    });
  });

  // Update results bar
  const total = visiblePins.length;
  resultsCount.textContent = `${total} photo${total !== 1 ? 's' : ''}`;
  resultsFilter.textContent = activeFilter !== 'all'
    ? `in ${capitalize(activeFilter)}${q ? ` matching "${q}"` : ''}`
    : q ? `matching "${q}"` : '';

  emptyState.hidden = total > 0;
  masonry.style.display = total > 0 ? '' : 'none';

  // Rebuild lightbox thumbs for new visible set
  buildThumbs();
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Filter pill clicks
filterPills.forEach(pill => {
  pill.addEventListener('click', () => {
    const filter = pill.dataset.filter;
    if (filter === activeFilter) return;
    activeFilter = filter;
    filterPills.forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    applyFilters();
  });
});

// Search
searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value;
  searchClear.hidden = !searchQuery;
  applyFilters();
});
searchClear.addEventListener('click', () => {
  searchInput.value = '';
  searchQuery = '';
  searchClear.hidden = true;
  searchInput.focus();
  applyFilters();
});

/* ════════════════════════════════════
   6. PIN INTERACTIONS — click & save
════════════════════════════════════ */
allPins.forEach((pin) => {
  // Open lightbox on pin click (not save button)
  pin.addEventListener('click', (e) => {
    if (e.target.closest('.pin-save') || e.target.closest('.pin-action-btn')) return;
    const data = pinData.find(p => p.el === pin);
    if (!data) return;
    const idx = visiblePins.indexOf(data);
    if (idx === -1) return;
    openLightbox(idx);
  });

  // Keyboard: Enter or Space
  pin.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      pin.click();
    }
  });

  // Save button toggle
  const saveBtn = pin.querySelector('.pin-save');
  if (saveBtn) {
    saveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isSaved = saveBtn.classList.toggle('saved');
      saveBtn.textContent = isSaved ? 'Saved' : 'Save';
    });
  }
});

/* ════════════════════════════════════
   7. LIGHTBOX
════════════════════════════════════ */
function buildThumbs() {
  lbThumbs.innerHTML = '';
  visiblePins.forEach((p, i) => {
    const t = document.createElement('button');
    t.className = 'lb-thumb';
    t.setAttribute('aria-label', p.title);
    t.innerHTML = `<img src="${p.src}" alt="${p.alt}" loading="lazy" />`;
    t.addEventListener('click', () => navigateTo(i));
    lbThumbs.appendChild(t);
  });
}

function openLightbox(idx) {
  lightboxIndex = idx;
  setLightboxContent(idx, false);
  lightbox.hidden = false;
  document.body.style.overflow = 'hidden';
  lbClose.focus();
  scrollThumbIntoView(idx);
}

function closeLightbox() {
  lightbox.hidden = true;
  document.body.style.overflow = '';
  // Return focus to originating pin
  const current = visiblePins[lightboxIndex];
  if (current) current.el.focus();
}

function setLightboxContent(idx, animate = true) {
  const p = visiblePins[idx];
  if (!p) return;

  // Update info
  lbTag.textContent   = p.tag;
  lbTitle.textContent = p.title;
  lbCounter.textContent = `${idx + 1} / ${visiblePins.length}`;

  // Highlight thumb
  Array.from(lbThumbs.children).forEach((t, i) => {
    t.classList.toggle('active', i === idx);
  });

  if (animate) {
    // Fade out → swap → fade in
    lbImg.classList.add('fade');
    lbLoader.classList.remove('hide');

    setTimeout(() => {
      swapImage(p.src, p.alt);
    }, 160);
  } else {
    swapImage(p.src, p.alt);
  }
}

function swapImage(src, alt) {
  lbLoader.classList.remove('hide');
  lbImg.classList.add('fade');

  const newImg = new Image();
  newImg.onload = () => {
    lbImg.src = src;
    lbImg.alt = alt;
    lbImg.classList.remove('fade');
    lbLoader.classList.add('hide');
  };
  newImg.onerror = () => {
    lbImg.src = src; // still set it
    lbImg.classList.remove('fade');
    lbLoader.classList.add('hide');
  };
  newImg.src = src;
}

function navigateTo(idx) {
  if (isTransitioning) return;
  if (visiblePins.length === 0) return;
  lightboxIndex = ((idx % visiblePins.length) + visiblePins.length) % visiblePins.length;
  setLightboxContent(lightboxIndex, true);
  scrollThumbIntoView(lightboxIndex);
}

function navigateBy(delta) {
  navigateTo(lightboxIndex + delta);
}

function scrollThumbIntoView(idx) {
  const thumb = lbThumbs.children[idx];
  if (thumb) thumb.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
}

// Controls
lbClose.addEventListener('click', closeLightbox);
lbBackdrop.addEventListener('click', closeLightbox);
lbPrev.addEventListener('click', () => navigateBy(-1));
lbNext.addEventListener('click', () => navigateBy(+1));

// Keyboard
document.addEventListener('keydown', (e) => {
  if (lightbox.hidden) return;
  switch (e.key) {
    case 'Escape':      closeLightbox(); break;
    case 'ArrowLeft':
    case 'ArrowUp':    e.preventDefault(); navigateBy(-1); break;
    case 'ArrowRight':
    case 'ArrowDown':  e.preventDefault(); navigateBy(+1); break;
  }
});

// Focus trap
const lbFocusable = [lbClose, lbPrev, lbNext];
lightbox.addEventListener('keydown', (e) => {
  if (e.key !== 'Tab') return;
  e.preventDefault();
  const idx = lbFocusable.indexOf(document.activeElement);
  const next = e.shiftKey
    ? (idx - 1 + lbFocusable.length) % lbFocusable.length
    : (idx + 1) % lbFocusable.length;
  lbFocusable[next].focus();
});

// Touch swipe
let touchStartX = 0, touchStartY = 0;
lightbox.addEventListener('touchstart', e => {
  touchStartX = e.changedTouches[0].clientX;
  touchStartY = e.changedTouches[0].clientY;
}, { passive: true });
lightbox.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 48) {
    navigateBy(dx < 0 ? 1 : -1);
  }
}, { passive: true });

/* ════════════════════════════════════
   8. BACK TO TOP
════════════════════════════════════ */
window.addEventListener('scroll', () => {
  backToTop.hidden = window.scrollY < 400;
}, { passive: true });

backToTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ════════════════════════════════════
   9. VIEW TOGGLE (2-col compact mode)
════════════════════════════════════ */
let compactMode = false;
viewToggle.addEventListener('click', () => {
  compactMode = !compactMode;
  masonry.style.columnCount = compactMode
    ? Math.max(getColumnCount() + 1, 2)
    : '';
  viewToggle.style.color = compactMode ? 'var(--red)' : '';
});

/* ════════════════════════════════════
   10. INIT
════════════════════════════════════ */
buildThumbs();
applyFilters();
