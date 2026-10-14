import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BotonSeguir } from "@/componentes/BotonSeguir";
import { GraficaDeLineas } from "@/componentes/GraficaDeLineas";
import { periodoAnterior, subidaEntre, ultimoAnio, ultimoPeriodo, variacion } from "@/lib/calculos";
import { linaje, rankingDeAlquiler, serieDeAlquiler, serieTuristica, territorioPorSlug, type Territorio } from "@/lib/datos";
import { cambio, entero, periodo, periodoCorto, porcentaje } from "@/lib/formato";

/** Se generan al construir las fichas de los municipios con índice de alquiler; el resto, la primera vez que se piden. */
export async function generateStaticParams() {
  const ranking = await rankingDeAlquiler();
  return ranking.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: PageProps<"/territorio/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const territorio = await territorioPorSlug(slug);
  if (!territorio) return {};
  return {
    title: territorio.nombre,
    description: `Evolución del alquiler y viviendas turísticas en ${territorio.nombre}, con datos del INE.`,
  };
}

const NIVEL: Record<Territorio["nivel"], string> = {
  pais: "País",
  comunidad: "Comunidad autónoma",
  provincia: "Provincia",
  municipio: "Municipio",
};

export default function Ficha({ params }: PageProps<"/territorio/[slug]">) {
  return (
    <Suspense fallback={<Esqueleto />}>
      <Contenido parametros={params} />
    </Suspense>
  );
}

function Esqueleto() {
  return (
    <div aria-busy="true" aria-label="Cargando la ficha" className="max-w-3xl animate-pulse">
      <div className="h-4 w-48 rounded bg-borde" />
      <div className="mt-4 h-10 w-72 rounded bg-borde" />
      <div className="mt-12 h-16 w-40 rounded bg-borde" />
      <div className="mt-6 h-64 rounded bg-borde/60" />
    </div>
  );
}

