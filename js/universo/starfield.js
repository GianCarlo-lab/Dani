/**
 * The night sky: a large static star shell (one Points draw call) plus
 * a small drifting "dust" layer nearer the camera (also one Points
 * draw call, individually animated since it's a small, bounded count).
 */
(function () {
  'use strict';

  var C = window.Universo.constants;

  function randomOnShell(rMin, rMax, rand) {
    var r = rMin + rand() * (rMax - rMin);
    var theta = rand() * Math.PI * 2;
    var phi = Math.acos(2 * rand() - 1);
    return {
      x: r * Math.sin(phi) * Math.cos(theta),
      y: r * Math.sin(phi) * Math.sin(theta),
      z: r * Math.cos(phi)
    };
  }

  function buildStars(rand) {
    var count = C.STAR_COUNT;
    var positions = new Float32Array(count * 3);
    var colors = new Float32Array(count * 3);
    var warm = new THREE.Color(C.PALETTE.starWarm);
    var cool = new THREE.Color(C.PALETTE.starCool);

    for (var i = 0; i < count; i++) {
      var p = randomOnShell(260, 820, rand);
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;

      var tint = warm.clone().lerp(cool, rand());
      var brightness = 0.5 + rand() * 0.5;
      colors[i * 3] = tint.r * brightness;
      colors[i * 3 + 1] = tint.g * brightness;
      colors[i * 3 + 2] = tint.b * brightness;
    }

    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    var material = new THREE.PointsMaterial({
      size: 1.6,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    var points = new THREE.Points(geometry, material);
    points.renderOrder = -2;
    return points;
  }

  function buildDust(rand) {
    var count = C.DUST_COUNT;
    var positions = new Float32Array(count * 3);
    var velocities = new Float32Array(count * 3);

    for (var i = 0; i < count; i++) {
      var p = randomOnShell(60, 220, rand);
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
      velocities[i * 3] = (rand() - 0.5) * 0.05;
      velocities[i * 3 + 1] = (rand() - 0.5) * 0.05;
      velocities[i * 3 + 2] = (rand() - 0.5) * 0.05;
    }

    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    var material = new THREE.PointsMaterial({
      size: 1.1,
      sizeAttenuation: true,
      color: C.PALETTE.goldSoft,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    var points = new THREE.Points(geometry, material);
    points.userData.velocities = velocities;
    points.userData.bound = 230;
    return points;
  }

  /** Advances dust drift; called once per frame with elapsed seconds. */
  function updateDust(dustPoints, dt) {
    var pos = dustPoints.geometry.attributes.position.array;
    var vel = dustPoints.userData.velocities;
    var bound = dustPoints.userData.bound;
    for (var i = 0; i < pos.length; i += 3) {
      pos[i] += vel[i] * dt * 60;
      pos[i + 1] += vel[i + 1] * dt * 60;
      pos[i + 2] += vel[i + 2] * dt * 60;
      // wrap softly back toward center once a particle drifts too far
      var d2 = pos[i] * pos[i] + pos[i + 1] * pos[i + 1] + pos[i + 2] * pos[i + 2];
      if (d2 > bound * bound) {
        pos[i] *= 0.2; pos[i + 1] *= 0.2; pos[i + 2] *= 0.2;
      }
    }
    dustPoints.geometry.attributes.position.needsUpdate = true;
  }

  /** Builds both layers, seeded deterministically. */
  function createStarfield() {
    var rand = C.mulberry32(C.seedFromString('universo-estrellas-v1'));
    var stars = buildStars(rand);
    var dust = buildDust(rand);
    var group = new THREE.Group();
    group.add(stars, dust);
    return {
      group: group,
      update: function (dt) {
        group.rotation.y += dt * 0.006;
        updateDust(dust, dt);
      }
    };
  }

  window.Universo.createStarfield = createStarfield;
})();
