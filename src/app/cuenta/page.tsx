import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";
import { borrarComparacion, salir } from "@/app/acciones";
import { FormularioDeEntrada } from "@/componentes/FormularioDeEntrada";
import { territorioPorCodigo } from "@/lib/datos";
import { clienteConSesion } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Mi cuenta", robots: { index: false } };

export default function Cuenta({ searchParams }: PageProps<"/cuenta">) {
  return (
    <>
      <h1 className="font-serif text-3xl font-semibold tracking-tight">Mi cuenta</h1>
      <Suspense fallback={<p className="mt-6 text-suave">Cargando…</p>}>
        <Contenido parametros={searchParams} />
      </Suspense>
    </>
  );
}

async function Contenido({ parametros }: { parametros: PageProps<"/cuenta">["searchParams"] }) {
  const { volver, error } = await parametros;
  const destino = z.string().startsWith("/").catch("/cuenta").parse(Array.isArray(volver) ? volver[0] : volver);
  const supabase = await clienteConSesion();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    return (
      <div className="mt-6 max-w-md">
        <p className="text-suave">
          Con una cuenta puedes seguir municipios y guardar comparaciones. No hay contraseña: te mandamos un enlace al
          correo para entrar.
        </p>
        {error && (
          <p role="alert" className="mt-4 text-sube">
            El enlace no vale o ha caducado. Pide otro.
          </p>
        )}
        <FormularioDeEntrada volver={destino} />
      </div>
    );
  }

  // RLS hace que estas consultas solo devuelvan lo del usuario de la sesión.
  const [{ data: seguidos }, { data: comparaciones }] = await Promise.all([
    supabase.from("seguimiento").select("territorio, creado_en").order("creado_en", { ascending: false }),
    supabase.from("comparacion").select("id, nombre, territorios").order("creada_en", { ascending: false }),
  ]);
  const territorios = await Promise.all((seguidos ?? []).map((s) => territorioPorCodigo(s.territorio)));

  return (
    <div className="mt-6 grid gap-10 md:grid-cols-2">
      <section aria-labelledby="seguidos">
        <h2 id="seguidos" className="font-serif text-xl font-semibold">
          Municipios que sigues
        </h2>
        {territorios.length === 0 ? (
          <p className="mt-3 text-suave">Todavía ninguno. Pulsa «Seguir» en la ficha de un municipio.</p>
        ) : (
          <ul className="mt-3 divide-y divide-borde">
            {territorios.map(
              (t) =>
                t && (
                  <li key={t.codigo} className="py-2">
                    <Link href={`/territorio/${t.slug}`} className="underline-offset-4 hover:underline">
                      {t.nombre}
                    </Link>
                  </li>
                ),
            )}
          </ul>
        )}
      </section>
      <section aria-labelledby="comparaciones">
        <h2 id="comparaciones" className="font-serif text-xl font-semibold">
          Comparaciones guardadas
        </h2>
        {(comparaciones ?? []).length === 0 ? (
          <p className="mt-3 text-suave">Todavía ninguna.</p>
        ) : (
          <ul className="mt-3 divide-y divide-borde">
            {comparaciones!.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                <Link href={`/comparar?t=${c.territorios.join(",")}`} className="underline-offset-4 hover:underline">
                  {c.nombre}
                </Link>
                <form action={borrarComparacion}>
                  <input type="hidden" name="id" value={c.id} />
                  <button type="submit" className="text-sm text-suave hover:text-texto" aria-label={`Borrar ${c.nombre}`}>
                    Borrar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
      <form action={salir} className="md:col-span-2">
        <p className="text-sm text-suave">Has entrado como {data.user.email}.</p>
        <button type="submit" className="mt-2 rounded-md border border-borde px-3 py-2 text-sm hover:bg-acento-suave">
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
