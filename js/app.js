import { LESSONS } from "./lessons.js";
import { PythonRunner } from "./runner.js";
import { Visualizer } from "./visualizer.js";
import { h } from "./dom.js";

const $ = (id) => document.getElementById(id);
const MAX_OUTPUT_CHARS = 200000;
const RUN_TIMEOUT_S = 15;

/* ------------------------------------------------------------------ */
/* Almacenamiento local (falla en silencio si el navegador lo bloquea) */
/* ------------------------------------------------------------------ */
const store = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch { /* sin almacenamiento: la app funciona igual */ }
  },
};

/* ------------------------------------------------------------------ */
/* Pistas en español para los errores más comunes                      */
/* ------------------------------------------------------------------ */
const HINTS = {
  SyntaxError: "Error de sintaxis: revisá paréntesis, comillas y los dos puntos (:) al final de if, for, while o def.",
  IndentationError: "La indentación no es correcta. Cada bloque va con 4 espacios y todas sus líneas deben alinearse igual.",
  TabError: "Mezclaste tabulaciones y espacios. Usá solo espacios.",
  NameError: "Usaste un nombre que Python no conoce. ¿Lo escribiste igual que cuando lo definiste? ¿Lo definiste antes de usarlo?",
  TypeError: "Estás combinando tipos incompatibles (por ejemplo, texto + número) o llamando a algo con argumentos incorrectos.",
  ValueError: "El valor tiene el tipo correcto pero no sirve para esa operación (por ejemplo, int(\"hola\")).",
  ZeroDivisionError: "No se puede dividir por cero.",
  IndexError: "Pediste una posición que no existe en la lista. Recordá que se empieza a contar desde 0.",
  KeyError: "Esa clave no existe en el diccionario.",
  AttributeError: "Ese objeto no tiene ese atributo o método. Revisá cómo lo escribiste.",
  EOFError: "input() necesita datos: escribilos en la caja «Entrada», una línea por cada input().",
  RecursionError: "La función se llama a sí misma sin parar. ¿Falta el caso base?",
};

/* ------------------------------------------------------------------ */
/* Estado y elementos                                                  */
/* ------------------------------------------------------------------ */
const state = {
  lesson: LESSONS[0],
  mode: "example", // "example" | "exercise"
  busy: false,
  progress: store.get("aprende.progress", {}),
};
let loadingCode = false;
let outputChars = 0;
let outputTruncated = false;
let lastSpan = null;

const els = {
  status: $("status"), statusText: $("status-text"),
  output: $("output"), outputEmpty: $("output-empty"),
  errorBox: $("error-box"), errorText: $("error-text"), errorHint: $("error-hint"),
  runMeta: $("run-meta"), checks: $("checks"),
  stdin: $("stdin"), stdinBox: $("stdin-box"),
  run: $("run-btn"), trace: $("trace-btn"), verify: $("verify-btn"),
  stop: $("stop-btn"), reset: $("reset-btn"),
};

/* ------------------------------------------------------------------ */
/* Python                                                              */
/* ------------------------------------------------------------------ */
const STATUS_TEXT = {
  loading: "Cargando Python…",
  ready: "Python listo",
  busy: "Ejecutando…",
  error: "No se pudo cargar Python",
};

const runner = new PythonRunner((status, detail) => {
  els.status.dataset.state = status;
  els.statusText.textContent = STATUS_TEXT[status];
  els.status.title = detail || "";
});

/* ------------------------------------------------------------------ */
/* Editor                                                              */
/* ------------------------------------------------------------------ */
const cm = CodeMirror($("editor"), {
  mode: "python",
  theme: "aprende",
  lineNumbers: true,
  indentUnit: 4,
  tabSize: 4,
  indentWithTabs: false,
  matchBrackets: true,
  autoCloseBrackets: true,
  gutters: ["CodeMirror-linenumbers", "exec-gutter"],
  extraKeys: {
    Tab: (editor) => (editor.somethingSelected()
      ? editor.indentSelection("add")
      : editor.execCommand("insertSoftTab")),
    "Shift-Tab": (editor) => editor.indentSelection("subtract"),
    "Ctrl-Enter": () => runCode(),
    "Cmd-Enter": () => runCode(),
    "Shift-Ctrl-Enter": () => traceCode(),
    "Shift-Cmd-Enter": () => traceCode(),
  },
});

let execLine = null;
let errorLine = null;

