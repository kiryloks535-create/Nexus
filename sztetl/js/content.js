/* ============================================================
   content.js — choreografia slajdów 8–18
   9: stemple lat · 11: licznik+domki · 12: ulice · 16: wykres
   17: licznik macew · 18: interaktywna macewa
   ============================================================ */
(function () {
  'use strict';

  const S = window.Snd;
  const slides = window.Deck.slides;
  let timers = [];
  const after = (ms, fn) => timers.push(setTimeout(fn, ms));
  const clearAll = () => { timers.forEach(clearTimeout); timers = []; };
  const enters = {}; // nr slajdu → handler (do deep-linka)
  const on = (i, ev, fn) => {
    if (ev === 'slideenter') enters[i] = fn;
    slides[i - 1].addEventListener(ev, fn);
  };

  function count(el, to, dur, suffix) {
    if (document.documentElement.classList.contains('static')) {
      el.textContent = to + (suffix || '');
      return;
    }
    const t0 = performance.now();
    (function step(now) {
      const p = Math.min(1, Math.max(0, (now - t0) / dur));
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(to * e) + (suffix || '');
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  /* ---------- 9: stemple ---------- */
  on(9, 'slideenter', () => {
    [500, 1000, 1500, 2000].forEach((t) => after(t, () => S.play('stamp')));
  });

  /* ---------- 11: 1806 licznik + domki ---------- */
  on(11, 'slideenter', () => {
    const houses = slides[10].querySelector('.houses');
    if (!houses.childElementCount) {
      for (let i = 0; i < 10; i++) {
        houses.insertAdjacentHTML('beforeend',
          '<svg class="hh" viewBox="0 0 40 34"><path d="M6,32 V16 L20,5 L34,16 V32 Z M16,32 V22 H24 V32"/></svg>');
      }
    }
    const list = houses.querySelectorAll('svg');
    list.forEach((h) => h.classList.remove('lit'));
    [0, 1, 2, 4, 5, 7].forEach((i, k) => after(900 + k * 260, () => {
      list[i].classList.add('lit'); S.play('tick');
    }));
    after(700, () => count(slides[10].querySelector('#cnt-1806'), 51, 2000, '%'));
  });
  on(11, 'slideleave', () => {
    const el = slides[10].querySelector('#cnt-1806');
    if (el) el.textContent = '0%';
  });

  /* ---------- 12: ulice ---------- */
  on(12, 'slideenter', () => {
    [700, 1200, 1700, 2200].forEach((t) => after(t, () => S.play('tick')));
  });

  /* ---------- 16: wykres ---------- */
  on(16, 'slideenter', () => {
    [800, 1200, 1600, 2000].forEach((t) => after(t, () => S.play('rise')));
  });

  /* ---------- 17: macewy ---------- */
  on(17, 'slideenter', () => {
    after(900, () => count(slides[16].querySelector('#cnt-macew'), 80, 1800));
  });
  on(17, 'slideleave', () => {
    const el = slides[16].querySelector('#cnt-macew');
    if (el) el.textContent = '0';
  });

  /* ---------- 18: macewa interaktywna ---------- */
  on(18, 'slideenter', () => {
    if (slides[17].dataset.macewaBound) return;
    slides[17].dataset.macewaBound = '1';
    slides[17].querySelectorAll('.mstone').forEach((b) => {
      b.addEventListener('click', () => {
        slides[17].querySelectorAll('.mstone').forEach((x) => x.classList.remove('sel'));
        b.classList.add('sel');
        slides[17].querySelector('#m-info').textContent = b.dataset.txt;
        S.play('stamp');
      });
    });
  });

  /* deep-link: slajd aktywny zanim ten plik się załaduje */
  slides.forEach((s, i) => {
    if (s.classList.contains('active') && enters[i + 1]) enters[i + 1]();
  });
})();
