import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { datosDelMapa, type Indicador } from "./datos";
import { INDICADORES } from "./indicadores";
import { COLORES, cortesPorCuantiles, dibujarMapa, geometria } from "./mapa";

/** Lo que la página del mapa necesita para la leyenda: los cortes de los colores y cuántos municipios tienen dato. */
export async function resumenDelMapa(indicador: Indicador) {
  "use cache";
  cacheLife("days");
  cacheTag("ine");
  const { valores } = await datosDelMapa(indicador);
  const lista = Object.values(valores);
  return { cortes: cortesPorCuantiles(lista, COLORES.length, INDICADORES[indicador].decimales), conDato: lista.length };
}

/** El mapa de un indicador en SVG, listo para servir. */
export async function svgDelMapa(indicador: Indicador): Promise<string> {
  "use cache";
  cacheLife("days");
  cacheTag("ine");
  const info = INDICADORES[indicador];
  const [{ valores, slugs }, { cortes, conDato }, dibujo] = await Promise.all([
    datosDelMapa(indicador),
    resumenDelMapa(indicador),
    geometria(),
  ]);
  return dibujarMapa(dibujo, {
    titulo: info.nombre,
    descripcion: `${info.explicacion} ${conDato} municipios con dato.`,
    valores,
    slugs,
    cortes,
    formato: info.formato,
  });
}
