import Link from "next/link";
import { cambiarSeguimiento } from "@/app/acciones";
import { clienteConSesion } from "@/lib/supabase/servidor";

/**
 * Seguir o dejar de seguir un municipio. Lee la sesión (cookies), así que va dentro de un `<Suspense>`: la ficha sale de
 * la caché y el botón llega después. Funciona sin JavaScript (es un formulario).
 */
export async function BotonSeguir({ territorio, nombre, ruta }: { territorio: string; nombre: string; ruta: string }) {
  const supabase = await clienteConSesion();
  const { data } = await supabase.auth.getUser();
  const clases = "rounded-md px-3 py-2 text-sm";
  if (!data.user) {
    return (
      <Link href={`/cuenta?volver=${encodeURIComponent(ruta)}`} className={`${clases} bg-acento text-superficie hover:opacity-90`}>
        Seguir
      </Link>
    );
  }
  const { count } = await supabase
    .from("seguimiento")
    .select("territorio", { count: "exact", head: true })
    .eq("territorio", territorio);
  const sigue = (count ?? 0) > 0;
  return (
    <form action={cambiarSeguimiento}>
      <input type="hidden" name="territorio" value={territorio} />
      <input type="hidden" name="seguir" value={sigue ? "no" : "si"} />
      <input type="hidden" name="volver" value={ruta} />
      <button
        type="submit"
        aria-pressed={sigue}
        aria-label={sigue ? `Dejar de seguir ${nombre}` : `Seguir ${nombre}`}
        className={`${clases} ${sigue ? "border border-acento text-acento" : "bg-acento text-superficie"} hover:opacity-90`}
      >
        {sigue ? "Siguiendo" : "Seguir"}
      </button>
    </form>
  );
}
