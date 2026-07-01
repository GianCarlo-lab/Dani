/**
 * Universo entry point. Builds the scene graph once (lazily, on first
 * `Universo.start`), then exposes start()/pause() so js/nav.js can
 * stop the render loop whenever this view isn't visible instead of
 * rendering a hidden canvas forever, and resume instantly without
 * rebuilding anything when the user comes back.
 */
(function () {
  'use strict';

  var C = window.Universo.constants;

  var ctx = null;
  var initialized = false;
  var shouldRun = false;
  var rafId = null;
  var clock = null;

  function debounce(fn, wait) {
    var timer = null;
    return function () {
      var args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(null, args); }, wait);
    };
  }

  function init(mount) {
    var s = window.Universo.createScene(mount);

    var starfield = window.Universo.createStarfield();
    var planet = window.Universo.createPlanet();
    var rings = window.Universo.createRings(planet.group);
    var heart = window.Universo.createHeart();
    heart.group.position.set(0, C.PLANET_RADIUS * 2.35, 0);

    s.scene.add(starfield.group);
    s.scene.add(planet.group);
    s.scene.add(heart.group);

    var controller = window.Universo.createOrbitController(
      s.camera,
      s.renderer.domElement,
      C.PLANET_RADIUS * 4.6
    );

    var resizeHandler = debounce(function () { s.resize(); }, 120);
    window.addEventListener('resize', resizeHandler);
    window.addEventListener('orientationchange', resizeHandler);

    ctx = {
      scene: s.scene,
      camera: s.camera,
      renderer: s.renderer,
      starfield: starfield,
      planet: planet,
      rings: rings,
      heart: heart,
      controller: controller
    };
    initialized = true;
  }

  function frame() {
    rafId = requestAnimationFrame(frame);
    var dt = Math.min(clock.getDelta(), 0.05);
    ctx.starfield.update(dt);
    ctx.planet.update(dt);
    ctx.rings.update(dt, ctx.camera);
    ctx.heart.update(dt);
    ctx.controller.update(dt);
    ctx.renderer.render(ctx.scene, ctx.camera);
  }

  function startLoop() {
    if (rafId != null) return;
    clock = clock || new THREE.Clock();
    clock.getDelta(); // drop the (possibly huge) elapsed time accumulated while paused
    rafId = requestAnimationFrame(frame);
  }

  function stopLoop() {
    if (rafId != null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  /** Lazily builds the scene on first call; cheap on every call after. */
  function start(mount) {
    if (!initialized) init(mount);
    shouldRun = true;
    if (!document.hidden) startLoop();
  }

  /** Stops rendering but keeps all scene/camera state for an instant resume. */
  function pause() {
    shouldRun = false;
    stopLoop();
  }

  // tab backgrounded/foregrounded should pause/resume too, independent of
  // which app-level view is active (no point rendering a background tab)
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stopLoop();
    else if (shouldRun) startLoop();
  });

  window.Universo.start = start;
  window.Universo.pause = pause;
})();
