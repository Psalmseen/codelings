// Tiny synthesized sound effects, so there are no audio files to load.
const MUTE_KEY = 'codelings_muted';
let ctx;

export const isMuted = () => localStorage.getItem(MUTE_KEY) === '1';
export const setMuted = (muted) => localStorage.setItem(MUTE_KEY, muted ? '1' : '0');

function play(notes, { duration = 0.14, gap = 0.09, type = 'sine', volume = 0.18 } = {}) {
  if (isMuted()) return;
  try {
    ctx ??= new AudioContext();
    notes.forEach((frequency, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + i * gap;
      osc.type = type;
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration + 0.02);
    });
  } catch {
    // Audio isn't available; stay silent
  }
}

export const sounds = {
  correct: () => play([659, 988]),
  wrong: () => play([220, 165], { type: 'triangle', duration: 0.2, gap: 0.12 }),
  heartLost: () => play([330, 247, 196], { type: 'triangle', gap: 0.1 }),
  complete: () => play([523, 659, 784, 1047], { duration: 0.22, gap: 0.12 }),
};
