"use strict";

const STORAGE_KEY = "concurs-rofuip-progress-v2";
const PROGRESS_VERSION = 2;

const state = {
  bank: [],
  metadata: null,
  progress: loadProgress(),
  session: null,
  lastSessionQuestions: [],
};

const elements = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  cacheElements();
  bindEvents();
  try {
    const response = await fetch("data/questions.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(`Eroare HTTP ${response.status}`);
    const payload = await response.json();
    validateBank(payload);
    state.bank = payload.questions;
    state.metadata = payload;
    populateFilters();
    updateDashboard();
    elements.status.hidden = true;
    showView("home");
  } catch (error) {
    console.error(error);
    elements.status.hidden = true;
    elements.errorText.textContent = `Detaliu: ${error.message}`;
    showView("error");
  }
}

function cacheElements() {
  const ids = [
    "status", "error-text", "bank-count", "seen-count", "seen-detail", "correct-count",
    "correct-detail", "mistake-count", "mastery-ring", "mastery-value", "module-filter",
    "chapter-filter", "difficulty-filter", "question-count", "filter-result", "study-form",
    "session-mode", "question-position", "progress-bar", "session-score", "question-module",
    "question-difficulty", "question-reference", "question-title", "options", "feedback",
    "feedback-title", "feedback-text", "source-link", "next-question", "result-title",
    "result-score", "result-percent", "result-message", "review-list", "stats-summary",
    "module-bars", "import-file",
  ];
  ids.forEach((id) => { elements[toCamel(id)] = document.getElementById(id); });
  elements.views = [...document.querySelectorAll("[data-view-panel]")];
  elements.navButtons = [...document.querySelectorAll(".nav-button[data-view]")];
  elements.secondaryImports = [...document.querySelectorAll(".import-file-secondary")];
}

function bindEvents() {
  document.addEventListener("click", (event) => {
    const viewButton = event.target.closest("[data-view]");
    if (viewButton) {
      showView(viewButton.dataset.view);
      return;
    }
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;
    const actions = {
      contest: startContest,
      mistakes: startMistakes,
      quit: quitSession,
      "repeat-session": repeatLastSession,
      export: exportProgress,
      reset: resetProgress,
    };
    actions[actionButton.dataset.action]?.();
  });

  elements.studyForm.addEventListener("submit", startStudy);
  elements.moduleFilter.addEventListener("change", () => {
    populateChapterFilter();
    updateFilterSummary();
  });
  elements.chapterFilter.addEventListener("change", updateFilterSummary);
  elements.difficultyFilter.addEventListener("change", updateFilterSummary);
  elements.questionCount.addEventListener("change", updateFilterSummary);
  elements.nextQuestion.addEventListener("click", advanceQuestion);
  elements.importFile.addEventListener("change", importProgress);
  elements.secondaryImports.forEach((input) => input.addEventListener("change", importProgress));
}

function validateBank(payload) {
  if (!payload || !Array.isArray(payload.questions) || payload.questions.length < 20) {
    throw new Error("Banca nu conține minimum 20 de itemi verificați.");
  }
  const ids = new Set();
  for (const question of payload.questions) {
    if (!question.id || ids.has(question.id)) throw new Error("Există identificatori duplicați.");
    ids.add(question.id);
    if (!Array.isArray(question.options) || question.options.length !== 4) {
      throw new Error(`Itemul ${question.id} nu are patru variante.`);
    }
    const correct = question.options.filter((option) => option.isCorrect);
    if (correct.length !== 1 || correct[0].id !== question.correctOptionId) {
      throw new Error(`Barem invalid la ${question.id}.`);
    }
  }
}

function emptyProgress() {
  return {
    version: PROGRESS_VERSION,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    attempts: {},
    sessions: [],
  };
}

function loadProgress() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!parsed || parsed.version !== PROGRESS_VERSION || typeof parsed.attempts !== "object") {
      return emptyProgress();
    }
    return parsed;
  } catch {
    return emptyProgress();
  }
}

function saveProgress() {
  state.progress.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
}

function showView(name) {
  elements.views.forEach((view) => { view.hidden = view.dataset.viewPanel !== name; });
  elements.navButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.view === name));
  if (name === "home") updateDashboard();
  if (name === "stats") renderStats();
  if (name === "setup") updateFilterSummary();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function populateFilters() {
  const modules = [...new Set(state.bank.map((question) => question.module))].sort(romanSort);
  modules.forEach((module) => elements.moduleFilter.add(new Option(module, module)));
  populateChapterFilter();
  updateFilterSummary();
}

