"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { clienteConSesion } from "@/lib/supabase/servidor";

/**
 * Acciones de la cuenta. Todo lo que llega del navegador se valida con zod antes de tocar la base, y la base vuelve a
 * comprobar con RLS que cada fila es del usuario de la sesión: el usuario no se manda, sale del token.
 */

const CodigoDeTerritorio = z.string().regex(/^(es|c\d{2}|p\d{2}|m\d{5})$/, "Territorio no válido");

export type Estado = { error?: string; aviso?: string } | undefined;

async function conUsuario() {
  const supabase = await clienteConSesion();
  const { data } = await supabase.auth.getUser();
  return { supabase, usuario: data.user };
}

export async function cambiarSeguimiento(formulario: FormData): Promise<void> {
  const datos = z
    .object({ territorio: CodigoDeTerritorio, seguir: z.enum(["si", "no"]), volver: z.string().regex(/^\/(?!\/)/) })
    .safeParse(Object.fromEntries(formulario));
  if (!datos.success) return;
  const { supabase, usuario } = await conUsuario();
  if (!usuario) redirect(`/cuenta?volver=${encodeURIComponent(datos.data.volver)}`);
  if (datos.data.seguir === "si") {
    await supabase.from("seguimiento").upsert({ territorio: datos.data.territorio }, { onConflict: "usuario,territorio" });
  } else {
    await supabase.from("seguimiento").delete().eq("territorio", datos.data.territorio);
  }
  revalidatePath(datos.data.volver);
  revalidatePath("/cuenta");
}

const NuevaComparacion = z.object({
  nombre: z.string().trim().min(1, "Ponle un nombre").max(80, "Como mucho 80 caracteres"),
  territorios: z.array(CodigoDeTerritorio).min(2, "Elige al menos dos").max(4, "Como mucho cuatro"),
});

export async function guardarComparacion(_previo: Estado, formulario: FormData): Promise<Estado> {
  const datos = NuevaComparacion.safeParse({
    nombre: formulario.get("nombre"),
    territorios: String(formulario.get("territorios") ?? "").split(",").filter(Boolean),
  });
  if (!datos.success) return { error: datos.error.issues[0]?.message ?? "Datos no válidos" };
  const { supabase, usuario } = await conUsuario();
  if (!usuario) return { error: "Inicia sesión para guardar comparaciones" };
  const { error } = await supabase.from("comparacion").insert(datos.data);
  if (error) return { error: "No se ha podido guardar" };
  revalidatePath("/cuenta");
  return { aviso: "Comparación guardada" };
}

export async function borrarComparacion(formulario: FormData): Promise<void> {
  const id = z.uuid().safeParse(formulario.get("id"));
  if (!id.success) return;
  const { supabase } = await conUsuario();
  await supabase.from("comparacion").delete().eq("id", id.data);
  revalidatePath("/cuenta");
}

/** Manda el enlace mágico. Por seguridad la respuesta es la misma exista o no la cuenta. */
export async function entrar(_previo: Estado, formulario: FormData): Promise<Estado> {
  const correo = z.email("Escribe un correo válido").safeParse(String(formulario.get("correo") ?? "").trim());
  if (!correo.success) return { error: correo.error.issues[0]?.message };
  const volver = z.string().regex(/^\/(?!\/)/).catch("/cuenta").parse(formulario.get("volver"));
  const origen = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_URL_DEL_SITIO;
  const supabase = await clienteConSesion();
  const { error } = await supabase.auth.signInWithOtp({
    email: correo.data,
    options: { emailRedirectTo: `${origen}/auth/confirmar?volver=${encodeURIComponent(volver)}` },
  });
  if (error) return { error: "No se ha podido mandar el enlace. Inténtalo dentro de un rato." };
  return { aviso: `Te hemos mandado un enlace a ${correo.data}. Ábrelo en este navegador para entrar.` };
}

export async function salir(): Promise<void> {
  const supabase = await clienteConSesion();
  await supabase.auth.signOut();
  redirect("/");
}
