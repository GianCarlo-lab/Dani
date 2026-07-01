/**
 * The word-rings: each ring is built from literal text sprites placed
 * around a circle (not images), tilted and spun at its own speed.
 *
 * Structure per ring:
 *   tiltGroup (static rotation.x/z — the ring's fixed tilt)
 *     └─ spinGroup (rotation.y incremented every frame — the ring's spin)
 *           └─ one Sprite per word, placed at (cos(a)*R, 0, sin(a)*R)
 *
 * Every frame, each word sprite's `material.rotation` (its 2D rotation
 * around the camera-facing billboard) is recomputed from the word's
 * tangent direction on the ring projected into camera screen space —
 * this is what makes each word appear to "follow" the ring's
 * circumference instead of all facing the same fixed way.
 */
(function () {
  'use strict';

  var C = window.Universo.constants;

  function wordTexture(text, tone) {
    var fontSize = 46;
    var font = '600 ' + fontSize + 'px Georgia, "Times New Roman", serif';
    var measure = document.createElement('canvas').getContext('2d');
    measure.font = font;
    var textWidth = measure.measureText(text).width;

    var paddingX = 28;
    var paddingY = 20;
    var canvas = document.createElement('canvas');
    canvas.width = Math.ceil(textWidth + paddingX * 2);
    canvas.height = Math.ceil(fontSize + paddingY * 2);

    var ctx = canvas.getContext('2d');
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = tone.glowCss || 'rgba(255,180,220,.9)';
    ctx.shadowBlur = 14;
    ctx.fillStyle = tone.text;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    // a second crisp pass on top of the glow so the letters stay legible
    ctx.shadowBlur = 0;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    var texture = new THREE.CanvasTexture(canvas);
    return { texture: texture, aspect: canvas.width / canvas.height };
  }

  function buildRing(index, opts, rand) {
    var tone = C.RING_TONES[index % C.RING_TONES.length];
    tone = { text: tone.text, glow: tone.glow, glowCss: '#' + new THREE.Color(tone.glow).getHexString() };

    var tiltGroup = new THREE.Group();
    tiltGroup.rotation.x = opts.tiltX;
    tiltGroup.rotation.z = opts.tiltZ;

    var spinGroup = new THREE.Group();
    tiltGroup.add(spinGroup);

    // faint circular guide so the ring reads as a ring even between words
    var guidePoints = [];
    for (var g = 0; g <= 64; g++) {
      var ga = (g / 64) * Math.PI * 2;
      guidePoints.push(new THREE.Vector3(Math.cos(ga) * opts.radius, 0, Math.sin(ga) * opts.radius));
    }
    var guideGeom = new THREE.BufferGeometry().setFromPoints(guidePoints);
    var guideMat = new THREE.LineBasicMaterial({ color: tone.glow, transparent: true, opacity: 0.18 });
    spinGroup.add(new THREE.Line(guideGeom, guideMat));

    var words = [];
    var phaseOffset = rand() * Math.PI * 2;
    for (var i = 0; i < opts.wordCount; i++) {
      var angle = phaseOffset + (i / opts.wordCount) * Math.PI * 2;
      var phrase = C.PHRASES[Math.floor(rand() * C.PHRASES.length)];
      var built = wordTexture(phrase, tone);

      var material = new THREE.SpriteMaterial({
        map: built.texture,
        transparent: true,
        depthWrite: false
      });
      var sprite = new THREE.Sprite(material);
      var height = opts.wordScale;
      sprite.scale.set(height * built.aspect, height, 1);
      sprite.position.set(Math.cos(angle) * opts.radius, 0, Math.sin(angle) * opts.radius);
      sprite.userData.angle = angle;
      spinGroup.add(sprite);
      words.push(sprite);
    }

    return {
      tiltGroup: tiltGroup,
      spinGroup: spinGroup,
      words: words,
      speed: opts.speed
    };
  }

  /**
   * Recomputes each word's on-screen rotation so it visually follows
   * the ring's tangent, projecting the word's tangent direction (in
   * the ring's current world orientation) into the camera's screen
   * axes.
   */
  function updateWordOrientations(ring, camera) {
    var camRight = new THREE.Vector3();
    var camUp = new THREE.Vector3();
    camera.matrixWorld.extractBasis(camRight, camUp, new THREE.Vector3());

    var rotationMatrix = new THREE.Matrix4().extractRotation(ring.spinGroup.matrixWorld);
    var tangentLocal = new THREE.Vector3();

    ring.words.forEach(function (sprite) {
      var a = sprite.userData.angle;
      tangentLocal.set(-Math.sin(a), 0, Math.cos(a)).applyMatrix4(rotationMatrix).normalize();
      var sx = tangentLocal.dot(camRight);
      var sy = tangentLocal.dot(camUp);
      sprite.material.rotation = Math.atan2(sy, sx) - Math.PI / 2;
    });
  }

  /** Builds all rings and returns update/dispose handles. */
  function createRings(planetGroup) {
    var rand = C.mulberry32(C.seedFromString('universo-anillos-v1'));
    var count = C.RING_COUNT;
    var baseRadius = C.PLANET_RADIUS * 1.55;
    var rings = [];

    for (var i = 0; i < count; i++) {
      var radius = baseRadius + i * (C.PLANET_RADIUS * 0.42) + rand() * 6;
      var opts = {
        radius: radius,
        tiltX: (0.35 + rand() * 0.5) * (rand() > 0.5 ? 1 : -1),
        tiltZ: (rand() - 0.5) * 0.5,
        speed: 0.04 + rand() * 0.09, // rad/s, distinct per ring
        wordCount: 6 + Math.floor(rand() * 4), // 6..9
        wordScale: 4.4 + rand() * 1.6
      };
      var ring = buildRing(i, opts, rand);
      planetGroup.add(ring.tiltGroup);
      rings.push(ring);
    }

    return {
      rings: rings,
      update: function (dt, camera) {
        rings.forEach(function (ring) {
          // all rings spin the same direction ("sentido horario") at
          // their own distinct speed
          ring.spinGroup.rotation.y -= ring.speed * dt;
          ring.tiltGroup.updateMatrixWorld(true);
          updateWordOrientations(ring, camera);
        });
      }
    };
  }

  window.Universo.createRings = createRings;
})();
