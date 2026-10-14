// @vitest-environment node
import { describe, expect, it } from "vitest";
import { rutaPropia } from "@/lib/rutas";

describe("rutaPropia", () => {
  it("deja pasar las rutas de la web, con su consulta", () => {
    expect(rutaPropia("/territorio/murcia-30030")).toBe("/territorio/murcia-30030");
    expect(rutaPropia("/comparar?t=m30030,m03014")).toBe("/comparar?t=m30030,m03014");
  });

  it("no deja salir a otra web", () => {
    for (const valor of ["//otra.web", "/\\otra.web", "/\t/otra.web", "https://otra.web", "otra.web", "", null, 3]) {
      expect(rutaPropia(valor)).toBe("/cuenta");
    }
  });
});
