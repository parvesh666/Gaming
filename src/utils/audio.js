export const playRollSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    // Simulate dice rolling with 5 softer, distinct "clacks" spread over 400ms
    for (let i = 0; i < 5; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      // Triangle wave is much softer than square
      osc.type = 'triangle';
      
      const startTime = ctx.currentTime + i * 0.08;
      // Higher frequency that quickly drops creates a "clack" sound
      osc.frequency.setValueAtTime(600 + Math.random() * 200, startTime);
      osc.frequency.exponentialRampToValueAtTime(100, startTime + 0.03);
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.03);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.04);
    }
  } catch (e) {
    console.log("Audio not supported or interaction needed first", e);
  }
};

export const playMoveSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    // Create a pleasant "pop" sound for moving
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) {
    console.log("Audio not supported or interaction needed first", e);
  }
};

export const playCaptureSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    // Sharp downward swoop for a capture
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {}
};

export const playGoalSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    // Happy 3-note arpeggio (C, E, G) for reaching home
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      
      const startTime = ctx.currentTime + (i * 0.1);
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.15);
    });
  } catch (e) {}
};

export const playWinSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    // Victory fanfare
    const notes = [
      { freq: 523.25, time: 0, dur: 0.2 },
      { freq: 523.25, time: 0.2, dur: 0.2 },
      { freq: 523.25, time: 0.4, dur: 0.2 },
      { freq: 659.25, time: 0.6, dur: 0.6 }, // E5
      { freq: 783.99, time: 1.2, dur: 0.8 }, // G5
    ];
    
    notes.forEach(note => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      
      const startTime = ctx.currentTime + note.time;
      osc.frequency.setValueAtTime(note.freq, startTime);
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.4, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + note.dur);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + note.dur);
    });
  } catch (e) {}
};

export const playTurnSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    // Soft, quick notification "ding"
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.05);
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) {}
};
