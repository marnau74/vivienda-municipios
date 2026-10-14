import Link from "next/link";

export default function NoEncontrado() {
  return (
    <section className="max-w-xl">
      <h1 className="font-serif text-3xl font-semibold tracking-tight">No encontramos esa página</h1>
      <p className="mt-4 text-suave">
        Puede que el enlace esté mal copiado o que el municipio haya cambiado de código en el INE. Prueba a buscarlo desde
        el <Link href="/" className="underline underline-offset-4">inicio</Link>.
      </p>
    </section>
  );
}
