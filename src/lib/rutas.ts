/**
 * Una ruta de esta web a la que volver después de entrar, o `porDefecto` si no lo es. No basta con que empiece por
 * «/»: «//otra.web» y «/\otra.web» son direcciones de otra web para el navegador, y con ellas el enlace de entrada
 * serviría para mandar a cualquier sitio.
 */
export function rutaPropia(valor: unknown, porDefecto = "/cuenta"): string {
  if (typeof valor !== "string" || !/^\/(?![/\\])/.test(valor) || /[\u0000-\u001f\\]/.test(valor)) return porDefecto;
  const base = "http://esta.web";
  const url = new URL(valor, base);
  return url.origin === base ? `${url.pathname}${url.search}${url.hash}` : porDefecto;
}
