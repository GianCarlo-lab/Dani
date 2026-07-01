/**
 * Palette, word list, and tuning knobs for the Universo view. Plain
 * data + tiny pure helpers only — no Three.js calls here. Deliberately
 * independent from js/utilities.js (the bouquet's namespace) per the
 * "don't reuse bouquet code" requirement, even though a couple of
 * helpers (seeded PRNG, clamp) are conceptually similar.
 */
(function () {
  'use strict';

  window.Universo = window.Universo || {};

  var PALETTE = {
    bg: 0x0a0410,
    fog: 0x140a1e,
    planetCore: 0x6a1e42,
    planetMid: 0xb03a6b,
    planetHighlight: 0xffb6d9,
    wine: 0x5c1330,
    magenta: 0xc23a7a,
    lilac: 0xb98ee0,
    violet: 0x7a4bc9,
    gold: 0xffc46b,
    goldSoft: 0xffe0a3,
    starWarm: 0xfff2e0,
    starCool: 0xd8c6ff,
    heart: 0xff2f7e,
    heartCore: 0xffe27a,
    heartRim: 0xff5fc2,
    // saturated, "glow in the dark" neon variants used for the rings'
    // words and their dust — much more vivid than the soft pastel
    // PALETTE colors above, on purpose
    neonPink: 0xff2fa6,
    neonMagenta: 0xe619c9,
    neonViolet: 0xa64bff,
    neonGold: 0xffce33,
    neonRose: 0xff4f8f
  };

  var PHRASES = [
    'TE AMO',
    'MI GORDITA',
    'ERES MI TODO',
    'AMOR ETERNO',
    'MI CIELO',
    'MI FELICIDAD',
    'SIEMPRE JUNTOS',
    'MI VIDA',
    'INFINITO ♾',
    'ERES MI HOGAR',
    'CONTIGO TODO ES MEJOR',
    'NUNCA SOLTARÉ TU MANO'
  ];

  // deterministic PRNG (mulberry32) — same reproducibility philosophy as
  // the bouquet's dataset, implemented locally so Universo has zero
  // dependency on js/utilities.js
  function mulberry32(seed) {
    var state = seed >>> 0;
    return function () {
      state = (state + 0x6D2B79F5) | 0;
      var t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function seedFromString(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    return h >>> 0;
  }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  // ring tone groups, cycled per ring index — saturated neon versions
  // of the pink/wine/purple/gold palette so the words read as glowing
  // (used with THREE.AdditiveBlending, so brighter/more saturated =
  // more "phosphorescent", not just a lighter tint)
  var RING_TONES = [
    { text: '#ff6fc9', glow: PALETTE.neonPink },
    { text: '#c98bff', glow: PALETTE.neonViolet },
    { text: '#ffd94d', glow: PALETTE.neonGold },
    { text: '#ff5fae', glow: PALETTE.neonMagenta }
  ];

  window.Universo.constants = {
    PALETTE: PALETTE,
    PHRASES: PHRASES,
    RING_TONES: RING_TONES,
    RING_COUNT: 6,
    STAR_COUNT: 2200,
    DUST_COUNT: 220,
    RING_DUST_COUNT: 130,
    HEART_POINT_COUNT: 3200,
    HEART_EMIT_POOL: 16,
    PLANET_RADIUS: 34,
    mulberry32: mulberry32,
    seedFromString: seedFromString,
    clamp: clamp,
    lerp: lerp
  };
})();
