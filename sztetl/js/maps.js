/* ============================================================
   maps.js — slajdy 6–7: interaktywne mapy (SVG inline)
   Slajd 6: klik na Dąbrowę = zoom + przejście do planu miasta.
   Slajd 7: pinezki = wejście do rozdziałów.
   ============================================================ */
(function () {
  'use strict';

  function visit(n) {
    window.Snd.play('bell');
    setTimeout(function () { window.Deck.go(n); }, 280);
  }

  document.querySelectorAll('.pin[data-go]').forEach(function (p) {
    p.addEventListener('click', function () { visit(+p.dataset.go); });
    p.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); visit(+p.dataset.go); }
    });
  });

  /* ---------- slajd 6: zoom na Dąbrowę ---------- */
  var svg = document.getElementById('map-podlasie');
  if (svg) {
    var world = document.getElementById('world6');
    var pin = document.getElementById('pin-dabrowa');
    var zooming = false;

    function zoom() {
      if (zooming) return;
      zooming = true;
      window.Snd.play('zoom');
      var s = 3, px = 762, py = 152;
      var tx = 500 - s * px, ty = 320 - s * py;
      var t0 = performance.now(), dur = 1200;
      var ease = function (p) { return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };

      (function step(now) {
        var p = Math.min(1, (now - t0) / dur), e = ease(p);
        var cs = 1 + (s - 1) * e;
        world.setAttribute('transform',
          'translate(' + (tx * e) + ',' + (ty * e) + ') scale(' + cs + ')');
        if (p < 1) requestAnimationFrame(step);
        else setTimeout(function () { window.Deck.go(7); }, 350);
      })(performance.now());
    }

    pin.addEventListener('click', zoom);
    pin.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); zoom(); }
    });
  }
})();
