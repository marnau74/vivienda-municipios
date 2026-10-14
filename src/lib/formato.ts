const numero = new Intl.NumberFormat("es-ES");
const decimal = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const mes = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: "UTC" });
const mesCorto = new Intl.DateTimeFormat("es-ES", { month: "short", timeZone: "UTC" });

export function entero(valor: number | null | undefined): string {
  return valor == null ? "—" : numero.format(Math.round(valor));
}

/** «+23,4 %», «−1,2 %» (con el signo menos tipográfico) o «—» si no hay dato. */
export function cambio(valor: number | null | undefined): string {
  if (valor == null) return "—";
  const texto = decimal.format(Math.abs(valor));
  return `${valor > 0 ? "+" : valor < 0 ? "−" : ""}${texto} %`;
}

export function porcentaje(valor: number | null | undefined): string {
  return valor == null ? "—" : `${decimal.format(valor)} %`;
}

/** `2026-05-01` → «mayo de 2026». */
export function periodo(fecha: string): string {
  return mes.format(new Date(`${fecha}T00:00:00Z`));
}

/** `2026-05-01` → «may 2026», para los ejes de las gráficas. */
export function periodoCorto(fecha: string): string {
  return `${mesCorto.format(new Date(`${fecha}T00:00:00Z`)).replace(".", "")} ${fecha.slice(0, 4)}`;
}
