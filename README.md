# Aprendiendo a programar — Python en vivo

Entorno de aprendizaje de Python que corre **100 % en el navegador** (HTML, CSS y
JavaScript, sin servidor), pensado para publicarse en GitHub Pages.

- **Ejecutá Python en tiempo real**: el código corre en el navegador con
  [Pyodide](https://pyodide.org) (Python compilado a WebAssembly) dentro de un Web
  Worker, así la página nunca se congela y podés cortar un bucle infinito.
- **Visualizá la ejecución paso a paso**: la línea activa se resalta en el editor y
  ves las variables, la pila de llamadas y la salida en cada paso (con avance,
  retroceso, reproducción automática y marcas de qué variable cambió).
- **11 lecciones con ejercicios** que se verifican automáticamente, con pistas en
  español para los errores comunes. El progreso y tus borradores se guardan en el
  navegador.

## Probarlo en local

Necesita un servidor HTTP (los Web Workers y los módulos no funcionan con `file://`):

```bash
python3 -m http.server 8000
```

y abrí <http://localhost:8000>. La primera vez descarga Pyodide (~10 MB, queda en
caché del navegador).

## Publicarlo en GitHub Pages

Opción A — desde la rama: *Settings → Pages → Build and deployment → Deploy from a
branch*, elegí `main` y la carpeta `/ (root)`.

Opción B — con Actions: *Settings → Pages → Source: GitHub Actions*. El workflow
`.github/workflows/pages.yml` publica en cada push a `main`.

## Estructura

```
index.html            página única
css/styles.css        estilos (tema oscuro/claro)
js/app.js             interfaz: editor, pestañas, verificación, progreso
js/runner.js          administra el Web Worker (ejecutar, detener, límites de tiempo)
js/worker.js          carga Pyodide y ejecuta el código fuera del hilo principal
js/visualizer.js      visualizador paso a paso
js/lessons.js         contenido del curso
js/dom.js             helper para crear elementos del DOM de forma segura
python/runtime.py     ejecución y registro de pasos (sys.settrace), en Python
tests/test_runtime.py pruebas del runtime
```

## Agregar una lección

Sumá un objeto al arreglo de `js/lessons.js`:

```js
{
  id: "mi-leccion",
  level: "Intermedio",
  title: "Título",
  body: "<p>Explicación en HTML</p>",
  example:  { code: "print('hola')" },
  exercise: {
    prompt: "Qué tiene que hacer el alumno",
    starter: "# código de partida\n",
    tests: [{ stdin: "datos\nde entrada", expected: "salida esperada" }],
  },
}
```

En las pruebas, `input()` no imprime su mensaje: `expected` se compara solo con lo que
el programa muestra con `print()` (se ignoran los espacios al final de cada línea).

## Cómo funciona la visualización

`python/runtime.py` ejecuta el código con `sys.settrace` y guarda, antes de cada línea,
una foto de los marcos de pila del alumno (nombre, línea y variables con su tipo).
El visualizador solo recorre esa lista, por eso se puede retroceder libremente.
Hay un límite de 1500 pasos para que un bucle infinito no cuelgue la página.

## Dependencias (por CDN)

- [Pyodide 0.26.4](https://pyodide.org) — jsDelivr
- [CodeMirror 5.65.16](https://codemirror.net/5/) — cdnjs

## Pruebas

```bash
python3 tests/test_runtime.py
```
