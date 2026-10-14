import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";

/**
 * La llama el script de carga al terminar para que la web enseñe los datos nuevos sin esperar a que caduque la caché.
 * Protegida con un secreto compartido (REVALIDAR_SECRETO); sin él configurado, no existe.
 */
export async function POST(peticion: Request) {
  const secreto = process.env.REVALIDAR_SECRETO;
  const recibido = peticion.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!secreto || !iguales(recibido, secreto)) return new Response(null, { status: 404 });
  revalidateTag("ine", "max");
  return Response.json({ revalidado: "ine" });
}

function iguales(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
