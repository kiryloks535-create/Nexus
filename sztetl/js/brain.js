/* ============================================================
   brain.js — slajd 5: żywe menu-konstelacja (three.js r149)
   6 węzłów-sekcji, pył pamięci, parallax, hover/klik = lot kamery.
   Render tylko gdy slajd aktywny. Działa offline.
   ============================================================ */
(function () {
  'use strict';
  if (!window.THREE) return;

  const SECTIONS = [
    { key: 'geneza',  label: 'Geneza',  sub: 'początki Dubrowy',      go: 8,  pos: [-2.0,  0.9,  0.3], size: 1.0 },
    { key: 'sztetl',  label: 'Sztetl',  sub: 'życie miasteczka',      go: 12, pos: [ 0.1,  1.7, -0.4], size: 1.25 },
    { key: 'kirkut',  label: 'Kirkut',  sub: 'kamienie pamięci',      go: 17, pos: [ 2.1,  0.7,  0.2], size: 1.05 },
    { key: 'wojna',   label: 'Wojna',   sub: '1939–1943',             go: 19, pos: [-1.4, -0.9,  0.6], size: 1.15 },
    { key: 'pamiec',  label: 'Pamięć',  sub: 'co zostało',            go: 25, pos: [ 0.4, -1.8, -0.2], size: 1.1 },
    { key: 'zrodla',  label: 'Źródła',  sub: 'dokumenty i linki',     go: 29, pos: [ 2.3, -0.5, -0.9], size: 0.9 },
  ];
  const EDGES = [[0, 1], [1, 2], [1, 3], [3, 4], [2, 4], [4, 5], [0, 3]];

  const slide = document.querySelector('.s5');
  const holder = document.getElementById('brain-canvas');
  const layer = document.getElementById('brain-labels');

  let renderer, scene, camera, raycaster, group, core;
  let nodes = [], sprites = [], dust, linesMat;
  let active = false, started = false, rafId = 0;
  let mouse = { x: 0, y: 0 }, hovered = null, flying = null;

  /* ---------- tekstura poświaty (canvas) ---------- */
  function glowTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,244,214,1)');
    grd.addColorStop(0.25, 'rgba(230,196,85,.55)');
    grd.addColorStop(0.6, 'rgba(201,162,39,.12)');
    grd.addColorStop(1, 'rgba(201,162,39,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    return t;
  }

  function init() {
    const w = holder.clientWidth, h = holder.clientHeight;

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(w, h);
    holder.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 60);
    camera.position.set(0, 0, 6.2);

    raycaster = new THREE.Raycaster();
    group = new THREE.Group();
    scene.add(group);

    const tex = glowTexture();

    /* węzły */
    const nodeGeo = new THREE.SphereGeometry(0.16, 16, 16);
    SECTIONS.forEach((s, i) => {
      const col = new THREE.Color(i === 3 ? 0xd9a05b : 0xe6c455); // Wojna cieplejsza
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex, color: col, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      spr.position.set(...s.pos);
      spr.scale.setScalar(0.9 * s.size);
      spr.userData = { i, base: 0.9 * s.size };
      group.add(spr); sprites.push(spr);

      const hit = new THREE.Mesh(nodeGeo, new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.copy(spr.position);
      hit.scale.setScalar(2.4);
      hit.userData = { i };
      group.add(hit); nodes.push(hit);

      const el = document.createElement('div');
      el.className = 'brain-label';
      el.innerHTML = '<b>' + s.label + '</b><span>' + s.sub + '</span>';
      el.addEventListener('click', () => flyTo(i));
      layer.appendChild(el);
      s.el = el;
    });

    /* krawędzie */
    const lp = [];
    EDGES.forEach(([a, b]) => {
      lp.push(...SECTIONS[a].pos, ...SECTIONS[b].pos);
    });
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
    linesMat = new THREE.LineBasicMaterial({
      color: 0xc9a227, transparent: true, opacity: 0.22,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    group.add(new THREE.LineSegments(lg, linesMat));

    /* pył pamięci */
    const dn = 380, dp = new Float32Array(dn * 3);
    for (let i = 0; i < dn; i++) {
      const r = 2.6 + Math.random() * 2.6, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      dp[i * 3] = r * Math.sin(ph) * Math.cos(th);
      dp[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th) * 0.7;
      dp[i * 3 + 2] = r * Math.cos(ph);
    }
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
    dust = new THREE.Points(dg, new THREE.PointsMaterial({
      map: tex, color: 0xcabf9a, size: 0.07, transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    }));
    scene.add(dust);

    /* jądro */
    core = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, color: 0xfff3cf, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    core.scale.setScalar(1.1);
    scene.add(core);

    started = true;
    bind();
    resize();
  }

  /* ---------- interakcja ---------- */
  function bind() {
    const cv = renderer.domElement;

    slide.addEventListener('mousemove', (e) => {
      const r = holder.getBoundingClientRect();
      mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      if (!active || flying) return;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(nodes, false);
      const h = hits.length ? hits[0].object.userData.i : null;
      setHover(h);
    });
    slide.addEventListener('mouseleave', () => setHover(null));
    cv.addEventListener('click', () => { if (hovered !== null && !flying) flyTo(hovered); });
    addEventListener('resize', resize);
  }

  function setHover(i) {
    if (i === hovered) return;
    if (hovered !== null) {
      sprites[hovered].scale.setScalar(sprites[hovered].userData.base);
      SECTIONS[hovered].el.classList.remove('hot');
      slide.style.cursor = '';
    }
    hovered = i;
    if (hovered !== null) {
      sprites[hovered].scale.setScalar(sprites[hovered].userData.base * 1.3);
      SECTIONS[hovered].el.classList.add('hot');
      slide.style.cursor = 'pointer';
      window.Snd.play('hover');
    }
  }

  function flyTo(i) {
    if (flying) return;
    flying = { i, t0: performance.now(), from: camera.position.clone() };
    window.Snd.play('whoosh');
    setHover(null);
  }

  function resize() {
    if (!started) return;
    const w = holder.clientWidth, h = holder.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  /* ---------- pętla ---------- */
  const easeIO = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  function tick(now) {
    if (!active) { rafId = 0; return; }
    rafId = requestAnimationFrame(tick);

    const t = REDUCED ? 0 : now * 0.001;
    group.rotation.y = t * 0.07;
    dust.rotation.y = -t * 0.03;
    core.scale.setScalar(1.05 + Math.sin(t * 1.6) * 0.12);
    linesMat.opacity = 0.18 + Math.sin(t * 0.8) * 0.06;

    camera.position.x += (mouse.x * 0.55 - camera.position.x) * 0.04;
    camera.position.y += (mouse.y * 0.4 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);

    /* lot do węzła */
    if (flying) {
      const p = Math.min(1, (now - flying.t0) / 750);
      const target = new THREE.Vector3(...SECTIONS[flying.i].pos).multiplyScalar(2.4);
      camera.position.lerpVectors(flying.from, target, easeIO(p));
      camera.lookAt(0, 0, 0);
      if (p >= 1) {
        const go = SECTIONS[flying.i].go;
        flying = null;
        window.Deck.go(go);
      }
    }

    /* etykiety: projekcja 3D → 2D */
    const w = holder.clientWidth, h = holder.clientHeight;
    SECTIONS.forEach((s, i) => {
      const v = new THREE.Vector3(...s.pos).applyMatrix4(group.matrixWorld).project(camera);
      const vis = v.z < 1;
      s.el.style.opacity = vis ? (hovered === i ? 1 : 0.85) : 0;
      s.el.style.transform =
        'translate(' + ((v.x * 0.5 + 0.5) * w) + 'px,' + ((-v.y * 0.5 + 0.5) * h) + 'px) translate(-50%,-130%)';
    });

    renderer.render(scene, camera);
  }

  /* ---------- start/stop z silnikiem ---------- */
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function start() {
    if (!started) init();
    active = true;
    if (!rafId) rafId = requestAnimationFrame(tick);
  }

  slide.addEventListener('slideenter', () => {
    start();
    window.Snd.play('chime');
  });
  slide.addEventListener('slideleave', () => {
    active = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  });

  /* deep-link #5: slajd aktywny zanim ten plik się załaduje */
  if (slide.classList.contains('active')) start();

  window.Brain = { flyTo: (k) => flyTo(SECTIONS.findIndex((s) => s.key === k)) };
})();
