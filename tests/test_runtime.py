"""Pruebas del runtime de Python (python/runtime.py). Ejecutar: python3 tests/test_runtime.py"""
import importlib.util, json, pathlib, sys
spec = importlib.util.spec_from_file_location("rt", pathlib.Path(__file__).resolve().parent.parent / "python" / "runtime.py")
rt = importlib.util.module_from_spec(spec); spec.loader.exec_module(rt)

out = []
emit = lambda t, k: out.append((k, t))

# 1) ejecución normal + input
r = json.loads(rt.run_user('n = input("Nombre: ")\nprint(f"Hola {n}")', "Ana", emit))
assert r["ok"], r
assert "".join(t for _, t in out) == "Nombre: Ana\nHola Ana\n", out

# 2) sin echo (modo verificación)
out.clear()
rt.run_user('n = input("Nombre: ")\nprint(n)', "Ana", emit, False)
assert "".join(t for _, t in out) == "Ana\n", out

# 3) errores: línea y traceback limpio
r = json.loads(rt.run_user("x = 1\ny = x / 0", "", emit))
assert r["error"]["type"] == "ZeroDivisionError" and r["error"]["line"] == 2, r
assert "runtime.py" not in r["error"]["text"], r["error"]["text"]
r = json.loads(rt.run_user("print('hola'", "", emit))
assert r["error"]["type"] == "SyntaxError" and r["error"]["line"] == 1, r
r = json.loads(rt.run_user("input()", "", emit))
assert r["error"]["type"] == "EOFError", r
print("traceback de ejemplo:\n" + json.loads(rt.run_user("def f():\n    return 1/0\nf()", "", emit))["error"]["text"])

# 4) trace: factorial
code = "def f(n):\n    if n <= 1:\n        return 1\n    return n * f(n - 1)\n\nprint(f(3))"
t = json.loads(rt.trace_user(code, ""))
assert t["output"] == "6\n" and not t["error"] and not t["truncated"]
depths = [len(s["f"]) for s in t["steps"]]
assert max(depths) == 4, depths   # Global + f(3) + f(2) + f(1)
assert t["steps"][-1]["e"] == "end"
print("pasos factorial:", len(t["steps"]), "prof. máx:", max(depths))
print("retornos:", [(s["l"], s["r"]) for s in t["steps"] if s["e"] == "return"])

# 5) trace: límite de pasos con bucle infinito
t = json.loads(rt.trace_user("while True:\n    pass", ""))
assert t["truncated"] and len(t["steps"]) == rt.MAX_STEPS, (t["truncated"], len(t["steps"]))

# 6) trace: error en tiempo de ejecución
t = json.loads(rt.trace_user("a = 1\nb = a + 'x'", ""))
assert t["error"]["type"] == "TypeError" and t["steps"][-1]["e"] == "error"

# 7) objetos
t = json.loads(rt.trace_user("class P:\n    def __init__(s):\n        s.v = 3\np = P()\nq = [p, 2]", ""))
last = {v[0]: v for v in t["steps"][-1]["f"][0]["v"]}
print("objeto:", last["p"], "| lista:", last["q"])

# 8) el stdout real se restaura
assert sys.stdout is sys.__stdout__
print("OK")
