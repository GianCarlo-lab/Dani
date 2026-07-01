/**
 * View-switching state machine. Independent of both `Bouquet` and
 * `Universo` — it only knows about `.vista` sections and nav buttons,
 * and calls `Universo.start`/`Universo.pause` as opaque lifecycle
 * hooks (never touches Universo's or Bouquet's internals).
 *
 * Transition mechanic: each `.vista` has a resting visible state
 * (opacity 1 / no blur / scale 1, defined on `.vista` itself) and a
 * `.vista--hidden-state` modifier (opacity 0 / blurred / scaled) that
 * CSS transitions between. A separate `.vista--desmontada` class
 * (`display:none`, no transition) removes the inactive view from
 * layout/paint/input entirely once its exit transition has finished —
 * kept as a distinct class specifically so toggling it never itself
 * triggers a transition (display can't be animated).
 */
(function () {
  'use strict';

  var TRANSITION_MS = 420;

  var nav = document.getElementById('nav-vistas');
  var vistaEls = {}; // name -> element
  var buttonEls = {}; // name -> button
  // Ramo is always the view the page loads into — see index.html, the
  // #vista-ramo section has no `vista--desmontada` class on load.
  var activeName = 'ramo';
  var switching = false;

  document.querySelectorAll('.vista').forEach(function (el) {
    vistaEls[el.dataset.vista] = el;
  });

  if (nav) {
    nav.querySelectorAll('button[data-vista]').forEach(function (btn) {
      buttonEls[btn.dataset.vista] = btn;
      btn.addEventListener('click', function () { goTo(btn.dataset.vista); });
    });
  }

  function highlightButton(name) {
    Object.keys(buttonEls).forEach(function (key) {
      buttonEls[key].classList.toggle('activo', key === name);
      buttonEls[key].setAttribute('aria-pressed', key === name ? 'true' : 'false');
    });
  }

  function onViewEntered(name) {
    if (name === 'universo') {
      var mount = document.getElementById('universo-canvas-mount');
      if (window.Universo && mount) window.Universo.start(mount);
    }
  }

  function onViewLeft(name) {
    if (name === 'universo' && window.Universo) {
      window.Universo.pause();
    }
  }

  function goTo(name) {
    if (switching || name === activeName || !vistaEls[name]) return;
    switching = true;

    var next = vistaEls[name];
    var current = activeName ? vistaEls[activeName] : null;

    // prep the incoming view at its "hidden" visual state while it's
    // still display:none, so removing display:none doesn't itself pop
    // it straight to the resting state before the transition can run
    next.classList.add('vista--hidden-state');
    next.classList.remove('vista--desmontada');
    // force a style flush so the browser registers the hidden-state
    // styles before we remove them on the next line
    void next.offsetHeight; // eslint-disable-line no-void
    next.classList.remove('vista--hidden-state');

    if (current) current.classList.add('vista--hidden-state');

    highlightButton(name);
    var previousName = activeName;
    activeName = name;

    setTimeout(function () {
      if (current) current.classList.add('vista--desmontada');
      switching = false;
      onViewEntered(name);
      if (previousName) onViewLeft(previousName);
    }, TRANSITION_MS);
  }

  window.Vistas = {
    goTo: goTo,
    current: function () { return activeName; }
  };

  highlightButton(activeName);
})();
