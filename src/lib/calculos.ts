/** Cálculos sobre las series, sin red ni base de datos. */

export type PuntoAlquiler = { anio: number; indice: number; variacion_anual: number | null };
export type PuntoTuristico = { periodo: string; viviendas: number | null; plazas: number | null; porcentaje: number | null };

/**
 * Subida del alquiler entre dos años, en porcentaje. Con un índice se compara la evolución, nunca el nivel: un 120
 * en Madrid y un 120 en Teruel significan que los dos han subido un 20 % desde 2015, no que cuesten lo mismo.
 */
export function subidaEntre(serie: PuntoAlquiler[], desde: number, hasta: number): number | null {
  const inicio = serie.find((p) => p.anio === desde)?.indice;
  const fin = serie.find((p) => p.anio === hasta)?.indice;
  if (inicio === undefined || fin === undefined) return null;
  return (fin / inicio - 1) * 100;
}

export function ultimoAnio(serie: PuntoAlquiler[]): PuntoAlquiler | undefined {
  return serie.reduce<PuntoAlquiler | undefined>((u, p) => (!u || p.anio > u.anio ? p : u), undefined);
}

export function ultimoPeriodo(serie: PuntoTuristico[]): PuntoTuristico | undefined {
  return serie.reduce<PuntoTuristico | undefined>((u, p) => (!u || p.periodo > u.periodo ? p : u), undefined);
}

/** El mismo periodo un año antes (los datos son semestrales: mayo con mayo, noviembre con noviembre). */
export function periodoAnterior(serie: PuntoTuristico[], periodo: string): PuntoTuristico | undefined {
  const anio = Number(periodo.slice(0, 4)) - 1;
  return serie.find((p) => p.periodo === `${anio}${periodo.slice(4)}`);
}

/** Variación relativa en porcentaje; nula si falta alguno de los dos valores o el de partida es cero. */
export function variacion(actual: number | null | undefined, anterior: number | null | undefined): number | null {
  if (actual == null || anterior == null || anterior === 0) return null;
  return (actual / anterior - 1) * 100;
}

/** Los años que faltan entre el primero y el último de una serie (los huecos se cuentan, no se esconden). */
export function aniosQueFaltan(serie: PuntoAlquiler[]): number[] {
  if (serie.length === 0) return [];
  const anios = new Set(serie.map((p) => p.anio));
  const min = Math.min(...anios);
  const max = Math.max(...anios);
  const faltan: number[] = [];
  for (let a = min; a <= max; a++) if (!anios.has(a)) faltan.push(a);
  return faltan;
}
