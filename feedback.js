// User-controlled, light sound and motion feedback for the whole Ledger UI.
(function () {
  var soundControl = document.getElementById('feedbackSound');
  var motionControl = document.getElementById('feedbackMotion');
  if (!soundControl || !motionControl) return;

  function readPreference(key, fallback) {
    try {
      var stored = localStorage.getItem(key);
      return stored === null ? fallback : stored === 'true';
    } catch (_) { return fallback; }
  }
  function storePreference(key, enabled) {
    try { localStorage.setItem(key, String(enabled)); } catch (_) { /* Preference storage is optional. */ }
  }

  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  soundControl.checked = readPreference('brandex-feedback-sound', true);
  motionControl.checked = readPreference('brandex-feedback-motion', !reducedMotion);
  document.body.classList.toggle('feedback-motion-off', !motionControl.checked);

  var audioContext = null;
  function playTap() {
    if (!soundControl.checked) return;
    try {
      var AudioContextType = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextType) return;
      if (!audioContext) audioContext = new AudioContextType();
      if (audioContext.state === 'suspended') audioContext.resume();
      var now = audioContext.currentTime;
      [520, 660].forEach(function (frequency, index) {
        var oscillator = audioContext.createOscillator();
        var gain = audioContext.createGain();
        var start = now + index * 0.025;
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.012, start + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.065);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.07);
      });
    } catch (_) { /* Sound is optional and can be disabled in Feedback. */ }
  }

  soundControl.addEventListener('change', function () {
    storePreference('brandex-feedback-sound', soundControl.checked);
    if (soundControl.checked) playTap();
  });
  motionControl.addEventListener('change', function () {
    document.body.classList.toggle('feedback-motion-off', !motionControl.checked);
    storePreference('brandex-feedback-motion', motionControl.checked);
  });

  document.addEventListener('click', function (event) {
    var control = event.target.closest('button,.ni,.client-card,.feedback-settings summary');
    if (!control || control.disabled || control.closest('.feedback-settings-panel')) return;
    playTap();
  });
})();