function populateChapterFilter() {
  const previous = elements.chapterFilter.value;
  const module = elements.moduleFilter.value;
  const chapters = [...new Set(
    state.bank
      .filter((question) => !module || question.module === module)
      .map((question) => question.chapter)
      .filter(Boolean),
  )].sort(romanSort);
  elements.chapterFilter.replaceChildren(new Option("Toate capitolele", ""));
  chapters.forEach((chapter) => elements.chapterFilter.add(new Option(chapter, chapter)));
  if (chapters.includes(previous)) elements.chapterFilter.value = previous;
}

function filteredQuestions() {
  const module = elements.moduleFilter.value;
  const chapter = elements.chapterFilter.value;
  const difficulty = elements.difficultyFilter.value;
  return state.bank.filter((question) =>
    (!module || question.module === module)
    && (!chapter || question.chapter === chapter)
    && (!difficulty || question.difficulty === difficulty));
}

function updateFilterSummary() {
  if (!state.bank.length) return;
  const available = filteredQuestions().length;
  const requested = Number(elements.questionCount.value);
  elements.filterResult.textContent = `${formatNumber(available)} itemi disponibili; sesiunea va folosi ${formatNumber(Math.min(available, requested))}.`;
}

function startStudy(event) {
  event.preventDefault();
  const pool = filteredQuestions();
  if (!pool.length) return announce("Nu există itemi pentru filtrele alese.");
  const count = Math.min(Number(elements.questionCount.value), pool.length);
  startSession("study", shuffle(pool).slice(0, count));
}

function startContest() {
  if (!state.bank.length) return;
  startSession("contest", balancedSample(state.bank, 20));
}

function startMistakes() {
  const mistakes = state.bank.filter((question) => state.progress.attempts[question.id]?.lastCorrect === false);
  if (!mistakes.length) {
    announce("Nu ai greșeli active. Rezolvă mai întâi câteva întrebări.");
    showView("home");
    return;
  }
  startSession("mistakes", shuffle(mistakes));
}

function startSession(mode, questions) {
  state.lastSessionQuestions = [...questions];
  state.session = {
    mode,
    questions,
    index: 0,
    correct: 0,
    answers: [],
    selected: null,
    locked: false,
    startedAt: new Date().toISOString(),
  };
  showView("quiz");
  renderQuestion();
}

function renderQuestion() {
  const session = state.session;
  const question = session.questions[session.index];
  session.selected = null;
  session.locked = false;
  const labels = { study: "Învățare", contest: "Test ROFUIP 20", mistakes: "Reîncercare greșeli" };
  elements.sessionMode.textContent = labels[session.mode];
  elements.questionPosition.textContent = `${session.index + 1} / ${session.questions.length}`;
  elements.progressBar.style.width = `${((session.index + 1) / session.questions.length) * 100}%`;
  elements.sessionScore.textContent = `${session.correct} corecte`;
  elements.questionModule.textContent = question.module;
  elements.questionDifficulty.textContent = question.difficulty;
  elements.questionReference.textContent = [question.chapter, question.section].filter(Boolean).join(" · ");
  elements.questionTitle.textContent = question.prompt;
  elements.options.replaceChildren();
  elements.feedback.hidden = true;
  elements.feedback.classList.remove("is-wrong");
  elements.nextQuestion.disabled = true;
  elements.nextQuestion.textContent = session.index === session.questions.length - 1 ? "Vezi rezultatul" : "Continuă";

  question.options.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "option";
    button.dataset.optionId = option.id;
    const key = document.createElement("span");
    key.className = "option-key";
    key.textContent = option.id;
    const copy = document.createElement("span");
    copy.textContent = option.text;
    button.append(key, copy);
    button.addEventListener("click", () => selectOption(option.id));
    elements.options.append(button);
  });
}

function selectOption(optionId) {
  const session = state.session;
  if (!session || session.locked) return;
  session.selected = optionId;
  [...elements.options.children].forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.optionId === optionId);
  });
  elements.nextQuestion.disabled = false;
  if (session.mode !== "contest") submitCurrentAnswer(true);
}

function submitCurrentAnswer(showFeedback) {
  const session = state.session;
  if (session.locked || !session.selected) return;
  const question = session.questions[session.index];
  const selectedOption = question.options.find((option) => option.id === session.selected);
  const correctOption = question.options.find((option) => option.id === question.correctOptionId);
  const isCorrect = session.selected === question.correctOptionId;
  session.locked = true;
  if (isCorrect) session.correct += 1;
  session.answers.push({
    questionId: question.id,
    selectedId: session.selected,
    correctId: question.correctOptionId,
    isCorrect,
  });
  recordAttempt(question, isCorrect);
  elements.sessionScore.textContent = `${session.correct} corecte`;

  if (showFeedback) {
    [...elements.options.children].forEach((button) => {
      button.disabled = true;
      if (button.dataset.optionId === question.correctOptionId) button.classList.add("is-correct");
      if (button.dataset.optionId === session.selected && !isCorrect) button.classList.add("is-wrong");
    });
    elements.feedback.hidden = false;
    elements.feedback.classList.toggle("is-wrong", !isCorrect);
    elements.feedbackTitle.textContent = isCorrect ? "Corect" : "De revăzut";
    elements.feedbackText.textContent = `${question.explanation}\n\nRăspunsul tău: ${selectedOption.text}\nRăspunsul corect: ${correctOption.text}`;
    elements.sourceLink.href = question.legalSource.url;
  }
}

