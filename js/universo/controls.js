/**
 * Hand-rolled drag-to-orbit camera controller: no OrbitControls addon
 * (ES-module-only in any three.js recent enough to pair with the
 * vendored r150 core, see the plan notes). Dragging drives the camera
 * directly; releasing keeps whatever angular velocity the drag ended
 * with and blends it — never snapping, never fully stopping — back
 * toward a constant slow auto-orbit.
 */
(function () {
  'use strict';

  var AUTO_SPEED = 0.055;       // rad/s baseline auto-orbit (always eventually returned to)
  var DEFAULT_PHI = Math.PI / 2.35; // resting polar angle (camera height)
  var DRAG_SENSITIVITY = 0.0038;
  var RETURN_RATE = 0.55;       // how fast released velocity blends back to AUTO_SPEED
  var PHI_SPRING = 0.35;        // how fast phi eases back to DEFAULT_PHI once released
  var PHI_MIN = 0.25;
  var PHI_MAX = Math.PI - 0.25;
  var PORTRAIT_PULLBACK_MAX = 2.15; // hard cap so very tall/narrow windows don't recede forever

  /**
   * A THREE.PerspectiveCamera's `fov` is its VERTICAL field of view —
   * on a tall phone screen (aspect = width/height < 1) the effective
   * HORIZONTAL field of view is narrower than on a landscape screen at
   * the exact same distance, so the same planet reads as noticeably
   * bigger relative to a narrow phone's width than it does on a
   * desktop window. Pulling the camera back further as the aspect
   * ratio gets narrower keeps the planet's apparent size on screen
   * consistent across phones, tablets and desktops instead.
   */
  function portraitPullback(aspect) {
    if (aspect >= 1) return 1;
    var factor = Math.pow(1 / aspect, 0.62);
    return Math.min(factor, PORTRAIT_PULLBACK_MAX);
  }

  /**
   * @param {THREE.Camera} camera
   * @param {HTMLElement} domElement pointer events are bound here
   * @param {number} radius base orbit distance from the target (before
   *   the portrait pullback above adjusts it for the current aspect)
   */
  function createOrbitController(camera, domElement, radius) {
    var theta = Math.PI * 0.18;
    var phi = DEFAULT_PHI;
    var velTheta = AUTO_SPEED;
    var velPhi = 0;
    var dragging = false;
    var lastX = 0, lastY = 0;
    var target = new THREE.Vector3(0, 4, 0);

    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

    function onDown(e) {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      domElement.setPointerCapture && e.pointerId != null && domElement.setPointerCapture(e.pointerId);
    }

    function onMove(e) {
      if (!dragging) return;
      var dx = e.clientX - lastX;
      var dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;

      var dTheta = -dx * DRAG_SENSITIVITY;
      var dPhi = -dy * DRAG_SENSITIVITY;
      theta += dTheta;
      phi = clamp(phi + dPhi, PHI_MIN, PHI_MAX);

      // remember this frame's motion as the release velocity (per ~16ms tick)
      velTheta = dTheta * 60;
      velPhi = dPhi * 60;
    }

    function onUp() {
      dragging = false;
    }

    domElement.addEventListener('pointerdown', onDown);
    domElement.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    function update(dt) {
      if (!dragging) {
        // ease released velocity back toward the constant auto-orbit —
        // never snaps to it and never reaches a full stop
        velTheta += (AUTO_SPEED - velTheta) * Math.min(1, RETURN_RATE * dt);
        velPhi += (0 - velPhi) * Math.min(1, RETURN_RATE * dt);
        theta += velTheta * dt;
        phi += velPhi * dt;
        phi += (DEFAULT_PHI - phi) * Math.min(1, PHI_SPRING * dt);
        phi = clamp(phi, PHI_MIN, PHI_MAX);
      }

      var effectiveRadius = radius * portraitPullback(camera.aspect || 1);
      camera.position.set(
        target.x + effectiveRadius * Math.sin(phi) * Math.cos(theta),
        target.y + effectiveRadius * Math.cos(phi),
        target.z + effectiveRadius * Math.sin(phi) * Math.sin(theta)
      );
      camera.lookAt(target);
    }

    function dispose() {
      domElement.removeEventListener('pointerdown', onDown);
      domElement.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    }

    return { update: update, dispose: dispose };
  }

  window.Universo.createOrbitController = createOrbitController;
})();
