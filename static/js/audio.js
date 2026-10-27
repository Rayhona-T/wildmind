let context = null;

function ctx() {
  if (!context) context = new AudioContext();
  return context;
}

function beep(freq, duration, type, gainValue) {
  const audio = ctx();
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = gainValue;
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
  osc.stop(audio.currentTime + duration);
}

export const audio = {
  enabled: false,
  volume: 0.4,
  setEnabled(value) {
    this.enabled = value;
    if (value) ctx().resume();
  },
  click() {
    if (!this.enabled) return;
    beep(520, 0.08, "square", this.volume * 0.08);
  },
  discover() {
    if (!this.enabled) return;
    beep(420, 0.12, "triangle", this.volume * 0.1);
    setTimeout(() => beep(640, 0.16, "triangle", this.volume * 0.1), 90);
  },
  error() {
    if (!this.enabled) return;
    beep(180, 0.18, "sawtooth", this.volume * 0.08);
  },
};
