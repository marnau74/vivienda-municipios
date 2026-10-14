import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { PuntoAlquiler, PuntoTuristico } from "./calculos";
import { clientePublico } from "./supabase/publico";

/**
 * Lecturas de los datos públicos del INE. Cambian una vez al mes como mucho (la carga), así que se cachean un día y
 * todas llevan la etiqueta «ine» para invalidarlas juntas después de una carga.
 */

export type Territorio = {
  codigo: string;
  codigo_ine: string;
  nivel: "pais" | "comunidad" | "provincia" | "municipio";
  nombre: string;
  padre: string | null;
  slug: string;
};

async function o<T>(consulta: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await consulta;
  if (error) throw new Error(`Error al leer los datos: ${error.message}`);
  return data as T;
}

export async function territorioPorSlug(slug: string): Promise<Territorio | null> {
  "use cache";
  cacheLife("days");
  cacheTag("ine");
  const filas = await o(clientePublico().from("territorio").select("*").eq("slug", slug).limit(1));
  return (filas[0] as Territorio | undefined) ?? null;
}

export async function territorioPorCodigo(codigo: string): Promise<Territorio | null> {
  "use cache";
  cacheLife("days");
  cacheTag("ine");
  const filas = await o(clientePublico().from("territorio").select("*").eq("codigo", codigo).limit(1));
  return (filas[0] as Territorio | undefined) ?? null;
}

/** El territorio y sus antepasados: municipio, provincia, comunidad y España. */
export async function linaje(territorio: Territorio): Promise<Territorio[]> {
  const cadena = [territorio];
  let actual = territorio;
  while (actual.padre) {
    const padre = await territorioPorCodigo(actual.padre);
    if (!padre) break;
    cadena.push(padre);
    actual = padre;
  }
  return cadena;
}

export async function serieDeAlquiler(codigo: string): Promise<PuntoAlquiler[]> {
  "use cache";
  cacheLife("days");
  cacheTag("ine");
  const filas = await o(
    clientePublico().from("alquiler_indice").select("anio, indice, variacion_anual").eq("territorio", codigo).order("anio"),
  );
  return filas.map((f) => ({ anio: f.anio, indice: Number(f.indice), variacion_anual: f.variacion_anual === null ? null : Number(f.variacion_anual) }));
}

export async function serieTuristica(codigo: string): Promise<PuntoTuristico[]> {
  "use cache";
  cacheLife("days");
  cacheTag("ine");
  const filas = await o(
    clientePublico()
      .from("vivienda_turistica")
      .select("periodo, viviendas, plazas, porcentaje")
      .eq("territorio", codigo)
      .order("periodo"),
  );
  return filas.map((f) => ({ ...f, porcentaje: f.porcentaje === null ? null : Number(f.porcentaje) }));
}

export type FilaDeRanking = { codigo: string; nombre: string; slug: string; provincia: string; valor: number };

/** Todos los municipios con índice de alquiler, por subida desde 2015 (mayor primero). */
export async function rankingDeAlquiler(): Promise<FilaDeRanking[]> {
  "use cache";
  cacheLife("days");
  cacheTag("ine");
  const filas = await todas(() =>
    clientePublico()
      .from("alquiler_municipio")
      .select("codigo, nombre, slug, provincia, subida_desde_2015")
      .order("subida_desde_2015", { ascending: false })
      .order("codigo"),
  );
  return filas.map((f) => ({
    codigo: f.codigo!,
    nombre: f.nombre!,
    slug: f.slug!,
    provincia: f.provincia!,
    valor: Number(f.subida_desde_2015),
  }));
}

/**
 * Mínimo de viviendas turísticas para entrar en el ranking: en un pueblo pequeño, cinco viviendas pueden ser el 30 % y
 * llenarían el ranking de casos que no dicen nada.
 */
export const MINIMO_DE_VIVIENDAS_TURISTICAS = 100;

/** Municipios por porcentaje de viviendas turísticas en el último periodo (mayor primero). */
export async function rankingTuristico({ todos = false }: { todos?: boolean } = {}): Promise<FilaDeRanking[]> {
  "use cache";
  cacheLife("days");
  cacheTag("ine");
  const supabase = clientePublico();
  const [ultimas, municipios] = await Promise.all([
    todas(() =>
      supabase.from("vivienda_turistica_ultima").select("territorio, porcentaje, viviendas").like("territorio", "m%"),
    ),
    todas(() => supabase.from("territorio").select("codigo, nombre, slug, padre").eq("nivel", "municipio")),
  ]);
  const provincias = await o(supabase.from("territorio").select("codigo, nombre").eq("nivel", "provincia"));
  const nombreDeProvincia = new Map(provincias.map((p) => [p.codigo, p.nombre]));
  const porCodigo = new Map(municipios.map((m) => [m.codigo, m]));
  return ultimas
    .filter((u) => u.porcentaje !== null && porCodigo.has(u.territorio!))
    .filter((u) => todos || (u.viviendas ?? 0) >= MINIMO_DE_VIVIENDAS_TURISTICAS)
    .map((u) => {
      const m = porCodigo.get(u.territorio!)!;
      return { codigo: m.codigo, nombre: m.nombre, slug: m.slug, provincia: nombreDeProvincia.get(m.padre!) ?? "", valor: Number(u.porcentaje) };
    })
    .sort((a, b) => b.valor - a.valor);
}

/** El valor y la ficha de cada municipio para el mapa, por código INE (el identificador del TopoJSON). */
export async function datosDelMapa(
  indicador: Indicador,
): Promise<{ valores: Record<string, number>; slugs: Record<string, string> }> {
  "use cache";
  cacheLife("days");
  cacheTag("ine");
  const filas = indicador === "alquiler" ? await rankingDeAlquiler() : await rankingTuristico({ todos: true });
  return {
    valores: Object.fromEntries(filas.map((f) => [f.codigo.slice(1), f.valor])),
    slugs: Object.fromEntries(filas.map((f) => [f.codigo.slice(1), f.slug])),
  };
}

export type Indicador = "alquiler" | "turisticas";

export function ranking(indicador: Indicador): Promise<FilaDeRanking[]> {
  return indicador === "alquiler" ? rankingDeAlquiler() : rankingTuristico();
}

/** Fecha de la última carga del INE, para decir de cuándo son los datos. */
export async function ultimaCarga(): Promise<string | null> {
  "use cache";
  cacheLife("days");
  cacheTag("ine");
  const filas = await o(clientePublico().from("carga").select("cargada_en").order("cargada_en", { ascending: false }).limit(1));
  return filas[0]?.cargada_en ?? null;
}

/** PostgREST devuelve como mucho 1.000 filas por petición: se pide por páginas hasta tenerlas todas. */
async function todas<T>(consulta: () => { range: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }> }): Promise<T[]> {
  const resultado: T[] = [];
  for (let desde = 0; ; desde += 1000) {
    const pagina = await o(consulta().range(desde, desde + 999));
    resultado.push(...pagina);
    if (pagina.length < 1000) return resultado;
  }
}