function advanceQuestion() {
  const session = state.session;
  if (!session.selected) return;
  if (session.mode === "contest" && !session.locked) submitCurrentAnswer(false);
  if (session.index >= session.questions.length - 1) {
    finishSession();
    return;
  }
  session.index += 1;
  renderQuestion();
}

function recordAttempt(question, isCorrect) {
  const record = state.progress.attempts[question.id] || {
    seen: 0, correct: 0, wrong: 0, lastCorrect: null, lastAnsweredAt: null,
  };
  record.seen += 1;
  record[isCorrect ? "correct" : "wrong"] += 1;
  record.lastCorrect = isCorrect;
  record.lastAnsweredAt = new Date().toISOString();
  record.module = question.module;
  state.progress.attempts[question.id] = record;
  saveProgress();
}

function finishSession() {
  const session = state.session;
  const percent = Math.round((session.correct / session.questions.length) * 100);
  state.progress.sessions.unshift({
    mode: session.mode,
    startedAt: session.startedAt,
    completedAt: new Date().toISOString(),
    count: session.questions.length,
    correct: session.correct,
    percent,
  });
  state.progress.sessions = state.progress.sessions.slice(0, 50);
  saveProgress();
  renderResults(session, percent);
  showView("results");
}

function renderResults(session, percent) {
  const labels = { study: "Sesiune de învățare", contest: "Test tematic ROFUIP", mistakes: "Reîncercarea greșelilor" };
  elements.resultTitle.textContent = labels[session.mode];
  elements.resultScore.textContent = `${session.correct}/${session.questions.length}`;
  elements.resultPercent.textContent = `${percent}%`;
  elements.resultMessage.textContent = resultMessage(percent);
  elements.reviewList.replaceChildren();

  session.questions.forEach((question, index) => {
    const answer = session.answers[index];
    const selected = question.options.find((option) => option.id === answer.selectedId);
    const correct = question.options.find((option) => option.id === question.correctOptionId);
    const card = document.createElement("article");
    card.className = `review-card ${answer.isCorrect ? "correct" : "wrong"}`;
    const title = document.createElement("h3");
    title.textContent = `${index + 1}. ${question.prompt}`;
    const status = document.createElement("p");
    status.innerHTML = `<strong>${answer.isCorrect ? "Corect" : "Greșit"}</strong>`;
    const response = document.createElement("p");
    response.textContent = `Răspunsul tău: ${selected?.text || "—"}`;
    const key = document.createElement("p");
    key.textContent = `Răspunsul corect: ${correct.text}`;
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = "Explicație și sursă";
    const explanation = document.createElement("p");
    explanation.textContent = question.explanation;
    details.append(summary, explanation);
    card.append(title, status, response, key, details);
    elements.reviewList.append(card);
  });
}

function updateDashboard() {
  if (!state.bank.length) return;
  const stats = calculateStats();
  elements.bankCount.textContent = formatNumber(state.bank.length);
  elements.seenCount.textContent = formatNumber(stats.uniqueSeen);
  elements.seenDetail.textContent = `${stats.coverage}% din bancă`;
  elements.correctCount.textContent = formatNumber(stats.correct);
  elements.correctDetail.textContent = `din ${formatNumber(stats.total)} răspunsuri`;
  elements.mistakeCount.textContent = formatNumber(stats.activeMistakes);
  elements.masteryValue.textContent = `${stats.accuracy}%`;
  elements.masteryRing.style.setProperty("--score", `${stats.accuracy}%`);
}

function calculateStats() {
  const records = Object.values(state.progress.attempts);
  const total = records.reduce((sum, item) => sum + item.correct + item.wrong, 0);
  const correct = records.reduce((sum, item) => sum + item.correct, 0);
  const uniqueSeen = records.filter((item) => item.seen > 0).length;
  return {
    total,
    correct,
    uniqueSeen,
    activeMistakes: records.filter((item) => item.lastCorrect === false).length,
    accuracy: total ? Math.round((correct / total) * 100) : 0,
    coverage: state.bank.length ? Math.round((uniqueSeen / state.bank.length) * 100) : 0,
  };
}

