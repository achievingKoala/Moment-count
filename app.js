(() => {
  "use strict";

  const MINIMUM_DURATION = 120_000;
  const RECORDS_KEY = "move-two-minutes.records.v1";
  const ACTIVE_KEY = "move-two-minutes.active.v1";
  const REMINDER_KEY = "move-two-minutes.reminder.v1";

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
    toast: document.querySelector("#toast"),
    reminderStatus: document.querySelector("#reminderStatus"),
    reminderCountdown: document.querySelector("#reminderCountdown"),
    reminderHint: document.querySelector("#reminderHint"),
    reminderOptions: document.querySelector("#reminderOptions"),
    customMinutes: document.querySelector("#customMinutes"),
    reminderButton: document.querySelector("#reminderButton"),
    alarmPlayButton: document.querySelector("#alarmPlayButton"),
    alarmAudio: document.querySelector("#alarmAudio")
  };

  let records = readRecords();
  let activeStart = readActiveStart();
  let timerId = null;
  let toastTimer = null;
  let reminder = readReminder();
  let reminderTimerId = null;
  let selectedReminderDuration = 10 * 60_000;
  let wakeLock = null;

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

  function readReminder() {
    const value = safeParse(REMINDER_KEY, null);
    if (!value || !Number.isFinite(value.deadline) || value.deadline <= 0) return null;
    return { deadline: value.deadline, ringing: Boolean(value.ringing) };
  }

  function saveReminder() {
    if (reminder === null) localStorage.removeItem(REMINDER_KEY);
    else localStorage.setItem(REMINDER_KEY, JSON.stringify(reminder));
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
    if (reminder !== null) {
      stopReminder(false);
      showToast(`活动已生效，提醒已取消 · ${formatDuration(duration)}`);
    } else {
      showToast(`记录成功：${formatDuration(duration)}`);
    }
    renderAll();
  }

  function formatCountdown(milliseconds) {
    const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
  }

  function updateReminder() {
    if (reminder === null) {
      elements.reminderCountdown.textContent = "--:--";
      return;
    }

    const remaining = reminder.deadline - Date.now();
    if (remaining <= 0) {
      triggerAlarm();
      return;
    }

    elements.reminderCountdown.textContent = formatCountdown(remaining);
    elements.reminderStatus.textContent = "倒计时中";
    elements.reminderStatus.classList.add("is-active");
    elements.reminderHint.textContent = "完成一次满 2 分钟的有效活动，提醒会自动取消";
    elements.reminderButton.textContent = "取消倒计时";
    elements.reminderButton.classList.add("is-active");
    elements.reminderButton.classList.remove("is-ringing");
    setReminderControlsDisabled(true);
  }

  function setReminderControlsDisabled(disabled) {
    elements.reminderOptions.querySelectorAll("button").forEach((button) => { button.disabled = disabled; });
    elements.customMinutes.disabled = disabled;
  }

  async function primeAlarmAudio() {
    try {
      elements.alarmAudio.muted = true;
      await elements.alarmAudio.play();
      elements.alarmAudio.pause();
      elements.alarmAudio.currentTime = 0;
      elements.alarmAudio.muted = false;
    } catch {
      elements.alarmAudio.muted = false;
    }
  }

  async function requestWakeLock() {
    if (wakeLock !== null || !("wakeLock" in navigator) || document.hidden || reminder === null || reminder.ringing) return;
    try {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => { wakeLock = null; });
    } catch {
      wakeLock = null;
    }
  }

  function startReminder() {
    const customValue = Number(elements.customMinutes.value);
    if (elements.customMinutes.value !== "" && (!Number.isFinite(customValue) || customValue < 1 || customValue > 180)) {
      showToast("请输入 1–180 分钟");
      elements.customMinutes.focus();
      return;
    }

    const duration = elements.customMinutes.value === "" ? selectedReminderDuration : customValue * 60_000;
    const durationLabel = duration < 60_000 ? `${duration / 1000} 秒测试` : `${duration / 60_000} 分钟`;

    primeAlarmAudio();
    reminder = { deadline: Date.now() + duration, ringing: false };
    saveReminder();
    requestWakeLock();
    updateReminder();
    window.clearInterval(reminderTimerId);
    reminderTimerId = window.setInterval(updateReminder, 250);
    showToast(`已设置 ${durationLabel}活动提醒`);
  }

  function triggerAlarm() {
    if (reminder === null) return;
    if (!reminder.ringing) {
      reminder.ringing = true;
      saveReminder();
    }
    window.clearInterval(reminderTimerId);
    reminderTimerId = null;
    if (wakeLock !== null) wakeLock.release().catch(() => {});
    elements.reminderCountdown.textContent = "00:00";
    elements.reminderStatus.textContent = "正在响铃";
    elements.reminderStatus.classList.add("is-active");
    elements.reminderHint.textContent = "时间到了，还没有完成有效活动";
    elements.reminderButton.textContent = "停止闹钟";
    elements.alarmPlayButton.hidden = true;
    elements.reminderButton.classList.remove("is-active");
    elements.reminderButton.classList.add("is-ringing");
    setReminderControlsDisabled(true);
    elements.alarmAudio.play().catch(() => {
      elements.reminderHint.textContent = "浏览器阻止了自动播放，请点下面的按钮播放闹钟";
      elements.alarmPlayButton.hidden = false;
    });
  }

  function stopReminder(showMessage = true) {
    const wasRinging = Boolean(reminder?.ringing);
    reminder = null;
    saveReminder();
    window.clearInterval(reminderTimerId);
    reminderTimerId = null;
    if (wakeLock !== null) wakeLock.release().catch(() => {});
    elements.alarmAudio.pause();
    elements.alarmAudio.currentTime = 0;
    elements.reminderCountdown.textContent = "--:--";
    elements.reminderStatus.textContent = "未设置";
    elements.reminderStatus.classList.remove("is-active");
    elements.reminderHint.textContent = "到时间仍未完成有效活动，就会响起闹钟";
    elements.reminderButton.textContent = "启动倒计时";
    elements.alarmPlayButton.hidden = true;
    elements.reminderButton.classList.remove("is-active", "is-ringing");
    setReminderControlsDisabled(false);
    if (showMessage) showToast(wasRinging ? "闹钟已停止" : "倒计时已取消");
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

    elements.reminderOptions.addEventListener("click", (event) => {
      const button = event.target.closest("[data-minutes], [data-seconds]");
      if (!button || reminder !== null) return;
      selectedReminderDuration = button.dataset.seconds
        ? Number(button.dataset.seconds) * 1000
        : Number(button.dataset.minutes) * 60_000;
      elements.customMinutes.value = "";
      elements.reminderOptions.querySelectorAll("[data-minutes], [data-seconds]").forEach((chip) => {
        chip.classList.toggle("is-selected", chip === button);
      });
    });

    elements.customMinutes.addEventListener("input", () => {
      elements.reminderOptions.querySelectorAll("[data-minutes], [data-seconds]").forEach((chip) => chip.classList.remove("is-selected"));
    });

    elements.reminderButton.addEventListener("click", () => {
      if (reminder === null) startReminder();
      else stopReminder();
    });

    elements.alarmPlayButton.addEventListener("click", () => {
      elements.alarmAudio.play().then(() => {
        elements.alarmPlayButton.hidden = true;
        elements.reminderHint.textContent = "时间到了，还没有完成有效活动";
      }).catch(() => showToast("无法播放，请检查手机媒体音量"));
    });

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        updateTimer();
        updateToday();
        requestWakeLock();
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

    if (reminder !== null) {
      if (reminder.ringing || reminder.deadline <= Date.now()) triggerAlarm();
      else {
        updateReminder();
        requestWakeLock();
        reminderTimerId = window.setInterval(updateReminder, 250);
      }
    }
  }

  initialize();
})();
