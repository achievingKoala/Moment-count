// 浏览器没有统一的语音性别字段，按常见系统语音名称匹配。
const femaleNames = /female|woman|samantha|victoria|karen|moira|tessa|fiona|serena|ava|allison|susan|zira|hazel|sonia|jenny|aria|xiaoxiao|xiaoyi|ting.?ting|mei.?jia|sin.?ji|huihui|yaoyao|晓晓|晓伊|婷婷|慧慧|瑶瑶|女声/i;
const maleNames = /\bmale\b|\bman\b|daniel|alex\b|david|mark\b|george|james|guy\b|ryan|yunxi|yunjian|kangkang|云希|云健|康康|男声/i;
export function selectCharacterVoice(voices, gender, english) {
  const language = english ? /^en/i : /^zh/i;
  const candidates = voices.filter(voice => language.test(voice.lang));
  const preferred = gender === 'female' ? femaleNames : maleNames;
  const opposite = gender === 'female' ? maleNames : femaleNames;
  return candidates.filter(voice => preferred.test(voice.name) && !opposite.test(voice.name))
    .sort((a,b) => Number(b.localService)-Number(a.localService))[0] || null;
}
