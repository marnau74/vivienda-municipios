import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Refresca la sesión de Supabase antes de cada página: si el token ha caducado, pide uno nuevo y lo escribe en las
 * cookies de la respuesta (los componentes de servidor no pueden). No decide permisos: eso lo hacen RLS y cada página.
 */
export async function proxy(request: NextRequest) {
  let respuesta = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (lista) => {
          for (const { name, value } of lista) request.cookies.set(name, value);
          respuesta = NextResponse.next({ request });
          for (const { name, value, options } of lista) respuesta.cookies.set(name, value, options);
        },
      },
    },
  );
  await supabase.auth.getUser();
  return respuesta;
}

export const config = {
  // Todo menos los ficheros estáticos. Las partes públicas de las páginas siguen saliendo de la caché: el proxy solo
  // toca las cookies de sesión.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico|webmanifest)$).*)"],
};
