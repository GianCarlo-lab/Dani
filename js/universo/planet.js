/**
 * The artistic, non-scientific "Saturn" — a sphere with a painterly
 * banded gradient texture (wine/magenta/gold, not a photoreal planet)
 * plus a soft additive glow halo behind it.
 */
(function () {
  'use strict';

  var C = window.Universo.constants;

  function buildPlanetTexture() {
    var w = 4, h = 256; // 1px-wide gradient strip, stretched — cheap & smooth
    var canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext('2d');
    var grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0.00, '#ffd9a8');   // gold rim highlight (top)
    grad.addColorStop(0.16, '#ff9fc7');   // warm pink band
    grad.addColorStop(0.38, '#c23a7a');   // magenta
    grad.addColorStop(0.60, '#7a2456');   // wine
    grad.addColorStop(0.82, '#4a1030');   // deep granate
    grad.addColorStop(1.00, '#2a0a1e');   // shadowed pole
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // a few subtle darker/lighter bands for a painterly, hand-illustrated feel
    var bandRand = C.mulberry32(C.seedFromString('planeta-bandas'));
    for (var i = 0; i < 10; i++) {
      var y = bandRand() * h;
      var bh = 2 + bandRand() * 6;
      ctx.fillStyle = 'rgba(255,255,255,' + (bandRand() * 0.06).toFixed(3) + ')';
      ctx.fillRect(0, y, w, bh);
    }

    var texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }

  function createPlanet() {
    var radius = C.PLANET_RADIUS;
    var geometry = new THREE.SphereGeometry(radius, 48, 48);
    var material = new THREE.MeshStandardMaterial({
      map: buildPlanetTexture(),
      roughness: 0.55,
      metalness: 0.25,
      emissive: new THREE.Color(C.PALETTE.wine),
      emissiveIntensity: 0.35
    });
    var mesh = new THREE.Mesh(geometry, material);

    var group = new THREE.Group();
    group.add(mesh);

    // soft halo behind the planet — the "brillos dorados" glow
    var halo = window.Universo.glow.createGlowSprite(C.PALETTE.gold, radius * 4.4, 0.55);
    halo.position.set(0, 0, -radius * 0.2);
    group.add(halo);

    var haloPink = window.Universo.glow.createGlowSprite(C.PALETTE.magenta, radius * 3.1, 0.4);
    haloPink.position.set(0, 0, radius * 0.1);
    group.add(haloPink);

    return {
      group: group,
      mesh: mesh,
      update: function (dt) {
        mesh.rotation.y += dt * 0.03;
      }
    };
  }

  window.Universo.createPlanet = createPlanet;
})();