function renderStats() {
  if (!state.bank.length) return;
  const stats = calculateStats();
  const cards = [
    ["Răspunsuri", formatNumber(stats.total), "toate încercările"],
    ["Acuratețe", `${stats.accuracy}%`, "răspunsuri corecte"],
    ["Acoperire", `${stats.coverage}%`, `${stats.uniqueSeen} itemi unici`],
    ["Greșeli active", formatNumber(stats.activeMistakes), "de reîncercat"],
  ];
  elements.statsSummary.replaceChildren();
  cards.forEach(([label, value, detail]) => {
    const card = document.createElement("article");
    card.className = "stat-card";
    const span = document.createElement("span"); span.textContent = label;
    const strong = document.createElement("strong"); strong.textContent = value;
    const small = document.createElement("small"); small.textContent = detail;
    card.append(span, strong, small);
    elements.statsSummary.append(card);
  });

  const byModule = new Map();
  state.bank.forEach((question) => {
    if (!byModule.has(question.module)) byModule.set(question.module, { total: 0, correct: 0, seen: 0 });
    const item = byModule.get(question.module);
    const record = state.progress.attempts[question.id];
    if (record) {
      item.total += record.correct + record.wrong;
      item.correct += record.correct;
      item.seen += 1;
    }
  });
  elements.moduleBars.replaceChildren();
  [...byModule.entries()].sort(([a], [b]) => romanSort(a, b)).forEach(([module, item]) => {
    const accuracy = item.total ? Math.round((item.correct / item.total) * 100) : 0;
    const row = document.createElement("div"); row.className = "bar-row";
    const label = document.createElement("div"); label.className = "bar-label"; label.textContent = module;
    const track = document.createElement("div"); track.className = "bar-track";
    const fill = document.createElement("span"); fill.style.width = `${accuracy}%`; track.append(fill);
    const value = document.createElement("div"); value.className = "bar-value"; value.textContent = item.seen ? `${accuracy}%` : "—";
    row.append(label, track, value);
    elements.moduleBars.append(row);
  });
}

function quitSession() {
  if (!state.session) return showView("home");
  if (state.session.answers.length && !confirm("Închizi sesiunea? Răspunsurile deja date rămân salvate.")) return;
  state.session = null;
  showView("home");
}

function repeatLastSession() {
  if (!state.lastSessionQuestions.length) return;
  const mode = state.session?.mode || "study";
  startSession(mode, shuffle([...state.lastSessionQuestions]));
}

function exportProgress() {
  const exportData = {
    application: "Modul ROFUIP · Concurs",
    exportedAt: new Date().toISOString(),
    progress: state.progress,
  };
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `progres-rofuip-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
  announce("Progresul a fost exportat.");
}

async function importProgress(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const imported = data.progress || data;
    if (!imported || imported.version !== PROGRESS_VERSION || typeof imported.attempts !== "object") {
      throw new Error("Fișier incompatibil");
    }
    if (!confirm("Importul va înlocui progresul din acest browser. Continui?")) return;
    state.progress = imported;
    saveProgress();
    updateDashboard();
    renderStats();
    announce("Progresul a fost importat.");
  } catch (error) {
    alert(`Fișierul nu a putut fi importat: ${error.message}`);
  } finally {
    event.target.value = "";
  }
}

function resetProgress() {
  if (!confirm("Ștergi definitiv tot progresul salvat în acest browser?")) return;
  state.progress = emptyProgress();
  saveProgress();
  updateDashboard();
  renderStats();
  announce("Progresul local a fost șters.");
}

function balancedSample(items, count) {
  const groups = new Map();
  shuffle([...items]).forEach((item) => {
    if (!groups.has(item.module)) groups.set(item.module, []);
    groups.get(item.module).push(item);
  });
  const selected = [];
  const queues = [...groups.values()];
  while (selected.length < count && queues.some((queue) => queue.length)) {
    for (const queue of queues) {
      if (queue.length) selected.push(queue.pop());
      if (selected.length === count) break;
    }
  }
  return shuffle(selected);
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function resultMessage(percent) {
  if (percent >= 90) return "Nivel foarte bun. Revizuiește explicațiile pentru a fixa traseul decizional și excepțiile.";
  if (percent >= 75) return "Bază solidă. Reia spețele greșite și urmărește cine propune, cine aprobă și în ce termen.";
  if (percent >= 50) return "Progres bun. Folosește modul Greșeli pentru procedurile și limitele care încă se confundă.";
  return "Continuă cu sesiuni scurte. Spețele și explicațiile juridice vor consolida treptat materia.";
}

function announce(message) {
  elements.status.hidden = false;
  elements.status.textContent = message;
  window.setTimeout(() => { elements.status.hidden = true; }, 3000);
}

function romanSort(left, right) {
  return left.localeCompare(right, "ro", { numeric: true, sensitivity: "base" });
}

function formatNumber(value) {
  return new Intl.NumberFormat("ro-RO").format(value);
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}



