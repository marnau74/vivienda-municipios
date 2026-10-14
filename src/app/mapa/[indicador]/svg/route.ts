import { esIndicador, INDICADORES } from "@/lib/indicadores";
import { svgDelMapa } from "@/lib/mapa-del-indicador";

export function generateStaticParams() {
  return Object.keys(INDICADORES).map((indicador) => ({ indicador }));
}

export async function GET(_peticion: Request, { params }: RouteContext<"/mapa/[indicador]/svg">) {
  const { indicador } = await params;
  if (!esIndicador(indicador)) return new Response(null, { status: 404 });
  return new Response(await svgDelMapa(indicador), {
    headers: { "content-type": "image/svg+xml; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}
