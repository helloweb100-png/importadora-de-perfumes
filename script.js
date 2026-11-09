/* ==========================================================================
   IMPORTADORA MV · script.js  (sin librerías externas)
   Módulos: cargador · WhatsApp · menú · motor de scroll (barra, sello,
   manifiesto, línea de tiempo, parallax, marquesina) · reveal · contadores ·
   hero (partículas + inclinación 3D) · trío · catálogo · buscador de aroma ·
   formulario · efectos de puntero.
   ========================================================================== */
(() => {
  'use strict';

  /* ===== CONFIGURACIÓN: el número de WhatsApp vive SOLO aquí =====
     Formato wa.me: 52 + 10 dígitos, sin signos ni espacios. */
  const WHATSAPP = '524495775195';
  const NEGOCIO = 'Importadora MV';

  const root = document.documentElement;
  root.classList.add('js');
  // Respaldo: si algo falla, el hero se muestra igual a los 2.4 s.
  const readyTimer = setTimeout(() => root.classList.add('is-ready'), 2400);

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const hasWA = /^\d{10,15}$/.test(WHATSAPP);
  const waUrl = (text) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
  if (!hasWA) root.classList.add('no-wa');

  /* ===== Cargador (≤ 2.5 s; el CSS tiene un respaldo que lo oculta solo) ===== */
  function initLoader() {
    const el = $('#loader');
    const num = $('#loaderNum');
    if (!el) { root.classList.add('is-ready'); return; }
    const t0 = performance.now();
    const end = Math.max(t0 + 500, 1450); // ms desde el inicio de la navegación
    const dur = end - t0;
    const finish = () => {
      el.classList.add('is-out');
      root.classList.add('is-ready');
      clearTimeout(readyTimer);
      setTimeout(() => el.classList.add('is-gone'), 780);
    };
    const tick = (now) => {
      const p = clamp((now - t0) / dur);
      if (num) num.textContent = Math.round((1 - Math.pow(1 - p, 3)) * 100);
      if (p < 1) requestAnimationFrame(tick); else finish();
    };
    requestAnimationFrame(tick);
  }

  /* ===== WhatsApp: enlaces de todos los CTA ===== */
  function wireWhatsApp() {
    if (!hasWA) return;
    $$('[data-wa]').forEach((a) => {
      a.href = waUrl(a.dataset.wa);
      a.target = '_blank';
      a.rel = 'noopener';
    });
    $$('.pcard').forEach((card) => {
      const a = $('[data-prod]', card);
      if (!a) return;
      const msg = `Hola ${NEGOCIO}, me interesa ${card.dataset.b} ${card.dataset.name} (cód. ${card.dataset.code}). ¿Tienen disponibilidad y precio?`;
      a.href = waUrl(msg);
      a.target = '_blank';
      a.rel = 'noopener';
    });
    const fl = $('.wa-float');
    if (fl) {
      setTimeout(() => fl.classList.add('is-tip'), 6500);
      setTimeout(() => fl.classList.remove('is-tip'), 13500);
    }
  }

  /* ===== Menú móvil ===== */
  function initMenu() {
    const burger = $('.burger');
    const menu = $('#menu');
    if (!burger || !menu) return;
    const set = (open) => {
      root.classList.toggle('menu-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      menu.setAttribute('aria-hidden', String(!open));
    };
    burger.addEventListener('click', () => set(!root.classList.contains('menu-open')));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
    window.matchMedia('(min-width: 960px)').addEventListener('change', (e) => { if (e.matches) set(false); });
  }

  /* ===== Enlace activo del menú ===== */
  function initNavSpy() {
    if (!('IntersectionObserver' in window)) return;
    const links = $$('.nav a');
    const map = new Map();
    links.forEach((a) => { const t = $(a.getAttribute('href')); if (t) map.set(t, a); });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((l) => l.removeAttribute('aria-current'));
        const a = map.get(en.target);
        if (a) a.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((_, sec) => io.observe(sec));
  }

  /* ===== Motor de scroll ===== */
  function splitWords(el) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        const s = document.createElement('span');
        s.className = 'w';
        s.textContent = part;
        frag.appendChild(s);
      });
      node.parentNode.replaceChild(frag, node);
    });
    return $$('.w', el);
  }

  function initScrollEngine() {
    const bar = $('#progress');
    const header = $('#header');
    const seal = $('#sello');
    const mText = $('#manifestoText');
    const mWords = mText ? splitWords(mText) : [];
    const timeline = $('#timeline');
    const steps = $$('.step');
    const px = $$('.px');
    let lastY = window.scrollY;
    let busy = false;
    let boost = 0;
    let boostRaf = 0;
    let mqAnims = null;

    if (reduceMotion) mWords.forEach((w) => w.classList.add('on'));

    function marqueeBoost(dy) {
      if (reduceMotion) return;
      if (!mqAnims) mqAnims = $$('.marquee__row').flatMap((r) => (r.getAnimations ? r.getAnimations() : []));
      if (!mqAnims.length) return;
      boost = Math.min(6, boost + Math.abs(dy) * 0.03);
      if (!boostRaf) boostRaf = requestAnimationFrame(decay);
    }
    function decay() {
      boost *= 0.93;
      const rate = 1 + boost;
      mqAnims.forEach((a) => { a.playbackRate = rate; });
      if (boost > 0.02) boostRaf = requestAnimationFrame(decay);
      else { boostRaf = 0; boost = 0; mqAnims.forEach((a) => { a.playbackRate = 1; }); }
    }

    function update() {
      busy = false;
      const y = window.scrollY;
      const vh = window.innerHeight;
      const max = root.scrollHeight - vh;

      if (bar) bar.style.transform = `scaleX(${max > 0 ? clamp(y / max).toFixed(4) : 0})`;
      if (header) header.classList.toggle('is-stuck', y > 24);

      // Sello: la imagen del logo se abre hasta ocupar toda la pantalla
      if (seal) {
        const r = seal.getBoundingClientRect();
        if (r.bottom > -50 && r.top < vh + 50) {
          const p = clamp(-r.top / Math.max(1, r.height - vh));
          const e = clamp(p / 0.62);
          seal.style.setProperty('--ex', (e * e * (3 - 2 * e)).toFixed(4));
        }
      }

      // Manifiesto: las palabras se iluminan con el scroll
      if (mText && !reduceMotion && mWords.length) {
        const r = mText.getBoundingClientRect();
        if (r.bottom > -100 && r.top < vh + 100) {
          const p = clamp((vh * 0.86 - r.top) / (r.height + vh * 0.38));
          const n = Math.round(p * mWords.length * 1.04);
          mWords.forEach((w, i) => w.classList.toggle('on', i < n));
        }
      }

      // Línea de tiempo: el hilo dorado se dibuja
      if (timeline) {
        const r = timeline.getBoundingClientRect();
        if (r.bottom > -100 && r.top < vh + 100) {
          timeline.style.setProperty('--tp', clamp((vh * 0.66 - r.top) / r.height).toFixed(4));
          steps.forEach((s) => s.classList.toggle('is-on', s.getBoundingClientRect().top < vh * 0.7));
        }
      }

      // Parallax suave en decoraciones
      if (!reduceMotion) {
        px.forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.bottom < -300 || r.top > vh + 300) return;
          const d = r.top + r.height / 2 - vh / 2;
          el.style.setProperty('--py', `${(-d * (parseFloat(el.dataset.px) || 0.06)).toFixed(1)}px`);
        });
      }

      const dy = y - lastY;
      if (Math.abs(dy) > 2) marqueeBoost(dy);
      lastY = y;
    }
    const onScroll = () => { if (!busy) { busy = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }

  /* ===== Reveal al entrar en pantalla ===== */
  function initReveal() {
    // Cuadrícula de catálogo: solo las primeras tarjetas entran con reveal
    $$('.pcard').slice(0, 12).forEach((c, i) => {
      c.setAttribute('data-reveal', '');
      c.style.setProperty('--d', `${(i % 4) * 0.08}s`);
    });
    $$('[data-stagger]').forEach((g) => {
      Array.from(g.children).forEach((c, i) => {
        c.setAttribute('data-reveal', '');
        c.style.setProperty('--d', `${(i % 6) * 0.09}s`);
      });
    });
    const items = $$('[data-reveal]');
    const done = (el) => {
      el.classList.add('is-in');
      // Limpia el atributo para que las transiciones propias (hover, flex) vuelvan a mandar.
      setTimeout(() => el.removeAttribute('data-reveal'), 2400);
    };
    if (!('IntersectionObserver' in window)) { items.forEach(done); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { done(en.target); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    items.forEach((el) => io.observe(el));
  }

  /* ===== Contadores ===== */
  function initCounters() {
    const els = $$('[data-count]');
    if (!els.length || !('IntersectionObserver' in window)) return;
    const run = (el) => {
      const to = Number(el.dataset.count) || 0;
      if (reduceMotion) { el.textContent = String(to); return; }
      const t0 = performance.now();
      const dur = 1600;
      const step = (now) => {
        const p = clamp((now - t0) / dur);
        el.textContent = String(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { run(en.target); io.unobserve(en.target); } });
    }, { threshold: 0.6 });
    els.forEach((el) => { el.textContent = '0'; io.observe(el); });
  }

  /* ===== Hero: partículas doradas + inclinación 3D con el puntero ===== */
  function initHero() {
    const hero = $('#inicio');
    const cv = $('#dust');
    const stage = $('.stage__tilt');
    if (!hero || !cv || !cv.getContext) return;
    const ctx = cv.getContext('2d');
    let W = 0, H = 0, dpr = 1, parts = [], raf = 0, visible = true;
    const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, inside: false };

    const make = (initial) => ({
      x: Math.random() * W,
      y: initial ? Math.random() * H : H + 10,
      r: Math.random() * 1.8 + 0.5,
      vx: (Math.random() - 0.5) * 0.18,
      vy: -(Math.random() * 0.35 + 0.08),
      ph: Math.random() * 6.28,
      sp: Math.random() * 0.02 + 0.006,
      star: Math.random() < 0.14,
    });
    function size() {
      const w = hero.clientWidth, h = hero.clientHeight;
      if (!w || !h || (w === W && h === H)) return;
      W = w; H = h;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(clamp((W * H) / 16000, 24, 90));
      parts = Array.from({ length: n }, () => make(true));
    }
    function star(x, y, r, a) {
      ctx.save();
      ctx.translate(x, y);
      ctx.globalAlpha = a;
      ctx.fillStyle = '#f0d3a6';
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.quadraticCurveTo(r * 0.12, -r * 0.12, r, 0);
      ctx.quadraticCurveTo(r * 0.12, r * 0.12, 0, r);
      ctx.quadraticCurveTo(-r * 0.12, r * 0.12, -r, 0);
      ctx.quadraticCurveTo(-r * 0.12, -r * 0.12, 0, -r);
      ctx.fill();
      ctx.restore();
    }
    function frame(t) {
      ctx.clearRect(0, 0, W, H);
      const px = pointer.x * W, py = pointer.y * H;
      for (const p of parts) {
        p.ph += p.sp;
        p.x += p.vx + Math.sin(p.ph) * 0.25;
        p.y += p.vy;
        if (pointer.inside) {
          const dx = p.x - px, dy = p.y - py, d = Math.hypot(dx, dy) || 1;
          if (d < 150) { const f = (150 - d) / 150; p.x += (dx / d) * f * 2.2; p.y += (dy / d) * f * 2.2; }
        }
        if (p.y < -10 || p.x < -10 || p.x > W + 10) Object.assign(p, make(false));
        const a = 0.35 + 0.55 * Math.abs(Math.sin(p.ph * 1.7));
        if (p.star) star(p.x, p.y, p.r * 3.4, a);
        else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fillStyle = `rgba(240,211,166,${(a * 0.8).toFixed(3)})`; ctx.fill(); }
      }
      ctx.lineWidth = 0.6;
      for (let i = 0; i < parts.length; i++) {
        for (let j = i + 1; j < parts.length; j++) {
          const dx = parts[i].x - parts[j].x, dy = parts[i].y - parts[j].y, d2 = dx * dx + dy * dy;
          if (d2 < 9000) {
            ctx.strokeStyle = `rgba(227,184,124,${((1 - d2 / 9000) * 0.22).toFixed(3)})`;
            ctx.beginPath(); ctx.moveTo(parts[i].x, parts[i].y); ctx.lineTo(parts[j].x, parts[j].y); ctx.stroke();
          }
        }
      }
      if (stage && !reduceMotion) {
        if (!pointer.inside) { pointer.tx = 0.5 + Math.sin(t / 2300) * 0.2; pointer.ty = 0.5 + Math.cos(t / 2900) * 0.14; }
        pointer.x = lerp(pointer.x, pointer.tx, 0.06);
        pointer.y = lerp(pointer.y, pointer.ty, 0.06);
        stage.style.setProperty('--rx', `${((pointer.y - 0.5) * -14).toFixed(2)}deg`);
        stage.style.setProperty('--ry', `${((pointer.x - 0.5) * 18).toFixed(2)}deg`);
      }
      if (!reduceMotion) raf = requestAnimationFrame(frame);
    }
    const start = () => { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame); };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };

    size();
    if ('ResizeObserver' in window) new ResizeObserver(size).observe(hero);
    else window.addEventListener('resize', size);
    if (reduceMotion) { frame(0); return; }

    hero.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      const r = hero.getBoundingClientRect();
      pointer.tx = clamp((e.clientX - r.left) / r.width);
      pointer.ty = clamp((e.clientY - r.top) / r.height);
      pointer.inside = true;
    });
    hero.addEventListener('pointerleave', () => { pointer.inside = false; });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) start(); else stop(); }).observe(hero);
    }
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
    start();
  }

  /* ===== Trío: paneles que se expanden ===== */
  function initTrio() {
    const list = $('#trio');
    if (!list) return;
    const panels = $$('.panel', list);
    const mq = window.matchMedia('(min-width: 900px)');
    let idx = 0, timer = 0, userTouched = false;
    const set = (i) => { idx = i; panels.forEach((p, k) => p.classList.toggle('is-active', k === i)); };
    const stop = () => { clearInterval(timer); timer = 0; };
    const start = () => {
      if (timer || reduceMotion || userTouched) return;
      timer = setInterval(() => { if (mq.matches && !document.hidden) set((idx + 1) % panels.length); }, 5200);
    };
    panels.forEach((p, i) => {
      ['mouseenter', 'focusin', 'click'].forEach((ev) => p.addEventListener(ev, () => {
        if (!mq.matches) return;
        userTouched = true; stop(); set(i);
      }));
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => { if (es[0].isIntersecting) start(); else stop(); }, { threshold: 0.35 }).observe(list);
    }
  }

  /* ===== Catálogo: filtros, paginado y tilt ===== */
  const filterHooks = {};
  function initCatalog() {
    const grid = $('#grid');
    if (!grid) return;
    const cards = $$('.pcard', grid);
    const count = $('#count');
    const empty = $('#empty');
    const more = $('#more');
    const PAGE = 12;
    const state = { g: 'all', b: 'all', limit: PAGE };

    function apply(animate) {
      const matches = cards.filter((c) => (state.g === 'all' || c.dataset.g === state.g) && (state.b === 'all' || c.dataset.b === state.b));
      const before = new Set(cards.filter((c) => !c.hidden));
      cards.forEach((c) => { c.hidden = true; });
      const shown = matches.slice(0, state.limit);
      shown.forEach((c, i) => {
        c.hidden = false;
        if (animate && !reduceMotion && !before.has(c) && c.animate) {
          c.animate(
            [{ opacity: 0, translate: '0 22px', scale: '.96' }, { opacity: 1, translate: '0 0', scale: '1' }],
            { duration: 650, delay: (i % 6) * 55, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' }
          );
        }
      });
      if (count) count.textContent = matches.length ? `Mostrando ${shown.length} de ${matches.length} fragancias` : '';
      if (empty) empty.hidden = matches.length > 0;
      if (more) {
        const left = matches.length - shown.length;
        more.hidden = left <= 0;
        more.firstChild.textContent = `Ver más fragancias (${left})`;
      }
    }
    function setFilter(patch) {
      Object.assign(state, patch, { limit: PAGE });
      $$('.seg__b').forEach((b) => { const on = b.dataset.g === state.g; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); });
      $$('.chipb').forEach((b) => { const on = b.dataset.b === state.b; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); });
      apply(true);
    }
    filterHooks.set = setFilter;

    $$('.seg__b').forEach((b) => b.addEventListener('click', () => setFilter({ g: b.dataset.g })));
    $$('.chipb').forEach((b) => b.addEventListener('click', () => setFilter({ b: b.dataset.b })));
    if (more) more.addEventListener('click', () => { state.limit += PAGE; apply(true); });
    $$('[data-filter]').forEach((a) => a.addEventListener('click', () => setFilter({ g: a.dataset.filter, b: 'all' })));

    // Inclinación 3D de las tarjetas (solo puntero fino)
    if (finePointer && !reduceMotion) {
      grid.addEventListener('pointermove', (e) => {
        const c = e.target.closest('.pcard');
        if (!c) return;
        const r = c.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        c.style.setProperty('--ry', `${(x * 9).toFixed(2)}deg`);
        c.style.setProperty('--rx', `${(-y * 9).toFixed(2)}deg`);
      });
      grid.addEventListener('pointerout', (e) => {
        const c = e.target.closest('.pcard');
        if (c && !c.contains(e.relatedTarget)) { c.style.removeProperty('--rx'); c.style.removeProperty('--ry'); }
      });
    }
    apply(false);
  }

  /* ===== Buscador de aroma ===== */
  function initFinder() {
    const box = $('#finder');
    if (!box) return;
    const steps = $$('.fstep', box);
    const dots = $$('.finder__prog i', box);
    const res = $('#fresult');
    const title = $('#fTitle');
    const list = $('#fList');
    const wa = $('#fWa');
    const reset = $('#fReset');
    const cards = $$('.pcard');
    const ans = {};
    const textPara = { ella: 'para ella', el: 'para él', uni: 'unisex', any: 'para cualquier persona' };
    const textAroma = { dulce: 'dulce y envolvente', fresco: 'fresco y limpio', floral: 'floral y elegante', oud: 'profundo y misterioso' };

    function show(step) {
      steps.forEach((s) => s.classList.toggle('is-active', Number(s.dataset.step) === step));
      dots.forEach((d, i) => d.classList.toggle('is-on', i < step));
      res.hidden = true;
    }
    function result() {
      steps.forEach((s) => s.classList.remove('is-active'));
      dots.forEach((d) => d.classList.add('is-on'));
      const scored = cards.map((c) => {
        const fams = (c.dataset.fam || '').split(' ');
        let s = 0;
        if (fams.includes(ans.aroma)) s += fams[0] === ans.aroma ? 3 : 2;
        if (ans.para === 'ella' || ans.para === 'el') { if (c.dataset.g === ans.para) s += 2; else if (c.dataset.g === 'uni') s += 1; else s -= 5; }
        else if (ans.para === 'uni') { if (c.dataset.g === 'uni') s += 2; else s -= 1; }
        return { c, s };
      }).filter((o) => o.s >= 2).sort((a, b) => b.s - a.s).slice(0, 3);

      const desc = `${textPara[ans.para]} · ${textAroma[ans.aroma]}`;
      let msg;
      if (scored.length) {
        title.textContent = 'Tus 3 fragancias ideales';
        list.innerHTML = scored.map(({ c }) => {
          const style = ['--c1', '--c2', '--cap'].map((v) => `${v}:${c.style.getPropertyValue(v)}`).join(';');
          const shape = $('.flask', c) ? $('.flask', c).className.replace('flask ', '') : 'flask--tall';
          return `<article class="rcard" style="${esc(style)}"><div class="rcard__art"><i class="flask ${esc(shape)}"><span></span></i></div><div><small>${esc(c.dataset.b)} · Cód. ${esc(c.dataset.code)}</small><b>${esc(c.dataset.name)}</b><span>${esc($$('.notes li', c).map((li) => li.textContent.trim()).join(' · '))}</span></div></article>`;
        }).join('');
        const names = scored.map(({ c }) => `${c.dataset.b} ${c.dataset.name} (cód. ${c.dataset.code})`).join(', ');
        msg = `Hola ${NEGOCIO}, usé el buscador de aroma de su página: busco algo ${desc}. Me interesan: ${names}. ¿Tienen disponibilidad y precio?`;
      } else {
        title.textContent = 'Cuéntanos más y te asesoramos';
        list.innerHTML = '<p>Con esa combinación necesitamos ayudarte de forma personal. Escríbenos y te recomendamos opciones de todo el catálogo.</p>';
        msg = `Hola ${NEGOCIO}, busco una fragancia ${desc}. ¿Me ayudan a elegir?`;
      }
      if (wa && hasWA) { wa.href = waUrl(msg); wa.target = '_blank'; wa.rel = 'noopener'; }
      res.hidden = false;
    }
    box.addEventListener('click', (e) => {
      const b = e.target.closest('.opt');
      if (!b) return;
      ans[b.dataset.q] = b.dataset.v;
      if (b.dataset.q === 'para') show(2); else result();
    });
    if (reset) reset.addEventListener('click', () => { Object.keys(ans).forEach((k) => delete ans[k]); show(1); });
  }

  /* ===== Formulario → WhatsApp ===== */
  function initForm() {
    const form = $('#form');
    if (!form) return;
    const fieldName = $('#fNombre');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const nombre = form.elements.nombre.value.trim();
      if (!nombre) {
        if (fieldName) fieldName.classList.add('has-error');
        form.elements.nombre.focus();
        return;
      }
      if (fieldName) fieldName.classList.remove('has-error');
      if (!hasWA) return;
      const tipo = form.elements.tipo.value === 'mayoreo' ? 'mayoreo (para mi negocio)' : 'menudeo (para mí)';
      const interes = form.elements.interes.value.trim();
      const extra = form.elements.mensaje.value.trim();
      const lines = [`Hola ${NEGOCIO}, soy ${nombre}.`, `Quiero comprar al ${tipo}.`];
      if (interes) lines.push(`Me interesa: ${interes}.`);
      if (extra) lines.push(extra);
      lines.push('¿Me ayudan con disponibilidad y precio?');
      const a = document.createElement('a');
      a.href = waUrl(lines.join('\n'));
      a.target = '_blank';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
    form.elements.nombre.addEventListener('input', () => { if (fieldName) fieldName.classList.remove('has-error'); });
  }

  /* ===== Efectos de puntero: magnético y foco de luz ===== */
  function initPointerFx() {
    if (!finePointer || reduceMotion) return;
    $$('.mag').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--tx', `${((e.clientX - r.left - r.width / 2) * 0.2).toFixed(1)}px`);
        el.style.setProperty('--ty', `${((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1)}px`);
      });
      el.addEventListener('pointerleave', () => { el.style.removeProperty('--tx'); el.style.removeProperty('--ty'); });
    });
    $$('.spot').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${(e.clientX - r.left).toFixed(0)}px`);
        el.style.setProperty('--my', `${(e.clientY - r.top).toFixed(0)}px`);
      });
    });
  }

  /* ===== Arranque ===== */
  function init() {
    const y = $('#year');
    if (y) y.textContent = String(new Date().getFullYear());
    initLoader();
    wireWhatsApp();
    initMenu();
    initNavSpy();
    initScrollEngine();
    initReveal();
    initCounters();
    initHero();
    initTrio();
    initCatalog();
    initFinder();
    initForm();
    initPointerFx();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
