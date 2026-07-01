/**
 * Animation orchestration: timing/stagger decisions live here, the
 * actual @keyframes live in css/animations.css. This file only
 * defines functions — nothing runs until app.js calls them.
 */
(function () {
  'use strict';

  var Bouquet = window.Bouquet;

  /**
   * How long a stem waits before it starts growing in. Stems near the
   * center bloom first, outer ones follow — a gentle wave outward.
   */
  function entranceDelay(rot) {
    return 0.15 + Math.abs(rot) / 45;
  }

  /**
   * Gives a stem's sway wrapper its own randomized-but-deterministic
   * duration and a NEGATIVE delay. Negative delay starts the animation
   * already mid-cycle instead of at rest, so every stem looks like it's
   * already been swaying in the breeze rather than starting frozen and
   * staggering to life one by one.
   */
  function applyStemSway(swayEl, index) {
    var rand = Bouquet.utils.mulberry32(Bouquet.utils.seedFromString('sway-' + index));
    var duration = Bouquet.utils.randRange(5.2, 8.5, rand);
    swayEl.style.animationDuration = duration + 's';
    swayEl.style.animationDelay = (-rand() * duration) + 's';
  }

  /** Same idea as applyStemSway, but faster/lighter — leaves flutter quicker than stems bow. */
  function applyLeafSway(swayEl, index, leafIndex) {
    var rand = Bouquet.utils.mulberry32(Bouquet.utils.seedFromString('leafsway-' + index + '-' + leafIndex));
    var duration = Bouquet.utils.randRange(3.4, 5.6, rand);
    swayEl.style.animationDuration = duration + 's';
    swayEl.style.animationDelay = (-rand() * duration) + 's';
  }

  /**
   * Briefly swaps in a larger-amplitude sway on a stem, then reverts —
   * used for the "other flowers move too" reaction when the user taps
   * the bouquet.
   */
  function boostSway(swayEl, durationMs) {
    swayEl.classList.add('sway-boost');
    setTimeout(function () {
      swayEl.classList.remove('sway-boost');
    }, durationMs || 1800);
  }

  /**
   * Plays the tap "bloom open" pulse on a flower's inner .flor-cara
   * wrapper. Removes-then-re-adds the class (with a forced reflow in
   * between) so a second tap mid-animation restarts it cleanly instead
   * of being a no-op because the class was already present.
   */
  function triggerBloomOpen(caraEl) {
    caraEl.classList.remove('abriendo');
    void caraEl.offsetHeight; // eslint-disable-line no-void -- forces the reflow that lets the animation restart
    caraEl.classList.add('abriendo');
    var onEnd = function () {
      caraEl.classList.remove('abriendo');
      caraEl.removeEventListener('animationend', onEnd);
    };
    caraEl.addEventListener('animationend', onEnd);
  }

  Bouquet.animations = Bouquet.animations || {};
  Bouquet.animations.entranceDelay = entranceDelay;
  Bouquet.animations.applyStemSway = applyStemSway;
  Bouquet.animations.applyLeafSway = applyLeafSway;
  Bouquet.animations.boostSway = boostSway;
  Bouquet.animations.triggerBloomOpen = triggerBloomOpen;
})();
