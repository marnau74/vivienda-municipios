"use client";

import { useRouter } from "next/navigation";
import { Buscador } from "./Buscador";

/** El buscador del comparador: al elegir un municipio lo añade a la URL en vez de abrir su ficha. */
export function AnadirAComparacion({ actuales }: { actuales: string[] }) {
  const router = useRouter();
  return (
    <Buscador
      etiqueta="Añade un municipio"
      alElegir={(r) => {
        if (!actuales.includes(r.codigo)) router.push(`/comparar?t=${[...actuales, r.codigo].join(",")}`);
      }}
    />
  );
}
