import { NextResponse } from "next/server";
import { z } from "zod";
import { clienteConSesion } from "@/lib/supabase/servidor";

/**
 * Vuelta del enlace mágico: Supabase redirige aquí con un código (PKCE) que se cambia por la sesión. Solo se redirige
 * a rutas propias (que empiezan por «/»), para que el enlace no se pueda usar para mandar a otra web.
 */
export async function GET(peticion: Request) {
  const url = new URL(peticion.url);
  const codigo = url.searchParams.get("code");
  const volver = z
    .string()
    .regex(/^\/(?!\/)/)
    .catch("/cuenta")
    .parse(url.searchParams.get("volver"));
  if (codigo) {
    const supabase = await clienteConSesion();
    const { error } = await supabase.auth.exchangeCodeForSession(codigo);
    if (!error) return NextResponse.redirect(new URL(volver, url.origin));
  }
  return NextResponse.redirect(new URL("/cuenta?error=enlace", url.origin));
}
