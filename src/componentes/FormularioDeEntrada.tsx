"use client";

import { useActionState } from "react";
import { entrar } from "@/app/acciones";

/** Pedir el enlace mágico. El aviso es el mismo exista o no la cuenta (no se revela quién está registrado). */
export function FormularioDeEntrada({ volver }: { volver: string }) {
  const [estado, accion, enviando] = useActionState(entrar, undefined);
  return (
    <form action={accion} className="mt-6">
      <input type="hidden" name="volver" value={volver} />
      <label htmlFor="correo" className="block text-sm font-medium">
        Correo electrónico
      </label>
      <input
        id="correo"
        name="correo"
        type="email"
        required
        autoComplete="email"
        className="mt-1 w-full rounded-md border border-borde bg-superficie px-3 py-2.5"
      />
      <button
        type="submit"
        disabled={enviando}
        className="mt-3 rounded-md bg-acento px-4 py-2 text-superficie hover:opacity-90 disabled:opacity-60"
      >
        {enviando ? "Enviando…" : "Mandarme el enlace"}
      </button>
      <p aria-live="polite" className={`mt-3 ${estado?.error ? "text-sube" : "text-baja"}`}>
        {estado?.error ?? estado?.aviso}
      </p>
    </form>
  );
}
