// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  claveDe,
  COMUNIDAD_DE_PROVINCIA,
  filasDeAlquiler,
  filasTuristicas,
  nombreNatural,
  ordenarParaInsertar,
  padresQueFaltan,
  RespuestaIne,
  slugDe,
  territorios,
} from "@/lib/ine/transformar";

const tabla = (numero: string) =>
  RespuestaIne.parse(JSON.parse(readFileSync(`tests/datos-ine/${numero}.json`, "utf-8")));

describe("nombres", () => {
  it.each([
    ["Coruña, A", "A Coruña"],
    ["Palmas de Gran Canaria, Las", "Las Palmas de Gran Canaria"],
    ["Murcia, Región de", "Región de Murcia"],
    ["Hospitalet de Llobregat, L'", "L'Hospitalet de Llobregat"],
    ["Alicante/Alacant", "Alicante/Alacant"],
    ["  Albacete  ", "Albacete"],
  ])("«%s» se escribe «%s»", (ine, natural) => {
    expect(nombreNatural(ine)).toBe(natural);
  });

  it("los slugs no llevan tildes ni signos", () => {
    expect(slugDe("L'Hospitalet de Llobregat")).toBe("l-hospitalet-de-llobregat");
    expect(slugDe("A Coruña")).toBe("a-coruna");
  });

  it("todas las provincias tienen comunidad", () => {
    expect(Object.keys(COMUNIDAD_DE_PROVINCIA)).toHaveLength(52);
    expect(new Set(Object.values(COMUNIDAD_DE_PROVINCIA)).size).toBe(19);
  });
});

describe("territorios", () => {
  const todos = territorios([...tabla("59056"), ...tabla("59058"), ...tabla("59060")]);
  const por = (codigo: string) => todos.find((t) => t.codigo === codigo);

  it("municipio con su provincia y slug con el código", () => {
    expect(por("m15030")).toEqual({
      codigo: "m15030",
      codigo_ine: "15030",
      nivel: "municipio",
      nombre: "A Coruña",
      padre: "p15",
      slug: "a-coruna-15030",
    });
  });

  it("provincia con su comunidad y comunidad con España", () => {
    expect(por("p30")?.padre).toBe("c14");
    expect(por("c14")).toMatchObject({ nombre: "Región de Murcia", padre: "es", slug: "region-de-murcia" });
    expect(por("es")).toMatchObject({ nivel: "pais", padre: null, nombre: "España" });
  });

  it("sin repetir y con los padres antes que los hijos", () => {
    expect(new Set(todos.map((t) => t.codigo)).size).toBe(todos.length);
    const orden = ordenarParaInsertar(todos).map((t) => t.nivel);
    expect(orden.indexOf("municipio")).toBeGreaterThan(orden.lastIndexOf("provincia"));
    expect(orden[0]).toBe("pais");
  });

  it("con todas las tablas no falta ningún padre; sin las provincias, sí", () => {
    expect(padresQueFaltan(todos)).toEqual([]);
    expect(padresQueFaltan(territorios(tabla("59060")))).toEqual(["p02", "p15", "p30"]);
  });

  it("claves", () => {
    expect(claveDe("pais", "00")).toBe("es");
    expect(claveDe("provincia", "02")).toBe("p02");
  });
});

describe("alquiler", () => {
  const filas = filasDeAlquiler([...tabla("59056"), ...tabla("59058"), ...tabla("59060")]);

  it("solo el total, no el desglose por tipo de vivienda", () => {
    const espana2024 = filas.filter((f) => f.territorio === "es" && f.anio === 2024);
    expect(espana2024).toEqual([{ territorio: "es", anio: 2024, indice: 122.92, variacion_anual: 3.5 }]);
  });

  it("el índice vale 100 en 2015 (la base) y la variación del primer año falta", () => {
    const albacete = filas.filter((f) => f.territorio === "m02003");
    expect(albacete.find((f) => f.anio === 2015)?.indice).toBeCloseTo(100, 1);
    expect(albacete[0]?.variacion_anual).toBeNull();
    expect(albacete.at(-1)).toMatchObject({ anio: 2024, indice: 119.698, variacion_anual: 3.2 });
  });

  it("una fila por territorio y año", () => {
    const claves = filas.map((f) => `${f.territorio}${f.anio}`);
    expect(new Set(claves).size).toBe(claves.length);
  });
});

describe("viviendas turísticas", () => {
  const filas = filasTuristicas(tabla("39363"), tabla("39366"));

  it("une número, plazas y porcentaje por territorio y periodo", () => {
    const espana = filas.find((f) => f.territorio === "es" && f.periodo === "2026-05-01");
    expect(espana).toEqual({ territorio: "es", periodo: "2026-05-01", viviendas: 341001, plazas: 1714702, porcentaje: 1.28 });
  });

  it("no confunde «plazas» con «plazas por vivienda»", () => {
    const espana = filas.find((f) => f.territorio === "es" && f.periodo === "2026-05-01");
    expect(espana?.plazas).toBeGreaterThan(1000);
  });

  it("los municipios cuelgan de su provincia", () => {
    expect(filas.some((f) => f.territorio === "m30030")).toBe(true);
    expect(filas.every((f) => /^(es|c\d\d|p\d\d|m\d{5})$/.test(f.territorio))).toBe(true);
  });

  it("los periodos son semestrales y el último es mayo de 2026", () => {
    const periodos = [...new Set(filas.map((f) => f.periodo))].sort();
    expect(periodos.at(-1)).toBe("2026-05-01");
    expect(periodos.length).toBeGreaterThanOrEqual(12);
  });
});

it("una respuesta con otra forma no pasa la validación", () => {
  expect(() => RespuestaIne.parse([{ COD: "X", Nombre: "Y" }])).toThrow();
});
