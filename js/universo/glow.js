/**
 * Shared "fake bloom" helper: a single soft radial-gradient texture,
 * reused (tinted via material.color, sized via sprite.scale) by every
 * glow billboard in the scene — stars, the planet's halo, the heart.
 * This stands in for true post-processing bloom (EffectComposer +
 * UnrealBloomPass are ES-module-only in modern three.js, and even in
 * older builds run several full-screen blur passes per frame — a real
 * risk to the 60fps-on-mobile requirement). Additive sprites cost one
 * extra draw call per glow instead, and read as "glowing" just as well
 * for point-light-like sources like these.
 */
(function () {
  'use strict';

  var sharedGlowTexture = null;

  function getGlowTexture() {
    if (sharedGlowTexture) return sharedGlowTexture;

    var size = 128;
    var canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext('2d');
    var grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.35, 'rgba(255,255,255,.55)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    sharedGlowTexture = new THREE.CanvasTexture(canvas);
    return sharedGlowTexture;
  }

  /**
   * @param {number} color hex color for the glow tint
   * @param {number} size world-space diameter of the glow billboard
   * @param {number} [opacity]
   * @returns {THREE.Sprite}
   */
  function createGlowSprite(color, size, opacity) {
    var material = new THREE.SpriteMaterial({
      map: getGlowTexture(),
      color: color,
      transparent: true,
      opacity: opacity != null ? opacity : 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    var sprite = new THREE.Sprite(material);
    sprite.scale.set(size, size, 1);
    return sprite;
  }

  window.Universo.glow = {
    getGlowTexture: getGlowTexture,
    createGlowSprite: createGlowSprite
  };
})();
