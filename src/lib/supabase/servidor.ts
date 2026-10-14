import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { entornoSupabase } from "./entorno";
import type { Database } from "./tipos";

/**
 * Cliente con la sesión del usuario, uno por petición (nunca compartido: mezclaría sesiones). Desde un componente de
 * servidor no se pueden escribir cookies; el refresco de la sesión lo hace el proxy.
 */
export async function clienteConSesion() {
  // Todo lo que depende de la sesión es de cada petición: se dice antes de que la librería mire la hora.
  await connection();
  const { url, clave } = entornoSupabase();
  const almacen = await cookies();
  return createServerClient<Database>(url, clave, {
    cookies: {
      getAll: () => almacen.getAll(),
      setAll: (lista) => {
        try {
          for (const { name, value, options } of lista) almacen.set(name, value, options);
        } catch {
          // En un componente de servidor no se pueden escribir: el proxy ya ha refrescado la sesión.
        }
      },
    },
  });
}

/** El usuario de la sesión, comprobado contra Supabase Auth (no basta con leer la cookie). */
export async function usuarioActual() {
  const supabase = await clienteConSesion();
  const { data } = await supabase.auth.getUser();
  return data.user;
}
