import { expect, type Page, test } from "@playwright/test";

/**
 * La cuenta de punta a punta: pedir el enlace mágico, leerlo del buzón de pruebas de Supabase local (Mailpit), entrar,
 * seguir un municipio, guardar una comparación y salir. Cada ejecución usa un correo nuevo.
 */
const MAILPIT = "http://127.0.0.1:54324";

async function enlaceMagico(correo: string): Promise<string> {
  for (let intento = 0; intento < 20; intento++) {
    const lista = await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${correo}`)}`)).json();
    const id = lista.messages?.[0]?.ID;
    if (id) {
      const mensaje = await (await fetch(`${MAILPIT}/api/v1/message/${id}`)).json();
      const enlace = String(mensaje.Text ?? mensaje.HTML).match(/https?:\/\/[^\s"<>]+verify[^\s"<>]+/)?.[0];
      if (enlace) return enlace.replaceAll("&amp;", "&");
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No ha llegado el enlace para ${correo}`);
}

async function entrar(page: Page, volver = "/cuenta") {
  const correo = `prueba-${Date.now()}-${Math.round(Math.random() * 1e6)}@demo.example`;
  await page.goto(`/cuenta?volver=${encodeURIComponent(volver)}`);
  await page.getByLabel("Correo electrónico").fill(correo);
  await page.getByRole("button", { name: "Mandarme el enlace" }).click();
  await expect(page.getByText(`Te hemos mandado un enlace a ${correo}`)).toBeVisible();
  await page.goto(await enlaceMagico(correo));
  return correo;
}

test("sin sesión, la cuenta ofrece entrar y seguir lleva a entrar", async ({ page }) => {
  await page.goto("/territorio/murcia-30030");
  await page.getByRole("link", { name: "Seguir" }).click();
  await expect(page).toHaveURL(/\/cuenta\?volver=%2Fterritorio%2Fmurcia-30030/);
  await expect(page.getByLabel("Correo electrónico")).toBeVisible();
});

test("un correo mal escrito se avisa sin mandar nada", async ({ page }) => {
  await page.goto("/cuenta");
  await page.getByLabel("Correo electrónico").fill("no-es-un-correo@");
  // El navegador valida type=email; se quita para probar la validación del servidor.
  await page.getByLabel("Correo electrónico").evaluate((e) => e.setAttribute("type", "text"));
  await page.getByRole("button", { name: "Mandarme el enlace" }).click();
  await expect(page.getByText("Escribe un correo válido")).toBeVisible();
});

test("entrar con el enlace mágico, seguir un municipio, guardar una comparación y salir", async ({ page }) => {
  const correo = await entrar(page, "/territorio/murcia-30030");
  await expect(page).toHaveURL(/\/territorio\/murcia-30030$/);

  await page.getByRole("button", { name: "Seguir Murcia" }).click();
  await expect(page.getByRole("button", { name: "Dejar de seguir Murcia" })).toBeVisible();

  await page.goto("/comparar?t=m30030,m15030");
  await page.getByLabel("Guardar como").fill("Murcia y A Coruña");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Comparación guardada")).toBeVisible();

  await page.goto("/cuenta");
  await expect(page.getByText(`Has entrado como ${correo}`)).toBeVisible();
  await expect(page.getByRole("region", { name: "Municipios que sigues" }).getByRole("link", { name: "Murcia" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Murcia y A Coruña" })).toHaveAttribute("href", "/comparar?t=m30030,m15030");

  await page.getByRole("button", { name: "Borrar Murcia y A Coruña" }).click();
  await expect(page.getByRole("link", { name: "Murcia y A Coruña" })).toHaveCount(0);

  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL("/");
  await page.goto("/cuenta");
  await expect(page.getByLabel("Correo electrónico")).toBeVisible();
});

test("otro usuario no ve lo que sigue el primero", async ({ page, browser }) => {
  await entrar(page, "/territorio/murcia-30030");
  await page.getByRole("button", { name: "Seguir Murcia" }).click();
  await expect(page.getByRole("button", { name: "Dejar de seguir Murcia" })).toBeVisible();

  const otro = await (await browser.newContext()).newPage();
  await entrar(otro);
  await expect(otro.getByText("Todavía ninguno")).toBeVisible();
});

test("un enlace de vuelta a otra web no se sigue", async ({ page }) => {
  await page.goto("/auth/confirmar?code=falso&volver=//otra-web.example");
  await expect(page).toHaveURL(/\/cuenta\?error=enlace/);
});
