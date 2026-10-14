/**
 * Hace las capturas del README contra la web en marcha (`npm run dev` o `npm start`) con los datos completos del INE.
 *
 *   node scripts/capturas.ts [http://localhost:3000]
 */
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3000";
const navegador = await chromium.launch();

const capturas = [
  { nombre: "inicio", ruta: "/", ancho: 1280, alto: 860 },
  { nombre: "ficha", ruta: "/territorio/malaga-29067", ancho: 1280, alto: 1400 },
  { nombre: "mapa", ruta: "/mapa/alquiler", ancho: 1280, alto: 1150 },
  { nombre: "comparar", ruta: "/comparar?t=m29067,m07040,m46250,m28079", ancho: 1280, alto: 900 },
  { nombre: "ficha-movil-oscuro", ruta: "/territorio/malaga-29067", ancho: 390, alto: 1500, oscuro: true },
];

for (const c of capturas) {
  const pagina = await navegador.newPage({
    viewport: { width: c.ancho, height: c.alto },
    deviceScaleFactor: c.ancho < 500 ? 2 : 1,
    colorScheme: c.oscuro ? "dark" : "light",
    locale: "es-ES",
  });
  await pagina.goto(base + c.ruta, { waitUntil: "networkidle" });
  await pagina.screenshot({ path: `docs/capturas/${c.nombre}.png` });
  await pagina.close();
  console.log(`docs/capturas/${c.nombre}.png`);
}
await navegador.close();
