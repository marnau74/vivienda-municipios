import { defineConfig, devices } from "@playwright/test";

/**
 * Pruebas de extremo a extremo contra la web construida en modo producción y el Supabase local cargado con las
 * respuestas grabadas del INE (`INE_FICHEROS=tests/datos-ine`), para que las cifras sean siempre las mismas.
 */
const PUERTO = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PUERTO}`,
    locale: "es-ES",
    timezoneId: "Europe/Madrid",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "escritorio", use: { ...devices["Desktop Chrome"] } },
    { name: "movil", use: { ...devices["Pixel 7"] }, testMatch: /navegacion\.spec\.ts/ },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${PUERTO}`,
    url: `http://localhost:${PUERTO}`,
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
    env: { NEXT_PUBLIC_URL_DEL_SITIO: `http://localhost:${PUERTO}` },
  },
});
