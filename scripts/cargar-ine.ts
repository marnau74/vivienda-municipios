/**
 * Carga los datos del INE en Supabase: territorios, índice de alquiler (IPVA) y viviendas turísticas (VTE).
 *
 *   node --env-file=.env.local scripts/cargar-ine.ts
 *
 * Con `--muestra` (o INE_FICHEROS=<carpeta>) lee las respuestas grabadas (<tabla>.json) de tests/datos-ine en vez de
 * llamar al INE: así la CI y las pruebas de extremo a extremo no dependen de la red y siempre ven los mismos datos.
 *
 * Usa la clave de servicio (SUPABASE_SECRET_KEY), que se salta RLS: solo vive aquí, nunca en la web. Es idempotente
 * (upsert por clave primaria): repetirla actualiza sin duplicar.
 */
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import {
  filasDeAlquiler,
  filasTuristicas,
  ordenarParaInsertar,
  padresQueFaltan,
  RespuestaIne,
  type SerieIne,
  territorios,
} from "../src/lib/ine/transformar.ts";

const TABLAS = { alquilerEspana: "59056", alquilerProvincias: "59058", alquilerMunicipios: "59060", turisticas: "39363", porcentajeTuristicas: "39366" };
const LOTE = 1000;

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const clave = process.env.SUPABASE_SECRET_KEY;
if (!url || !clave) {
  console.error("Faltan SUPABASE_URL y SUPABASE_SECRET_KEY (ver .env.ejemplo).");
  process.exit(1);
}
const supabase = createClient(url, clave, { auth: { persistSession: false } });

/** Descarga una tabla completa. El INE redirige las tablas completas a su caché; fetch sigue la redirección. */
async function descargar(tabla: string): Promise<SerieIne[]> {
  const carpeta = process.env.INE_FICHEROS ?? (process.argv.includes("--muestra") ? "tests/datos-ine" : undefined);
  if (carpeta) return RespuestaIne.parse(JSON.parse(await readFile(`${carpeta}/${tabla}.json`, "utf-8")));
  for (let intento = 1; ; intento++) {
    try {
      const respuesta = await fetch(`https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA/${tabla}?tip=AM`, {
        signal: AbortSignal.timeout(120_000),
      });
      if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
      const series = RespuestaIne.parse(await respuesta.json());
      console.log(`Tabla ${tabla}: ${series.length} series`);
      return series;
    } catch (error) {
      if (intento === 3) throw new Error(`No se ha podido descargar la tabla ${tabla}: ${error}`);
      console.warn(`Tabla ${tabla}, intento ${intento} fallido (${error}); se reintenta`);
      await new Promise((r) => setTimeout(r, 5_000 * intento));
    }
  }
}

async function guardar(tabla: string, filas: object[], conflicto: string): Promise<void> {
  for (let i = 0; i < filas.length; i += LOTE) {
    const { error } = await supabase.from(tabla).upsert(filas.slice(i, i + LOTE), { onConflict: conflicto });
    if (error) throw new Error(`Error al guardar en ${tabla}: ${error.message}`);
  }
  console.log(`${tabla}: ${filas.length} filas`);
}

async function anotar(tablaIne: string, filas: number): Promise<void> {
  const { error } = await supabase.from("carga").insert({ tabla_ine: tablaIne, filas });
  if (error) throw new Error(`Error al anotar la carga: ${error.message}`);
}

const [espana, provincias, municipios, turisticas, porcentajes] = await Promise.all([
  descargar(TABLAS.alquilerEspana),
  descargar(TABLAS.alquilerProvincias),
  descargar(TABLAS.alquilerMunicipios),
  descargar(TABLAS.turisticas),
  descargar(TABLAS.porcentajeTuristicas),
]);

const todas = [...espana, ...provincias, ...municipios, ...turisticas, ...porcentajes];
const lista = territorios(todas);
const faltan = padresQueFaltan(lista);
if (faltan.length > 0) throw new Error(`Faltan territorios padre en los datos del INE: ${faltan.join(", ")}`);
await guardar("territorio", ordenarParaInsertar(lista), "codigo");

const alquiler = filasDeAlquiler([...espana, ...provincias, ...municipios]);
await guardar("alquiler_indice", alquiler, "territorio,anio");
await anotar("59056+59058+59060", alquiler.length);

const viviendas = filasTuristicas(turisticas, porcentajes);
await guardar("vivienda_turistica", viviendas, "territorio,periodo");
await anotar("39363+39366", viviendas.length);

console.log("Carga terminada.");

// Si la web está en marcha y se ha configurado, se le avisa para que tire la caché de los datos del INE.
const web = process.env.REVALIDAR_URL;
if (web && process.env.REVALIDAR_SECRETO) {
  const respuesta = await fetch(web, { method: "POST", headers: { authorization: `Bearer ${process.env.REVALIDAR_SECRETO}` } });
  console.log(respuesta.ok ? "Caché de la web renovada." : `La web no renovó la caché (${respuesta.status}).`);
}
