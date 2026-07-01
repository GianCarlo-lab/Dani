/**
 * Renderer, camera, fog and resize handling for the Universo scene.
 * Pure Three.js setup — no bouquet code, no bouquet DOM.
 */
(function () {
  'use strict';

  var C = window.Universo.constants;

  /**
   * @param {HTMLElement} mount element the canvas is appended into
   * @returns {{renderer:THREE.WebGLRenderer, scene:THREE.Scene, camera:THREE.PerspectiveCamera, resize:Function, dispose:Function}}
   */
  function createScene(mount) {
    var scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(C.PALETTE.fog, 0.0055);

    var width = mount.clientWidth || window.innerWidth;
    var height = mount.clientHeight || window.innerHeight;

    var camera = new THREE.PerspectiveCamera(52, width / height, 1, 2000);
    camera.position.set(0, 30, 150);

    var isSmallScreen = window.matchMedia('(max-width: 640px), (pointer: coarse)').matches;

    var renderer = new THREE.WebGLRenderer({
      antialias: !isSmallScreen,
      alpha: false,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(C.PALETTE.bg, 1);
    mount.appendChild(renderer.domElement);

    var ambient = new THREE.AmbientLight(0xffffff, 0.55);
    var key = new THREE.PointLight(0xffd9ec, 1.3, 600, 1.6);
    key.position.set(80, 60, 120);
    var rim = new THREE.PointLight(0x8a5fc9, 0.8, 600, 1.6);
    rim.position.set(-100, -40, -80);
    scene.add(ambient, key, rim);

    function resize() {
      var w = mount.clientWidth || window.innerWidth;
      var h = mount.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }

    function dispose() {
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    }

    return { renderer: renderer, scene: scene, camera: camera, resize: resize, dispose: dispose };
  }

  window.Universo.createScene = createScene;
})();
