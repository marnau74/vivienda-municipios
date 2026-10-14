import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";
import { AnadirAComparacion } from "@/componentes/AnadirAComparacion";
import { GraficaDeLineas } from "@/componentes/GraficaDeLineas";
import { GuardarComparacion } from "@/componentes/GuardarComparacion";
import { periodoAnterior, subidaEntre, ultimoAnio, ultimoPeriodo, variacion } from "@/lib/calculos";
import { serieDeAlquiler, serieTuristica, territorioPorCodigo, type Territorio } from "@/lib/datos";
import { cambio, entero, porcentaje } from "@/lib/formato";
import { usuarioActual } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Comparar municipios" };

const MAXIMO = 4;
const Codigos = z
  .string()
  .optional()
  .transform((t) => [...new Set((t ?? "").split(",").filter((c) => /^(es|c\d{2}|p\d{2}|m\d{5})$/.test(c)))].slice(0, MAXIMO));

export default function Comparar({ searchParams }: PageProps<"/comparar">) {
  return (
    <>
      <h1 className="font-serif text-3xl font-semibold tracking-tight">Comparar municipios</h1>
      <p className="mt-2 max-w-2xl text-suave">
        Hasta cuatro territorios a la vez. Se comparan cuánto han cambiado, no cuánto cuestan: el índice del alquiler no
        dice el precio.
      </p>
      <Suspense fallback={<p className="mt-8 text-suave">Cargando la comparación…</p>}>
        <Comparacion parametros={searchParams} />
      </Suspense>
    </>
  );
}

async function Comparacion({ parametros }: { parametros: PageProps<"/comparar">["searchParams"] }) {
  const { t } = await parametros;
  const codigos = Codigos.parse(Array.isArray(t) ? t[0] : t);
  const territorios = (await Promise.all(codigos.map(territorioPorCodigo))).filter((x): x is Territorio => x !== null);
  const datos = await Promise.all(
    territorios.map(async (territorio) => ({
      territorio,
      alquiler: await serieDeAlquiler(territorio.codigo),
      turisticas: await serieTuristica(territorio.codigo),
    })),
  );
  const usuario = await usuarioActual();
  const enlace = (lista: string[]) => (lista.length ? `/comparar?t=${lista.join(",")}` : "/comparar");
  const anios = [...new Set(datos.flatMap((d) => d.alquiler.map((p) => p.anio)))].sort();

  return (
    <div className="mt-8">
      <ul className="flex flex-wrap gap-2" aria-label="Territorios en la comparación">
        {territorios.map((t) => (
          <li key={t.codigo} className="flex items-center gap-2 rounded-full border border-borde py-1 pl-3 pr-1 text-sm">
            <Link href={`/territorio/${t.slug}`} className="underline-offset-4 hover:underline">
              {t.nombre}
            </Link>
            <Link
              href={enlace(codigos.filter((c) => c !== t.codigo))}
              aria-label={`Quitar ${t.nombre}`}
              className="rounded-full px-2 text-suave hover:bg-acento-suave hover:text-texto"
            >
              ×
            </Link>
          </li>
        ))}
      </ul>
      {territorios.length < MAXIMO && (
        <div className="mt-4 max-w-md">
          <AnadirAComparacion actuales={codigos} />
        </div>
      )}

      {datos.length === 0 ? (
        <p className="mt-8 text-suave">Busca un municipio para empezar.</p>
      ) : (
        <>
          <div className="mt-8 overflow-x-auto" role="region" aria-label="Tabla de comparación" tabIndex={0}>
            <table className="cifras w-full border-collapse text-sm">
              <caption className="sr-only">Comparación de los territorios elegidos</caption>
              <thead>
                <tr className="border-b border-borde text-left">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Territorio
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    Alquiler desde 2015
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    Alquiler, último año
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    Viviendas turísticas
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    Sobre el total
                  </th>
                  <th scope="col" className="py-2 text-right font-medium">
                    En un año
                  </th>
                </tr>
              </thead>
              <tbody>
                {datos.map(({ territorio, alquiler, turisticas }) => {
                  const a = ultimoAnio(alquiler);
                  const v = ultimoPeriodo(turisticas);
                  return (
                    <tr key={territorio.codigo} className="border-b border-borde">
                      <th scope="row" className="py-2 pr-4 text-left font-medium">
                        {territorio.nombre}
                      </th>
                      <td className="py-2 pr-4 text-right">{a ? cambio(subidaEntre(alquiler, 2015, a.anio)) : "sin dato"}</td>
                      <td className="py-2 pr-4 text-right">{a ? cambio(a.variacion_anual) : "sin dato"}</td>
                      <td className="py-2 pr-4 text-right">{entero(v?.viviendas)}</td>
                      <td className="py-2 pr-4 text-right">{porcentaje(v?.porcentaje)}</td>
                      <td className="py-2 text-right">
                        {v ? cambio(variacion(v.viviendas, periodoAnterior(turisticas, v.periodo)?.viviendas)) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {anios.length > 0 && (
            <GraficaDeLineas
              titulo="Índice del alquiler"
              descripcion="Índice de precios de vivienda en alquiler del INE, base 2015 = 100, de los territorios elegidos."
              etiquetas={anios.map(String)}
              series={datos
                .filter((d) => d.alquiler.length > 0)
                .map((d, i) => ({
                  nombre: d.territorio.nombre,
                  valores: anios.map((anio) => d.alquiler.find((p) => p.anio === anio)?.indice ?? null),
                  destacada: i === 0,
                }))}
              formato={(v) => entero(v)}
              referencia={{ valor: 100, texto: "2015 = 100" }}
            />
          )}
          {codigos.length >= 2 &&
            (usuario ? (
              <GuardarComparacion territorios={codigos} />
            ) : (
              <p className="mt-4 text-sm text-suave">
                <Link className="text-acento underline underline-offset-4" href={`/cuenta?volver=${encodeURIComponent(enlace(codigos))}`}>
                  Inicia sesión
                </Link>{" "}
                para guardar esta comparación.
              </p>
            ))}
        </>
      )}
    </div>
  );
}
