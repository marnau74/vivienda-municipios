"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

type Resultado = { codigo: string; nombre: string; provincia: string; slug: string };

type Props = {
  etiqueta?: string;
  /** Qué hacer al elegir un municipio; por defecto, ir a su ficha. */
  alElegir?: (resultado: Resultado) => void;
};

/**
 * Buscador de municipios con la pauta de «combobox» de WAI-ARIA: se escribe, salen sugerencias, se eligen con las
 * flechas y Enter o con el ratón. Espera a que se deje de escribir y cancela la petición anterior.
 */
export function Buscador({ etiqueta = "Busca un municipio", alElegir }: Props) {
  const router = useRouter();
  const id = useId();
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [activo, setActivo] = useState(-1);
  const [abierto, setAbierto] = useState(false);
  const [estado, setEstado] = useState<"" | "buscando" | "sin resultados" | "error">("");
  const cancelar = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = texto.trim();
    if (q.length < 2) return;
    const espera = setTimeout(async () => {
      cancelar.current?.abort();
      const controlador = new AbortController();
      cancelar.current = controlador;
      setEstado("buscando");
      try {
        const respuesta = await fetch(`/api/buscar?q=${encodeURIComponent(q)}`, { signal: controlador.signal });
        if (!respuesta.ok) throw new Error(String(respuesta.status));
        const datos = (await respuesta.json()) as Resultado[];
        setResultados(datos);
        setActivo(datos.length ? 0 : -1);
        setAbierto(true);
        setEstado(datos.length ? "" : "sin resultados");
      } catch (error) {
        if ((error as Error).name !== "AbortError") setEstado("error");
      }
    }, 250);
    return () => clearTimeout(espera);
  }, [texto]);

  function elegir(r: Resultado) {
    setAbierto(false);
    setTexto(alElegir ? "" : r.nombre);
    if (alElegir) alElegir(r);
    else router.push(`/territorio/${r.slug}`);
  }

  function teclas(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAbierto(true);
      setActivo((a) => Math.min(a + 1, resultados.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActivo((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && abierto && resultados[activo]) {
      e.preventDefault();
      elegir(resultados[activo]);
    } else if (e.key === "Escape") {
      setAbierto(false);
    }
  }

  // Con menos de dos letras no se busca: lo que hubiera de antes no se enseña.
  const corto = texto.trim().length < 2;
  const visibles = corto ? [] : resultados;
  const aviso = corto ? "" : estado;
  const lista = `${id}-lista`;
  return (
    <div className="relative">
      <label htmlFor={`${id}-campo`} className="block text-sm font-medium">
        {etiqueta}
      </label>
      <input
        id={`${id}-campo`}
        type="search"
        role="combobox"
        autoComplete="off"
        aria-expanded={abierto && visibles.length > 0}
        aria-controls={lista}
        aria-autocomplete="list"
        aria-activedescendant={abierto && activo >= 0 ? `${id}-opcion-${activo}` : undefined}
        value={texto}
        placeholder="Por ejemplo, Albacete o Calvià"
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={teclas}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        onFocus={() => resultados.length && setAbierto(true)}
        className="mt-1 w-full rounded-md border border-borde bg-superficie px-3 py-2.5 text-base outline-none focus:border-acento"
      />
      <p aria-live="polite" className="sr-only">
        {aviso === "sin resultados"
          ? "Ningún municipio coincide"
          : aviso === "error"
            ? "No se ha podido buscar"
            : abierto && visibles.length
              ? `${visibles.length} resultados`
              : ""}
      </p>
      {aviso === "sin resultados" && <p className="mt-2 text-sm text-suave">Ningún municipio coincide.</p>}
      {aviso === "error" && <p className="mt-2 text-sm text-sube">No se ha podido buscar. Inténtalo de nuevo.</p>}
      {abierto && visibles.length > 0 && (
        <ul
          id={lista}
          role="listbox"
          aria-label="Municipios"
          className="absolute z-10 mt-1 max-h-80 w-full overflow-auto rounded-md border border-borde bg-superficie py-1 shadow-lg"
        >
          {visibles.map((r, i) => (
            <li
              key={r.codigo}
              id={`${id}-opcion-${i}`}
              role="option"
              aria-selected={i === activo}
              onMouseDown={(e) => {
                e.preventDefault();
                elegir(r);
              }}
              onMouseEnter={() => setActivo(i)}
              className={`cursor-pointer px-3 py-2 ${i === activo ? "bg-acento-suave" : ""}`}
            >
              {r.nombre} <span className="text-sm text-suave">· {r.provincia}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
