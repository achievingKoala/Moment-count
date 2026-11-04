import {createPracticeHistory} from './practice-history.js';
export function createFeedbackController({ input, onApply, fetcher = fetch }) {
  const panel = document.getElementById('ai-feedback'), status = document.getElementById('ai-feedback-status'), content = document.getElementById('ai-feedback-content');
  const submit = document.querySelector('#answer-form button[type="submit"]');
  let storage; try { storage = globalThis.localStorage; } catch {}
  const history = createPracticeHistory(storage);
  const previous = document.getElementById('feedback-previous'), next = document.getElementById('feedback-next'), counter = document.getElementById('feedback-counter');
  let activeRecord = null, currentHistoryQuestion = null, cardIndex = 0;
  function recordsForQuestion() { return history.all().filter(record => record.question === currentHistoryQuestion); }
  function showHistory(question) { currentHistoryQuestion = question; cardIndex = 0; renderHistory(); }
  function renderHistory() {
    const records = recordsForQuestion();
    cardIndex = Math.max(0, Math.min(cardIndex, records.length - 1));
    panel.hidden = !currentHistoryQuestion;
    content.replaceChildren();
    previous.disabled = cardIndex >= records.length - 1;
    next.disabled = cardIndex === 0;
    counter.textContent = records.length ? `${records.length - cardIndex} / ${records.length}` : '暂无记录';
    const record = records[cardIndex];
    if (!record) { status.textContent = '提交回答后，这里会显示反馈卡片。'; return; }
    status.textContent = new Date(record.time).toLocaleString('zh-CN') + ' · ' + record.status;
    paragraph('本次回答：' + record.answer);
    if (record.feedback) renderFeedback(record.feedback);
  }
  previous.onclick = () => { cardIndex++; renderHistory(); };
  next.onclick = () => { cardIndex--; renderHistory(); };
  let sequence = 0, controller = null;
  function clearPendingRecord() { if(activeRecord){history.update(activeRecord,{status:'请求已中断，可重新提交'});activeRecord=null;renderHistory();} }
  function cancel() { if(activeRecord){history.update(activeRecord,{status:'请求已中断，可重新提交'});activeRecord=null;renderHistory();} sequence++; controller?.abort(); controller = null; submit.disabled = false; submit.textContent = '提交回答并获取反馈'; panel.hidden = true; status.textContent = ''; content.replaceChildren(); }
  function paragraph(text, parent = content, tag = 'p') { const node = document.createElement(tag); node.textContent = text; parent.append(node); return node; }
  function list(title, items) { if (!items.length) return; paragraph(title, content, 'h4'); const ul = document.createElement('ul'); for (const item of items) paragraph(item, ul, 'li'); content.append(ul); }
  function renderFeedback(f) {
      paragraph(f.referenceBand === null ? '文字表达参考分：暂不估分' : `文字表达参考分：${f.referenceBand} / 9`, content, 'h4');
      paragraph('仅根据文字估分，不含发音和口语流利度。');
      paragraph('主要错误', content, 'h4');
      if (!f.onTopic) paragraph('回答偏离题目，请先直接回答问题。');
      if (!f.corrections.length && f.onTopic) paragraph('暂未发现明显的语言错误。');
      for (const correction of f.corrections.slice(0, 2)) {
        const row = document.createElement('div'); row.className = 'ai-correction';
        paragraph(correction.original + ' → ' + correction.revised, row);
        paragraph(correction.reason, row); content.append(row);
      }
      list('改进点', f.improvements.slice(0, 2));
  }
  async function request(question, answer) {
    cancel(); showHistory(question); const token = sequence; const requestController = new AbortController(); controller = requestController; panel.hidden = false; status.textContent = 'AI 正在点评你的文字回答…'; submit.disabled = true; submit.textContent = '正在点评…';
    const entry=history.add(question,answer); const record=entry.record; activeRecord=record; cardIndex=0; renderHistory();
    if(!entry.saved) status.textContent+='（当前浏览器无法持久保存记录）';
    const timer = setTimeout(() => requestController.abort(), 32000);
    try {
      if (location.protocol === 'file:') throw Error('AI 反馈需要服务端，请使用本地预览地址，或部署后的网页。');
      const response = await fetcher('/api/speaking-feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ part: 1, question, answer }), signal: requestController.signal });
      let payload; try { payload = await response.json(); } catch { throw Error('当前预览服务不支持 AI 接口，请运行 npm run dev。'); }
      if (!response.ok) throw Error(payload.error || 'AI 反馈暂时不可用，请再次提交。');
      if (token !== sequence) return;
      const f = payload.feedback; if (!f || !Array.isArray(f.corrections) || !Array.isArray(f.strengths) || !Array.isArray(f.improvements)) throw Error('反馈格式不正确，请重试。');
      const saved=history.update(record,{status:'点评完成',feedback:f}); activeRecord=null;renderHistory();
      status.textContent = saved?'点评完成':'点评完成（记录仅在当前页面保留）';

    } catch (error) { if (token !== sequence) return; status.textContent = error.name === 'AbortError' ? '反馈等待超时，请再次提交。' : error.message; history.update(record,{status:status.textContent});activeRecord=null;renderHistory(); }
    finally { clearTimeout(timer); if (token === sequence) { controller = null; submit.disabled = false; submit.textContent = '再次提交获取反馈'; } }
  }
  renderHistory();
  // 编辑时保留上一轮反馈；仅中断正在进行的请求，避免旧结果覆盖新回答。
  input.addEventListener('input', () => {
    if (!controller) return;
    sequence++; controller.abort(); controller = null;
    clearPendingRecord();
    submit.disabled = false; submit.textContent = '提交回答并获取反馈';
    status.textContent = '回答已修改，请重新提交。';
  });
  return { cancel, request, showHistory };
}
