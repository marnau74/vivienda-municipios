import "server-only";
import { cacheLife } from "next/cache";
import { geoArea, geoConicConformal, geoPath, type GeoPermissibleObjects } from "d3-geo";
import type { Feature, GeoJsonProperties, Geometry } from "geojson";
import { feature, mesh } from "topojson-client";
import { presimplify, quantile, simplify } from "topojson-simplify";
import type { GeometryCollection, Topology } from "topojson-specification";
import atlas from "es-atlas/es/municipalities.json";

/**
 * La geometría del mapa de municipios, calculada en el servidor una vez: rutas SVG listas para pintar, con Canarias
 * en un recuadro abajo a la izquierda. Los municipios del TopoJSON de es-atlas usan como identificador el código del
 * INE, el mismo que los datos.
 */

export const ANCHO = 960;
export const ALTO = 640;
const RECUADRO = { x: 20, y: 470, ancho: 300, alto: 150 };
/**
 * Parte de los puntos de los contornos que se conservan. A este tamaño no se nota y el mapa pasa de 1,2 MB de caminos
 * a 0,6. Se simplifica la topología, no cada municipio, para que los vecinos sigan encajando sin huecos.
 */
const PUNTOS_QUE_SE_CONSERVAN = 0.1;

export type MunicipioDelMapa = { codigo: string; nombre: string; d: string };
export type Geometria = { municipios: MunicipioDelMapa[]; provincias: string; recuadro: typeof RECUADRO };

type Propiedades = { name: string };

export async function geometria(): Promise<Geometria> {
  "use cache";
  cacheLife("max");
  const original = presimplify(
    structuredClone(atlas) as unknown as Topology<{
      municipalities: GeometryCollection<Propiedades>;
      provinces: GeometryCollection<Propiedades>;
    }>,
  );
  const topo = simplify(original, quantile(original, PUNTOS_QUE_SE_CONSERVAN));
  const municipios = feature(topo, topo.objects.municipalities).features.map(orientar);
  const esCanarias = (codigo: string) => codigo.startsWith("35") || codigo.startsWith("38");

  const peninsula = municipios.filter((m) => !esCanarias(String(m.id)));
  const islas = municipios.filter((m) => esCanarias(String(m.id)));
  const proyeccionPeninsula = geoConicConformal()
    .rotate([4, 0])
    .fitExtent(
      [
        [10, 10],
        [ANCHO - 10, ALTO - 10],
      ],
      { type: "FeatureCollection", features: peninsula } as GeoPermissibleObjects,
    );
  const proyeccionCanarias = geoConicConformal()
    .rotate([15.5, 0])
    .fitExtent(
      [
        [RECUADRO.x + 8, RECUADRO.y + 8],
        [RECUADRO.x + RECUADRO.ancho - 8, RECUADRO.y + RECUADRO.alto - 8],
      ],
      { type: "FeatureCollection", features: islas } as GeoPermissibleObjects,
    );
  const rutaPeninsula = geoPath(proyeccionPeninsula).digits(1);
  const rutaCanarias = geoPath(proyeccionCanarias).digits(1);

  const resultado = municipios
    .map((m) => {
      const codigo = String(m.id);
      const d = (esCanarias(codigo) ? rutaCanarias : rutaPeninsula)(m) ?? "";
      return { codigo, nombre: m.properties.name, d };
    })
    .filter((m) => m.d !== "");

  // Los límites de provincia, una sola vez cada uno (mesh), para dibujarlos encima de los municipios.
  const limites = mesh(topo, topo.objects.provinces, (a, b) => a !== b);
  const provincias = [
    rutaPeninsula({ ...limites, coordinates: limites.coordinates.filter((l) => l[0]![0]! > -13) }),
    rutaCanarias({ ...limites, coordinates: limites.coordinates.filter((l) => l[0]![0]! <= -13) }),
  ].join("");

  return { municipios: resultado, provincias, recuadro: RECUADRO };
}

/**
 * d3-geo trabaja sobre la esfera: un polígono con los anillos en el sentido contrario al que espera se entiende como
 * «toda la Tierra menos este municipio» y lo tapa todo. Si un polígono ocupa más de media esfera, se le da la vuelta.
 */
