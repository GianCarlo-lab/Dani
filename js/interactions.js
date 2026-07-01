/**
 * User interaction wiring. Contains only dispatch logic — the actual
 * particle/animation implementations live in particles.js / animations.js.
 */
(function () {
  'use strict';

  var Bouquet = window.Bouquet;

  /** Boosts the sway on a few random stems — "the bouquet notices the touch". */
  function boostNearbySway() {
    var sways = document.querySelectorAll('.tallo-sway');
    if (!sways.length) return;
    var chosen = {};
    var target = Math.min(3, sways.length);
    while (Object.keys(chosen).length < target) {
      chosen[Math.floor(Math.random() * sways.length)] = true;
    }
    Object.keys(chosen).forEach(function (idx) {
      Bouquet.animations.boostSway(sways[idx]);
    });
  }

  /**
   * Tapping a flower: it pulses open, sheds a few petals, sparkles a
   * little, and nearby stems sway harder for a moment. Tapping empty
   * stage: the original heart burst.
   */
  function handleTap(x, y, target, stage) {
    var florEl = target.closest ? target.closest('.flor') : null;

    if (florEl) {
      var cara = florEl.querySelector('.flor-cara');
      if (cara) Bouquet.animations.triggerBloomOpen(cara);
      Bouquet.particles.spawnPetalBurst(x, y, stage, 6);
      Bouquet.particles.spawnGoldAccent(x, y, stage);
      boostNearbySway();
    } else {
      Bouquet.particles.spawnHeartBurst(x, y, stage);
    }
  }

  /** Binds the tap/click interaction to the whole stage. */
  function bindStageEvents(stage) {
    stage.addEventListener('click', function (e) {
      handleTap(e.clientX, e.clientY, e.target, stage);
    });
    stage.addEventListener('touchstart', function (e) {
      var t = e.touches[0];
      handleTap(t.clientX, t.clientY, e.target, stage);
    }, { passive: true });
  }

  Bouquet.interactions = Bouquet.interactions || {};
  Bouquet.interactions.bindStageEvents = bindStageEvents;
})();
