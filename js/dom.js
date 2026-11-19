/* Crea elementos del DOM de forma segura: los hijos de tipo texto se insertan
 * como nodos de texto, nunca como HTML. */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "class") el.className = value;
    else if (value !== false && value != null) el.setAttribute(key, value);
  }
  for (const child of children) {
    if (child != null) el.append(child);
  }
  return el;
}
