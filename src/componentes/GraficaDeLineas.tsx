/**
 * Gráfica de líneas en SVG, dibujada en el servidor (sin JavaScript en el navegador). Cada serie lleva su nombre al
 * final de la línea, en vez de una leyenda aparte; un dato que falta corta la línea en lugar de inventar el tramo. La
 * misma información va en una tabla, desplegable y legible por lectores de pantalla.
 */

export type Serie = { nombre: string; valores: (number | null)[]; destacada?: boolean };

type Props = {
  titulo: string;
  descripcion: string;
  etiquetas: string[];
  series: Serie[];
  formato: (valor: number) => string;
  /** Una línea de referencia (por ejemplo, la base 100 del índice). */
  referencia?: { valor: number; texto: string };
};

const ANCHO = 640;
const ALTO = 300;
const MARGEN = { arriba: 16, derecha: 132, abajo: 28, izquierda: 44 };

export function escalaBonita(min: number, max: number, marcas = 4): number[] {
  if (min === max) return [min];
  const paso0 = (max - min) / marcas;
  const magnitud = 10 ** Math.floor(Math.log10(paso0));
  const paso = [1, 2, 2.5, 5, 10].map((f) => f * magnitud).find((p) => p >= paso0) ?? paso0;
  const inicio = Math.floor(min / paso) * paso;
  const resultado: number[] = [];
  for (let v = inicio; v <= max + paso * 0.001; v += paso) resultado.push(Number(v.toFixed(10)));
  if (resultado.at(-1)! < max) resultado.push(Number((resultado.at(-1)! + paso).toFixed(10)));
  return resultado;
}

/** Los tramos de la línea: un dato que falta parte la serie en dos. */
export function tramos(valores: (number | null)[]): { i: number; v: number }[][] {
  const resultado: { i: number; v: number }[][] = [];
  let actual: { i: number; v: number }[] = [];
  valores.forEach((v, i) => {
    if (v === null) {
      if (actual.length) resultado.push(actual);
      actual = [];
    } else {
      actual.push({ i, v });
    }
  });
  if (actual.length) resultado.push(actual);
  return resultado;
}

export function GraficaDeLineas({ titulo, descripcion, etiquetas, series, formato, referencia }: Props) {
  const todos = series.flatMap((s) => s.valores.filter((v): v is number => v !== null));
  if (referencia) todos.push(referencia.valor);
  if (todos.length === 0) return <p className="text-suave">Sin datos para dibujar la gráfica.</p>;

  const marcas = escalaBonita(Math.min(...todos), Math.max(...todos));
  const yMin = marcas[0]!;
  const yMax = marcas.at(-1)!;
  const anchoUtil = ANCHO - MARGEN.izquierda - MARGEN.derecha;
  const altoUtil = ALTO - MARGEN.arriba - MARGEN.abajo;
  const x = (i: number) => MARGEN.izquierda + (etiquetas.length === 1 ? anchoUtil / 2 : (i / (etiquetas.length - 1)) * anchoUtil);
  const y = (v: number) => MARGEN.arriba + (1 - (v - yMin) / (yMax - yMin || 1)) * altoUtil;
  const cadaCuanto = Math.ceil(etiquetas.length / 8);

  // Etiquetas al final de cada línea, separadas para que no se monten.
  const finales = series
    .map((s) => {
      const ultimo = [...s.valores].reverse().find((v) => v !== null);
      return ultimo == null ? null : { serie: s, y: y(ultimo), valor: ultimo };
    })
    .filter((f) => f !== null)
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < finales.length; i++) {
    if (finales[i]!.y - finales[i - 1]!.y < 16) finales[i]!.y = finales[i - 1]!.y + 16;
  }

  const id = titulo.replace(/\W+/g, "-").toLowerCase();
  return (
    <figure className="my-6">
      <svg
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        role="img"
        aria-labelledby={`${id}-titulo ${id}-desc`}
        className="grafica h-auto w-full overflow-visible"
      >
        <title id={`${id}-titulo`}>{titulo}</title>
        <desc id={`${id}-desc`}>{descripcion}</desc>
        {marcas.map((m) => (
          <g key={m}>
            <line x1={MARGEN.izquierda} x2={ANCHO - MARGEN.derecha} y1={y(m)} y2={y(m)} stroke="var(--borde)" />
            <text x={MARGEN.izquierda - 8} y={y(m)} dy="0.32em" textAnchor="end" fontSize="11" fill="var(--texto-suave)" className="cifras">
              {formato(m)}
            </text>
          </g>
        ))}
        {referencia && (
          <g>
            <line
              x1={MARGEN.izquierda}
              x2={ANCHO - MARGEN.derecha}
              y1={y(referencia.valor)}
              y2={y(referencia.valor)}
              stroke="var(--texto-suave)"
              strokeDasharray="3 3"
            />
            <text
              x={ANCHO - MARGEN.derecha - 4}
              y={y(referencia.valor) - 5}
              textAnchor="end"
              fontSize="11"
              fill="var(--texto-suave)"
            >
              {referencia.texto}
            </text>
          </g>
        )}
        {etiquetas.map((e, i) =>
          // Cada «cadaCuanto» etiquetas contando desde la última, para que la última siempre salga y no se pise.
          (etiquetas.length - 1 - i) % cadaCuanto === 0 ? (
            <text
              key={e}
              x={x(i)}
              y={ALTO - 8}
              textAnchor="middle"
              fontSize="11"
              fill="var(--texto-suave)"
              // En el móvil, con la letra más grande, se queda una de cada dos (también contando desde la última).
              className={`cifras ${((etiquetas.length - 1 - i) / cadaCuanto) % 2 === 1 ? "alterna" : ""}`}
            >
              {e}
            </text>
          ) : null,
        )}
        {series.map((s, n) =>
          tramos(s.valores).map((tramo, t) => (
            <polyline
              key={`${n}-${t}`}
              points={tramo.map((p) => `${x(p.i)},${y(p.v)}`).join(" ")}
              fill="none"
              stroke={s.destacada ? "var(--acento)" : "var(--texto-suave)"}
              strokeWidth={s.destacada ? 2.5 : 1.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity={s.destacada ? 1 : 0.7}
            />
          )),
        )}
        {finales.map((f, n) => (
          <text
            key={n}
            x={ANCHO - MARGEN.derecha + 8}
            y={f.y}
            dy="0.32em"
            fontSize="12"
            fontWeight={f.serie.destacada ? 600 : 400}
            fill={f.serie.destacada ? "var(--acento)" : "var(--texto-suave)"}
          >
            {f.serie.nombre.length > 18 ? `${f.serie.nombre.slice(0, 17)}…` : f.serie.nombre}
          </text>
        ))}
      </svg>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-suave">Ver los datos de la gráfica</summary>
        <div className="mt-2 overflow-x-auto" role="region" aria-label={`Datos: ${titulo}`} tabIndex={0}>
          <table className="cifras w-full border-collapse text-right">
            <caption className="sr-only">{titulo}</caption>
            <thead>
              <tr className="border-b border-borde">
                <th scope="col" className="py-1 pr-3 text-left font-medium">
                  Periodo
                </th>
                {series.map((s, n) => (
                  <th key={n} scope="col" className="py-1 pl-3 font-medium">
                    {s.nombre}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {etiquetas.map((e, i) => (
                <tr key={e} className="border-b border-borde/60">
                  <th scope="row" className="py-1 pr-3 text-left font-normal">
                    {e}
                  </th>
                  {series.map((s, n) => (
                    <td key={n} className="py-1 pl-3">
                      {s.valores[i] == null ? "sin dato" : formato(s.valores[i]!)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
