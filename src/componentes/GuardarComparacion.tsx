"use client";

import { useActionState } from "react";
import { guardarComparacion } from "@/app/acciones";

/** Guardar la comparación actual con un nombre. Los errores de validación vienen del servidor (zod). */
export function GuardarComparacion({ territorios }: { territorios: string[] }) {
  const [estado, accion, enviando] = useActionState(guardarComparacion, undefined);
  return (
    <form action={accion} className="mt-6 flex max-w-md flex-wrap items-end gap-2">
      <input type="hidden" name="territorios" value={territorios.join(",")} />
      <div className="flex-1">
        <label htmlFor="nombre-comparacion" className="block text-sm font-medium">
          Guardar como
        </label>
        <input
          id="nombre-comparacion"
          name="nombre"
          required
          maxLength={80}
          placeholder="Por ejemplo, Costa de Murcia"
          className="mt-1 w-full rounded-md border border-borde bg-superficie px-3 py-2"
        />
      </div>
      <button
        type="submit"
        disabled={enviando}
        className="rounded-md bg-acento px-3 py-2 text-sm text-superficie hover:opacity-90 disabled:opacity-60"
      >
        Guardar
      </button>
      <p aria-live="polite" className={`w-full text-sm ${estado?.error ? "text-sube" : "text-baja"}`}>
        {estado?.error ?? estado?.aviso}
      </p>
    </form>
  );
}
