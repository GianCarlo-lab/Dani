/**
 * Entry point. Every other script only *defines* functions — this is
 * the one file that actually runs anything, so the whole page's
 * startup sequence is readable in one place.
 */
(function () {
  'use strict';

  var Bouquet = window.Bouquet;

  /**
   * Keeps the bouquet inside the viewport at every size from 320px up
   * to 4K by scaling the whole composition uniformly from its
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

    var availableWidth = stage.clientWidth * 0.98;
    var availableHeight = Math.max(120, stage.clientHeight - reservedTop - reservedBottom);

    var scaleX = availableWidth / bounds.width;
    var scaleY = availableHeight / bounds.height;
    var scale = Bouquet.utils.clamp(Math.min(scaleX, scaleY), 0.3, 1.4);

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
