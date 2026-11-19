/* Administra el Web Worker de Python: arranque, ejecución, límites de tiempo y
 * reinicio (que es como se "detiene" un programa que no termina). */

const WORKER_URL = "js/worker.js";

export class PythonRunner {
  /** @param {(state: "loading"|"ready"|"busy"|"error", detail?: string) => void} onStatus */
  constructor(onStatus = () => {}) {
    this.onStatus = onStatus;
    this.seq = 0;
    this.pending = new Map();
    this.worker = null;
    this.ready = null;
    this._boot();
  }

  _boot() {
    this.onStatus("loading");
    this.worker = new Worker(WORKER_URL);
    this.ready = new Promise((resolve, reject) => {
      this._resolveReady = resolve;
      this._rejectReady = reject;
    });
    this.ready.catch(() => {}); // el error ya se informa por onStatus
    this.worker.onmessage = (event) => this._onMessage(event.data);
    this.worker.onerror = (event) => this._fatal(event.message || "Error en el worker");
  }

  _fatal(message) {
    this.onStatus("error", message);
    this._rejectReady(new Error(message));
    this._rejectAll(new Error(message));
  }

  _onMessage(msg) {
    if (msg.type === "ready") {
      this.onStatus("ready");
      this._resolveReady();
    } else if (msg.type === "fatal") {
      this._fatal(msg.message);
    } else if (msg.type === "output") {
      const job = this.pending.get(msg.id);
      if (job && job.onOutput) job.onOutput(msg.text, msg.kind);
    } else if (msg.type === "done") {
      const job = this.pending.get(msg.id);
      if (!job) return;
      clearTimeout(job.timer);
      this.pending.delete(msg.id);
      this.onStatus("ready");
      job.resolve(msg.result);
    }
  }

  _rejectAll(error) {
    for (const job of this.pending.values()) {
      clearTimeout(job.timer);
      job.reject(error);
    }
    this.pending.clear();
  }

  async _request(type, payload, { onOutput, timeout }) {
    await this.ready;
    const id = ++this.seq;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.restart();
        const error = new Error("timeout");
        error.timeout = true;
        reject(error);
      }, timeout);
      this.pending.set(id, { resolve, reject, onOutput, timer });
      this.onStatus("busy");
      this.worker.postMessage({ id, type, ...payload });
    });
  }

  /** Ejecuta el código. La salida llega en vivo por `onOutput(texto, "out"|"err")`. */
  run(code, stdin = "", onOutput = null, { echo = true, timeout = 15000 } = {}) {
    return this._request("run", { code, stdin, echo }, { onOutput, timeout });
  }

  /** Ejecuta el código registrando cada paso (ver python/runtime.py). */
  trace(code, stdin = "", { echo = true, timeout = 20000 } = {}) {
    return this._request("trace", { code, stdin, echo }, { onOutput: null, timeout });
  }

  /** Corta lo que se esté ejecutando y arranca un Python nuevo. */
  stop() {
    const error = new Error("stopped");
    error.stopped = true;
    this._rejectAll(error);
    this.restart();
  }

  restart() {
    this._rejectAll(Object.assign(new Error("stopped"), { stopped: true }));
    if (this.worker) this.worker.terminate();
    this._boot();
  }
}
