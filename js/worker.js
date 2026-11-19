/* Web Worker: carga Pyodide (Python en WebAssembly) y ejecuta el código del
 * alumno fuera del hilo principal, así la página nunca se congela y se puede
 * cortar un bucle infinito terminando el worker. */

const PYODIDE_URL = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/";
importScripts(PYODIDE_URL + "pyodide.js");

let api = null;

async function init() {
  try {
    const pyodide = await loadPyodide({ indexURL: PYODIDE_URL });
    const response = await fetch(new URL("../python/runtime.py", self.location.href));
    if (!response.ok) throw new Error("No se pudo cargar python/runtime.py");
    pyodide.runPython(await response.text());
    api = {
      run: pyodide.globals.get("run_user"),
      trace: pyodide.globals.get("trace_user"),
    };
    postMessage({ type: "ready" });
  } catch (err) {
    postMessage({ type: "fatal", message: String(err && err.message ? err.message : err) });
  }
}

self.onmessage = (event) => {
  const { id, type, code, stdin, echo } = event.data;
  try {
    let result;
    if (type === "run") {
      const emit = (text, kind) => postMessage({ type: "output", id, text, kind });
      result = JSON.parse(api.run(code, stdin, emit, echo));
    } else if (type === "trace") {
      result = JSON.parse(api.trace(code, stdin, echo));
    } else {
      return;
    }
    postMessage({ type: "done", id, result });
  } catch (err) {
    postMessage({
      type: "done",
      id,
      result: {
        ok: false,
        steps: [],
        output: "",
        error: { type: "Error", message: String(err), text: String(err), line: null },
      },
    });
  }
};

init();
