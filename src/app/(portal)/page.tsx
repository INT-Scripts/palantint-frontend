import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Users, WashingMachine, MapPin } from "lucide-react";

export const metadata: Metadata = {
  title: { absolute: "INT Portal : les services du campus de Télécom SudParis" },
  alternates: { canonical: "/" },
};

export default function PortalHomePage() {
  return (
    <section className="flex-1 max-w-6xl mx-auto w-full px-4 py-20 sm:py-28 flex flex-col justify-center relative z-10">
      <div className="max-w-3xl mb-16">
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-zinc-950 dark:text-stone-50 mb-6 leading-none">
          Les services du campus <br className="hidden sm:inline" /> au même endroit.
        </h1>
        <p className="text-lg sm:text-xl text-zinc-600 dark:text-stone-400 leading-relaxed max-w-2xl">
          Télécom SudParis et IMT-BS, à Évry : les laveries en direct, les logements, les associations et les plans du foyer.
        </p>
      </div>

      {/* Feature Grid - Minimal Editorial Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 border border-zinc-200/80 dark:border-stone-800/50 bg-stone-50/90 dark:bg-stone-900/90 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-sm relative z-10">
        
        {/* Clubs Column (Green) */}
        <Link href="/clubs" className="group flex flex-col justify-between h-full p-4 rounded-xl hover:bg-stone-100/60 dark:hover:bg-stone-800/40 transition-colors">
          <div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300 shadow-sm border border-emerald-100/50 dark:border-emerald-900/10">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-lg text-zinc-900 dark:text-stone-100 transition-colors inline-block">
              <span className="relative pb-1">
                Clubs et associations
                <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-gradient-to-r from-emerald-500 to-teal-500 group-hover:w-full transition-all duration-300" />
              </span>
            </h3>
            <p className="text-zinc-500 dark:text-stone-400 text-sm mt-3 leading-relaxed">
              Les clubs et les associations du campus, et ce qu’ils proposent.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-400 dark:text-stone-500 text-xs font-semibold uppercase tracking-wider mt-8 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-all group-hover:translate-x-1 duration-300">
            Voir la liste →
          </div>
        </Link>

        {/* Foyer Map Column (Red/Pink) */}
        <Link href="/foyer" className="group flex flex-col justify-between h-full p-4 rounded-xl hover:bg-stone-100/60 dark:hover:bg-stone-800/40 transition-colors">
          <div>
            <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300 shadow-sm border border-rose-100/50 dark:border-rose-900/10">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-lg text-zinc-900 dark:text-stone-100 transition-colors inline-block">
              <span className="relative pb-1">
                Plan du foyer
                <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-gradient-to-r from-rose-500 to-pink-500 group-hover:w-full transition-all duration-300" />
              </span>
            </h3>
            <p className="text-zinc-500 dark:text-stone-400 text-sm mt-3 leading-relaxed">
              Les plans 2D et 3D des locaux associatifs du foyer.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-400 dark:text-stone-500 text-xs font-semibold uppercase tracking-wider mt-8 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-all group-hover:translate-x-1 duration-300">
            Voir les plans →
          </div>
        </Link>

        {/* Housing Column (Amber) */}
        <Link href="/apartments" className="group flex flex-col justify-between h-full p-4 rounded-xl hover:bg-stone-100/60 dark:hover:bg-stone-800/40 transition-colors">
          <div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300 shadow-sm border border-amber-100/50 dark:border-amber-900/10">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-lg text-zinc-900 dark:text-stone-100 transition-colors inline-block">
              <span className="relative pb-1">
                Logements
                <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-gradient-to-r from-amber-500 to-orange-500 group-hover:w-full transition-all duration-300" />
              </span>
            </h3>
            <p className="text-zinc-500 dark:text-stone-400 text-sm mt-3 leading-relaxed">
              Surfaces, tarifs et étages des logements de la MAISEL.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-400 dark:text-stone-500 text-xs font-semibold uppercase tracking-wider mt-8 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-all group-hover:translate-x-1 duration-300">
            Voir les logements →
          </div>
        </Link>

        {/* Laundry Column (Blue) */}
        <Link href="/laundry" className="group flex flex-col justify-between h-full p-4 rounded-xl hover:bg-stone-100/60 dark:hover:bg-stone-800/40 transition-colors">
          <div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300 shadow-sm border border-blue-100/50 dark:border-blue-900/10">
              <WashingMachine className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-lg text-zinc-900 dark:text-stone-100 transition-colors inline-block">
              <span className="relative pb-1">
                Laveries
                <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-gradient-to-r from-blue-500 to-indigo-500 group-hover:w-full transition-all duration-300" />
              </span>
            </h3>
            <p className="text-zinc-500 dark:text-stone-400 text-sm mt-3 leading-relaxed">
              Les machines à laver et les séchoirs libres, en temps réel.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-400 dark:text-stone-500 text-xs font-semibold uppercase tracking-wider mt-8 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all group-hover:translate-x-1 duration-300">
            Voir les machines →
          </div>
        </Link>

      </div>
    </section>
  );
}
