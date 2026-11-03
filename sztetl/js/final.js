/* ============================================================
   final.js — slajdy 19–30: tykanie (22), suwak wtedy/dziś (26),
   finał (30). Reszta choreografii jest w CSS (.active).
   ============================================================ */
(function () {
  'use strict';

  const S = window.Snd;
  const slides = window.Deck.slides;

  /* 22 — zegar: ciche tykanie */
  slides[21].addEventListener('slideenter', () => {
    let i = 0;
    const iv = setInterval(() => {
      if (++i > 5 || !slides[21].classList.contains('active')) { clearInterval(iv); return; }
      S.play('tick');
    }, 1300);
  });

  /* 26 — suwak wtedy/dziś */
  const cmp = document.getElementById('cmp-range');
  const now = document.querySelector('.cmp-now');
  if (cmp && now) {
    const apply = () => { now.style.clipPath = 'inset(0 0 0 ' + cmp.value + '%)'; };
    cmp.addEventListener('input', apply);
    apply();
  }

  /* 28 — powrót ciepła */
  slides[27].addEventListener('slideenter', () => { S.play('string'); });

  /* 30 — finał */
  slides[29].addEventListener('slideenter', () => {
    setTimeout(() => S.play('chime'), 2600);
  });
  const again = document.getElementById('btn-again');
  if (again) again.addEventListener('click', () => {
    S.play('whoosh');
    window.Deck.go(5);
  });
})();
