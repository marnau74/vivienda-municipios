import { MapaInteractivo } from "@/componentes/MapaInteractivo";
import type { Indicador } from "@/lib/datos";
import { INDICADORES } from "@/lib/indicadores";
import { resumenDelMapa } from "@/lib/mapa-del-indicador";
import { ALTO, ANCHO, COLORES, PATRON_SIN_DATO } from "@/lib/mapa";

/**
 * Mapa de coropletas por municipio. El SVG se dibuja en el servidor y se sirve aparte; aquí van su hueco y la leyenda.
 * Los municipios sin dato van rayados en gris, para no confundirlos con un valor bajo.
 */
export async function Mapa({ indicador }: { indicador: Indicador }) {
  const { formato } = INDICADORES[indicador];
  const { cortes } = await resumenDelMapa(indicador);
  const tramos = [null, ...cortes].map((desde, i) => ({ desde, hasta: cortes[i] ?? null, color: COLORES[i]! }));

  return (
    <figure>
      <MapaInteractivo src={`/mapa/${indicador}/svg`} ancho={ANCHO} alto={ALTO} ranking={`/ranking/${indicador}`} />
      <figcaption className="mt-3">
        <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm" aria-label="Leyenda">
          {tramos.map((t, i) => (
            <li key={i} className="flex items-center gap-2">
              <span aria-hidden className="inline-block h-3 w-6 rounded-sm" style={{ background: t.color }} />
              <span className="cifras">
                {t.desde === null ? `menos de ${formato(t.hasta!)}` : t.hasta === null ? `${formato(t.desde)} o más` : `${formato(t.desde)} a ${formato(t.hasta)}`}
              </span>
            </li>
          ))}
          <li className="flex items-center gap-2">
            <svg aria-hidden width="24" height="12">
              <defs dangerouslySetInnerHTML={{ __html: PATRON_SIN_DATO.replace('id="sin-dato"', 'id="sin-dato-leyenda"') }} />
              <rect width="24" height="12" fill="url(#sin-dato-leyenda)" rx="2" />
            </svg>
            <span>sin dato</span>
          </li>
        </ul>
      </figcaption>
    </figure>
  );
}
