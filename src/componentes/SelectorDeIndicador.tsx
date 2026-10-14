import Link from "next/link";
import type { Indicador } from "@/lib/datos";
import { INDICADORES } from "@/lib/indicadores";

/** Cambiar de indicador: dos enlaces, con el actual marcado (aria-current). */
export function SelectorDeIndicador({ actual, base }: { actual: Indicador; base: "/mapa" | "/ranking" }) {
  return (
    <ul className="flex gap-2 text-sm" aria-label="Indicador">
      {(Object.keys(INDICADORES) as Indicador[]).map((i) => (
        <li key={i}>
          <Link
            href={`${base}/${i}`}
            prefetch={base === "/mapa" ? false : undefined}
            aria-current={i === actual ? "page" : undefined}
            className={`block rounded-md border px-3 py-1.5 ${
              i === actual ? "border-acento bg-acento-suave text-acento" : "border-borde text-suave hover:text-texto"
            }`}
          >
            {INDICADORES[i].corto}
          </Link>
        </li>
      ))}
    </ul>
  );
}
