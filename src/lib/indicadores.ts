import type { Indicador } from "./datos";
import { cambio, porcentaje } from "./formato";

/** Lo que hace falta para enseñar cada indicador en el mapa y en los rankings. */
export const INDICADORES: Record<
  Indicador,
  { nombre: string; corto: string; explicacion: string; formato: (v: number) => string; decimales: number }
> = {
  alquiler: {
    nombre: "Subida del alquiler desde 2015",
    corto: "Alquiler",
    explicacion:
      "Variación del índice de precios de vivienda en alquiler del INE entre 2015 y el último año publicado. Solo los municipios de más de 10.000 habitantes.",
    formato: cambio,
    decimales: 0,
  },
  turisticas: {
    nombre: "Viviendas turísticas sobre el total",
    corto: "Viviendas turísticas",
    explicacion:
      "Porcentaje de viviendas turísticas sobre el total de viviendas en el último semestre publicado por el INE (medición experimental).",
    formato: porcentaje,
    decimales: 1,
  },
};

export function esIndicador(valor: string): valor is Indicador {
  return valor === "alquiler" || valor === "turisticas";
}