function highlightLine(line) {
  if (execLine !== null) {
    cm.removeLineClass(execLine, "background", "exec-line");
    cm.setGutterMarker(execLine, "exec-gutter", null);
    execLine = null;
  }
  if (!line || line > cm.lineCount()) return;
  execLine = line - 1;
  cm.addLineClass(execLine, "background", "exec-line");
  cm.setGutterMarker(execLine, "exec-gutter", h("div", { class: "exec-marker" }, "▶"));
  cm.scrollIntoView({ line: execLine, ch: 0 }, 80);
}

function markError(line) {
  clearErrorLine();
  if (!line || line > cm.lineCount()) return;
  errorLine = line - 1;
  cm.addLineClass(errorLine, "background", "error-line");
  cm.scrollIntoView({ line: errorLine, ch: 0 }, 80);
}

function clearErrorLine() {
  if (errorLine !== null && errorLine < cm.lineCount()) {
    cm.removeLineClass(errorLine, "background", "error-line");
  }
  errorLine = null;
}

/* ------------------------------------------------------------------ */
/* Visualizador                                                        */
/* ------------------------------------------------------------------ */
const viz = new Visualizer({
  empty: $("viz-empty"), body: $("viz-body"),
  first: $("viz-first"), prev: $("viz-prev"), play: $("viz-play"),
  next: $("viz-next"), last: $("viz-last"),
  slider: $("viz-slider"), speed: $("viz-speed"), counter: $("viz-counter"),
  stale: $("viz-stale"), message: $("viz-message"), frames: $("viz-frames"),
  output: $("viz-output"), outputBox: $("viz-output-box"),
}, {
  onStep(step, { stale }) {
    highlightLine(!stale && step ? step.l : null);
  },
});

cm.on("change", () => {
  if (loadingCode) return;
  clearErrorLine();
  viz.markStale();
  store.set(draftKey("code"), cm.getValue());
});
els.stdin.addEventListener("input", () => store.set(draftKey("stdin"), els.stdin.value));

/* ------------------------------------------------------------------ */
/* Pestañas                                                            */
/* ------------------------------------------------------------------ */
function showTab(name) {
  const isOutput = name === "output";
  $("tab-output").setAttribute("aria-selected", String(isOutput));
  $("tab-viz").setAttribute("aria-selected", String(!isOutput));
  $("panel-output").hidden = !isOutput;
  $("panel-viz").hidden = isOutput;
}
$("tab-output").addEventListener("click", () => showTab("output"));
$("tab-viz").addEventListener("click", () => showTab("viz"));

/* ------------------------------------------------------------------ */
/* Salida                                                              */
/* ------------------------------------------------------------------ */
function clearOutput() {
  els.output.replaceChildren();
  els.outputEmpty.hidden = false;
  els.errorBox.hidden = true;
  els.runMeta.textContent = "";
  els.checks.hidden = true;
  els.checks.replaceChildren();
  outputChars = 0;
  outputTruncated = false;
  lastSpan = null;
}

function appendOutput(text, kind) {
  if (outputTruncated) return;
  els.outputEmpty.hidden = true;
  if (outputChars + text.length > MAX_OUTPUT_CHARS) {
    text = text.slice(0, Math.max(0, MAX_OUTPUT_CHARS - outputChars));
    outputTruncated = true;
  }
  outputChars += text.length;
  if (!lastSpan || lastSpan.dataset.kind !== kind) {
    lastSpan = h("span", { class: kind === "err" ? "out-err" : "", "data-kind": kind });
    lastSpan.append(document.createTextNode(""));
    els.output.append(lastSpan);
  }
  lastSpan.firstChild.appendData(text);
  if (outputTruncated) {
    els.output.append(h("span", { class: "out-err" }, "\n… salida demasiado larga, se cortó acá."));
  }
}

function showError(error, { box = els.errorBox, text = els.errorText, hint = els.errorHint } = {}) {
  text.textContent = error.text;
  hint.textContent = HINTS[error.type] || "";
  box.hidden = false;
  markError(error.line);
}

function showProblem(message, hint = "") {
  els.errorText.textContent = message;
  els.errorHint.textContent = hint;
  els.errorBox.hidden = false;
}

function explainFailure(err) {
  if (err.stopped) return showProblem("Ejecución detenida.");
  if (err.timeout) {
    return showProblem(`El programa tardó más de ${RUN_TIMEOUT_S} segundos y se detuvo.`,
      "¿Hay un bucle infinito? Revisá que la condición del while pueda dejar de cumplirse.");
  }
  showProblem("No se pudo ejecutar el programa: " + err.message,
    "Python se descarga desde internet la primera vez. Revisá tu conexión y recargá la página.");
}

