/**
 * Shared namespace + small pure helpers used across every other script.
 * Must load first — nothing here touches the DOM or runs on load.
 */
(function () {
  'use strict';

  window.Bouquet = window.Bouquet || {};
  var Bouquet = window.Bouquet;

  /* ---------- randomness ---------- */

  /**
   * Tiny deterministic PRNG (mulberry32). Given the same seed it always
   * produces the same sequence — used so each flower's "imperfections"
   * (petal jitter, gradient variance) are stable across page loads
   * instead of changing every refresh, which would make the bouquet's
   * hand-tuned layout impossible to visually iterate on.
   * @param {number} seed
   * @returns {() => number} a function returning floats in [0, 1)
   */
  function mulberry32(seed) {
    var state = seed >>> 0;
    return function () {
      state = (state + 0x6D2B79F5) | 0;
      var t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Derives a small integer seed from a string (species+variant+index style keys). */
  function seedFromString(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) {
      h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return h >>> 0;
  }

  /** Random float in [min, max). Pass a seeded rand() to keep it deterministic. */
  function randRange(min, max, rand) {
    var r = rand ? rand() : Math.random();
    return min + r * (max - min);
  }

  /** Picks a random element from an array. Pass a seeded rand() to keep it deterministic. */
  function pick(arr, rand) {
    var r = rand ? rand() : Math.random();
    return arr[Math.floor(r * arr.length)];
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function degToRad(deg) {
    return (deg * Math.PI) / 180;
  }

  /** Delays invoking fn until `wait` ms have passed without another call. */
  function debounce(fn, wait) {
    var timer = null;
    return function () {
      var args = arguments;
      var ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(ctx, args); }, wait);
    };
  }

  /* ---------- color ---------- */

  function hexToRgb(hex) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    var num = parseInt(h, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }

  function rgbToHex(r, g, b) {
    function ch(v) {
      var s = clamp(Math.round(v), 0, 255).toString(16);
      return s.length === 1 ? '0' + s : s;
    }
    return '#' + ch(r) + ch(g) + ch(b);
  }

  /** Blends a hex color toward white by `amt` (0-1). */
  function lighten(hex, amt) {
    var c = hexToRgb(hex);
    return rgbToHex(
      c.r + (255 - c.r) * amt,
      c.g + (255 - c.g) * amt,
      c.b + (255 - c.b) * amt
    );
  }

  /** Blends a hex color toward black by `amt` (0-1). */
  function darken(hex, amt) {
    var c = hexToRgb(hex);
    return rgbToHex(c.r * (1 - amt), c.g * (1 - amt), c.b * (1 - amt));
  }

  Bouquet.utils = {
    mulberry32: mulberry32,
    seedFromString: seedFromString,
    randRange: randRange,
    pick: pick,
    clamp: clamp,
    lerp: lerp,
    degToRad: degToRad,
    debounce: debounce,
    lighten: lighten,
    darken: darken
  };

  /* ---------- dom helpers ---------- */

  /** Creates an element with an optional class, optionally appended to a parent. */
  function createEl(tag, className, parent) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (parent) parent.appendChild(el);
    return el;
  }

  Bouquet.dom = {
    createEl: createEl
  };

  /* ---------- shared constants ----------
     Kept in sync by hand with css/variables.css — see the note at the
     top of that file for why these are literal hex strings here rather
     than CSS var() references (SVG fills are generated as raw strings
     and injected via innerHTML, and this project needs to keep working
     in constrained embedded browser viewers). */
  Bouquet.constants = {
    PALETTE: {
      pinkPastel: '#f8d9e2',
      pinkStrong: '#e0356b',
      whiteBloom: '#ffffff',
      cream: '#fff2c2',
      yellowLight: '#ffe9a8',
      lilac: '#d9c2f0',
      violet: '#8a5fc9',
      coralRed: '#ff6f61',
      orangeMuted: '#e8935a',
      olive: '#6b7a3a',
      greenDark: '#2e4d2f'
    },
    DEPTH_BANDS: ['back', 'mid', 'front']
  };
})();
