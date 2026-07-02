(() => {
  "use strict";

  const MINIMUM_DURATION = 120_000;
  const RECORDS_KEY = "move-two-minutes.records.v1";
  const ACTIVE_KEY = "move-two-minutes.active.v1";

  const elements = {
    todayLabel: document.querySelector("#todayLabel"),
    todayCount: document.querySelector("#todayCount"),
    todayDuration: document.querySelector("#todayDuration"),
    timerTitle: document.querySelector("#timerTitle"),
    timerDisplay: document.querySelector("#timerDisplay"),
    timerHint: document.querySelector("#timerHint"),
    statusPill: document.querySelector("#statusPill"),
    progressFill: document.querySelector("#progressFill"),
    activityButton: document.querySelector("#activityButton"),
    activityButtonLabel: document.querySelector("#activityButtonLabel"),
    historyList: document.querySelector("#historyList"),
    clearButton: document.querySelector("#clearButton"),
    confirmDialog: document.querySelector("#confirmDialog"),
    toast: document.querySelector("#toast")
  };

  let records = readRecords();
  let activeStart = readActiveStart();
  let timerId = null;
  let toastTimer = null;

  function safeParse(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function readRecords() {
    const value = safeParse(RECORDS_KEY, []);
    if (!Array.isArray(value)) return [];
    return value.filter((record) =>
      record && typeof record.id === "string" &&
      Number.isFinite(record.startTime) && Number.isFinite(record.endTime) &&
      Number.isFinite(record.duration) && record.duration >= MINIMUM_DURATION
    );
  }

  function readActiveStart() {
    const value = safeParse(ACTIVE_KEY, null);
    return Number.isFinite(value) && value > 0 && value <= Date.now() ? value : null;
  }

  function saveRecords() {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  }

  function saveActiveStart() {
    if (activeStart === null) localStorage.removeItem(ACTIVE_KEY);
    else localStorage.setItem(ACTIVE_KEY, JSON.stringify(activeStart));
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function formatTimer(milliseconds) {
    const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
  }

  function formatDuration(milliseconds) {
    const totalMinutes = Math.floor(milliseconds / 60_000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours === 0) return `${Math.max(2, totalMinutes)} 分钟`;
    return minutes === 0 ? `${hours} 小时` : `${hours} 小时 ${minutes} 分`;
  }

  function isSameLocalDay(timestamp, comparison = Date.now()) {
    const date = new Date(timestamp);
    const other = new Date(comparison);
    return date.getFullYear() === other.getFullYear() &&
      date.getMonth() === other.getMonth() &&
      date.getDate() === other.getDate();
  }

  function formatRecordTime(record) {
    const end = new Date(record.endTime);
    const datePart = isSameLocalDay(record.endTime)
      ? "今天"
      : end.toLocaleDateString("zh-CN", { month: "long", day: "numeric" });
    const startTime = new Date(record.startTime).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
    const endTime = end.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
    return `${datePart} · ${startTime}–${endTime}`;
  }

  function updateToday() {
    const todayRecords = records.filter((record) => isSameLocalDay(record.endTime));
    const total = todayRecords.reduce((sum, record) => sum + record.duration, 0);
    elements.todayCount.textContent = String(todayRecords.length);
    const totalMinutes = Math.floor(total / 60_000);
    elements.todayDuration.innerHTML = totalMinutes >= 60
      ? `${(totalMinutes / 60).toFixed(totalMinutes % 60 === 0 ? 0 : 1)}<small>小时</small>`
      : `${totalMinutes}<small>分钟</small>`;
  }

  function updateTimer() {
    if (activeStart === null) {
      elements.timerDisplay.textContent = "00:00";
      elements.progressFill.style.width = "0%";
      return;
    }

    const elapsed = Math.max(0, Date.now() - activeStart);
    const isEffective = elapsed >= MINIMUM_DURATION;
    elements.timerDisplay.textContent = formatTimer(elapsed);
    elements.progressFill.style.width = `${Math.min(100, elapsed / MINIMUM_DURATION * 100)}%`;
    elements.statusPill.textContent = isEffective ? "已生效" : "进行中";
    elements.statusPill.classList.add("is-active");
    elements.timerTitle.textContent = isEffective ? "这次活动已生效" : "保持活动";
    elements.timerHint.textContent = isEffective
      ? "已经超过 2 分钟，结束后会保存这次记录"
      : `再坚持 ${formatTimer(MINIMUM_DURATION - elapsed)}，这次活动就生效`;
  }

  function startActivity() {
    activeStart = Date.now();
    saveActiveStart();
    elements.activityButton.classList.add("is-stopping");
    elements.activityButtonLabel.textContent = "结束活动";
    updateTimer();
    timerId = window.setInterval(updateTimer, 250);
  }

  function stopActivity() {
    const endTime = Date.now();
    const startTime = activeStart;
    if (startTime === null) return;
    const duration = endTime - startTime;

    activeStart = null;
    saveActiveStart();
    window.clearInterval(timerId);
    timerId = null;
    resetTimerView();

    if (duration < MINIMUM_DURATION) {
      showToast(`本次只有 ${formatTimer(duration)}，未满 2 分钟，未计入记录`);
      return;
    }

    records.push({
      id: globalThis.crypto?.randomUUID?.() || `${endTime}-${Math.random().toString(16).slice(2)}`,
      startTime,
      endTime,
      duration
    });
    saveRecords();
    renderAll();
    showToast(`记录成功：${formatDuration(duration)}`);
  }

  function resetTimerView() {
    elements.timerTitle.textContent = "准备好了吗？";
    elements.statusPill.textContent = "未开始";
    elements.statusPill.classList.remove("is-active");
    elements.timerHint.textContent = "连续活动满 2 分钟，才会计入记录";
    elements.activityButton.classList.remove("is-stopping");
    elements.activityButtonLabel.textContent = "开始活动";
    updateTimer();
  }

  function renderHistory() {
    elements.clearButton.hidden = records.length === 0;
    if (records.length === 0) {
      elements.historyList.innerHTML = `
        <div class="empty-state">
          <strong>还没有有效活动</strong>
          <p>完成一次不少于 2 分钟的活动后，记录会出现在这里。</p>
        </div>`;
      return;
    }

    elements.historyList.replaceChildren(...[...records]
      .sort((a, b) => b.endTime - a.endTime)
      .map((record) => {
        const item = document.createElement("article");
        item.className = "history-item";
        item.innerHTML = `
          <div class="history-main">
            <span class="history-dot" aria-hidden="true"></span>
            <div class="history-copy">
              <strong>有效活动</strong>
              <time datetime="${new Date(record.endTime).toISOString()}">${formatRecordTime(record)}</time>
            </div>
          </div>
          <div class="history-actions">
            <span class="duration-badge">${formatDuration(record.duration)}</span>
            <button class="delete-button" type="button" aria-label="删除这条活动记录" data-delete-id="${record.id}">×</button>
          </div>`;
        return item;
      }));
  }

  function renderAll() {
    updateToday();
    renderHistory();
  }

  function deleteRecord(id) {
    records = records.filter((record) => record.id !== id);
    saveRecords();
    renderAll();
    showToast("已删除这条记录");
  }

  function clearRecords() {
    records = [];
    saveRecords();
    renderAll();
    showToast("所有记录已清空");
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 3200);
  }

  function initialize() {
    elements.todayLabel.textContent = new Intl.DateTimeFormat("zh-CN", {
      month: "long", day: "numeric", weekday: "long"
    }).format(new Date());

    elements.activityButton.addEventListener("click", () => {
      if (activeStart === null) startActivity();
      else stopActivity();
    });

    elements.historyList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-delete-id]");
      if (button) deleteRecord(button.dataset.deleteId);
    });

    elements.clearButton.addEventListener("click", () => elements.confirmDialog.showModal());
    elements.confirmDialog.addEventListener("close", () => {
      if (elements.confirmDialog.returnValue === "confirm") clearRecords();
    });

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        updateTimer();
        updateToday();
      }
    });

    renderAll();
    if (activeStart !== null) {
      elements.activityButton.classList.add("is-stopping");
      elements.activityButtonLabel.textContent = "结束活动";
      updateTimer();
      timerId = window.setInterval(updateTimer, 250);
    } else {
      resetTimerView();
    }
  }

  initialize();
})();
