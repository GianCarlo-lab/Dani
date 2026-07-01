/**
 * The particle heart hovering above the planet: one filled point cloud
 * sampled from a parametric heart curve (single draw call), a slow
 * breathing scale pulse, and a small recycled pool of particles that
 * drift outward from the heart's edge.
 */
(function () {
  'use strict';

  var C = window.Universo.constants;

  /** Classic parametric heart curve, t in [0, 2π). */
  function heartOutline(t) {
    var x = 16 * Math.pow(Math.sin(t), 3);
    var y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    return { x: x, y: y };
  }

  function buildHeartCloud(rand) {
    var count = C.HEART_POINT_COUNT;
    var scale = 2.05;
    var positions = new Float32Array(count * 3);
    var colors = new Float32Array(count * 3);
    // three-tone gradient (edge -> rim -> core) instead of a two-tone
    // lerp, plus a brightness boost past 1.0 on the core so it reads
    // as genuinely glowing under additive blending, not just pale
    var core = new THREE.Color(C.PALETTE.heartCore).multiplyScalar(1.15);
    var rim = new THREE.Color(C.PALETTE.heartRim);
    var edge = new THREE.Color(C.PALETTE.heart);

    for (var i = 0; i < count; i++) {
      var t = rand() * Math.PI * 2;
      var o = heartOutline(t);
      // sqrt for uniform-area fill instead of clustering toward the center
      var s = Math.sqrt(rand());
      var jitter = (rand() - 0.5) * 1.6;

      positions[i * 3] = o.x * s * scale + jitter;
      positions[i * 3 + 1] = o.y * s * scale + jitter;
      positions[i * 3 + 2] = (rand() - 0.5) * 6 * s;

      var tint = s < 0.5
        ? edge.clone().lerp(rim, s * 2)
        : rim.clone().lerp(core, (s - 0.5) * 2);
      colors[i * 3] = tint.r;
      colors[i * 3 + 1] = tint.g;
      colors[i * 3 + 2] = tint.b;
    }

    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    var material = new THREE.PointsMaterial({
      size: 1.7,
      map: window.Universo.glow.getGlowTexture(),
      alphaTest: 0.02,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    return new THREE.Points(geometry, material);
  }

  function buildEmitters(rand) {
    var count = C.HEART_EMIT_POOL;
    var positions = new Float32Array(count * 3);
    var velocities = new Float32Array(count * 3);
    var life = new Float32Array(count);
    var maxLife = new Float32Array(count);

    function reset(i) {
      var t = rand() * Math.PI * 2;
      var o = heartOutline(t);
      var scale = 2.05;
      var nx = o.x, ny = o.y;
      var len = Math.sqrt(nx * nx + ny * ny) || 1;
      positions[i * 3] = o.x * scale;
      positions[i * 3 + 1] = o.y * scale;
      positions[i * 3 + 2] = (rand() - 0.5) * 4;
      velocities[i * 3] = (nx / len) * (2 + rand() * 3);
      velocities[i * 3 + 1] = (ny / len) * (2 + rand() * 3) + 1.2;
      velocities[i * 3 + 2] = (rand() - 0.5) * 1.5;
      life[i] = 0;
      maxLife[i] = 1.1 + rand() * 1.2;
    }

    for (var i = 0; i < count; i++) reset(i);

    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    var material = new THREE.PointsMaterial({
      size: 2,
      map: window.Universo.glow.getGlowTexture(),
      color: C.PALETTE.neonGold,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    var points = new THREE.Points(geometry, material);

    function update(dt) {
      for (var i = 0; i < count; i++) {
        life[i] += dt;
        if (life[i] >= maxLife[i]) { reset(i); continue; }
        positions[i * 3] += velocities[i * 3] * dt;
        positions[i * 3 + 1] += velocities[i * 3 + 1] * dt;
        positions[i * 3 + 2] += velocities[i * 3 + 2] * dt;
      }
      geometry.attributes.position.needsUpdate = true;
    }

    return { points: points, update: update };
  }

  function createHeart() {
    var rand = C.mulberry32(C.seedFromString('universo-corazon-v1'));
    var group = new THREE.Group();

    var cloud = buildHeartCloud(rand);
    group.add(cloud);

    var emitters = buildEmitters(rand);
    group.add(emitters.points);

    var haloBack = window.Universo.glow.createGlowSprite(C.PALETTE.heart, 62, 0.5);
    haloBack.position.z = -6;
    group.add(haloBack);

    // a tighter, brighter core glow on top of the wider halo — two
    // glow radii read as noticeably more "lit from within" than one
    var haloCore = window.Universo.glow.createGlowSprite(C.PALETTE.heartRim, 30, 0.6);
    haloCore.position.z = -3;
    group.add(haloCore);

    var clock = 0;
    return {
      group: group,
      update: function (dt) {
        clock += dt;
        var breathe = 1 + Math.sin(clock * 1.6) * 0.06;
        group.scale.set(breathe, breathe, breathe);
        emitters.update(dt);
      }
    };
  }

  window.Universo.createHeart = createHeart;
})();
