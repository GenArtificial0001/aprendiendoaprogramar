"""Runtime de Python que corre dentro del navegador (Pyodide).

Este archivo lo carga `js/worker.js`. Expone dos funciones:

* ``run_user``   -> ejecuta el código del alumno y emite su salida en vivo.
* ``trace_user`` -> ejecuta el código registrando un "paso" por cada línea,
                    con las variables de cada marco de pila (visualización).

Todo lo que el alumno escribe se ejecuta en un espacio de nombres propio, de modo
que nunca pisa las funciones de este archivo.
"""

import builtins
import json
import linecache
import reprlib
import sys
import traceback
import types

USER_FILE = "<codigo>"
MAX_STEPS = 1500          # límite de pasos al visualizar (evita bucles infinitos)
MAX_FRAMES = 40           # límite de marcos de pila que se muestran por paso


class _StepLimit(BaseException):
    """Se lanza cuando se alcanza MAX_STEPS. Hereda de BaseException para que
    un ``except Exception`` del alumno no la atrape."""


class _Out:
    """Reemplaza a sys.stdout / sys.stderr y reenvía cada escritura a ``emit``."""

    encoding = "utf-8"

    def __init__(self, emit, kind):
        self._emit = emit
        self._kind = kind

    def write(self, text):
        text = str(text)
        if text:
            self._emit(text, self._kind)
        return len(text)

    def flush(self):
        pass

    def isatty(self):
        return False

    def writable(self):
        return True


def _register_source(code):
    """Permite que los tracebacks muestren las líneas del código del alumno."""
    linecache.cache[USER_FILE] = (len(code), None, code.splitlines(True), USER_FILE)


def _make_namespace(stdin_text, echo):
    """Espacio de nombres del alumno, con un input() que lee de la caja «Entrada»."""
    lines = stdin_text.replace("\r\n", "\n").split("\n") if stdin_text else []
    if lines and lines[-1] == "":
        lines.pop()
    pending = iter(lines)

    def fake_input(prompt=""):
        if echo:
            sys.stdout.write(str(prompt))
        try:
            value = next(pending)
        except StopIteration:
            raise EOFError(
                "input() pidió un dato pero la caja «Entrada» no tiene más líneas"
            ) from None
        if echo:
            sys.stdout.write(value + "\n")
        return value

    env = dict(vars(builtins))
    env["input"] = fake_input
    return {"__name__": "__main__", "__builtins__": env}


def _error_info(exc):
    """Resume una excepción mostrando solo los marcos del código del alumno."""
    user_frames = [
        f for f in traceback.extract_tb(exc.__traceback__) if f.filename == USER_FILE
    ]
    parts = []
    if user_frames:
        parts.append("Traceback (most recent call last):\n")
        parts.extend(traceback.format_list(user_frames))
    parts.extend(traceback.format_exception_only(type(exc), exc))

    line = None
    if isinstance(exc, SyntaxError) and exc.filename == USER_FILE:
        line = exc.lineno
    elif user_frames:
        line = user_frames[-1].lineno

    return {
        "type": type(exc).__name__,
        "message": getattr(exc, "msg", None) or str(exc),
        "text": "".join(parts).rstrip("\n"),
        "line": line,
    }


# --------------------------------------------------------------------------
# Ejecución normal
# --------------------------------------------------------------------------

def run_user(code, stdin_text, emit, echo=True):
    """Ejecuta ``code``. La salida se envía en vivo con ``emit(texto, tipo)``.

    Devuelve un JSON: {"ok": bool, "error": {...} | null}
    """
    _register_source(code)
    old_out, old_err = sys.stdout, sys.stderr
    sys.stdout, sys.stderr = _Out(emit, "out"), _Out(emit, "err")
    result = {"ok": True, "error": None}
    try:
        compiled = compile(code, USER_FILE, "exec")
        exec(compiled, _make_namespace(stdin_text, echo))
    except SystemExit:
        pass
    except BaseException as exc:  # noqa: BLE001 - queremos mostrar cualquier error
        result = {"ok": False, "error": _error_info(exc)}
    finally:
        sys.stdout, sys.stderr = old_out, old_err
    return json.dumps(result)


# --------------------------------------------------------------------------
# Ejecución con registro de pasos
# --------------------------------------------------------------------------

