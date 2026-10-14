import "server-only";
import { createClient } from "@supabase/supabase-js";
import { entornoSupabase } from "./entorno";
import type { Database } from "./tipos";

/**
 * Cliente sin sesión para los datos públicos del INE. No lee cookies, así que se puede usar dentro de `"use cache"`:
 * la misma respuesta vale para todos los visitantes.
 */
export function clientePublico() {
  const { url, clave } = entornoSupabase();
  return createClient<Database>(url, clave, { auth: { persistSession: false, autoRefreshToken: false } });
}
