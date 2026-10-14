import "server-only";
import { cacheLife } from "next/cache";
import { geoArea, geoConicConformal, geoPath, type GeoPermissibleObjects } from "d3-geo";
import type { Feature, GeoJsonProperties, Geometry } from "geojson";
import { feature, mesh } from "topojson-client";
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

export type MunicipioDelMapa = { codigo: string; nombre: string; d: string };
export type Geometria = { municipios: MunicipioDelMapa[]; provincias: string; recuadro: typeof RECUADRO };

type Propiedades = { name: string };

export async function geometria(): Promise<Geometria> {
  "use cache";
  cacheLife("max");
  const topo = atlas as unknown as Topology<{
    municipalities: GeometryCollection<Propiedades>;
    provinces: GeometryCollection<Propiedades>;
  }>;
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
