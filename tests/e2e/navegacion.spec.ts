import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/** Lo público: buscar, la ficha, el mapa, el ranking y el comparador. Con las cifras de las respuestas grabadas. */

test("buscar un municipio y ver su ficha con las cifras correctas", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("combobox").fill("murcia");
  await expect(page.getByRole("option", { name: /^Murcia/ })).toBeVisible();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/territorio\/murcia-30030$/);
  await expect(page.getByRole("heading", { level: 1, name: "Murcia" })).toBeVisible();
  // IPVA 2024: 125,420 (base 2015 = 100). Provincia, 121,613; España, 122,920.
  await expect(page.getByText("+25,4 %").first()).toBeVisible();
  await expect(page.getByText(/la provincia de Murcia,\s*\+21,6 %/)).toBeVisible();
  await expect(page.getByText(/España,\s*\+22,9 %/)).toBeVisible();
  await expect(page.getByText("777", { exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: /Índice del alquiler en Murcia/ })).toBeVisible();
});

test("un municipio sin índice de alquiler lo explica en vez de dejar un hueco", async ({ page }) => {
  await page.goto("/territorio/yecla-30043");
  await expect(page.getByRole("heading", { level: 1, name: "Yecla" })).toBeVisible();
  // Yecla sí tiene índice en la muestra; Albacete no tiene viviendas turísticas en ella.
  await page.goto("/territorio/albacete-02003");
  await expect(page.getByText(/no publica viviendas turísticas/)).toBeVisible();
});

test("el mapa colorea los municipios con dato y enlaza a su ficha", async ({ page }) => {
  await page.goto("/mapa/alquiler");
  const mapa = page.getByRole("group", { name: "Subida del alquiler desde 2015" });
  await expect(mapa).toBeVisible();
  await expect(page.locator('a[href="/territorio/murcia-30030"]')).toHaveCount(1);
  await expect(page.getByRole("list", { name: "Leyenda" })).toContainText("sin dato");

  await page.locator('a[href="/territorio/murcia-30030"] path').click();
  await expect(page).toHaveURL(/\/territorio\/murcia-30030$/);
  await expect(page.getByRole("heading", { level: 1, name: "Murcia" })).toBeVisible();
});

test("el ranking ordena de más a menos", async ({ page }) => {
  await page.goto("/ranking/alquiler");
  const primeras = page.getByRole("region", { name: /con más/ }).getByRole("link");
  await expect(primeras.first()).toHaveText("Yecla");
  await expect(primeras.nth(1)).toHaveText("Murcia");
});

test("comparar dos municipios desde la URL y quitar uno", async ({ page }) => {
  await page.goto("/comparar?t=m30030,m02003");
  const tabla = page.getByRole("table", { name: /Comparación/ });
  await expect(tabla.getByRole("row")).toHaveCount(3);
  await page.getByRole("link", { name: "Quitar Albacete" }).click();
  await expect(page).toHaveURL(/t=m30030$/);
  await expect(tabla.getByRole("row")).toHaveCount(2);
});

test("una ficha que no existe lo dice y no se indexa", async ({ page }) => {
  // Con el prerenderizado parcial la cabecera ya ha salido con 200 cuando se sabe que no existe; Next lo compensa con
  // noindex (y las siguientes peticiones ya responden 404). Ver docs/decisiones/0003.
  await page.goto(`/territorio/no-existe-${Date.now() % 100000}`);
  await expect(page.getByRole("heading", { name: "No encontramos esa página" })).toBeVisible();
  await expect(page.locator('head meta[name="robots"]')).toHaveAttribute("content", "noindex");
});

for (const ruta of ["/", "/territorio/murcia-30030", "/mapa/turisticas", "/ranking/alquiler", "/comparar?t=m30030,m15030"]) {
  test(`sin problemas de accesibilidad: ${ruta}`, async ({ page }) => {
    await page.goto(ruta);
    await page.waitForLoadState("networkidle");
    const resultado = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(resultado.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
}
