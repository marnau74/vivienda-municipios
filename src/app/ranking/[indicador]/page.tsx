import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SelectorDeIndicador } from "@/componentes/SelectorDeIndicador";
import { type FilaDeRanking, MINIMO_DE_VIVIENDAS_TURISTICAS, ranking } from "@/lib/datos";
import { esIndicador, INDICADORES } from "@/lib/indicadores";

export function generateStaticParams() {
  return Object.keys(INDICADORES).map((indicador) => ({ indicador }));
}

export async function generateMetadata({ params }: PageProps<"/ranking/[indicador]">): Promise<Metadata> {
  const { indicador } = await params;
  return esIndicador(indicador) ? { title: `Ranking: ${INDICADORES[indicador].nombre.toLowerCase()}` } : {};
}

const CUANTOS = 50;

export default function Ranking({ params }: PageProps<"/ranking/[indicador]">) {
  return (
    <Suspense fallback={<div aria-busy="true" aria-label="Cargando el ranking" className="h-96 animate-pulse rounded bg-borde/60" />}>
      <Contenido parametros={params} />
    </Suspense>
  );
}

async function Contenido({ parametros }: { parametros: PageProps<"/ranking/[indicador]">["params"] }) {
  const { indicador } = await parametros;
  if (!esIndicador(indicador)) notFound();
  const info = INDICADORES[indicador];
  const filas = await ranking(indicador);
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">{info.nombre}</h1>
          <p className="mt-2 max-w-2xl text-suave">{info.explicacion}</p>
        </div>
        <SelectorDeIndicador actual={indicador} base="/ranking" />
      </div>
      <div className="mt-8 grid gap-10 md:grid-cols-2">
        <Tabla titulo={`Los ${CUANTOS} con más`} filas={filas.slice(0, CUANTOS)} puesto={(i) => i + 1} formato={info.formato} />
        <Tabla
          titulo={`Los ${CUANTOS} con menos`}
          filas={filas.slice(-CUANTOS).reverse()}
          puesto={(i) => filas.length - i}
          formato={info.formato}
        />
      </div>
      <p className="mt-6 text-sm text-suave">
        {filas.length.toLocaleString("es-ES")} municipios con dato
        {indicador === "turisticas" &&
          ` y al menos ${MINIMO_DE_VIVIENDAS_TURISTICAS} viviendas turísticas (en un pueblo pequeño, unas pocas viviendas dan porcentajes muy altos que no dicen mucho; el mapa sí los enseña todos)`}
        .
      </p>
    </>
  );
}

function Tabla({
  titulo,
  filas,
  puesto,
  formato,
}: {
  titulo: string;
  filas: FilaDeRanking[];
  puesto: (i: number) => number;
  formato: (v: number) => string;
}) {
  return (
    <section aria-label={titulo}>
      <h2 className="font-serif text-xl font-semibold">{titulo}</h2>
      <table className="cifras mt-3 w-full border-collapse text-sm">
        <thead className="sr-only">
          <tr>
            <th scope="col">Puesto</th>
            <th scope="col">Municipio</th>
            <th scope="col">Valor</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={f.codigo} className="border-b border-borde">
              <td className="w-12 py-2 text-suave">{puesto(i)}</td>
              <td className="py-2">
                <Link href={`/territorio/${f.slug}`} className="underline-offset-4 hover:underline">
                  {f.nombre}
                </Link>
                <span className="text-suave"> · {f.provincia}</span>
              </td>
              <td className="py-2 text-right font-semibold">{formato(f.valor)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
