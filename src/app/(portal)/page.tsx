import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

export default function PortalHomePage() {
  return (
    <>
      {/* Header */}
      <header className="border-b border-zinc-200/85 dark:border-stone-800/80 bg-white/70 dark:bg-stone-950/70 backdrop-blur-md sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-stone-100 flex items-center justify-center font-bold text-white dark:text-zinc-950 shadow-sm transition-colors">
              I
            </div>
            <span className="font-semibold text-lg tracking-tight text-zinc-900 dark:text-stone-50">INT Portal</span>
          </div>
          <nav className="flex items-center gap-6 text-sm font-medium text-zinc-600 dark:text-stone-400">
            <Link href="/clubs" className="hover:text-zinc-950 dark:hover:text-white transition-colors">Clubs</Link>
            <Link href="/apartments" className="hover:text-zinc-950 dark:hover:text-white transition-colors">Apartments</Link>
            <Link href="/laundry" className="hover:text-zinc-950 dark:hover:text-white transition-colors">Laundry</Link>
            <div className="border-l border-zinc-200 dark:border-stone-800/80 h-4" />
            <ThemeToggle />
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 max-w-6xl mx-auto w-full px-4 py-20 sm:py-28 flex flex-col justify-center relative z-10">
        <div className="max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-200/50 dark:bg-stone-800/40 border border-zinc-200 dark:border-stone-800/80 text-xs font-semibold text-zinc-700 dark:text-stone-300 mb-6 transition-colors">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            Welcome to the Campus Portal
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-zinc-950 dark:text-stone-50 mb-6 leading-none">
            All your campus services <br className="hidden sm:inline" /> in one unified place.
          </h1>
          <p className="text-lg sm:text-xl text-zinc-600 dark:text-stone-400 leading-relaxed max-w-2xl">
            Check the live laundry room occupancy, find information about campus housing pricing, and discover student clubs.
          </p>
        </div>

        {/* Feature Grid - Minimal Editorial Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-y-12 md:gap-y-0 md:gap-x-12 divide-y md:divide-y-0 md:divide-x divide-zinc-200/60 dark:divide-stone-800/30 border-t border-b border-zinc-200/60 dark:border-stone-800/30 py-12">
          
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

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-stone-850/40 bg-white/40 dark:bg-stone-950/20 py-8 mt-auto transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-500 dark:text-stone-500">
          <div>&copy; {new Date().getFullYear()} INT Portal. All rights reserved.</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-zinc-800 dark:hover:text-stone-300 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-zinc-800 dark:hover:text-stone-300 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-zinc-800 dark:hover:text-stone-300 transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </>
  );
}
