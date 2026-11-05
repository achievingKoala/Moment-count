// 浏览器没有统一的语音性别字段，按常见系统语音名称匹配。
const femaleNames = /female|woman|samantha|victoria|karen|moira|tessa|fiona|serena|ava|allison|susan|zira|hazel|sonia|jenny|aria|xiaoxiao|xiaoyi|ting.?ting|mei.?jia|sin.?ji|huihui|yaoyao|晓晓|晓伊|婷婷|慧慧|瑶瑶|女声/i;
const maleNames = /\bmale\b|\bman\b|daniel|alex\b|david|mark\b|george|james|guy\b|ryan|yunxi|yunjian|yunyang|yunfeng|yunhao|yunxia|yunze|kangkang|yusheng|云希|云健|云扬|云枫|云皓|云夏|云泽|康康|宇生|男声/i;
export function selectCharacterVoice(voices, gender, english) {
  const language = english ? /^en/i : /^zh/i;
  const candidates = voices.filter(voice => language.test(voice.lang));
  const preferred = gender === 'female' ? femaleNames : maleNames;
  const opposite = gender === 'female' ? maleNames : femaleNames;
  return candidates.filter(voice => preferred.test(voice.name) && !opposite.test(voice.name))
    .sort((a,b) => Number(b.localService)-Number(a.localService))[0] || null;
}

// 等待角色语音加载；超时后优先保证同语言可播放，性别只能按名称尽力匹配。
export function selectFallbackVoice(voices, english) {
  const language = english ? /^en/i : /^zh/i;
  return voices.filter(voice => language.test(voice.lang))
    .sort((a,b) => Number(Boolean(b.default))-Number(Boolean(a.default)) || Number(Boolean(b.localService))-Number(Boolean(a.localService)))[0] || null;
}
export function waitForCharacterVoice(synth, gender, english, timeoutMs = 2000) {
  const voices = synth.getVoices();
  const current = selectCharacterVoice(voices, gender, english) || selectFallbackVoice(voices, english);
  if (current) return Promise.resolve(current);
  return new Promise(resolve => {
    let timer;
    function finish(voice) {
      clearTimeout(timer);
      synth.removeEventListener('voiceschanged', changed);
      resolve(voice);
    }
    function changed() {
      const available = synth.getVoices();
      const voice = selectCharacterVoice(available, gender, english) || selectFallbackVoice(available, english);
      if (voice) finish(voice);
    }
    synth.addEventListener('voiceschanged', changed);
    timer = setTimeout(() => finish(selectCharacterVoice(synth.getVoices(), gender, english) || selectFallbackVoice(synth.getVoices(), english)), timeoutMs);
    changed();
  });
}
