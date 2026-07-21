import Link from "next/link";

export default function PortalHomePage() {
  return (
    <section className="flex-1 max-w-6xl mx-auto w-full px-4 py-20 sm:py-28 flex flex-col justify-center relative z-10">
      <div className="max-w-3xl mb-16">
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-zinc-950 dark:text-stone-50 mb-6 leading-none">
          All your campus services <br className="hidden sm:inline" /> in one unified place.
        </h1>
        <p className="text-lg sm:text-xl text-zinc-600 dark:text-stone-400 leading-relaxed max-w-2xl">
          Check the live laundry room occupancy, find information about campus housing pricing, and discover student clubs.
        </p>
      </div>

      {/* Feature Grid - Minimal Editorial Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-y-12 md:gap-y-0 md:gap-x-12 divide-y md:divide-y-0 md:divide-x divide-zinc-200/60 dark:divide-stone-800/30 border border-zinc-200/80 dark:border-stone-800/50 bg-stone-50/90 dark:bg-stone-900/90 backdrop-blur-sm rounded-2xl p-8 sm:p-12 shadow-sm relative z-10">
        
        {/* Laundry Column */}
        <Link href="/laundry" className="group flex flex-col justify-between h-full md:pr-0">
          <div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-2xl mb-6 group-hover:scale-105 transition-transform duration-300 shadow-sm border border-blue-100/50 dark:border-blue-900/10">
              🧺
            </div>
            <h3 className="font-semibold text-lg text-zinc-900 dark:text-stone-100 transition-colors inline-block">
              <span className="relative pb-1">
                Laundry Status
                <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-gradient-to-r from-blue-500 to-indigo-500 group-hover:w-full transition-all duration-300" />
              </span>
            </h3>
            <p className="text-zinc-500 dark:text-stone-400 text-sm mt-3 leading-relaxed">
              Real-time tracking of washing machines and dryers across all campus buildings.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-400 dark:text-stone-500 text-xs font-semibold uppercase tracking-wider mt-8 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all group-hover:translate-x-1 duration-300">
            Check availability →
          </div>
        </Link>

        {/* Clubs Column */}
        <Link href="/clubs" className="group flex flex-col justify-between h-full md:pl-12">
          <div>
            <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 flex items-center justify-center text-2xl mb-6 group-hover:scale-105 transition-transform duration-300 shadow-sm border border-rose-100/50 dark:border-rose-900/10">
              🤝
            </div>
            <h3 className="font-semibold text-lg text-zinc-900 dark:text-stone-100 transition-colors inline-block">
              <span className="relative pb-1">
                Clubs & Orgs
                <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-gradient-to-r from-rose-500 to-pink-500 group-hover:w-full transition-all duration-300" />
              </span>
            </h3>
            <p className="text-zinc-500 dark:text-stone-400 text-sm mt-3 leading-relaxed">
              Discover student clubs, associations, upcoming events, and campus life activities.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-400 dark:text-stone-500 text-xs font-semibold uppercase tracking-wider mt-8 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-all group-hover:translate-x-1 duration-300">
            Explore list →
          </div>
        </Link>

        {/* Housing Column */}
        <Link href="/apartments" className="group flex flex-col justify-between h-full md:pl-12">
          <div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-2xl mb-6 group-hover:scale-105 transition-transform duration-300 shadow-sm border border-amber-100/50 dark:border-amber-900/10">
              🏢
            </div>
            <h3 className="font-semibold text-lg text-zinc-900 dark:text-stone-100 transition-colors inline-block">
              <span className="relative pb-1">
                Campus Housing
                <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-gradient-to-r from-amber-500 to-orange-500 group-hover:w-full transition-all duration-300" />
              </span>
            </h3>
            <p className="text-zinc-500 dark:text-stone-400 text-sm mt-3 leading-relaxed">
              View detailed apartment sizes, pricing guides, scholarship rates, and floor details.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-400 dark:text-stone-500 text-xs font-semibold uppercase tracking-wider mt-8 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-all group-hover:translate-x-1 duration-300">
            Housing info →
          </div>
        </Link>

      </div>
    </section>
  );
}
