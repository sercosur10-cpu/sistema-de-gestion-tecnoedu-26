import { Suspense } from 'react';
import Link from 'next/link';
import { Wifi, ArrowLeft } from 'lucide-react';
import { ConsultaClienteModule } from '@/modules/consulta/components/ConsultaClienteModule';

export default function ConsultaPage() {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 sm:px-6">
      <header className="mx-auto mb-8 flex max-w-xl items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400">
            <Wifi className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">
              TecnoEdu ISP · Autogestión
            </h1>
            <p className="text-[11px] text-slate-400">
              Bermejo · Tarija · Santa Cruz · Roboré
            </p>
          </div>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Inicio
        </Link>
      </header>

      <Suspense
        fallback={
          <div className="mx-auto max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center text-sm text-slate-400">
            Cargando módulo de consulta...
          </div>
        }
      >
        <ConsultaClienteModule />
      </Suspense>
    </div>
  );
}
