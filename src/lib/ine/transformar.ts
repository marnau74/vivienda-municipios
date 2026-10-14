/**
 * De las respuestas de la API del INE (tablas con `tip=AM`, con metadatos) a las filas de la base.
 *
 * Funciones puras: no saben nada de la red ni de Supabase, y se prueban con respuestas reales grabadas.
 */
import { z } from "zod";

const Dato = z.object({
  Anyo: z.number().int(),
  Fecha: z.string(),
  Valor: z.number().nullable(),
  Secreto: z.boolean().optional(),
});

const Serie = z.object({
  COD: z.string(),
  Nombre: z.string(),
  MetaData: z.array(z.object({ T3_Variable: z.string(), Nombre: z.string(), Codigo: z.string() })),
  Data: z.array(Dato),
});

export const RespuestaIne = z.array(Serie);
export type SerieIne = z.infer<typeof Serie>;

export type Nivel = "pais" | "comunidad" | "provincia" | "municipio";

export type Territorio = {
  codigo: string;
  codigo_ine: string;
  nivel: Nivel;
  nombre: string;
  padre: string | null;
  slug: string;
};

export type FilaAlquiler = { territorio: string; anio: number; indice: number; variacion_anual: number | null };

export type FilaTuristica = {
  territorio: string;
  periodo: string;
  viviendas: number | null;
  plazas: number | null;
  porcentaje: number | null;
};

const VARIABLES_DE_TERRITORIO: Record<string, Nivel> = {
  "Total Nacional": "pais",
  "Comunidades y Ciudades Autónomas": "comunidad",
  Provincias: "provincia",
  Municipios: "municipio",
};

/**
 * Comunidad autónoma de cada provincia (códigos del INE). Las tablas del INE no traen la jerarquía, solo el código de
 * cada territorio; los dos primeros dígitos del municipio son su provincia.
 */
export const COMUNIDAD_DE_PROVINCIA: Record<string, string> = {
  "01": "16", "02": "08", "03": "10", "04": "01", "05": "07", "06": "11", "07": "04", "08": "09", "09": "07",
  "10": "11", "11": "01", "12": "10", "13": "08", "14": "01", "15": "12", "16": "08", "17": "09", "18": "01",
  "19": "08", "20": "16", "21": "01", "22": "02", "23": "01", "24": "07", "25": "09", "26": "17", "27": "12",
  "28": "13", "29": "01", "30": "14", "31": "15", "32": "12", "33": "03", "34": "07", "35": "05", "36": "12",
  "37": "07", "38": "05", "39": "06", "40": "07", "41": "01", "42": "07", "43": "09", "44": "02", "45": "08",
  "46": "10", "47": "07", "48": "16", "49": "07", "50": "02", "51": "18", "52": "19",
};

const PREFIJO: Record<Nivel, string> = { pais: "", comunidad: "c", provincia: "p", municipio: "m" };

/** La clave del territorio en la base: `es`, `c14`, `p30`, `m30030`. */
export function claveDe(nivel: Nivel, codigoIne: string): string {
  return nivel === "pais" ? "es" : PREFIJO[nivel] + codigoIne;
}

/**
 * El INE pone el artículo al final («Coruña, A», «Palmas de Gran Canaria, Las», «Murcia, Región de»). Para la web se
 * pone delante, como se dice.
 */
export function nombreNatural(nombreIne: string): string {
  const nombre = nombreIne.trim().replace(/\s+/g, " ");
  const coma = nombre.match(/^(.+), ([^,]+)$/);
  const base = coma?.[1];
  const articulo = coma?.[2];
  if (!base || !articulo) return nombre;
  return articulo.endsWith("'") ? `${articulo}${base}` : `${articulo} ${base}`;
}

