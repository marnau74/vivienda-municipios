// @vitest-environment node
import { describe, expect, it } from "vitest";
import { aniosQueFaltan, periodoAnterior, subidaEntre, ultimoAnio, ultimoPeriodo, variacion } from "@/lib/calculos";
import { cambio, entero, periodo, periodoCorto, porcentaje } from "@/lib/formato";
import { clase, cortesPorCuantiles, dibujarMapa, orientar } from "@/lib/mapa";

const serie = [
  { anio: 2015, indice: 100, variacion_anual: 1 },
  { anio: 2016, indice: 103, variacion_anual: 3 },
  { anio: 2018, indice: 110, variacion_anual: 4 },
  { anio: 2024, indice: 125, variacion_anual: 2.5 },
];

describe("alquiler", () => {
  it("la subida entre dos años es la del índice, sea cual sea la base", () => {
    expect(subidaEntre(serie, 2015, 2024)).toBeCloseTo(25);
    expect(subidaEntre(serie, 2016, 2018)).toBeCloseTo((110 / 103 - 1) * 100);
  });

  it("sin el año de partida o el de llegada no hay subida", () => {
    expect(subidaEntre(serie, 2017, 2024)).toBeNull();
  });

  it("el último año y los que faltan", () => {
    expect(ultimoAnio(serie)?.anio).toBe(2024);
    expect(ultimoAnio([])).toBeUndefined();
    expect(aniosQueFaltan(serie)).toEqual([2017, 2019, 2020, 2021, 2022, 2023]);
  });
});

describe("viviendas turísticas", () => {
  const turisticas = [
    { periodo: "2025-05-01", viviendas: 431, plazas: 2799, porcentaje: 1.2 },
    { periodo: "2025-11-01", viviendas: 298, plazas: 2073, porcentaje: 0.8 },
    { periodo: "2026-05-01", viviendas: 318, plazas: 2159, porcentaje: 0.9 },
  ];

  it("se compara con el mismo mes del año anterior", () => {
    const ultimo = ultimoPeriodo(turisticas)!;
    expect(ultimo.periodo).toBe("2026-05-01");
    expect(periodoAnterior(turisticas, ultimo.periodo)?.viviendas).toBe(431);
    expect(variacion(318, 431)).toBeCloseTo(-26.2, 1);
  });

  it("sin dato de partida (o cero) no hay variación", () => {
    expect(variacion(10, null)).toBeNull();
    expect(variacion(10, 0)).toBeNull();
    expect(periodoAnterior(turisticas, "2025-05-01")).toBeUndefined();
  });
});

describe("formato", () => {
  it("cambios con signo y el menos tipográfico", () => {
    expect(cambio(23.44)).toBe("+23,4 %");
    expect(cambio(-1.25)).toBe("−1,3 %");
    expect(cambio(0)).toBe("0,0 %");
    expect(cambio(-0.04)).toBe("0,0 %");
    expect(cambio(0.04)).toBe("0,0 %");
    expect(cambio(null)).toBe("—");
  });

  it("números y periodos en español", () => {
    expect(entero(341001)).toBe("341.001");
    expect(porcentaje(1.28)).toBe("1,3 %");
    expect(periodo("2026-05-01")).toBe("mayo de 2026");
    expect(periodoCorto("2020-08-01")).toBe("ago 2020");
  });
});

describe("mapa", () => {
  it("los cortes por cuantiles reparten los valores", () => {
    const valores = Array.from({ length: 60 }, (_, i) => i);
    const cortes = cortesPorCuantiles(valores, 6);
    expect(cortes).toEqual([10, 20, 30, 40, 50]);
    expect(clase(0, cortes)).toBe(0);
    expect(clase(10, cortes)).toBe(1);
    expect(clase(59, cortes)).toBe(5);
  });

  it("sin cortes repetidos aunque haya muchos valores iguales", () => {
    expect(cortesPorCuantiles([1, 1, 1, 1, 1, 2], 4)).toEqual([1]);
    expect(cortesPorCuantiles([], 6)).toEqual([]);
  });

  it("un polígono del revés se pone del derecho (y uno bien no se toca)", () => {
    // d3-geo espera el anillo exterior en el sentido de las agujas del reloj.
    const horario = [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
      [0, 0],
    ];
    const antihorario = [...horario].reverse();
    const bien = { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [horario] } };
    const mezclado = {
      type: "Feature",
      properties: {},
      geometry: { type: "MultiPolygon", coordinates: [[antihorario], [horario]] },
    };
    const resultado = orientar(structuredClone(mezclado) as never) as unknown as { geometry: { coordinates: number[][][][] } };
    expect(resultado.geometry.coordinates).toEqual([[horario], [horario]]);
    expect(orientar(structuredClone(bien) as never)).toEqual(bien);
  });
});

describe("dibujo del mapa", () => {
  const geometria = {
    municipios: [
      { codigo: "30030", nombre: "Murcia", d: "M0,0L1,0L1,1Z" },
      { codigo: "30043", nombre: "Yecla", d: "M2,0L3,0L3,1Z" },
      { codigo: "02003", nombre: "Albacete", d: "M4,0L5,0L5,1Z" },
      { codigo: "99999", nombre: "A <b>&</b>", d: "M6,0L7,0L7,1Z" },
    ],
    provincias: "M0,0L9,9",
    recuadro: { x: 0, y: 0, ancho: 1, alto: 1 },
  };
  const svg = dibujarMapa(geometria, {
    titulo: "Subida",
    descripcion: "Con <dato>",
    valores: { "30030": 25.4, "30043": 27.3, "99999": 1 },
    slugs: { "30030": "murcia-30030", "30043": "yecla-30043" },
    cortes: [26],
    formato: (v) => `${v} %`,
  });

  it("cada municipio con dato enlaza a su ficha, fuera del tabulador, con su valor de título", () => {
    expect(svg).toContain('<a href="/territorio/murcia-30030" tabindex="-1"><path d="M0,0L1,0L1,1Z" fill="var(--escala-1)"><title>Murcia: 25.4 %</title>');
    expect(svg).toContain('fill="var(--escala-2)"><title>Yecla: 27.3 %</title>');
  });

  it("los municipios sin dato van juntos en un solo camino rayado", () => {
    expect(svg).toContain('<path d="M4,0L5,0L5,1Z" fill="url(#sin-dato)"/>');
    expect(svg).not.toContain("Albacete");
  });

  it("los textos se escapan", () => {
    expect(svg).toContain("<desc id=\"mapa-desc\">Con &lt;dato&gt;</desc>");
    expect(svg).toContain("<title>A &lt;b&gt;&amp;&lt;/b&gt;: 1 %</title>");
    expect(svg).not.toContain("<b>");
  });
});
