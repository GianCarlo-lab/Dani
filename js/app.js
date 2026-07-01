/**
 * Entry point. Every other script only *defines* functions — this is
 * the one file that actually runs anything, so the whole page's
 * startup sequence is readable in one place.
 */
(function () {
  'use strict';

  var Bouquet = window.Bouquet;

  // The bouquet should actively FILL roughly this fraction of the
  // viewport's WIDTH on a phone — not just shrink-to-fit — so it reads
  // as an abundant arrangement rather than a small cluster floating in
  // empty space. Height isn't targeted directly the same way (that
  // overshot width unpredictably); instead the dataset itself is tuned
  // (tall, near-vertical back-band stems) so hitting the width target
  // naturally also pushes the bouquet's top edge up past mid-screen.
  var TARGET_WIDTH_FRACTION = 0.86;

  /**
   * Keeps the bouquet filling most of the viewport at every size from
   * 320px up to 4K by scaling the whole composition uniformly from its
   * bottom-center pin point — one mechanism instead of per-breakpoint
   * magic numbers. Measured against the dataset's own computed bounds
   * (see bouquet.js computeDesignBounds), so it can't go stale if the
   * dataset changes later. Capped at 1.4x so huge screens get a
   * modestly bigger bouquet rather than an oversized one.
   */
  function recalcBouquetScale() {
    var stage = document.getElementById('stage');
    var titulo = document.querySelector('.titulo');
    if (!stage) return;

    var bounds = Bouquet.bouquet.computeDesignBounds();
    var tituloHeight = titulo ? titulo.getBoundingClientRect().height : 0;
    var reservedTop = tituloHeight + 24;
    var reservedBottom = 40;

    var availableHeight = Math.max(120, stage.clientHeight - reservedTop - reservedBottom);

    var scaleForWidthTarget = (stage.clientWidth * TARGET_WIDTH_FRACTION) / bounds.width;
    var scaleForMaxWidth = (stage.clientWidth * 0.98) / bounds.width; // hard ceiling, never exceed the viewport
    var scaleForMaxHeight = availableHeight / bounds.height; // never clip vertically, either

    var scale = Math.min(scaleForWidthTarget, scaleForMaxWidth, scaleForMaxHeight);
    scale = Bouquet.utils.clamp(scale, 0.3, 1.4);

    document.documentElement.style.setProperty('--bouquet-scale', scale);
  }

  function init() {
    var ramo = document.getElementById('ramo');
    var stage = document.getElementById('stage');

    Bouquet.particles.spawnBackgroundLayer(stage);
    Bouquet.bouquet.buildBouquet(ramo);
    Bouquet.particles.spawnSparkles(stage);
    Bouquet.particles.startAmbientSpawners(stage);
    Bouquet.interactions.bindStageEvents(stage);

    recalcBouquetScale();
    window.addEventListener('resize', Bouquet.utils.debounce(recalcBouquetScale, 120));
    window.addEventListener('orientationchange', Bouquet.utils.debounce(recalcBouquetScale, 120));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
