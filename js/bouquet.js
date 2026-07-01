/**
 * The bouquet itself: petal-shape helpers, the 5 flower species
 * renderers, the hand-tuned stem dataset, and the DOM builders that
 * turn that dataset into the actual bouquet inside #ramo.
 *
 * IMPORTANT — flower/stem attachment invariant (do not break this):
 * .tallo-grupo is a zero-size div that rotates as ONE rigid unit.
 * .flor-anchor sits at `bottom:${h}px` *inside* that rotated group and
 * then counter-rotates by `-rot`. Because CSS `bottom` is resolved in
 * the parent's pre-transform coordinate system, the anchor always ends
 * up exactly at the visual tip of a straight line of length `h` drawn
 * at angle `rot` — and the counter-rotation makes the flower render
 * upright there regardless of the stem's angle. If stem shape ever
 * stops being representable as "a straight run of length h" (e.g.
 * curved stems, added later), the anchor's `bottom` value must still
 * resolve to that same local (0, h) point, or flowers will detach from
 * their stems — this exact bug has happened twice before.
 */
(function () {
  'use strict';

  var Bouquet = window.Bouquet;

  /* ---------- petal shape helpers ---------- */

  function petalPointed(reach, width) {
    var tipY = 50 - reach;
    var bellyY = 50 - reach * 0.5;
    return 'M50,50 C' + (50 - width) + ',' + bellyY + ' ' + (50 - width * 0.7) + ',' + (tipY + 6) + ' 50,' + tipY + ' '
         + 'C' + (50 + width * 0.7) + ',' + (tipY + 6) + ' ' + (50 + width) + ',' + bellyY + ' 50,50 Z';
  }

  // simple smooth-tipped (rounded) petal — single point tip, no notch
  function petalRound(reach, width) {
    var tipY = 50 - reach;
    var bellyY = 50 - reach * 0.55;
    return 'M50,50 C' + (50 - width) + ',' + bellyY + ' ' + (50 - width) + ',' + (tipY + width * 0.35) + ' 50,' + tipY + ' '
         + 'C' + (50 + width) + ',' + (tipY + width * 0.35) + ' ' + (50 + width) + ',' + bellyY + ' 50,50 Z';
  }

  /**
   * One decorated petal: a soft dark offset "shadow petal" behind it
   * (faking inner depth without any blur filter — cheap, just one
   * extra flat-fill path), the real gradient-filled petal, and a thin
   * low-opacity highlight sliver in front (a rim-light catching the
   * light on one edge). Reserved for the outermost, most visible ring
   * of each flower — using it on every ring would triple total path
   * count across 36 flowers for little extra visible benefit.
   */
  function decoratedPetal(shapeFn, reach, width, angle, fillUrl, opacity) {
    var out = '';
    out += '<path d="' + shapeFn(reach * 0.97, width * 1.05) + '" transform="rotate(' + angle + ' 50 50) translate(0.6,1.1)" fill="rgba(0,0,0,.14)"/>';
    out += '<path d="' + shapeFn(reach, width) + '" transform="rotate(' + angle + ' 50 50)" fill="' + fillUrl + '" opacity="' + (opacity != null ? opacity : 0.97) + '"/>';
    out += '<path d="' + shapeFn(reach * 0.88, width * 0.32) + '" transform="rotate(' + (angle + 2) + ' 50 50)" fill="rgba(255,255,255,.32)"/>';
    return out;
  }

  /**
   * Stamps `count` petals evenly around the center, each with a small
   * deterministic jitter in angle/reach/width when `rand` is given
   * (the source of each flower's "no two are pixel-identical"
   * imperfection). `jitterScale` widens or narrows that jitter — the
   * wildflower species uses a larger scale for its deliberately
   * "unkempt" look. Pass `decorate:true` for the outer/most-visible
   * ring to add the shadow-petal + rim-light treatment.
   */
  function ring(count, offsetDeg, reach, width, fill, opacity, shapeFn, rand, decorate, jitterScale) {
    var scale = jitterScale || 1;
    var out = '';
    for (var i = 0; i < count; i++) {
      var angle = offsetDeg + (360 / count) * i + (rand ? (rand() - 0.5) * 6 * scale : 0);
      var reachJ = reach * (1 + (rand ? (rand() - 0.5) * 0.16 * scale : 0));
      var widthJ = width * (1 + (rand ? (rand() - 0.5) * 0.16 * scale : 0));
      out += decorate
        ? decoratedPetal(shapeFn, reachJ, widthJ, angle, fill, opacity)
        : '<path d="' + shapeFn(reachJ, widthJ) + '" transform="rotate(' + angle + ' 50 50)" fill="' + fill + '" opacity="' + opacity + '"/>';
    }
    return out;
  }

  function svgWrap(inner) {
    return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' + inner + '</svg>';
  }

  /**
   * Builds one soft linear gradient per color in a species' palette
   * set (light near the petal base, true color at mid, darker at the
   * tip — see petalPointed/petalRound: every petal template has its
   * base at the shape's own bounding-box bottom and its tip at the
   * top, so a single bottom-to-top gradient direction works correctly
   * for every stamped, rotated copy). IDs are keyed by the flower's
   * stable stem index, so 30+ flowers on screen never collide, and a
   * given stem always gets the same gradients on every page load.
   */
  function buildGradientDefs(index, colorSet, rand) {
    var defs = '';
    var urls = {};
    Object.keys(colorSet).forEach(function (key) {
      var id = 'grad-' + index + '-' + key;
      var lightAmt = 0.3 + (rand ? rand() : 0.5) * 0.15;
      var darkAmt = 0.2 + (rand ? rand() : 0.5) * 0.12;
      var base = colorSet[key];
      defs += '<linearGradient id="' + id + '" x1="0" y1="1" x2="0" y2="0">'
        + '<stop offset="0%" stop-color="' + Bouquet.utils.lighten(base, lightAmt) + '"/>'
        + '<stop offset="55%" stop-color="' + base + '"/>'
        + '<stop offset="100%" stop-color="' + Bouquet.utils.darken(base, darkAmt) + '"/>'
        + '</linearGradient>';
      urls[key] = 'url(#' + id + ')';
    });
    return { defs: '<defs>' + defs + '</defs>', urls: urls };
  }

  /* ---------- seven flower species ---------- */

  function roseSVG(s, rand, index) {
    var g = buildGradientDefs(index, s, rand);
    var u = g.urls;
    var m = g.defs;
    m += ring(6, 0, 46, 16, u.outer, 0.97, petalPointed, rand, true);
    m += ring(6, 30, 33, 14, u.mid, 0.97, petalPointed, rand, false);
    m += ring(5, 12, 20, 10, u.inner, 0.98, petalPointed, rand, false);
    m += ring(4, 40, 9, 6, u.core, 0.9, petalPointed, rand, false);
    m += '<circle cx="50" cy="50" r="3" fill="' + s.core + '" opacity="0.55"/>';
    return svgWrap(m);
  }

  // tulip: a closed upward cup, NOT a flat rosette — petals concentrated
  // within a narrow upward fan (like a real tulip bulb silhouette)
  function tulipanSVG(s, rand, index) {
    var g = buildGradientDefs(index, s, rand);
    var u = g.urls;
    var j = function (base) { return rand ? base + (rand() - 0.5) * 6 : base; };
    var m = g.defs;
    m += '<path d="' + petalRound(38, 15) + '" transform="rotate(' + j(-54) + ' 50 50)" fill="' + u.mid + '" opacity="0.9"/>';
    m += '<path d="' + petalRound(38, 15) + '" transform="rotate(' + j(54) + ' 50 50)" fill="' + u.mid + '" opacity="0.9"/>';
    m += decoratedPetal(petalRound, 46, 17, j(-24), u.outer, 0.97);
    m += decoratedPetal(petalRound, 49, 18, j(0), u.outer, 0.97);
    m += decoratedPetal(petalRound, 46, 17, j(24), u.outer, 0.97);
    m += '<ellipse cx="50" cy="61" rx="7" ry="4" fill="' + s.core + '" opacity="0.55"/>';
    return svgWrap(m);
  }

  // lily: long slender open petals with a bright midrib streak,
  // plus long protruding stamens — the lily's signature feature
  function lirioSVG(s, rand, index) {
    var g = buildGradientDefs(index, s, rand);
    var u = g.urls;
    var m = g.defs;
    m += ring(6, 0, 50, 8, u.outer, 0.97, petalPointed, rand, true);
    m += ring(6, 0, 30, 3, u.mid, 0.85, petalPointed, rand, false); // midrib highlight down each petal
    for (var i = 0; i < 6; i++) {
      var angle = (360 / 6) * i + 30;
      var rad = angle * Math.PI / 180;
      var x2 = 50 + Math.sin(rad) * 20;
      var y2 = 50 - Math.cos(rad) * 20;
      m += '<line x1="50" y1="50" x2="' + x2 + '" y2="' + y2 + '" stroke="' + s.core + '" stroke-width="1.4" opacity="0.9"/>';
      m += '<circle cx="' + x2 + '" cy="' + y2 + '" r="2.6" fill="' + s.core + '" opacity="0.95"/>';
    }
    m += '<circle cx="50" cy="50" r="3.5" fill="' + s.mid + '" opacity="0.9"/>';
    return svgWrap(m);
  }

  function amapolaSVG(s, rand, index) {
    var g = buildGradientDefs(index, s, rand);
    var u = g.urls;
    var m = g.defs;
    m += ring(4, 10, 42, 22, u.outer, 0.92, petalRound, rand, true);
    m += ring(4, 55, 30, 16, u.mid, 0.85, petalRound, rand, false);
    m += '<circle cx="50" cy="50" r="13" fill="' + s.core + '" opacity="0.95"/>';
    for (var i = 0; i < 10; i++) {
      var angle = (360 / 10) * i;
      var rad = angle * Math.PI / 180;
      var x2 = 50 + Math.sin(rad) * 15;
      var y2 = 50 - Math.cos(rad) * 15;
      m += '<circle cx="' + x2 + '" cy="' + y2 + '" r="1.4" fill="' + s.core + '" opacity="0.9"/>';
    }
    return svgWrap(m);
  }

  function narcisoSVG(s, rand, index) {
    var g = buildGradientDefs(index, s, rand);
    var u = g.urls;
    var m = g.defs;
    m += ring(6, 0, 40, 15, u.outer, 0.96, petalPointed, rand, true);
    m += '<path d="M38,52 L35,34 Q50,25 65,34 L62,52 Z" fill="' + u.trumpet + '" opacity="0.95"/>';
    m += '<ellipse cx="50" cy="34" rx="15" ry="5" fill="' + s.trumpetRim + '" opacity="0.9"/>';
    m += '<ellipse cx="50" cy="52" rx="12" ry="4" fill="' + s.core + '" opacity="0.6"/>';
    return svgWrap(m);
  }

  // daisy: many narrow petals in a single open ring (unlike the rose's
  // concentric layers), topped with a textured, dotted disc center
  function margaritaSVG(s, rand, index) {
    var g = buildGradientDefs(index, s, rand);
    var u = g.urls;
    var m = g.defs;
    // 14 thin petals is already a lot of geometry (there are 8 daisies
    // in the bouquet) — skip the shadow-petal+rim-light treatment here
    // (still gradient-filled, just not the 3x-path decoration) to keep
    // total SVG node count in check without losing the gradient depth
    m += ring(14, 0, 44, 5, u.outer, 0.95, petalRound, rand, false);
    m += ring(14, 12.8, 30, 4, u.mid, 0.5, petalRound, rand, false);
    m += '<circle cx="50" cy="50" r="12" fill="' + s.core + '" opacity="0.95"/>';
    for (var i = 0; i < 9; i++) {
      var angle = (360 / 9) * i;
      var rad = angle * Math.PI / 180;
      var x2 = 50 + Math.sin(rad) * 8;
      var y2 = 50 - Math.cos(rad) * 8;
      m += '<circle cx="' + x2 + '" cy="' + y2 + '" r="1.3" fill="' + s.coreDark + '" opacity="0.85"/>';
    }
    return svgWrap(m);
  }

  // wildflower: the smallest, humblest bloom in the bouquet — few
  // petals, muted tones, and a deliberately wider jitter range so it
  // reads as the most "unkempt/organic" species among cultivated ones
  function silvestreSVG(s, rand, index) {
    var g = buildGradientDefs(index, s, rand);
    var u = g.urls;
    var m = g.defs;
    m += ring(5, 0, 30, 9, u.outer, 0.95, petalPointed, rand, true, 2.2);
    m += ring(5, 36, 20, 6, u.mid, 0.6, petalPointed, rand, false, 2.2);
    m += '<circle cx="50" cy="50" r="4" fill="' + s.core + '" opacity="0.9"/>';
    return svgWrap(m);
  }

  var especies = {
    rosa: { render: roseSVG, sets: [
      { outer: '#ffffff', mid: '#fbeef2', inner: '#f2cfdd', core: '#e6a9c3' },
      { outer: '#f4a7c4', mid: '#ec7fac', inner: '#d85590', core: '#b83b76' },
      { outer: '#c65fa8', mid: '#a13d8d', inner: '#7c2c72', core: '#5c1f56' }
    ] },
    tulipan: { render: tulipanSVG, sets: [
      { outer: '#ff8fab', mid: '#ff5d8f', inner: '#ffd6e3', core: '#c2185b' },
      { outer: '#c9a0ff', mid: '#a374e0', inner: '#e9d9ff', core: '#6a3fa0' },
      { outer: '#ff6f61', mid: '#e5483a', inner: '#ffd1c9', core: '#a5271c' }
    ] },
    lirio: { render: lirioSVG, sets: [
      { outer: '#fff7f9', mid: '#ffe1ea', core: '#e0793f' },
      { outer: '#ffe9c7', mid: '#ffd79a', core: '#c25a1f' }
    ] },
    amapola: { render: amapolaSVG, sets: [
      { outer: '#ff4d4d', mid: '#ff7a52', core: '#2b1b16' },
      { outer: '#ff6f3c', mid: '#ff9a52', core: '#2b1b16' }
    ] },
    narciso: { render: narcisoSVG, sets: [
      { outer: '#fffdf2', trumpet: '#ffb703', trumpetRim: '#ffd166', core: '#f4a300' },
      { outer: '#fff2c2', trumpet: '#ff8c00', trumpetRim: '#ffbe4d', core: '#e08e00' }
    ] },
    margarita: { render: margaritaSVG, sets: [
      { outer: '#ffffff', mid: '#fef6e4', core: '#f4a300', coreDark: '#c97f00' },
      { outer: '#fff2c2', mid: '#fdeccb', core: '#e8935a', coreDark: '#a85f2e' }
    ] },
    silvestre: { render: silvestreSVG, sets: [
      { outer: '#d9c2f0', mid: '#c9a8e8', core: '#8a5fc9' },
      { outer: '#f8d9e2', mid: '#f0b8c9', core: '#c9668a' },
      { outer: '#fff2c2', mid: '#ffe9a8', core: '#d9a441' }
    ] }
  };

  /**
   * Renders one flower. `index` (the stem's position in the dataset)
   * seeds a deterministic PRNG so this exact stem always looks the
   * same across page loads, while different stems of the same
   * species+variant still look visibly distinct from each other —
   * and doubles as the suffix for this flower's gradient IDs so
   * concurrent flowers never collide in the shared document ID space.
   */
  function florSVG(tipo, variant, index) {
    var esp = especies[tipo];
    var set = esp.sets[variant % esp.sets.length];
    var rand = Bouquet.utils.mulberry32(Bouquet.utils.seedFromString(tipo + '-' + variant + '-' + index));
    return esp.render(set, rand, index);
  }

  /* ---------- bouquet layout: a WIDE, garden-bed-like base ----------
     Unlike an earlier version of this page (a hand-held bouquet with
     every stem sharing one base point), this is meant to read as a
     full, abundant garden bed — so each stem now has its own base
     position (`x`) spread across a wide footprint, not just a shared
     origin fanning out by angle alone.

     48 stems across an EXACT species count (10 rosa / 8 margarita /
     6 tulipan / 5 lirio / 5 amapola / 4 narciso / 10 silvestre) would
     be impractical to hand-type reliably and keep correct through
     future edits, so the dataset is generated once, deterministically
     (same seed → identical layout every load, same reproducibility
     the earlier hand-authored array had) by buildTallosDataset()
     below, from a compact per-band config instead. Three depth bands
     (back/mid/front) still control z-index + shading (see
     computeDesignBounds / bouquet.css [data-depth]). */

  var SPECIES_COUNTS_PER_BAND = {
    back: { rosa: 3, margarita: 2, tulipan: 1, lirio: 2, amapola: 1, narciso: 1, silvestre: 4 },
    mid: { rosa: 4, margarita: 3, tulipan: 3, lirio: 2, amapola: 2, narciso: 2, silvestre: 2 },
    front: { rosa: 3, margarita: 3, tulipan: 2, lirio: 1, amapola: 2, narciso: 1, silvestre: 4 }
  };

  // back: small + tall + desaturated (handled by [data-depth] in CSS), furthest back.
  //   Kept nearly vertical (low rotCorr) on purpose: a tall stem at even
  //   a modest angle sweeps a lot of horizontal reach (h * sin(rot)), so
  //   the "wide base" here comes mostly from x-spread, not from angling
  //   the tallest stems outward too.
  // mid: the main, most colorful mass of the arrangement.
  // front: the biggest, most open blooms, closest to the viewer, angled
  //   outward the most (they're short, so that costs little reach) —
  //   this is what actually reads as "abanico natural" up close.
  var BAND_RANGES = {
    back: { x: [-55, 55], rotCorr: 0.06, rotJitter: 4, h: [340, 430], size: [38, 50] },
    mid: { x: [-50, 50], rotCorr: 0.20, rotJitter: 7, h: [220, 300], size: [52, 66] },
    front: { x: [-44, 44], rotCorr: 0.28, rotJitter: 8, h: [130, 210], size: [62, 86] }
  };

  /** Deterministic Fisher-Yates shuffle (keeps the layout reproducible). */
  function shuffleDeterministic(arr, rand) {
    var out = arr.slice();
    for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var tmp = out[i]; out[i] = out[j]; out[j] = tmp;
    }
    return out;
  }

  /**
   * Builds the 48-stem dataset: for each band, expands the species
   * counts into a flat list, shuffles it (so the same species isn't
   * clustered together left-to-right), then spreads those stems
   * evenly across the band's x range with jitter on every dimension
   * (position, angle, height, size, curve direction) so nothing lines
   * up or looks copy-pasted.
   */
  function buildTallosDataset() {
    var rand = Bouquet.utils.mulberry32(Bouquet.utils.seedFromString('bouquet-layout-jardin-v1'));
    var variantCursor = {};
    var dataset = [];

    ['back', 'mid', 'front'].forEach(function (depth) {
      var counts = SPECIES_COUNTS_PER_BAND[depth];
      var range = BAND_RANGES[depth];
      var speciesList = [];
      Object.keys(counts).forEach(function (tipo) {
        for (var n = 0; n < counts[tipo]; n++) speciesList.push(tipo);
      });
      speciesList = shuffleDeterministic(speciesList, rand);

      speciesList.forEach(function (tipo, i) {
        var t = (i + 0.5) / speciesList.length;
        var x = Bouquet.utils.lerp(range.x[0], range.x[1], t) + (rand() - 0.5) * 10;
        var rot = x * range.rotCorr + (rand() - 0.5) * 2 * range.rotJitter;
        var h = Bouquet.utils.randRange(range.h[0], range.h[1], rand);
        var size = Bouquet.utils.randRange(range.size[0], range.size[1], rand);
        var curveDir = rand() > 0.5 ? 1 : -1;

        var variantCount = especies[tipo].sets.length;
        variantCursor[tipo] = variantCursor[tipo] || 0;
        var v = variantCursor[tipo] % variantCount;
        variantCursor[tipo]++;

        dataset.push({
          x: x, rot: rot, h: h, size: size,
          tipo: tipo, v: v, depth: depth,
          curveDir: curveDir, curveMag: 0
        });
      });
    });

    return dataset;
  }

  var tallos = buildTallosDataset();

  // Shared with computeDesignBounds below — a rotated grass blade's tip
  // can swing sideways well past its own base x position (height *
  // sin(rotation)), so the "never clip" scale calculation needs these
  // same worst-case numbers, not just the flowers'. Keep both in sync.
  var GRASS_CONFIGS = {
    back: { count: 60, maxX: 130, minH: 55, maxH: 140, rotBase: 14, rotJitter: 5 },
    front: { count: 26, maxX: 140, minH: 30, maxH: 85, rotBase: 12, rotJitter: 5 }
  };

  /**
   * Back grass: wide, tall, behind everything (default stacking, no
   * explicit z-index — every flower band's z-index beats "auto"), so
   * it reads as the garden bed the bouquet grows out of rather than a
   * thin decorative fringe at the sides.
   */
  function buildBriznas(ramo) {
    var c = GRASS_CONFIGS.back;
    for (var i = 0; i < c.count; i++) {
      var bx = -c.maxX + ((c.maxX * 2) / (c.count - 1)) * i + (Math.random() * 10 - 5);
      var el = document.createElement('div');
      el.className = 'brizna';
      el.style.left = 'calc(50% + ' + bx + 'px)';
      el.style.height = (c.minH + Math.random() * (c.maxH - c.minH)) + 'px';
      el.style.transform = 'rotate(' + ((bx / c.maxX) * c.rotBase + (Math.random() * c.rotJitter * 2 - c.rotJitter)) + 'deg)';
      el.style.animationDelay = (0.1 + Math.random() * 0.7) + 's';
      ramo.appendChild(el);
    }
  }

  /**
   * Front grass: shorter blades explicitly stacked ABOVE the flowers
   * (`.brizna-frente`'s z-index beats even the front band) and built
   * last, so a few blades visibly overlap the lower edge of the
   * bouquet — the detail that sells "growing out of a garden bed"
   * instead of "flowers floating over grass".
   */
  function buildBriznasFrente(ramo) {
    var c = GRASS_CONFIGS.front;
    for (var i = 0; i < c.count; i++) {
      var bx = -c.maxX + ((c.maxX * 2) / (c.count - 1)) * i + (Math.random() * 12 - 6);
      var el = document.createElement('div');
      el.className = 'brizna brizna-frente';
      el.style.left = 'calc(50% + ' + bx + 'px)';
      el.style.height = (c.minH + Math.random() * (c.maxH - c.minH)) + 'px';
      el.style.transform = 'rotate(' + ((bx / c.maxX) * c.rotBase + (Math.random() * c.rotJitter * 2 - c.rotJitter)) + 'deg)';
      el.style.animationDelay = (0.2 + Math.random() * 0.8) + 's';
      ramo.appendChild(el);
    }
  }

  /* ---------- filler foliage: SVG leaves + buds scattered through the
     bouquet's own volume (not just at stem bases) to close the dark
     gaps between individual flowers — this is what turns a handful of
     blooms into something that reads as a full, leafy arrangement. ---------- */

  var LEAF_KINDS = {
    lanceolada: { width: 7, length: 40 },  // long, narrow, pointed
    redonda: { width: 12, length: 20 },    // round/oval
    grande: { width: 15, length: 48 },     // large, broad
    pequena: { width: 5.5, length: 15 }    // small, simple
  };

  var LEAF_TONES = {
    oscura: { light: '#5c8f52', dark: '#1e3a20' },
    clara: { light: '#a9d68f', dark: '#5c8f52' },
    semitransparente: { light: '#8fbf7a', dark: '#33582f', opacity: 0.55 }
  };

  var leafIdCounter = 0;

  /** One SVG leaf: a gradient-filled blade with a faint center vein. */
  function leafSVG(kindName, toneName) {
    var kind = LEAF_KINDS[kindName];
    var tone = LEAF_TONES[toneName];
    var id = 'hojagrad-' + (leafIdCounter++);
    var w = kind.width, len = kind.length;
    var d = 'M' + w + ',' + len
          + ' C0,' + (len * 0.6) + ' ' + (w * 0.3) + ',' + (len * 0.12) + ' ' + w + ',0'
          + ' C' + (w * 1.7) + ',' + (len * 0.12) + ' ' + (w * 2) + ',' + (len * 0.6) + ' ' + w + ',' + len + ' Z';
    return '<svg viewBox="0 0 ' + (w * 2) + ' ' + len + '" width="' + (w * 2) + '" height="' + len + '" xmlns="http://www.w3.org/2000/svg">'
      + '<defs><linearGradient id="' + id + '" x1="0" y1="1" x2="0" y2="0">'
      + '<stop offset="0%" stop-color="' + tone.dark + '"/>'
      + '<stop offset="100%" stop-color="' + tone.light + '"/>'
      + '</linearGradient></defs>'
      + '<path d="' + d + '" fill="url(#' + id + ')" opacity="' + (tone.opacity || 0.96) + '"/>'
      + '<line x1="' + w + '" y1="' + (len * 0.92) + '" x2="' + w + '" y2="' + (len * 0.1) + '" stroke="rgba(255,255,255,.28)" stroke-width="0.7"/>'
      + '</svg>';
  }

  /** A small budding sprout — a teardrop with a soft radial highlight. */
  function broteSVG(toneName) {
    var tone = LEAF_TONES[toneName];
    var id = 'brotegrad-' + (leafIdCounter++);
    return '<svg viewBox="0 0 14 20" width="14" height="20" xmlns="http://www.w3.org/2000/svg">'
      + '<defs><radialGradient id="' + id + '" cx="38%" cy="28%" r="75%">'
      + '<stop offset="0%" stop-color="' + tone.light + '"/><stop offset="100%" stop-color="' + tone.dark + '"/>'
      + '</radialGradient></defs>'
      + '<path d="M7,20 C1,14 1,5 7,0 C13,5 13,14 7,20 Z" fill="url(#' + id + ')" opacity="0.95"/>'
      + '</svg>';
  }

  var FOLIAGE_BANDS = [
    { depth: 'back', count: 14, x: [-70, 70], y: [40, 300] },
    { depth: 'mid', count: 16, x: [-62, 62], y: [15, 220] },
    { depth: 'front', count: 16, x: [-55, 55], y: [5, 170] }
  ];

  /**
   * Scatters leaves/buds through the bouquet's own footprint (using
   * the same x/y neighborhoods the flowers occupy, per band), not just
   * near the stem bases — deliberately placed to sit *between* and
   * *around* flowers so there are no bare gaps of background showing
   * through the middle of the arrangement. Uses the same [data-depth]
   * z-index/shading bands as the flowers so filler leaves interleave
   * naturally with blooms in the same layer instead of always sitting
   * strictly above or below the whole bouquet.
   */
  function buildFillerFoliage(container) {
    var rand = Bouquet.utils.mulberry32(Bouquet.utils.seedFromString('follaje-relleno-v1'));
    var kindNames = Object.keys(LEAF_KINDS);
    var toneNames = Object.keys(LEAF_TONES);

    FOLIAGE_BANDS.forEach(function (band) {
      for (var i = 0; i < band.count; i++) {
        var isBud = rand() < 0.22;
        var x = Bouquet.utils.randRange(band.x[0], band.x[1], rand);
        var y = Bouquet.utils.randRange(band.y[0], band.y[1], rand);
        var rot = Bouquet.utils.randRange(-65, 65, rand);
        var scale = Bouquet.utils.randRange(0.75, 1.35, rand);
        var tone = toneNames[Math.floor(rand() * toneNames.length)];

        var wrap = document.createElement('div');
        wrap.className = 'hoja-relleno';
        wrap.dataset.depth = band.depth;
        wrap.style.left = 'calc(50% + ' + x.toFixed(1) + 'px)';
        wrap.style.bottom = y.toFixed(1) + 'px';
        wrap.style.transform = 'translate(-50%,0) rotate(' + rot.toFixed(1) + 'deg) scale(' + scale.toFixed(2) + ')';
        wrap.style.animationDelay = (rand() * 1.4).toFixed(2) + 's';

        if (isBud) {
          wrap.innerHTML = broteSVG(tone);
        } else {
          var kind = kindNames[Math.floor(rand() * kindNames.length)];
          wrap.innerHTML = leafSVG(kind, tone);
        }
        container.appendChild(wrap);
      }
    });
  }

  var STEM_HALF_WIDTH_BY_DEPTH = { back: 4, mid: 5.2, front: 6.5 };

  /**
   * Builds a tapered, curved stem SVG path. The path's own endpoints
   * are pinned at the container's horizontal center (base at the
   * bottom, tip at the top) — curvature only bulges the two edges
   * sideways *between* those endpoints. This is what keeps it safe:
   * `.flor-anchor` never looks at this path at all, it independently
   * assumes the stem tip sits at local (0, h) — pinning this path's
   * endpoints to that same center line is what makes the visual stem
   * actually line up with where the anchor already puts the flower.
   * @param {number} h stem length in px (container height)
   * @param {number} halfWidthBase half-thickness at the base
   * @param {number} halfWidthTip half-thickness at the tip
   * @param {number} bulge sideways bow of the curve's midpoint, in px
   * @returns {{ svg: string, containerWidth: number, offsetX: number }}
   */
  function buildStemPath(h, halfWidthBase, halfWidthTip, bulge) {
    var pad = Math.abs(bulge) + halfWidthBase + 2;
    var cx = pad; // horizontal center within the local viewBox
    var wB = halfWidthBase;
    var wT = halfWidthTip;
    var d = 'M ' + (cx - wB) + ',' + h
      + ' C ' + (cx - wB * 0.5 + bulge * 0.6) + ',' + (h * 0.64)
      + ' ' + (cx - wT * 0.5 + bulge) + ',' + (h * 0.32)
      + ' ' + (cx - wT) + ',0'
      + ' L ' + (cx + wT) + ',0'
      + ' C ' + (cx + wT * 0.5 + bulge) + ',' + (h * 0.32)
      + ' ' + (cx + wB * 0.5 + bulge * 0.6) + ',' + (h * 0.64)
      + ' ' + (cx + wB) + ',' + h
      + ' Z';
    var svg = '<svg viewBox="0 0 ' + (pad * 2) + ' ' + h + '" width="' + (pad * 2) + '" height="' + h + '">'
      + '<path d="' + d + '" fill="url(#tallo-grad)"/>'
      + '</svg>';
    return { svg: svg, containerWidth: pad * 2, offsetX: cx };
  }

  // shared gradient (referenced by every stem path via #tallo-grad, defined once in index.html)

  /**
   * Builds one leaf inside its own small independent sway wrapper, so
   * it flutters at a different rhythm than its stem instead of just
   * rigidly following it. The wrapper carries the position (left/
   * bottom) that used to live directly on the leaf; the leaf itself
   * keeps its own entrance animation + fixed `--rot` tilt.
   */
  function buildHoja(className, leftPx, bottomPx, rotDeg, delaySec, stemIndex, leafIndex, parent) {
    var swayWrap = document.createElement('div');
    swayWrap.className = 'hoja-sway-wrap';
    swayWrap.style.left = leftPx + 'px';
    swayWrap.style.bottom = bottomPx + 'px';
    Bouquet.animations.applyLeafSway(swayWrap, stemIndex, leafIndex);
    parent.appendChild(swayWrap);

    var hoja = document.createElement('div');
    hoja.className = className;
    hoja.style.setProperty('--rot', rotDeg + 'deg');
    hoja.style.animationDelay = delaySec + 's';
    swayWrap.appendChild(hoja);
    return hoja;
  }

  /**
   * Builds one stem: the rigid rotated group (static fan angle), a
   * nested sway wrapper (continuous gentle wind animation), its curved
   * tapered stem, its leaves, and its flower anchored exactly at the
   * tip. See the file header comment for why the anchor's
   * `bottom`/counter-rotate must stay keyed to the stem's actual
   * rendered length and to `rot` alone (not the sway) — the sway is
   * deliberately allowed to reach the flower too, so it visibly moves
   * with its stem instead of staying robotically upright.
   */
  function buildTallo(t, i, tallosWrap) {
    var delay = Bouquet.animations.entranceDelay(t.rot);

    var grupo = document.createElement('div');
    grupo.className = 'tallo-grupo';
    grupo.dataset.depth = t.depth || 'mid';
    grupo.style.left = 'calc(50% + ' + (t.x || 0) + 'px)';
    grupo.style.transform = 'rotate(' + t.rot + 'deg)';
    tallosWrap.appendChild(grupo);

    var sway = document.createElement('div');
    sway.className = 'tallo-sway';
    Bouquet.animations.applyStemSway(sway, i);
    grupo.appendChild(sway);

    // deterministic per-stem curve strength (dataset entries default to
    // curveMag:0, meaning "auto" — pick a natural, reproducible bow)
    var curveRand = Bouquet.utils.mulberry32(Bouquet.utils.seedFromString('curve-' + i));
    var curveMag = t.curveMag || (0.08 + curveRand() * 0.14);
    var bulge = Bouquet.utils.clamp(curveMag * t.h * (t.curveDir || 1), -40, 40);

    var halfWidthBase = STEM_HALF_WIDTH_BY_DEPTH[t.depth] || 5;
    var halfWidthTip = halfWidthBase * 0.35;
    var stem = buildStemPath(t.h, halfWidthBase, halfWidthTip, bulge);

    var talloWrap = document.createElement('div');
    talloWrap.className = 'tallo-svg-wrap';
    talloWrap.style.left = (-stem.offsetX) + 'px';
    talloWrap.style.width = stem.containerWidth + 'px';
    talloWrap.style.height = t.h + 'px';
    talloWrap.style.animationDelay = delay + 's';
    talloWrap.innerHTML = stem.svg;
    sway.appendChild(talloWrap);

    // leaves along the stem — every stem gets at least one leaf
    var side = t.rot <= 0 ? -1 : 1;
    buildHoja(
      'hoja' + (i % 3 === 0 ? ' euca' : ''),
      side * 13, t.h * 0.4, side * 32, delay + 0.25, i, 0, sway
    );

    if (i % 2 === 0) {
      buildHoja('hoja euca', -side * 12, t.h * 0.62, -side * 38, delay + 0.35, i, 1, sway);
    }

    // anchor at the stem tip, counter-rotated so every bloom faces upright
    var anchor = document.createElement('div');
    anchor.className = 'flor-anchor';
    anchor.style.bottom = t.h + 'px';
    anchor.style.transform = 'rotate(' + (-t.rot) + 'deg)';
    sway.appendChild(anchor);

    var bloomDelay = delay + 0.45;

    var flor = document.createElement('div');
    flor.className = 'flor';
    flor.style.width = t.size + 'px';
    flor.style.height = t.size + 'px';
    flor.style.animationDelay = bloomDelay + 's';
    anchor.appendChild(flor);

    // separate inner wrapper for the tap "bloom open" pulse (see
    // animations.js triggerBloomOpen) — keeping it on its own element
    // means toggling that animation never fights with .flor's own
    // one-shot entrance animation or the svg's infinite breathing
    var cara = document.createElement('div');
    cara.className = 'flor-cara';
    cara.innerHTML = florSVG(t.tipo, t.v, i);
    flor.appendChild(cara);
  }

  /**
   * Every stem's SVG references `url(#tallo-grad)` for its fill — a
   * single shared gradient defined once here, since `url(#id)` resolves
   * against the whole HTML document, not per-svg-root, so one hidden
   * defs block can be reused by all 36 stem paths instead of repeating
   * the same gradient markup 36 times.
   */
  function ensureStemGradientDefs(container) {
    if (document.getElementById('tallo-grad')) return;
    var defs = document.createElement('div');
    defs.setAttribute('aria-hidden', 'true');
    defs.style.position = 'absolute';
    defs.style.width = '0';
    defs.style.height = '0';
    defs.style.overflow = 'hidden';
    defs.innerHTML = '<svg><defs><linearGradient id="tallo-grad" x1="0" y1="1" x2="0" y2="0">'
      + '<stop offset="0%" stop-color="#245430"/>'
      + '<stop offset="100%" stop-color="#4c9a5c"/>'
      + '</linearGradient></defs></svg>';
    container.appendChild(defs);
  }

  /** Builds the whole bouquet (grass + every stem) inside the given container. */
  function buildBouquet(container) {
    ensureStemGradientDefs(container);

    var tallosWrap = document.createElement('div');
    tallosWrap.className = 'tallos';
    container.appendChild(tallosWrap);

    buildBriznas(container);

    tallos.forEach(function (t, i) {
      buildTallo(t, i, tallosWrap);
    });

    buildFillerFoliage(tallosWrap);
    buildBriznasFrente(container);
  }

  /**
   * The bouquet's authored "design size" — the largest horizontal and
   * vertical extent any stem+flower can reach, derived straight from
   * the dataset (not hand-measured), so a future dataset edit that
   * makes stems taller or wider can never silently start clipping:
   * the responsive scale system in app.js always measures against
   * whatever this actually computes.
   */
  function computeDesignBounds() {
    var maxReachX = 0;
    var maxReachY = 0;
    tallos.forEach(function (t) {
      var rad = Bouquet.utils.degToRad(Math.abs(t.rot));
      var reachX = Math.abs(t.x || 0) + t.h * Math.sin(rad) + t.size * 0.6;
      var reachY = t.h * Math.cos(rad) + t.size * 0.75;
      if (reachX > maxReachX) maxReachX = reachX;
      if (reachY > maxReachY) maxReachY = reachY;
    });

    // grass blades rotate too, and their tip can swing sideways well
    // past their own base x — must be included here or narrow
    // viewports can clip a grass tip even though every flower fits
    Object.keys(GRASS_CONFIGS).forEach(function (key) {
      var c = GRASS_CONFIGS[key];
      var rad = Bouquet.utils.degToRad(c.rotBase + c.rotJitter);
      var reachX = c.maxX + c.maxH * Math.sin(rad);
      if (reachX > maxReachX) maxReachX = reachX;
      if (c.maxH > maxReachY) maxReachY = c.maxH;
    });

    return { width: maxReachX * 2 + 40, height: maxReachY + 40 };
  }

  Bouquet.bouquet = Bouquet.bouquet || {};
  Bouquet.bouquet.florSVG = florSVG;
  Bouquet.bouquet.especies = especies;
  Bouquet.bouquet.tallos = tallos;
  Bouquet.bouquet.buildTallo = buildTallo;
  Bouquet.bouquet.buildBouquet = buildBouquet;
  Bouquet.bouquet.computeDesignBounds = computeDesignBounds;
})();
