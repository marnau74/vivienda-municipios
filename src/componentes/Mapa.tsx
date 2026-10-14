import { ALTO, ANCHO, clase, cortesPorCuantiles, geometria } from "@/lib/mapa";

const COLORES = ["var(--escala-1)", "var(--escala-2)", "var(--escala-3)", "var(--escala-4)", "var(--escala-5)", "var(--escala-6)"];

type Props = {
  titulo: string;
  descripcion: string;
  /** Valor por código INE del municipio. */
  valores: Record<string, number>;
  /** Slug de la ficha por código INE (los municipios con dato llevan a su ficha). */
  slugs: Record<string, string>;
  formato: (valor: number) => string;
  decimales?: number;
};

/**
 * Mapa de coropletas por municipio, en SVG y dibujado en el servidor. Los municipios sin dato van rayados en gris, para
 * no confundirlos con un valor bajo. Cada municipio con dato es un enlace a su ficha.
 */
export async function Mapa({ titulo, descripcion, valores, slugs, formato, decimales = 0 }: Props) {
  const { municipios, provincias, recuadro } = await geometria();
  const cortes = cortesPorCuantiles(Object.values(valores), COLORES.length, decimales);
  const tramos = [null, ...cortes].map((desde, i) => ({ desde, hasta: cortes[i] ?? null, color: COLORES[i]! }));

  return (
    <figure>
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} role="group" aria-labelledby="mapa-titulo" aria-describedby="mapa-desc" className="h-auto w-full">
        <title id="mapa-titulo">{titulo}</title>
        <desc id="mapa-desc">{descripcion}</desc>
        <defs>
          <pattern id="sin-dato" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="var(--sin-dato)" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--fondo)" strokeWidth="2" />
          </pattern>
        </defs>
        <rect
          x={recuadro.x}
          y={recuadro.y}
          width={recuadro.ancho}
          height={recuadro.alto}
          fill="none"
          stroke="var(--borde)"
        />
        <g stroke="var(--linea-mapa)" strokeWidth="0.3">
          {municipios.map((m) => {
            const valor = valores[m.codigo];
            if (valor === undefined) return <path key={m.codigo} d={m.d} fill="url(#sin-dato)" />;
            return (
              // Fuera del orden del tabulador: con el teclado son 8.000 paradas; el buscador y el ranking llevan a las mismas fichas.
              <a key={m.codigo} href={slugs[m.codigo] ? `/territorio/${slugs[m.codigo]}` : undefined} tabIndex={-1}>
                <path d={m.d} fill={COLORES[clase(valor, cortes)]}>
                  <title>{`${m.nombre}: ${formato(valor)}`}</title>
                </path>
              </a>
            );
          })}
        </g>
        <path d={provincias} fill="none" stroke="var(--texto-suave)" strokeWidth="0.6" pointerEvents="none" />
      </svg>
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
              <rect width="24" height="12" fill="url(#sin-dato)" rx="2" />
            </svg>
            <span>sin dato</span>
          </li>
        </ul>
      </figcaption>
    </figure>
  );
}