export function orientar<P extends GeoJsonProperties>(f: Feature<Geometry, P>): Feature<Geometry, P> {
  // Se mira cada polígono por separado: en un municipio de varios trozos puede venir al revés solo uno.
  const bien = (anillos: number[][][]) =>
    geoArea({ type: "Polygon", coordinates: anillos }) > 2 * Math.PI ? anillos.map((r) => [...r].reverse()) : anillos;
  if (f.geometry.type === "Polygon") return { ...f, geometry: { type: "Polygon", coordinates: bien(f.geometry.coordinates) } };
  if (f.geometry.type === "MultiPolygon") {
    return { ...f, geometry: { type: "MultiPolygon", coordinates: f.geometry.coordinates.map(bien) } };
  }
  return f;
}

/**
 * Cortes para colorear por cuantiles: cada color tiene más o menos los mismos municipios, así el mapa no queda de un
 * solo tono por unos pocos valores extremos. Se redondean para que la leyenda se lea bien.
 */
export function cortesPorCuantiles(valores: number[], clases: number, decimales = 0): number[] {
  if (valores.length === 0) return [];
  const ordenados = [...valores].sort((a, b) => a - b);
  const factor = 10 ** decimales;
  const cortes: number[] = [];
  for (let i = 1; i < clases; i++) {
    const v = ordenados[Math.min(ordenados.length - 1, Math.floor((i / clases) * ordenados.length))]!;
    const redondeado = Math.round(v * factor) / factor;
    if (!cortes.includes(redondeado)) cortes.push(redondeado);
  }
  return cortes;
}

/** La clase (0 = la más baja) de un valor según los cortes. */
export function clase(valor: number, cortes: number[]): number {
  let i = 0;
  while (i < cortes.length && valor >= cortes[i]!) i++;
  return i;
}

export const COLORES = ["var(--escala-1)", "var(--escala-2)", "var(--escala-3)", "var(--escala-4)", "var(--escala-5)", "var(--escala-6)"];

type DatosDelDibujo = {
  titulo: string;
  descripcion: string;
  /** Valor por código INE del municipio. */
  valores: Record<string, number>;
  /** Slug de la ficha por código INE (los municipios con dato llevan a su ficha). */
  slugs: Record<string, string>;
  cortes: number[];
  formato: (valor: number) => string;
};

/**
 * El mapa como texto SVG. Se sirve aparte de la página (ver `app/mapa/[indicador]/svg`): con miles de municipios
 * enlazados pesa megas, y dentro de la página iría dos veces (en el HTML y en los datos de React).
 */
export function dibujarMapa({ municipios, provincias, recuadro }: Geometria, datos: DatosDelDibujo): string {
  const { titulo, descripcion, valores, slugs, cortes, formato } = datos;
  const sinDato = municipios
    .filter((m) => valores[m.codigo] === undefined)
    .map((m) => m.d)
    .join("");
  const conDato = municipios
    .filter((m) => valores[m.codigo] !== undefined)
    .map((m) => {
      const valor = valores[m.codigo]!;
      const camino = `<path d="${m.d}" fill="${COLORES[clase(valor, cortes)]}"><title>${escapar(`${m.nombre}: ${formato(valor)}`)}</title></path>`;
      // Fuera del orden del tabulador: con el teclado serían miles de paradas; el buscador y el ranking llevan a las
      // mismas fichas.
      return slugs[m.codigo] ? `<a href="/territorio/${escapar(slugs[m.codigo]!)}" tabindex="-1">${camino}</a>` : camino;
    })
    .join("");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ANCHO} ${ALTO}" role="group" aria-labelledby="mapa-titulo" aria-describedby="mapa-desc" class="h-auto w-full">` +
    `<title id="mapa-titulo">${escapar(titulo)}</title><desc id="mapa-desc">${escapar(descripcion)}</desc>` +
    `<defs>${PATRON_SIN_DATO}</defs>` +
    `<rect x="${recuadro.x}" y="${recuadro.y}" width="${recuadro.ancho}" height="${recuadro.alto}" fill="none" stroke="var(--borde)"/>` +
    `<g stroke="var(--linea-mapa)" stroke-width="0.3"><path d="${sinDato}" fill="url(#sin-dato)"/>${conDato}</g>` +
    `<path d="${provincias}" fill="none" stroke="var(--texto-suave)" stroke-width="0.6" pointer-events="none"/>` +
    `</svg>`
  );
}

/** El rayado de «sin dato», el mismo en el mapa y en la leyenda. */
export const PATRON_SIN_DATO =
  '<pattern id="sin-dato" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
  '<rect width="6" height="6" fill="var(--sin-dato)"/><line x1="0" y1="0" x2="0" y2="6" stroke="var(--fondo)" stroke-width="2"/>' +
  "</pattern>";

export function escapar(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
