/* Visualizador paso a paso: muestra la pila de llamadas y las variables de cada
 * paso registrado por python/runtime.py, con controles para avanzar, retroceder
 * y reproducir. Todo el texto de Python se inserta con textContent (nunca HTML). */

import { h } from "./dom.js";

export class Visualizer {
  /**
   * @param {object} els  elementos del DOM (ver index.html)
   * @param {{onStep: (step: object|null, info: {stale: boolean}) => void}} hooks
   */
  constructor(els, { onStep = () => {} } = {}) {
    this.els = els;
    this.onStep = onStep;
    this.trace = null;
    this.code = "";
    this.index = 0;
    this.stale = false;
    this.timer = null;

    els.first.addEventListener("click", () => this.go(0));
    els.prev.addEventListener("click", () => this.go(this.index - 1));
    els.next.addEventListener("click", () => this.go(this.index + 1));
    els.last.addEventListener("click", () => this.go(this.steps.length - 1));
    els.play.addEventListener("click", () => this.togglePlay());
    els.slider.addEventListener("input", () => this.go(Number(els.slider.value)));
    els.speed.addEventListener("change", () => {
      if (this.timer) this.play();
    });
  }

  get steps() {
    return this.trace ? this.trace.steps : [];
  }

  /** Carga un recorrido nuevo y muestra el primer paso. */
  load(trace, code) {
    this.pause();
    this.trace = trace;
    this.code = code;
    this.stale = false;
    this.index = 0;
    const has = trace.steps.length > 0;
    this.els.empty.hidden = has;
    this.els.body.hidden = !has;
    this.els.stale.hidden = true;
    if (!has) {
      this.onStep(null, { stale: false });
      return;
    }
    this.els.slider.max = String(trace.steps.length - 1);
    this.render();
  }

  clear() {
    this.pause();
    this.trace = null;
    this.els.empty.hidden = false;
    this.els.body.hidden = true;
    this.onStep(null, { stale: false });
  }

  /** El alumno editó el código: el recorrido ya no corresponde a lo que ve. */
  markStale() {
    if (!this.trace || this.stale) return;
    this.stale = true;
    this.pause();
    this.els.stale.hidden = false;
    this.onStep(null, { stale: true });
  }

  go(i) {
    if (!this.trace) return;
    this.index = Math.max(0, Math.min(this.steps.length - 1, i));
    this.render();
  }

  togglePlay() {
    if (this.timer) this.pause();
    else this.play();
  }

  play() {
    if (!this.trace) return;
    clearInterval(this.timer);
    if (this.index >= this.steps.length - 1) this.go(0);
    this.els.play.textContent = "Pausar";
    this.timer = setInterval(() => {
      if (this.index >= this.steps.length - 1) return this.pause();
      this.go(this.index + 1);
    }, Number(this.els.speed.value));
  }

  pause() {
    clearInterval(this.timer);
    this.timer = null;
    this.els.play.textContent = "Reproducir";
  }

  render() {
    const { els, steps, index } = this;
    const step = steps[index];
    const prev = index > 0 ? steps[index - 1] : null;

    els.counter.textContent = `Paso ${index + 1} de ${steps.length}`;
    els.slider.value = String(index);
    els.first.disabled = els.prev.disabled = index === 0;
    els.next.disabled = els.last.disabled = index === steps.length - 1;

    els.message.replaceChildren(...this._describe(step));
    els.frames.replaceChildren(...this._renderFrames(step, prev));
    els.output.textContent = this.trace.output.slice(0, step.o);
    els.outputBox.hidden = step.o === 0;
    this.onStep(step, { stale: this.stale });
  }

  _describe(step) {
    const sourceLine = step.l ? (this.code.split("\n")[step.l - 1] || "").trim() : "";
    const isLast = this.index === this.steps.length - 1;
    const parts = [];
    switch (step.e) {
      case "line":
        parts.push(h("strong", {}, `Línea ${step.l}`), " — a punto de ejecutar: ",
          h("code", {}, sourceLine));
        break;
      case "return":
        parts.push(h("strong", {}, `Línea ${step.l}`), " — la función termina y devuelve ",
          h("code", {}, step.r));
        break;
      case "exception":
        parts.push(h("strong", {}, `Línea ${step.l}`), " — se produjo una excepción: ",
          h("code", {}, step.x));
        break;
      case "error":
        parts.push(h("strong", { class: "bad" }, "El programa terminó con un error"));
        break;
      default:
        parts.push(h("strong", {}, "Fin del programa"), " — estas son las variables finales.");
    }
    if (isLast && this.trace.truncated) {
      parts.push(h("div", { class: "notice" },
        `Se llegó al límite de ${this.trace.max_steps} pasos y se detuvo la ` +
        "visualización (¿un bucle infinito?)."));
    }
    if (step.e === "error") {
      parts.push(h("pre", { class: "error-text" }, step.x));
    }
    return parts;
  }

  _renderFrames(step, prev) {
    const out = [];
    if (step.s) {
      out.push(h("div", { class: "frame-skipped" },
        `… ${step.s} marcos de pila intermedios omitidos`));
    }
    step.f.forEach((frame, i) => {
      const before = prev && prev.f[i] && prev.f[i].n === frame.n ? prev.f[i] : null;
      const old = new Map(before ? before.v.map((v) => [v[0], v[2]]) : []);
      const isActive = i === step.f.length - 1 && step.e !== "end" && step.e !== "error";

      const title = frame.g ? "Variables globales" : `Función ${frame.n}()`;
      const card = h("section", {
        class: "frame" + (isActive ? " active" : "") + (frame.g ? " global" : ""),
        style: `--depth:${Math.min(i, 6)}`,
      });
      card.append(h("header", {}, h("span", { class: "frame-title" }, title),
        isActive ? h("span", { class: "chip active-chip" }, "activo") : null));

      if (frame.v.length === 0) {
        card.append(h("p", { class: "muted small" }, "Todavía no hay variables."));
      } else {
        const body = h("tbody");
        for (const [name, type, value] of frame.v) {
          let status = "";
          if (prev) {
            if (!old.has(name)) status = "new";
            else if (old.get(name) !== value) status = "changed";
          }
          body.append(h("tr", { class: status },
            h("th", { scope: "row" }, name),
            h("td", {}, h("span", { class: "chip" }, type)),
            h("td", { class: "value" }, value),
            h("td", { class: "badge-cell" },
              status ? h("span", { class: "badge " + status },
                status === "new" ? "nueva" : "cambió") : null)));
        }
        card.append(h("table", {}, body));
      }
      out.push(card);
    });
    return out;
  }
}