_repr = reprlib.Repr()
_repr.maxlevel = 3
_repr.maxlist = _repr.maxtuple = _repr.maxset = 10
_repr.maxdict = 8
_repr.maxstring = 50
_repr.maxother = 50


def _show(value, depth=0):
    """Representación corta y legible de un valor."""
    try:
        if isinstance(value, types.FunctionType):
            return f"función {value.__name__}"
        if isinstance(value, types.MethodType):
            return f"método {value.__name__}"
        if isinstance(value, type):
            return f"clase {value.__name__}"
        if isinstance(value, types.ModuleType):
            return f"módulo {value.__name__}"
        cls = type(value)
        if cls.__repr__ is object.__repr__ and hasattr(value, "__dict__") and depth == 0:
            attrs = ", ".join(
                f"{k}={_show(v, 1)}" for k, v in list(vars(value).items())[:6]
            )
            return f"{cls.__name__}({attrs})"
        return _repr.repr(value)
    except Exception:  # noqa: BLE001
        return "<no se puede mostrar>"


def _vars_of(mapping):
    return [
        [name, type(value).__name__, _show(value)]
        for name, value in list(mapping.items())
        if not name.startswith("__")
    ]


def _global_frame(namespace, line=None):
    return {"n": "Global", "g": True, "l": line, "v": _vars_of(namespace)}


def _snapshot(frame):
    """Marcos de pila del alumno, del más externo al más interno."""
    stack = []
    current = frame
    while current is not None and current.f_code.co_filename == USER_FILE:
        stack.append(current)
        current = current.f_back
    stack.reverse()

    skipped = 0
    if len(stack) > MAX_FRAMES:
        skipped = len(stack) - MAX_FRAMES
        stack = stack[:1] + stack[-(MAX_FRAMES - 1):]

    frames = []
    for fr in stack:
        is_module = fr.f_code.co_name == "<module>"
        frames.append({
            "n": "Global" if is_module else fr.f_code.co_name,
            "g": is_module,
            "l": fr.f_lineno,
            "v": _vars_of(fr.f_locals),
        })
    return frames, skipped


def trace_user(code, stdin_text, echo=True, max_steps=MAX_STEPS):
    """Ejecuta ``code`` registrando cada paso.

    Devuelve un JSON: {"steps": [...], "output": str, "error": {...} | null,
                       "truncated": bool}
    """
    _register_source(code)
    steps, chunks, size = [], [], [0]

    def emit(text, kind):
        chunks.append(text)
        size[0] += len(text)

    def tracer(frame, event, arg):
        if frame.f_code.co_filename != USER_FILE:
            return None
        if event == "return" and frame.f_code.co_name == "<module>":
            return tracer
        if event in ("line", "return", "exception"):
            if len(steps) >= max_steps:
                sys.settrace(None)
                raise _StepLimit()
            frames, skipped = _snapshot(frame)
            step = {"e": event, "l": frame.f_lineno, "f": frames, "o": size[0]}
            if skipped:
                step["s"] = skipped
            if event == "return":
                step["r"] = _show(arg)
            elif event == "exception":
                step["x"] = f"{arg[0].__name__}: {arg[1]}"
            steps.append(step)
        return tracer

    old_out, old_err = sys.stdout, sys.stderr
    sys.stdout, sys.stderr = _Out(emit, "out"), _Out(emit, "err")
    namespace, error, truncated = None, None, False
    try:
        compiled = compile(code, USER_FILE, "exec")
        namespace = _make_namespace(stdin_text, echo)
        sys.settrace(tracer)
        exec(compiled, namespace)
    except SystemExit:
        pass
    except _StepLimit:
        truncated = True
    except BaseException as exc:  # noqa: BLE001
        error = _error_info(exc)
    finally:
        sys.settrace(None)
        sys.stdout, sys.stderr = old_out, old_err

    if namespace is not None and not truncated:
        if error:
            steps.append({"e": "error", "l": error["line"],
                          "f": [_global_frame(namespace)], "o": size[0],
                          "x": error["text"]})
        else:
            steps.append({"e": "end", "l": None,
                          "f": [_global_frame(namespace)], "o": size[0]})

    return json.dumps({
        "steps": steps,
        "output": "".join(chunks),
        "error": error,
        "truncated": truncated,
        "max_steps": max_steps,
    })
