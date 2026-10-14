import { NextResponse } from "next/server";
import { z } from "zod";
import { clientePublico } from "@/lib/supabase/publico";

const Parametros = z.object({ q: z.string().trim().min(2).max(60) });

/** Búsqueda de municipios para el buscador: sin tildes y con erratas (la función buscar_municipios de la base). */
export async function GET(peticion: Request) {
  const parametros = Parametros.safeParse(Object.fromEntries(new URL(peticion.url).searchParams));
  if (!parametros.success) return NextResponse.json({ error: "Escribe entre 2 y 60 caracteres" }, { status: 400 });
  const { data, error } = await clientePublico().rpc("buscar_municipios", { texto: parametros.data.q, limite: 8 });
  if (error) return NextResponse.json({ error: "No se ha podido buscar" }, { status: 502 });
  return NextResponse.json(data, { headers: { "cache-control": "public, max-age=3600" } });
}