/* ------------------------------------------------------------------ */
/* Acciones                                                            */
/* ------------------------------------------------------------------ */
function setBusy(busy) {
  state.busy = busy;
  els.run.disabled = els.trace.disabled = els.verify.disabled = busy;
  els.stop.disabled = !busy;
}

async function runCode() {
  if (state.busy) return;
  setBusy(true);
  clearOutput();
  clearErrorLine();
  showTab("output");
  const started = performance.now();
  try {
    const result = await runner.run(cm.getValue(), els.stdin.value, appendOutput,
      { timeout: RUN_TIMEOUT_S * 1000 });
    if (!result.ok) showError(result.error);
    else if (outputChars === 0) els.runMeta.textContent = "El programa terminó sin imprimir nada.";
    else els.runMeta.textContent = `Terminó en ${Math.round(performance.now() - started)} ms.`;
  } catch (err) {
    explainFailure(err);
  } finally {
    setBusy(false);
  }
}

async function traceCode() {
  if (state.busy) return;
  setBusy(true);
  clearErrorLine();
  $("viz-error").hidden = true;
  const code = cm.getValue();
  try {
    const result = await runner.trace(code, els.stdin.value);
    viz.load(result, code);
    if (result.steps.length === 0) {
      $("viz-empty").hidden = false;
      if (result.error) {
        showError(result.error, {
          box: $("viz-error"), text: $("viz-error-text"), hint: $("viz-error-hint"),
        });
      }
    }
    showTab("viz");
  } catch (err) {
    showTab("output");
    clearOutput();
    explainFailure(err);
  } finally {
    setBusy(false);
  }
}

const normalize = (s) =>
  s.replace(/\r/g, "").split("\n").map((l) => l.replace(/\s+$/, "")).join("\n").trim();

async function verifyExercise() {
  if (state.busy || state.mode !== "exercise") return;
  const { tests } = state.lesson.exercise;
  setBusy(true);
  clearOutput();
  clearErrorLine();
  showTab("output");
  els.checks.hidden = false;
  let passed = 0;
  try {
    for (const [i, test] of tests.entries()) {
      let got = "";
      let error = null;
      const result = await runner.run(cm.getValue(), test.stdin || "", (text, kind) => {
        if (kind === "out") got += text;
      }, { echo: false, timeout: RUN_TIMEOUT_S * 1000 });
      if (!result.ok) {
        error = result.error;
        if (i === 0) markError(error.line);
      }
      const ok = !error && normalize(got) === normalize(test.expected);
      if (ok) passed++;
      els.checks.append(renderCheck(i + 1, tests.length, test, got, error, ok));
    }
    if (passed === tests.length) completeLesson();
  } catch (err) {
    els.checks.replaceChildren();
    explainFailure(err);
  } finally {
    setBusy(false);
  }
}

function renderCheck(n, total, test, got, error, ok) {
  const title = total > 1 ? `Prueba ${n} de ${total}` : "Resultado";
  const rows = [];
  if (test.stdin) rows.push(["Entrada", test.stdin]);
  rows.push(["Esperado", test.expected]);
  rows.push([error ? "Error" : "Obtuviste", error ? error.text : (got || "(no imprimió nada)")]);
  return h("section", { class: "check " + (ok ? "pass" : "fail") },
    h("h4", {}, (ok ? "✓ " : "✗ ") + title + (ok ? " correcta" : " no coincide")),
    ok ? null : h("dl", {}, ...rows.flatMap(([k, v]) => [h("dt", {}, k), h("dd", {}, v)])));
}

function completeLesson() {
  state.progress[state.lesson.id] = true;
  store.set("aprende.progress", state.progress);
  renderSidebar();
  const index = LESSONS.indexOf(state.lesson);
  const next = LESSONS[index + 1];
  let action;
  if (next) {
    action = h("button", { class: "btn success", type: "button" }, `Siguiente: ${next.title}`);
    action.addEventListener("click", () => openLesson(next.id));
  } else {
    action = h("span", {}, "¡Terminaste todas las lecciones!");
  }
  els.checks.append(h("div", { class: "celebrate" },
    h("strong", {}, "¡Ejercicio resuelto! 🎉"), action));
}

els.run.addEventListener("click", runCode);
els.trace.addEventListener("click", traceCode);
els.verify.addEventListener("click", verifyExercise);
els.stop.addEventListener("click", () => runner.stop());
els.reset.addEventListener("click", () => {
  if (!confirm("¿Volver al código original de esta lección? Se pierden tus cambios.")) return;
  store.set(draftKey("code"), null);
  store.set(draftKey("stdin"), null);
  loadDraft();
});

