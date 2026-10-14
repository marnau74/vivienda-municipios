/**
 * Escribe .env.local con las claves del Supabase local en marcha (`npx supabase start`), para no copiarlas a mano.
 *
 *   npm run entorno
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const salida = execSync("npx supabase status -o json", { encoding: "utf-8" });
const estado = JSON.parse(salida.slice(salida.indexOf("{"))) as Record<string, string>;
if (!estado.API_URL || !estado.PUBLISHABLE_KEY || !estado.SECRET_KEY) {
  console.error("Supabase local no está en marcha: npx supabase start");
  process.exit(1);
}

const valores: Record<string, string> = {
  NEXT_PUBLIC_SUPABASE_URL: estado.API_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: estado.PUBLISHABLE_KEY,
  SUPABASE_SECRET_KEY: estado.SECRET_KEY,
};
// Se parte de .env.ejemplo (o del .env.local que ya hubiera) y solo se cambian las claves de Supabase.
const base = readFileSync(existsSync(".env.local") ? ".env.local" : ".env.ejemplo", "utf-8");
const lineas = base.split("\n").map((linea) => {
  const nombre = linea.split("=")[0]!;
  return nombre in valores ? `${nombre}=${valores[nombre]}` : linea;
});
writeFileSync(".env.local", lineas.join("\n"));
console.log(".env.local escrito con las claves de Supabase local.");
