import Link from "next/link";
import { Buscador } from "@/componentes/Buscador";
import { subidaEntre, ultimoAnio, ultimoPeriodo } from "@/lib/calculos";
import { rankingDeAlquiler, rankingTuristico, serieDeAlquiler, serieTuristica } from "@/lib/datos";
import { cambio, entero, periodo, porcentaje } from "@/lib/formato";

export default async function Inicio() {
  const [alquiler, turisticas, rankingA, rankingT] = await Promise.all([
    serieDeAlquiler("es"),
    serieTuristica("es"),
    rankingDeAlquiler(),
    rankingTuristico(),
  ]);
  const ultimoA = ultimoAnio(alquiler);
  const ultimoT = ultimoPeriodo(turisticas);

  return (
    <>
      <section className="max-w-2xl">
        <h1 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
          Cuánto ha subido el alquiler en tu municipio
        </h1>
        <p className="mt-4 text-lg text-suave">
          Y cuántas viviendas turísticas tiene. Con los datos oficiales del INE, municipio a municipio.
        </p>
        <div className="mt-6">
          <Buscador />
        </div>
      </section>

      <section aria-labelledby="espana" className="mt-14 grid gap-8 border-t border-borde pt-8 sm:grid-cols-2">
        <h2 id="espana" className="sr-only">
          España
        </h2>
        <div>
          <p className="cifras font-serif text-5xl font-semibold text-acento">
            {ultimoA ? cambio(subidaEntre(alquiler, 2015, ultimoA.anio)) : "—"}
          </p>
          <p className="mt-1 text-suave">
            ha subido el alquiler en España desde 2015{ultimoA && ` hasta ${ultimoA.anio}`}.
          </p>
          <p className="mt-3 text-sm">
            Donde más,{" "}
            {rankingA.slice(0, 3).map((m, i) => (
              <span key={m.codigo}>
                {i > 0 && (i === 2 ? " y " : ", ")}
                <Link className="text-acento underline underline-offset-4" href={`/territorio/${m.slug}`}>
                  {m.nombre}
                </Link>{" "}
                <span className="cifras">({cambio(m.valor)})</span>
              </span>
            ))}
            .{" "}
            <Link href="/ranking/alquiler" className="underline underline-offset-4">
              Ver el ranking
            </Link>
          </p>
        </div>
        <div>
          <p className="cifras font-serif text-5xl font-semibold text-acento">{entero(ultimoT?.viviendas)}</p>
          <p className="mt-1 text-suave">
            viviendas turísticas en {ultimoT ? periodo(ultimoT.periodo) : "—"}, el {porcentaje(ultimoT?.porcentaje)} de
            todas las viviendas.
          </p>
          <p className="mt-3 text-sm">
            Donde más pesan,{" "}
            {rankingT.slice(0, 3).map((m, i) => (
              <span key={m.codigo}>
                {i > 0 && (i === 2 ? " y " : ", ")}
                <Link className="text-acento underline underline-offset-4" href={`/territorio/${m.slug}`}>
                  {m.nombre}
                </Link>{" "}
                <span className="cifras">({porcentaje(m.valor)})</span>
              </span>
            ))}
            .{" "}
            <Link href="/mapa/turisticas" prefetch={false} className="underline underline-offset-4">
              Ver el mapa
            </Link>
          </p>
        </div>
      </section>

      <section aria-labelledby="que-es" className="mt-14 max-w-2xl border-t border-borde pt-8 text-suave">
        <h2 id="que-es" className="font-serif text-xl font-semibold text-texto">
          De dónde salen los datos
        </h2>
        <p className="mt-3">
          El alquiler, del índice de precios de vivienda en alquiler del INE: mide cuánto ha cambiado, no cuánto cuesta, y
          solo existe para los municipios de más de 10.000 habitantes. Las viviendas turísticas, de la medición experimental
          del INE con los anuncios de las grandes plataformas.
        </p>
      </section>
    </>
  );
}
