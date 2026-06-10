let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

function playTone(frequency: number, durationMs: number, volume = 0.08): void {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "square";
  oscillator.frequency.value = frequency;
  gain.gain.value = volume;
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + durationMs / 1000);
}

export function playAgentSound(kind: "happy" | "alert" | "none"): void {
  if (kind === "none") {
    return;
  }
  if (kind === "happy") {
    playTone(880, 80);
    window.setTimeout(() => playTone(1175, 90), 90);
    return;
  }
  playTone(220, 120);
  window.setTimeout(() => playTone(185, 140), 100);
}
