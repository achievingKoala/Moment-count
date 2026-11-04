const KEY = 'windvale.practice-history.v1';
export function createPracticeHistory(storage) {
  let records = [];
  try { const saved = JSON.parse(storage?.getItem(KEY) || '[]'); if (Array.isArray(saved)) records = saved; } catch {}
  function save() { try { if (!storage) return false; storage.setItem(KEY, JSON.stringify(records)); return true; } catch { return false; } }
  return {
    all: () => records,
    add(question, answer) {
      const record = { id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`, time: new Date().toISOString(), question, answer, status: '等待反馈', feedback: null };
      records.unshift(record); return { record, saved: save() };
    },
    update(record, changes) { Object.assign(record, changes); return save(); }
  };
}