async function Contenido({ parametros }: { parametros: PageProps<"/territorio/[slug]">["params"] }) {
  const { slug } = await parametros;
  const territorio = await territorioPorSlug(slug);
  if (!territorio) notFound();

  const cadena = await linaje(territorio);
  const provincia = cadena.find((t) => t.nivel === "provincia" && t.codigo !== territorio.codigo);
  const espana = cadena.at(-1)!;
  const contexto = [provincia, espana.codigo === territorio.codigo ? undefined : espana].filter((t) => t !== undefined);

  const [alquiler, turisticas, alquilerContexto, turisticasContexto] = await Promise.all([
    serieDeAlquiler(territorio.codigo),
    serieTuristica(territorio.codigo),
    Promise.all(contexto.map((t) => serieDeAlquiler(t.codigo))),
    Promise.all(contexto.map((t) => serieTuristica(t.codigo))),
  ]);

  return (
    <article className="max-w-3xl">
      <nav aria-label="Dónde está" className="text-sm text-suave">
        <ol className="flex flex-wrap gap-x-2">
          {[...cadena]
            .reverse()
            .slice(0, -1)
            // En las comunidades de una sola provincia, la provincia se llama igual: no se repite.
            .filter((t, i, lista) => i === 0 || t.nombre !== lista[i - 1]!.nombre)
            .map((t) => (
              <li key={t.codigo} className="after:ml-2 after:content-['›']">
                <Link href={`/territorio/${t.slug}`} className="underline-offset-4 hover:underline">
                  {t.nombre}
                </Link>
              </li>
            ))}
        </ol>
      </nav>
      <header className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl font-semibold tracking-tight">{territorio.nombre}</h1>
          <p className="mt-1 text-suave">{NIVEL[territorio.nivel]}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/comparar?t=${territorio.codigo}`}
            className="rounded-md border border-borde px-3 py-2 text-sm hover:bg-acento-suave"
          >
            Comparar
          </Link>
          {territorio.nivel === "municipio" && (
            <Suspense fallback={null}>
              <BotonSeguir territorio={territorio.codigo} nombre={territorio.nombre} ruta={`/territorio/${territorio.slug}`} />
            </Suspense>
          )}
        </div>
      </header>

      <SeccionAlquiler territorio={territorio} serie={alquiler} contexto={contexto} seriesContexto={alquilerContexto} />
      <SeccionTuristicas territorio={territorio} serie={turisticas} contexto={contexto} seriesContexto={turisticasContexto} />
    </article>
  );
}

function SeccionAlquiler({
  territorio,
  serie,
  contexto,
  seriesContexto,
}: {
  territorio: Territorio;
  serie: Awaited<ReturnType<typeof serieDeAlquiler>>;
  contexto: Territorio[];
  seriesContexto: Awaited<ReturnType<typeof serieDeAlquiler>>[];
}) {
  const ultimo = ultimoAnio(serie);
  return (
    <section aria-labelledby="alquiler" className="mt-10 border-t border-borde pt-6">
      <h2 id="alquiler" className="font-serif text-2xl font-semibold">
        Alquiler
      </h2>
      {!ultimo ? (
        <p className="mt-3 text-suave">
          El INE solo publica el índice de precios del alquiler para los municipios de más de 10.000 habitantes.
          {territorio.nivel === "municipio" && contexto[0] && (
            <>
              {" "}
              Puedes ver el de{" "}
              <Link className="text-acento underline underline-offset-4" href={`/territorio/${contexto[0].slug}`}>
                su provincia
              </Link>
              .
            </>
          )}
        </p>
      ) : (
        <>
          <p className="mt-4">
            <span className="cifras block font-serif text-5xl font-semibold text-acento">
              {cambio(subidaEntre(serie, 2015, ultimo.anio))}
            </span>
            <span className="text-suave">desde 2015 hasta {ultimo.anio}</span>
          </p>
          <p className="mt-3">
            {contexto.map((t, i) => {
              const s = seriesContexto[i]!;
              return (
                <span key={t.codigo}>
                  {i > 0 && "; "}
                  {t.nivel === "pais" ? "España" : `la provincia de ${t.nombre}`},{" "}
                  <strong className="cifras font-semibold">{cambio(subidaEntre(s, 2015, ultimo.anio))}</strong>
                </span>
              );
            })}
            {contexto.length > 0 && ". "}
            En {ultimo.anio}, <strong className="cifras font-semibold">{cambio(ultimo.variacion_anual)}</strong> sobre el año
            anterior.
          </p>
          <GraficaDeLineas
            titulo={`Índice del alquiler en ${territorio.nombre}`}
            descripcion={`Índice de precios de vivienda en alquiler del INE, base 2015 = 100, de ${serie[0]!.anio} a ${ultimo.anio}.`}
            etiquetas={serie.map((p) => String(p.anio))}
            series={[
              { nombre: territorio.nombre, valores: serie.map((p) => p.indice), destacada: true },
              ...contexto.map((t, i) => ({
                nombre: nombreEnGrafica(t, territorio),
                valores: serie.map((p) => seriesContexto[i]!.find((q) => q.anio === p.anio)?.indice ?? null),
              })),
            ]}
            formato={(v) => entero(v)}
            referencia={{ valor: 100, texto: "2015 = 100" }}
          />
          <p className="text-sm text-suave">
            Es un índice: mide cuánto ha cambiado el alquiler, no cuánto cuesta. Un 120 aquí y un 120 en otro municipio
            quieren decir que los dos han subido un 20 % desde 2015, no que el alquiler sea igual de caro. Sale de los
            contratos declarados a Hacienda, por eso el último año es {ultimo.anio}.
          </p>
        </>
      )}
    </section>
  );
}

function SeccionTuristicas({
  territorio,
  serie,
  contexto,
  seriesContexto,
}: {
  territorio: Territorio;
  serie: Awaited<ReturnType<typeof serieTuristica>>;
  contexto: Territorio[];
  seriesContexto: Awaited<ReturnType<typeof serieTuristica>>[];
}) {
  const ultimo = ultimoPeriodo(serie);
  if (!ultimo) {
    return (
      <section aria-labelledby="turisticas" className="mt-10 border-t border-borde pt-6">
        <h2 id="turisticas" className="font-serif text-2xl font-semibold">
          Viviendas turísticas
        </h2>
        <p className="mt-3 text-suave">El INE no publica viviendas turísticas para {territorio.nombre}.</p>
      </section>
    );
  }
  const anterior = periodoAnterior(serie, ultimo.periodo);
  const variacionAnual = variacion(ultimo.viviendas, anterior?.viviendas);
  return (
    <section aria-labelledby="turisticas" className="mt-10 border-t border-borde pt-6">
      <h2 id="turisticas" className="font-serif text-2xl font-semibold">
        Viviendas turísticas
      </h2>
      <p className="mt-4">
        <span className="cifras block font-serif text-5xl font-semibold text-acento">{entero(ultimo.viviendas)}</span>
        <span className="text-suave">viviendas turísticas en {periodo(ultimo.periodo)}</span>
      </p>
      <dl className="cifras mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-sm text-suave">Sobre el total de viviendas</dt>
          <dd className="text-xl font-semibold">{porcentaje(ultimo.porcentaje)}</dd>
        </div>
        <div>
          <dt className="text-sm text-suave">Plazas</dt>
          <dd className="text-xl font-semibold">{entero(ultimo.plazas)}</dd>
        </div>
        <div>
          <dt className="text-sm text-suave">En un año</dt>
          <dd className="text-xl font-semibold">{variacionAnual === null ? "—" : cambio(variacionAnual)}</dd>
        </div>
      </dl>
      <GraficaDeLineas
        titulo={`Viviendas turísticas sobre el total en ${territorio.nombre}`}
        descripcion={`Porcentaje de viviendas turísticas sobre el total de viviendas, por semestre, de ${periodo(serie[0]!.periodo)} a ${periodo(ultimo.periodo)}.`}
        etiquetas={serie.map((p) => periodoCorto(p.periodo))}
        series={[
          { nombre: territorio.nombre, valores: serie.map((p) => p.porcentaje), destacada: true },
          ...contexto.map((t, i) => ({
            nombre: nombreEnGrafica(t, territorio),
            valores: serie.map((p) => seriesContexto[i]!.find((q) => q.periodo === p.periodo)?.porcentaje ?? null),
          })),
        ]}
        formato={(v) => porcentaje(v)}
      />
      <p className="text-sm text-suave">
        Medición experimental del INE a partir de los anuncios de las grandes plataformas de alquiler turístico. No incluye
        las viviendas anunciadas en otros canales.
      </p>
    </section>
  );
}

/** En la gráfica, la provincia que se llama igual que su capital se distingue de ella (Málaga y «Prov. de Málaga»). */
function nombreEnGrafica(t: Territorio, principal: Territorio) {
  return t.nivel === "provincia" && t.nombre === principal.nombre ? `Prov. de ${t.nombre}` : t.nombre;
}
