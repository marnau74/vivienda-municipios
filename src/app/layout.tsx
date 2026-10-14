import type { Metadata } from "next";
import { Public_Sans, Source_Serif_4 } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const texto = Public_Sans({ subsets: ["latin"], variable: "--fuente-texto", display: "swap" });
const titulos = Source_Serif_4({ subsets: ["latin"], variable: "--fuente-titulos", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_URL_DEL_SITIO ?? "http://localhost:3000"),
  title: { default: "Vivienda por municipio", template: "%s · Vivienda por municipio" },
  description:
    "Cómo ha cambiado el alquiler y cuántas viviendas turísticas hay en cada municipio de España, con los datos del INE.",
};

const enlaces = [
  { href: "/mapa/alquiler", texto: "Mapa" },
  { href: "/ranking/alquiler", texto: "Rankings" },
  { href: "/comparar", texto: "Comparar" },
  { href: "/cuenta", texto: "Mi cuenta" },
] as const;

export default function Raiz({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${texto.variable} ${titulos.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded focus:bg-superficie focus:px-3 focus:py-2"
        >
          Ir al contenido
        </a>
        <header className="border-b border-borde">
          <div className="mx-auto flex max-w-5xl flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-4 py-4">
            <Link href="/" className="font-serif text-xl font-semibold tracking-tight">
              Vivienda <span className="text-suave">por municipio</span>
            </Link>
            <nav aria-label="Principal">
              <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                {enlaces.map((e) => (
                  <li key={e.href}>
                    <Link
                      href={e.href}
                      // El mapa pesa: se descarga al pulsarlo, no en cada página que enseña el menú.
                      prefetch={e.href.startsWith("/mapa") ? false : undefined}
                      className="text-suave underline-offset-4 hover:text-texto hover:underline">
                      {e.texto}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </header>
        <main id="contenido" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-borde text-sm text-suave">
          <div className="mx-auto max-w-5xl px-4 py-6">
            Datos del{" "}
            <a className="underline underline-offset-4" href="https://www.ine.es/">
              Instituto Nacional de Estadística
            </a>
            : índice de precios de vivienda en alquiler (IPVA) y medición experimental de viviendas turísticas.
          </div>
        </footer>
      </body>
    </html>
  );
}