/** Texto para la URL: sin tildes, en minúsculas y con guiones. */
export function slugDe(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function territorioDeSerie(serie: SerieIne): Territorio | null {
  for (const m of serie.MetaData) {
    const nivel = VARIABLES_DE_TERRITORIO[m.T3_Variable];
    if (!nivel) continue;
    const codigo = nivel === "pais" ? "00" : m.Codigo;
    const nombre = nivel === "pais" ? "España" : nombreNatural(m.Nombre);
    let padre: string | null = null;
    if (nivel === "comunidad") padre = "es";
    if (nivel === "provincia") padre = claveDe("comunidad", COMUNIDAD_DE_PROVINCIA[codigo] ?? "");
    if (nivel === "municipio") padre = claveDe("provincia", codigo.slice(0, 2));
    const slug =
      nivel === "pais"
        ? "espana"
        : nivel === "municipio"
          ? `${slugDe(nombre)}-${codigo}`
          : `${nivel === "provincia" ? "provincia-" : ""}${slugDe(nombre)}`;
    return { codigo: claveDe(nivel, codigo), codigo_ine: codigo, nivel, nombre, padre, slug };
  }
  return null;
}

function valorDe(serie: SerieIne, variable: string): string | undefined {
  return serie.MetaData.find((m) => m.T3_Variable === variable)?.Nombre;
}

/** Todos los territorios que aparecen en unas series, sin repetir. */
export function territorios(series: SerieIne[]): Territorio[] {
  const vistos = new Map<string, Territorio>();
  for (const serie of series) {
    const t = territorioDeSerie(serie);
    if (t && !vistos.has(t.codigo)) vistos.set(t.codigo, t);
  }
  return [...vistos.values()];
}

/** Ordena para insertar: primero los padres (España, comunidades, provincias) y después los municipios. */
export function ordenarParaInsertar(lista: Territorio[]): Territorio[] {
  const orden: Record<Nivel, number> = { pais: 0, comunidad: 1, provincia: 2, municipio: 3 };
  return [...lista].sort((a, b) => orden[a.nivel] - orden[b.nivel] || a.codigo.localeCompare(b.codigo));
}

/**
 * Las filas del índice de alquiler. Solo el total (las tablas de provincias y comunidades desglosan también por tipo
 * de vivienda). Un año sin índice no se guarda; la variación anual puede faltar (el primer año no la tiene).
 */
export function filasDeAlquiler(series: SerieIne[]): FilaAlquiler[] {
  const filas = new Map<string, FilaAlquiler>();
  const variaciones = new Map<string, number | null>();
  for (const serie of series) {
    const tipoDeVivienda = valorDe(serie, "Tipo de vivienda");
    if (tipoDeVivienda && tipoDeVivienda !== "Total") continue;
    const territorio = territorioDeSerie(serie);
    if (!territorio) continue;
    const tipo = valorDe(serie, "Tipo de dato");
    for (const dato of serie.Data) {
      const clave = `${territorio.codigo}|${dato.Anyo}`;
      if (tipo === "Índice" && dato.Valor !== null) {
        filas.set(clave, { territorio: territorio.codigo, anio: dato.Anyo, indice: dato.Valor, variacion_anual: null });
      } else if (tipo === "Variación anual") {
        variaciones.set(clave, dato.Valor);
      }
    }
  }
  for (const [clave, fila] of filas) fila.variacion_anual = variaciones.get(clave) ?? null;
  return [...filas.values()].sort((a, b) => a.territorio.localeCompare(b.territorio) || a.anio - b.anio);
}

/** El primer día del mes de la fecha del INE (`2026-05-01T00:00:00.000+02:00` → `2026-05-01`). */
export function periodoDe(fecha: string): string {
  return fecha.slice(0, 10);
}

/**
 * Las filas de viviendas turísticas: número y plazas (tabla 39363) y porcentaje sobre las viviendas (39366), unidas
 * por territorio y periodo. Un periodo sin ninguno de los tres datos no se guarda.
 */
export function filasTuristicas(viviendasYPlazas: SerieIne[], porcentajes: SerieIne[]): FilaTuristica[] {
  const filas = new Map<string, FilaTuristica>();
  const fila = (territorio: string, periodo: string) => {
    const clave = `${territorio}|${periodo}`;
    let f = filas.get(clave);
    if (!f) {
      f = { territorio, periodo, viviendas: null, plazas: null, porcentaje: null };
      filas.set(clave, f);
    }
    return f;
  };
  for (const serie of [...viviendasYPlazas, ...porcentajes]) {
    const territorio = territorioDeSerie(serie);
    const concepto = valorDe(serie, "Concepto turístico") ?? serie.Nombre;
    if (!territorio) continue;
    const campo = concepto.startsWith("Viviendas turísticas")
      ? "viviendas"
      : concepto === "Plazas" || serie.Nombre.includes(". Plazas. ")
        ? "plazas"
        : concepto.startsWith("Porcentaje") || serie.Nombre.includes("Porcentaje")
          ? "porcentaje"
          : null;
    if (!campo) continue;
    for (const dato of serie.Data) {
      if (dato.Valor === null) continue;
      fila(territorio.codigo, periodoDe(dato.Fecha))[campo] = campo === "porcentaje" ? dato.Valor : Math.round(dato.Valor);
    }
  }
  return [...filas.values()].sort((a, b) => a.territorio.localeCompare(b.territorio) || a.periodo.localeCompare(b.periodo));
}

/** Los padres que faltan: un territorio cuyo padre no está en la lista no se puede guardar (clave foránea). */
export function padresQueFaltan(lista: Territorio[]): string[] {
  const codigos = new Set(lista.map((t) => t.codigo));
  return [...new Set(lista.map((t) => t.padre).filter((p): p is string => p !== null && !codigos.has(p)))].sort();
}
