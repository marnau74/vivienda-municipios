import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Buscador } from "@/componentes/Buscador";
import { escalaBonita, GraficaDeLineas, tramos } from "@/componentes/GraficaDeLineas";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

afterEach(cleanup);

describe("GraficaDeLineas", () => {
  const props = {
    titulo: "Índice en Albacete",
    descripcion: "Índice del alquiler",
    etiquetas: ["2015", "2016", "2017"],
    series: [
      { nombre: "Albacete", valores: [100, null, 110], destacada: true },
      { nombre: "España", valores: [100, 104, 108] },
    ],
    formato: (v: number) => String(v),
  };

  it("es una imagen con título y descripción accesibles", () => {
    render(<GraficaDeLineas {...props} />);
    expect(screen.getByRole("img", { name: /Índice en Albacete/ })).toBeTruthy();
  });

  it("lleva una tabla con los mismos datos y dice dónde falta un dato", () => {
    render(<GraficaDeLineas {...props} />);
    const tabla = screen.getByRole("table");
    expect(tabla.textContent).toContain("sin dato");
    expect(screen.getAllByRole("row")).toHaveLength(4);
  });

  it("un dato que falta corta la línea en dos tramos", () => {
    expect(tramos([100, null, 110])).toEqual([[{ i: 0, v: 100 }], [{ i: 2, v: 110 }]]);
    expect(tramos([null, null])).toEqual([]);
  });

  it("la escala del eje usa números redondos y cubre los datos", () => {
    const marcas = escalaBonita(97.3, 128.9);
    expect(marcas[0]).toBeLessThanOrEqual(97.3);
    expect(marcas.at(-1)).toBeGreaterThanOrEqual(128.9);
    expect(marcas.every((m) => Number.isInteger(m / 5))).toBe(true);
  });

  it("sin datos lo dice en vez de dibujar un eje vacío", () => {
    render(<GraficaDeLineas {...props} series={[{ nombre: "X", valores: [null, null, null] }]} />);
    expect(screen.getByText(/Sin datos/)).toBeTruthy();
  });
});

describe("Buscador", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json([
          { codigo: "m02003", nombre: "Albacete", provincia: "Albacete", slug: "albacete-02003" },
          { codigo: "m02009", nombre: "Almansa", provincia: "Albacete", slug: "almansa-02009" },
        ]),
      ),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("busca al dejar de escribir y se maneja con el teclado", async () => {
    const alElegir = vi.fn();
    render(<Buscador alElegir={alElegir} />);
    const campo = screen.getByRole("combobox");
    fireEvent.change(campo, { target: { value: "alba" } });
    await act(() => vi.advanceTimersByTimeAsync(300));
    await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(2));
    expect(fetch).toHaveBeenCalledWith("/api/buscar?q=alba", expect.anything());

    fireEvent.keyDown(campo, { key: "ArrowDown" });
    expect(screen.getAllByRole("option")[1]!.getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(campo, { key: "Enter" });
    expect(alElegir).toHaveBeenCalledWith(expect.objectContaining({ nombre: "Almansa" }));
  });

  it("con una sola letra no busca", async () => {
    render(<Buscador />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "a" } });
    await act(() => vi.advanceTimersByTimeAsync(300));
    expect(fetch).not.toHaveBeenCalled();
  });
});
