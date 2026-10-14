"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type MouseEvent } from "react";

type Estado = { svg: string } | { error: true } | null;

/**
 * Trae el SVG del mapa después de pintar la página y lo inserta tal cual (lo genera el servidor con los textos
 * escapados). Así la página sale al momento y el mapa, que pesa, no viaja dos veces dentro de ella.
 */
export function MapaInteractivo({ src, ancho, alto, ranking }: { src: string; ancho: number; alto: number; ranking: string }) {
  const [estado, setEstado] = useState<Estado>(null);
  const router = useRouter();

  useEffect(() => {
    const control = new AbortController();
    fetch(src, { signal: control.signal })
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((svg) => setEstado({ svg }))
      .catch((e: unknown) => {
        if (!control.signal.aborted) setEstado({ error: true });
        return e;
      });
    return () => control.abort();
  }, [src]);

  // Los enlaces del SVG navegan sin recargar la página, como los de Next.
  function alPulsar(evento: MouseEvent<HTMLDivElement>) {
    const enlace = (evento.target as Element).closest("a");
    const destino = enlace?.getAttribute("href");
    if (!destino?.startsWith("/") || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.button !== 0) return;
    evento.preventDefault();
    router.push(destino);
  }

  if (estado && "error" in estado) {
    return (
      <p className="rounded border border-borde p-6 text-suave">
        No se ha podido cargar el mapa. Los mismos datos están en el{" "}
        <Link href={ranking} className="underline underline-offset-4">
          ranking
        </Link>
        .
      </p>
    );
  }
  if (!estado) {
    return (
      <div
        aria-busy="true"
        aria-label="Cargando el mapa"
        className="w-full animate-pulse rounded bg-borde/60"
        style={{ aspectRatio: `${ancho} / ${alto}` }}
      />
    );
  }
  return <div onClick={alPulsar} dangerouslySetInnerHTML={{ __html: estado.svg }} />;
}