/* ------------------------------------------------------------------ */
/* Lecciones                                                           */
/* ------------------------------------------------------------------ */
const draftKey = (what) => `aprende.${what}.${state.lesson.id}.${state.mode}`;

function defaults() {
  const { example, exercise } = state.lesson;
  return state.mode === "example"
    ? { code: example.code, stdin: example.stdin || "" }
    : { code: exercise.starter, stdin: exercise.tests[0].stdin || "" };
}

function loadDraft() {
  const base = defaults();
  const code = store.get(draftKey("code")) ?? base.code;
  const stdin = store.get(draftKey("stdin")) ?? base.stdin;
  loadingCode = true;
  cm.setValue(code);
  cm.clearHistory();
  loadingCode = false;
  els.stdin.value = stdin;
  els.stdinBox.open = stdin.trim() !== "";
  clearErrorLine();
  viz.clear();
}

function setMode(mode) {
  state.mode = mode;
  const isExercise = mode === "exercise";
  $("mode-example").setAttribute("aria-pressed", String(!isExercise));
  $("mode-exercise").setAttribute("aria-pressed", String(isExercise));
  $("exercise-prompt").hidden = !isExercise;
  els.verify.hidden = !isExercise;
  clearOutput();
  loadDraft();
}

function openLesson(id) {
  const lesson = LESSONS.find((l) => l.id === id) || LESSONS[0];
  state.lesson = lesson;
  store.set("aprende.lesson", lesson.id);
  history.replaceState(null, "", "#" + lesson.id);

  $("lesson-level").textContent = lesson.level;
  $("lesson-title").textContent = lesson.title;
  $("lesson-body").innerHTML = lesson.body; // contenido propio del curso
  $("exercise-prompt").innerHTML = "<strong>Ejercicio:</strong> " + lesson.exercise.prompt;
  document.querySelector(".lesson").scrollTop = 0;

  setMode("example");
  renderSidebar();
  closeMenu();
}

function renderSidebar() {
  const nav = $("lesson-list");
  nav.replaceChildren();
  let level = null;
  LESSONS.forEach((lesson, i) => {
    if (lesson.level !== level) {
      level = lesson.level;
      nav.append(h("div", { class: "level" }, level));
    }
    const done = Boolean(state.progress[lesson.id]);
    const link = h("button", {
      class: "lesson-link" + (done ? " done" : ""),
      "aria-current": lesson === state.lesson ? "true" : "false",
      type: "button",
    }, h("span", { class: "num" }, done ? "✓" : String(i + 1)), lesson.title);
    link.addEventListener("click", () => openLesson(lesson.id));
    nav.append(link);
  });
  const completed = LESSONS.filter((l) => state.progress[l.id]).length;
  $("progress-text").textContent = `${completed} / ${LESSONS.length}`;
  $("progress-fill").style.width = `${(completed / LESSONS.length) * 100}%`;
}

$("mode-example").addEventListener("click", () => setMode("example"));
$("mode-exercise").addEventListener("click", () => setMode("exercise"));

/* ------------------------------------------------------------------ */
/* Menú móvil y tema                                                   */
/* ------------------------------------------------------------------ */
function closeMenu() {
  $("sidebar").classList.remove("open");
  $("menu-btn").setAttribute("aria-expanded", "false");
}
$("menu-btn").addEventListener("click", () => {
  const open = $("sidebar").classList.toggle("open");
  $("menu-btn").setAttribute("aria-expanded", String(open));
});

function applyTheme(theme) {
  if (theme) document.documentElement.dataset.theme = theme;
}
applyTheme(store.get("aprende.theme"));
$("theme-btn").addEventListener("click", () => {
  const current = document.documentElement.dataset.theme
    || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  const next = current === "light" ? "dark" : "light";
  applyTheme(next);
  store.set("aprende.theme", next);
});

/* Atajos del visualizador: ← → cuando no se está escribiendo */
document.addEventListener("keydown", (event) => {
  if ($("panel-viz").hidden || !viz.trace) return;
  if (event.target.closest("input, textarea, select, .CodeMirror")) return;
  if (event.key === "ArrowRight") viz.go(viz.index + 1);
  else if (event.key === "ArrowLeft") viz.go(viz.index - 1);
});

/* ------------------------------------------------------------------ */
/* Arranque                                                            */
/* ------------------------------------------------------------------ */
openLesson(location.hash.slice(1) || store.get("aprende.lesson") || LESSONS[0].id);
