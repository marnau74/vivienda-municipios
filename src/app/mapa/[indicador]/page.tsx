import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Mapa } from "@/componentes/Mapa";
import { SelectorDeIndicador } from "@/componentes/SelectorDeIndicador";
import { datosDelMapa } from "@/lib/datos";
import { esIndicador, INDICADORES } from "@/lib/indicadores";

export function generateStaticParams() {
  return Object.keys(INDICADORES).map((indicador) => ({ indicador }));
}

export async function generateMetadata({ params }: PageProps<"/mapa/[indicador]">): Promise<Metadata> {
  const { indicador } = await params;
  return esIndicador(indicador) ? { title: `Mapa: ${INDICADORES[indicador].nombre.toLowerCase()}` } : {};
}

export default function PaginaDelMapa({ params }: PageProps<"/mapa/[indicador]">) {
  return (
    <Suspense fallback={<div aria-busy="true" aria-label="Cargando el mapa" className="h-[640px] animate-pulse rounded bg-borde/60" />}>
      <Contenido parametros={params} />
    </Suspense>
  );
}

async function Contenido({ parametros }: { parametros: PageProps<"/mapa/[indicador]">["params"] }) {
  const { indicador } = await parametros;
  if (!esIndicador(indicador)) notFound();
  const info = INDICADORES[indicador];
  const { valores, slugs } = await datosDelMapa(indicador);
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">{info.nombre}</h1>
          <p className="mt-2 max-w-2xl text-suave">{info.explicacion}</p>
        </div>
        <SelectorDeIndicador actual={indicador} base="/mapa" />
      </div>
      <div className="mt-6">
        <Mapa
          titulo={info.nombre}
          descripcion={`${info.explicacion} ${Object.keys(valores).length} municipios con dato.`}
          valores={valores}
          slugs={slugs}
          formato={info.formato}
          decimales={info.decimales}
        />
      </div>
      <p className="mt-4 text-sm text-suave">
        Los colores reparten los municipios con dato en seis grupos de tamaño parecido. Pulsa un municipio para ver su
        ficha. Contornos: Instituto Geográfico Nacional (CC BY 4.0), vía{" "}
        <a href="https://github.com/martgnz/es-atlas" className="underline underline-offset-4">
          es-atlas
        </a>
        .
      </p>
    </>
  );
}
