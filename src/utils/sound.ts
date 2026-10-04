class SoundEngine {
  private ctx: AudioContext | null = null;
  private isAlarmPlaying = false;
  private intervalId: number | null = null;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playBeep(freq = 880, duration = 0.15, type: OscillatorType = 'sine') {
    try {
      this.initContext();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      // Audio context might be restricted before user gesture
    }
  }

  startSosSiren() {
    if (this.isAlarmPlaying) return;
    this.isAlarmPlaying = true;
    this.initContext();

    let high = true;
    const pulse = () => {
      if (!this.isAlarmPlaying) return;
      this.playBeep(high ? 950 : 650, 0.28, 'sawtooth');
      high = !high;
    };

    pulse();
    this.intervalId = window.setInterval(pulse, 320);
  }

  stopSosSiren() {
    this.isAlarmPlaying = false;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const soundFx = new SoundEngine();
