/* Lecciones del curso. Para agregar una, sumá un objeto a este arreglo.
 *
 *   id        identificador único (se usa para guardar progreso y borradores)
 *   level     grupo en la barra lateral
 *   title     título corto
 *   body      explicación en HTML (contenido propio, no de usuarios)
 *   example   { code, stdin? }       código de ejemplo para ejecutar y visualizar
 *   exercise  { prompt, starter, tests: [{ stdin?, expected }] }
 *             "expected" se compara con lo que imprime el programa
 *             (se ignoran espacios al final de cada línea). En las pruebas,
 *             input() no imprime su mensaje, solo lo que vos hacés con print().
 */

export const LESSONS = [
  {
    id: "hola-mundo",
    level: "Primeros pasos",
    title: "Hola, mundo",
    body: `
      <p>Un programa es una lista de instrucciones que la computadora ejecuta
      <strong>de arriba hacia abajo</strong>, una por una. La más básica es
      <code>print()</code>: muestra algo en pantalla.</p>
      <p>Lo que va entre comillas es un <strong>texto</strong> (en Python,
      <em>string</em>). Lo que sigue a un <code>#</code> es un
      <strong>comentario</strong>: Python lo ignora, es una nota para humanos.</p>
      <p class="tip"><strong>Probalo:</strong> apretá <em>Ejecutar</em> para ver la
      salida y después <em>Paso a paso</em> para ver cómo avanza línea por línea.</p>`,
    example: {
      code: `# Mi primer programa
print("¡Hola, mundo!")
print("Python ejecuta una línea a la vez")
print("Sumar:", 2 + 3)
`,
    },
    exercise: {
      prompt: `Mostrá en pantalla dos líneas: <code>¡Hola, Python!</code> y debajo
        <code>Estoy aprendiendo</code>.`,
      starter: `# Escribí tus dos print acá
`,
      tests: [{ expected: "¡Hola, Python!\nEstoy aprendiendo" }],
    },
  },

  {
    id: "variables",
    level: "Primeros pasos",
    title: "Variables y tipos",
    body: `
      <p>Una <strong>variable</strong> es un nombre que guarda un valor:
      <code>edad = 25</code>. El signo <code>=</code> no es “igual”, significa
      <em>“guardá esto en ese nombre”</em>.</p>
      <p>Cada valor tiene un <strong>tipo</strong>: <code>int</code> (enteros),
      <code>float</code> (decimales), <code>str</code> (texto) y <code>bool</code>
      (<code>True</code>/<code>False</code>). Con <code>type()</code> lo consultás.</p>
      <p class="tip"><strong>Mirá en <em>Paso a paso</em>:</strong> la variable
      <code>edad</code> aparece como “nueva” y después como “cambió” cuando se
      reasigna.</p>`,
    example: {
      code: `nombre = "Ana"
edad = 25
altura = 1.68
es_estudiante = True

print(nombre, edad, altura, es_estudiante)
print(type(edad))

edad = edad + 1
print("El año que viene tendré", edad)
`,
    },
    exercise: {
      prompt: `Un rectángulo tiene base 7 y altura 4. Calculá su área y su perímetro
        <strong>usando las variables</strong> y mostralos con el formato del código.`,
      starter: `base = 7
altura = 4

area = 0       # reemplazá este 0 por la fórmula
perimetro = 0  # y este también

print("Área:", area)
print("Perímetro:", perimetro)
`,
      tests: [{ expected: "Área: 28\nPerímetro: 22" }],
    },
  },

  {
    id: "entrada",
    level: "Primeros pasos",
    title: "Entrada de datos y f-strings",
    body: `
      <p><code>input()</code> pide un dato al usuario y lo devuelve siempre como
      <strong>texto</strong>. Si necesitás un número, convertilo con
      <code>int()</code> o <code>float()</code>.</p>
      <p>Una <strong>f-string</strong> (<code>f"..."</code>) mete variables y
      cálculos dentro de un texto usando llaves: <code>{nombre}</code>.</p>
      <p class="tip">En este entorno no hay consola interactiva: escribí los datos
      en la caja <strong>«Entrada»</strong> debajo del editor, <strong>una línea por
      cada <code>input()</code></strong>.</p>`,
    example: {
      code: `nombre = input("¿Cómo te llamás? ")
edad = int(input("¿Cuántos años tenés? "))

print(f"Hola {nombre}, el año que viene tendrás {edad + 1} años")
`,
      stdin: "Ana\n30",
    },
    exercise: {
      prompt: `Leé dos números enteros (uno por línea) y mostrá
        <code>La suma es X</code>, reemplazando X por el resultado.`,
      starter: `a = int(input())
b = int(input())

# Mostrá el resultado
`,
      tests: [
        { stdin: "3\n4", expected: "La suma es 7" },
        { stdin: "10\n-2", expected: "La suma es 8" },
      ],
    },
  },

  {
    id: "condicionales",
    level: "Primeros pasos",
    title: "Decisiones con if",
    body: `
      <p><code>if</code> ejecuta un bloque <strong>solo si</strong> la condición es
      verdadera. Con <code>elif</code> sumás más casos y con <code>else</code>
      cubrís “todo lo demás”.</p>
      <p>El bloque se marca con <strong>dos puntos</strong> y
      <strong>4 espacios de indentación</strong>. Para comparar usá
      <code>==</code>, <code>!=</code>, <code>&lt;</code>, <code>&gt;</code>,
      <code>&lt;=</code>, <code>&gt;=</code>. El operador <code>%</code> da el
      <em>resto</em> de una división: <code>7 % 2</code> es <code>1</code>.</p>
      <p class="tip">Mirá en <em>Paso a paso</em> cómo la ejecución
      <strong>salta</strong> los bloques que no se cumplen.</p>`,
    example: {
      code: `numero = int(input("Escribí un número: "))

if numero > 0:
    print("Es positivo")
elif numero < 0:
    print("Es negativo")
else:
    print("Es cero")
`,
      stdin: "5",
    },
    exercise: {
      prompt: `Leé un número entero y mostrá <code>par</code> o <code>impar</code>.`,
      starter: `numero = int(input())

# Mostrá "par" o "impar"
`,
      tests: [
        { stdin: "4", expected: "par" },
        { stdin: "7", expected: "impar" },
        { stdin: "0", expected: "par" },
      ],
    },
  },

  {
    id: "for",
    level: "Repetición",
    title: "Bucles for",
    body: `
      <p><code>for</code> repite un bloque una vez por cada elemento de una
      secuencia. <code>range(1, 6)</code> genera los números del 1 al 5 (el final
      <strong>no se incluye</strong>).</p>
      <p>Un patrón muy común es el <strong>acumulador</strong>: una variable que
      arranca en <code>0</code> y va sumando en cada vuelta.</p>
      <p class="tip">Con <em>Paso a paso</em> mirá cómo <code>i</code> cambia en
      cada vuelta y cómo crece <code>total</code>.</p>`,
    example: {
      code: `for i in range(1, 6):
    print("Vuelta número", i)

total = 0
for n in range(1, 6):
    total = total + n
print("La suma de 1 a 5 es", total)
`,
    },
    exercise: {
      prompt: `Mostrá la tabla del 7, del 1 al 10, con el formato
        <code>7 x 1 = 7</code>, una línea por cada multiplicación.`,
      starter: `# Usá un for con range
`,
      tests: [
        {
          expected: Array.from({ length: 10 }, (_, i) => `7 x ${i + 1} = ${7 * (i + 1)}`).join("\n"),
        },
      ],
    },
  },

  {
    id: "while",
    level: "Repetición",
    title: "Bucles while",
    body: `
      <p><code>while</code> repite mientras una condición sea verdadera. Es ideal
      cuando <strong>no sabés cuántas vueltas</strong> hacen falta.</p>
      <p class="warn"><strong>Cuidado:</strong> si la condición nunca deja de
      cumplirse, el programa no termina. Con el botón <em>Detener</em> lo cortás, y
      <em>Paso a paso</em> se frena solo a los 1500 pasos. Probá cambiar
      <code>contador - 1</code> por <code>contador + 1</code> para verlo.</p>`,
    example: {
      code: `contador = 3
while contador > 0:
    print(contador)
    contador = contador - 1
print("¡Despegue!")
`,
    },
    exercise: {
      prompt: `Usando <code>while</code>, mostrá los números <strong>impares menores
        que 10</strong> (1, 3, 5, 7, 9), uno por línea.`,
      starter: `n = 1
# Completá el bucle
`,
      tests: [{ expected: "1\n3\n5\n7\n9" }],
    },
  },

  {
    id: "listas",
    level: "Estructuras de datos",
    title: "Listas",
    body: `
      <p>Una <strong>lista</strong> guarda varios valores en orden:
      <code>[3, 8, 1]</code>. Se accede por posición, empezando en
      <code>0</code>: <code>lista[0]</code> es el primero y
      <code>lista[-1]</code> el último.</p>
      <p>Métodos útiles: <code>append()</code> agrega al final,
      <code>len()</code> cuenta elementos, y <code>sum()</code>, <code>max()</code>
      y <code>min()</code> resumen números.</p>`,
    example: {
      code: `frutas = ["manzana", "banana", "cereza"]
frutas.append("durazno")

print(frutas)
print("Primera:", frutas[0])
print("Última:", frutas[-1])
print("Cantidad:", len(frutas))

for fruta in frutas:
    print("Me gusta la", fruta)
`,
    },
    exercise: {
      prompt: `Con la lista dada, mostrá la suma, el máximo y el mínimo con el
        formato del ejemplo de salida: <code>Suma: …</code>,
        <code>Máximo: …</code>, <code>Mínimo: …</code>.`,
      starter: `numeros = [3, 8, 1, 9, 4]

# Mostrá Suma, Máximo y Mínimo
`,
      tests: [{ expected: "Suma: 25\nMáximo: 9\nMínimo: 1" }],
    },
  },

  {
    id: "funciones",
    level: "Estructuras de datos",
    title: "Funciones",
    body: `
      <p>Una <strong>función</strong> es un bloque de código con nombre que podés
      reutilizar. Se define con <code>def</code>, recibe
      <strong>parámetros</strong> y devuelve un resultado con
      <code>return</code>.</p>
      <p class="tip">En <em>Paso a paso</em> cada llamada crea un <strong>marco
      nuevo</strong> con sus propias variables (los parámetros). Cuando la función
      hace <code>return</code>, ese marco desaparece.</p>`,
    example: {
      code: `def saludar(nombre):
    mensaje = "Hola, " + nombre
    return mensaje

def sumar(a, b):
    return a + b

print(saludar("Ana"))
print(sumar(2, 3))
`,
    },
    exercise: {
      prompt: `Completá <code>es_par(n)</code> para que devuelva <code>True</code>
        si el número es par y <code>False</code> si no.`,
      starter: `def es_par(n):
    # tu código acá
    pass

print(es_par(4))
print(es_par(7))
print(es_par(0))
`,
      tests: [{ expected: "True\nFalse\nTrue" }],
    },
  },

  {
    id: "diccionarios",
    level: "Estructuras de datos",
    title: "Diccionarios",
    body: `
      <p>Un <strong>diccionario</strong> asocia <em>claves</em> con
      <em>valores</em>: <code>{"nombre": "Ana"}</code>. Se consulta por clave, no
      por posición: <code>persona["nombre"]</code>.</p>
      <p>Se recorre con <code>.items()</code> y se pregunta si una clave existe con
      <code>in</code>. Son perfectos para <strong>contar</strong> cosas.</p>`,
    example: {
      code: `persona = {"nombre": "Ana", "edad": 30}
persona["ciudad"] = "Córdoba"

print(persona["nombre"])
for clave, valor in persona.items():
    print(clave, "->", valor)
`,
    },
    exercise: {
      prompt: `Contá cuántas veces aparece cada palabra del texto y mostrá el
        diccionario.`,
      starter: `texto = "a b a c b a"
conteo = {}

for palabra in texto.split():
    # sumá 1 al contador de esta palabra
    pass

print(conteo)
`,
      tests: [{ expected: "{'a': 3, 'b': 2, 'c': 1}" }],
    },
  },

  {
    id: "recursion",
    level: "Intermedio",
    title: "Recursión",
    body: `
      <p>Una función <strong>recursiva</strong> se llama a sí misma. Necesita un
      <strong>caso base</strong> (cuándo parar) y un <strong>paso recursivo</strong>
      que se acerque a ese caso.</p>
      <p class="tip">Este es el mejor ejemplo para el <em>Paso a paso</em>: mirá
      cómo la <strong>pila de llamadas</strong> crece con cada
      <code>factorial</code> y después se va desarmando a medida que cada llamada
      devuelve su resultado.</p>`,
    example: {
      code: `def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

print(factorial(4))
`,
    },
    exercise: {
      prompt: `Implementá <code>fib(n)</code> de forma recursiva:
        <code>fib(0)=0</code>, <code>fib(1)=1</code> y
        <code>fib(n) = fib(n-1) + fib(n-2)</code>.`,
      starter: `def fib(n):
    # tu código acá
    pass

for i in range(7):
    print(fib(i))
`,
      tests: [{ expected: "0\n1\n1\n2\n3\n5\n8" }],
    },
  },

  {
    id: "clases",
    level: "Intermedio",
    title: "Clases y objetos",
    body: `
      <p>Una <strong>clase</strong> es un molde; un <strong>objeto</strong> es algo
      creado con ese molde. Los datos del objeto se guardan en
      <strong>atributos</strong> (<code>self.energia</code>) y sus acciones son
      <strong>métodos</strong> (<code>def jugar(self)</code>).</p>
      <p><code>__init__</code> se ejecuta al crear el objeto, y
      <code>self</code> es “este objeto en particular”.</p>
      <p class="tip">En <em>Paso a paso</em> mirá cómo <code>rocky</code> se muestra
      con sus atributos y cómo cambian en cada llamada a <code>jugar()</code>.</p>`,
    example: {
      code: `class Perro:
    def __init__(self, nombre):
        self.nombre = nombre
        self.energia = 10

    def jugar(self):
        self.energia = self.energia - 3
        print(self.nombre, "juega. Energía:", self.energia)

rocky = Perro("Rocky")
rocky.jugar()
rocky.jugar()
`,
    },
    exercise: {
      prompt: `Completá el método <code>sumar</code> de <code>Contador</code> para que
        aumente <code>self.valor</code> en <code>n</code>.`,
      starter: `class Contador:
    def __init__(self):
        self.valor = 0

    def sumar(self, n):
        # tu código acá
        pass

c = Contador()
c.sumar(1)
c.sumar(2)
print(c.valor)
`,
      tests: [{ expected: "3" }],
    },
  },
];
