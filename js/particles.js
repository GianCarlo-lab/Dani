/**
 * Ambient decoration: the always-on background layer (bokeh + stars,
 * built once), ambient sparkles/pollen/floating hearts, and the
 * tap-triggered heart/petal bursts. Nothing runs until app.js calls
 * these entry points.
 *
 * Continuous ambient spawners (hearts, pollen) use a small FIXED-SIZE
 * pool of reused DOM nodes instead of creating a new element every
 * tick forever — a long-open tab spawning a heart every 700ms would
 * otherwise churn through thousands of create/destroy cycles over an
 * hour even though the on-screen count stays bounded. Tap-triggered
 * bursts (hearts, petals) stay simple create + auto-remove, since
 * they're inherently bounded by how often a person can actually tap.
 */
(function () {
  'use strict';

  var Bouquet = window.Bouquet;

  // Romantic accent palette for ambient floating hearts / sparkle
  var coloresAmbiente = ['#ff5d8f', '#ff8fa3', '#e0356b', '#c65fa8', '#ffd166'];
  var coloresPetalo = ['#f4a7c4', '#ffffff', '#c9a0ff', '#ff6f61', '#fff2c2'];

  function heartSVG(color) {
    return '<svg viewBox="0 0 32 29" xmlns="http://www.w3.org/2000/svg">'
         + '<path d="M16 29 C16 29 0 18.5 0 8.8 C0 2.9 4.6 0 9 0 C12.2 0 14.8 1.9 16 4.6 C17.2 1.9 19.8 0 23 0 C27.4 0 32 2.9 32 8.8 C32 18.5 16 29 16 29 Z" fill="' + color + '"/>'
         + '</svg>';
  }

  // kept intentionally simple/local rather than reusing bouquet.js's
  // full petal-path machinery — a falling particle doesn't need
  // flower-grade fidelity, and this keeps particles.js self-contained
  function petalSVG(color) {
    return '<svg viewBox="0 0 20 30" xmlns="http://www.w3.org/2000/svg">'
         + '<path d="M10,30 C2,22 2,8 10,0 C18,8 18,22 10,30 Z" fill="' + color + '"/>'
         + '</svg>';
  }

  /* ---------- generic fixed-size recycled pool ---------- */

  /**
   * Creates `size` hidden elements of `className` once, appended to
   * `stage`. Returns { acquire(), release(slot) } — acquire() hands
   * back an idle {el} slot (or null if every slot is currently
   * animating), release() marks it idle again. Callers reset the
   * element's own styling/animation each time they acquire a slot.
   */
  function createPool(stage, className, size) {
    var slots = [];
    for (var i = 0; i < size; i++) {
      var el = document.createElement('div');
      el.className = className;
      el.style.opacity = '0';
      stage.appendChild(el);
      slots.push({ el: el, busy: false });
    }
    return {
      acquire: function () {
        for (var i = 0; i < slots.length; i++) {
          if (!slots[i].busy) { slots[i].busy = true; return slots[i]; }
        }
        return null; // every slot busy — silently skip this spawn tick
      },
      release: function (slot) { slot.busy = false; }
    };
  }

  /** Restarts a CSS animation on an element (forces a reflow between). */
  function restartAnimation(el, animationCss) {
    el.style.animation = 'none';
    void el.offsetHeight; // eslint-disable-line no-void -- forces the reflow that lets the animation restart
    el.style.animation = animationCss;
  }

  var heartPool = null;
  var pollenPool = null;

  /** One floating heart or gold dot, rising and fading, then recycled. */
  function activateFlotante(slot, stage) {
    var el = slot.el;
    var isHeart = Math.random() > 0.4;
    var size = 12 + Math.random() * 14;
    var duration = 5 + Math.random() * 3;
    el.style.left = (20 + Math.random() * 60) + '%';
    el.style.bottom = '20%';
    el.style.top = 'auto';
    el.style.width = size + 'px';
    el.style.height = (isHeart ? size * 0.9 : size) + 'px';
    if (isHeart) {
      var c = coloresAmbiente[Math.floor(Math.random() * coloresAmbiente.length)];
      el.style.background = 'none';
      el.style.borderRadius = '0';
      el.innerHTML = heartSVG(c);
    } else {
      el.innerHTML = '';
      el.style.background = 'var(--gold)';
      el.style.borderRadius = '50%';
    }
    restartAnimation(el, 'flotar ' + duration + 's ease-in-out 1');
    var onEnd = function () {
      el.removeEventListener('animationend', onEnd);
      heartPool.release(slot);
    };
    el.addEventListener('animationend', onEnd);
    stage.appendChild(el); // no-op if already attached; keeps it after later-added siblings
  }

  /** One drifting gold pollen speck near the bouquet, then recycled. */
  function activatePolen(slot) {
    var el = slot.el;
    var size = 2 + Math.random() * 2.5;
    var duration = 6 + Math.random() * 4;
    el.style.left = (30 + Math.random() * 40) + '%';
    el.style.bottom = (8 + Math.random() * 30) + '%';
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    el.style.setProperty('--polen-dx', (Math.random() * 40 - 20) + 'px');
    restartAnimation(el, 'polvoDorado ' + duration + 's ease-in-out 1');
    var onEnd = function () {
      el.removeEventListener('animationend', onEnd);
      pollenPool.release(slot);
    };
    el.addEventListener('animationend', onEnd);
  }

  /** Starts the recurring ambient heart/gold-dot + pollen spawners. */
  function startAmbientSpawners(stage) {
    if (!heartPool) heartPool = createPool(stage, 'flotante', 14);
    if (!pollenPool) pollenPool = createPool(stage, 'polen', 10);

    setTimeout(function () {
      setInterval(function () {
        var slot = heartPool.acquire();
        if (slot) activateFlotante(slot, stage);
      }, 700);
    }, 2200);

    setTimeout(function () {
      setInterval(function () {
        var slot = pollenPool.acquire();
        if (slot) activatePolen(slot);
      }, 900);
    }, 1200);
  }

  /** One-time scatter of pulsing gold sparkles across the background. */
  function spawnSparkles(stage) {
    for (var i = 0; i < 18; i++) {
      var s = document.createElement('div');
      s.className = 'sparkle';
      var size = 2 + Math.random() * 3;
      s.style.width = size + 'px';
      s.style.height = size + 'px';
      s.style.left = Math.random() * 100 + '%';
      s.style.top = Math.random() * 70 + '%';
      s.style.animationDelay = (Math.random() * 4) + 's';
      s.style.animationDuration = (3 + Math.random() * 3) + 's';
      stage.appendChild(s);
    }
  }

  /**
   * One-time background layer: soft bokeh circles + twinkling stars,
   * built once and never touched again (no spawn/despawn churn — they
   * just sit there animating opacity/transform forever). Painted
   * first/behind everything via its own low z-index.
   */
  function spawnBackgroundLayer(stage) {
    var layer = document.createElement('div');
    layer.className = 'fondo-ambiente';
    stage.insertBefore(layer, stage.firstChild);

    var BOKEH_COLORS = ['#ff8fa3', '#c9a0ff', '#ffd166', '#f6c453'];
    for (var i = 0; i < 8; i++) {
      var b = document.createElement('div');
      b.className = 'bokeh';
      var size = 70 + Math.random() * 130;
      b.style.width = size + 'px';
      b.style.height = size + 'px';
      b.style.left = Math.random() * 100 + '%';
      b.style.top = (Math.random() * 80) + '%';
      b.style.background = BOKEH_COLORS[i % BOKEH_COLORS.length];
      b.style.setProperty('--bokeh-final-opacity', (0.08 + Math.random() * 0.1).toFixed(2));
      b.style.animationDuration = (2 + Math.random()) + 's, ' + (20 + Math.random() * 16) + 's';
      b.style.animationDelay = (Math.random() * 2) + 's, 0s';
      layer.appendChild(b);
    }

    for (var j = 0; j < 34; j++) {
      var star = document.createElement('div');
      star.className = 'estrella';
      star.style.left = Math.random() * 100 + '%';
      star.style.top = Math.random() * 65 + '%';
      star.style.setProperty('--star-max-opacity', (0.5 + Math.random() * 0.5).toFixed(2));
      star.style.animationDuration = (2.4 + Math.random() * 3) + 's';
      star.style.animationDelay = (Math.random() * 4) + 's';
      layer.appendChild(star);
    }
  }

  /** Tap/click interaction: a small burst of hearts at (x, y). */
  function spawnHeartBurst(x, y, stage) {
    for (var i = 0; i < 8; i++) {
      var el = document.createElement('div');
      el.className = 'flotante';
      var size = 10 + Math.random() * 10;
      el.style.left = 'calc(' + x + 'px - 10px)';
      el.style.bottom = 'auto';
      el.style.top = y + 'px';
      el.style.width = size + 'px';
      el.style.height = size * 0.9 + 'px';
      el.style.animationDuration = (2 + Math.random() * 1.5) + 's';
      var c = coloresAmbiente[Math.floor(Math.random() * coloresAmbiente.length)];
      el.innerHTML = heartSVG(c);
      stage.appendChild(el);
      setTimeout(function () { el.remove(); }, 3500);
    }
  }

  /** Tap-on-flower interaction: a small burst of falling petals at (x, y). */
  function spawnPetalBurst(x, y, stage, count) {
    var n = count || 6;
    for (var i = 0; i < n; i++) {
      var el = document.createElement('div');
      el.className = 'petalo-caida';
      var size = 8 + Math.random() * 8;
      el.style.left = 'calc(' + x + 'px - ' + (size / 2) + 'px)';
      el.style.top = y + 'px';
      el.style.width = size + 'px';
      el.style.height = size * 1.5 + 'px';
      el.style.setProperty('--petal-dx', (Math.random() * 70 - 35) + 'px');
      el.style.setProperty('--petal-rot', (120 + Math.random() * 160) + 'deg');
      el.style.animationDuration = (1.4 + Math.random() * 0.9) + 's';
      var c = coloresPetalo[Math.floor(Math.random() * coloresPetalo.length)];
      el.innerHTML = petalSVG(c);
      stage.appendChild(el);
      setTimeout(function () { el.remove(); }, 2600);
    }
  }

  /** Tap-on-flower accent: a couple of quick gold sparkles at (x, y). */
  function spawnGoldAccent(x, y, stage) {
    for (var i = 0; i < 3; i++) {
      var el = document.createElement('div');
      el.className = 'sparkle';
      var size = 3 + Math.random() * 3;
      el.style.left = (x + (Math.random() * 30 - 15)) + 'px';
      el.style.top = (y + (Math.random() * 30 - 15)) + 'px';
      el.style.width = size + 'px';
      el.style.height = size + 'px';
      el.style.animationDuration = '1.1s';
      stage.appendChild(el);
      setTimeout(function () { el.remove(); }, 1300);
    }
  }

  Bouquet.particles = Bouquet.particles || {};
  Bouquet.particles.heartSVG = heartSVG;
  Bouquet.particles.spawnSparkles = spawnSparkles;
  Bouquet.particles.spawnBackgroundLayer = spawnBackgroundLayer;
  Bouquet.particles.startAmbientSpawners = startAmbientSpawners;
  Bouquet.particles.spawnHeartBurst = spawnHeartBurst;
  Bouquet.particles.spawnPetalBurst = spawnPetalBurst;
  Bouquet.particles.spawnGoldAccent = spawnGoldAccent;
})();
