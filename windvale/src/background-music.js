// 本地合成的轻柔循环旋律，无外部音频、下载或 AI 请求。
export function createBackgroundMusic(button, scope = window) {
  let context, output, timer, nextTime = 0, step = 0;
  let enabled = true, started = false, ducked = false;
  try { enabled = scope.localStorage.getItem('windvale.bgm') !== 'off'; } catch {}
  const melody = [72,null,76,79,76,null,74,72,69,null,72,76,74,null,72,67,
    65,null,69,72,76,null,74,72,67,null,71,74,72,null,71,67];
  const chords = [[48,52,55],[45,48,52],[41,45,48],[43,47,50]];
  function label() {
    button.textContent = enabled ? '♫ 音乐：开' : '♫ 音乐：关';
    button.setAttribute('aria-pressed', String(enabled));
  }
  function note(midi, time, duration, volume) {
    const oscillator = context.createOscillator(), gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(volume, time + .04);
    gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
    oscillator.connect(gain); gain.connect(output);
    oscillator.start(time); oscillator.stop(time + duration + .05);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
  function schedule() {
    while (nextTime < context.currentTime + .3) {
      const index = step % melody.length;
      if (index % 8 === 0) for (const pitch of chords[Math.floor(index / 8)]) note(pitch, nextTime, 3.4, .055);
      if (melody[index] !== null) note(melody[index], nextTime, 1.3, .09);
      step++; nextTime += .48;
    }
  }
  function volume() {
    if (output) output.gain.setTargetAtTime(ducked ? .13 : .45, context.currentTime, .2);
  }
  async function play() {
    if (!started || !enabled || scope.document.hidden) return;
    try {
      if (!context) {
        const AudioContext = scope.AudioContext || scope.webkitAudioContext;
        context = new AudioContext(); output = context.createGain(); output.connect(context.destination); volume();
        nextTime = context.currentTime;
      }
      await context.resume();
      if (!enabled || scope.document.hidden) { context.suspend(); return; }
      if (!timer) { nextTime = Math.max(nextTime, context.currentTime); schedule(); timer = scope.setInterval(schedule, 150); }
      label();
    } catch { button.textContent = '♫ 点击播放音乐'; }
  }
  function pause() { if (timer) scope.clearInterval(timer); timer = null; context?.suspend().catch(() => {}); }
  button.onclick = () => {
    enabled = !enabled;
    try { scope.localStorage.setItem('windvale.bgm', enabled ? 'on' : 'off'); } catch {}
    label(); if (enabled) { started = true; play(); } else pause();
  };
  scope.document.addEventListener('visibilitychange', () => { if (scope.document.hidden) pause(); else play(); });
  scope.addEventListener('pagehide', pause);
  label();
  return { start() { started = true; play(); }, duck(value) { ducked = value; volume(); } };
}
