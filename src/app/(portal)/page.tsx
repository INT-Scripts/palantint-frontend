import Link from "next/link";

export default function PortalHomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 text-zinc-900">
      {/* Header */}
      <header className="border-b border-zinc-200/80 bg-white/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center font-bold text-white shadow-sm">
              I
            </div>
            <span className="font-semibold text-lg tracking-tight">INT Portal</span>
          </div>
          <nav className="flex items-center gap-6 text-sm font-medium text-zinc-600">
            <Link href="/clubs" className="hover:text-zinc-950 transition-colors">Clubs</Link>
            <Link href="/apartments" className="hover:text-zinc-950 transition-colors">Apartments</Link>
            <Link href="/laundry" className="hover:text-zinc-950 transition-colors">Laundry</Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 max-w-6xl mx-auto w-full px-4 py-16 sm:py-24 flex flex-col justify-center">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-200/50 border border-zinc-200 text-xs font-semibold text-zinc-700 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            Welcome to the Campus Portal
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-zinc-950 mb-6 leading-none">
            All your campus services in one unified place.
          </h1>
          <p className="text-lg sm:text-xl text-zinc-600 mb-10 leading-relaxed max-w-2xl">
            Check the live laundry room occupancy, find information about campus housing pricing, and discover student clubs.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          <Link href="/laundry" className="group p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform duration-300">
                🧺
              </div>
              <h3 className="font-semibold text-lg text-zinc-900 group-hover:text-blue-600 transition-colors">Laundry Status</h3>
              <p className="text-zinc-500 text-sm mt-2 leading-snug">
                Real-time tracking of washing machines and dryers across all campus buildings.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-semibold uppercase tracking-wider mt-6 group-hover:text-blue-600 transition-colors">
              Check availability →
            </div>
          </Link>

          <Link href="/clubs" className="group p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform duration-300">
                🤝
              </div>
              <h3 className="font-semibold text-lg text-zinc-900 group-hover:text-rose-600 transition-colors">Clubs & Orgs</h3>
              <p className="text-zinc-500 text-sm mt-2 leading-snug">
                Discover student clubs, associations, upcoming events, and campus life activities.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-semibold uppercase tracking-wider mt-6 group-hover:text-rose-600 transition-colors">
              Explore list →
            </div>
          </Link>

          <Link href="/apartments" className="group p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform duration-300">
                🏢
              </div>
              <h3 className="font-semibold text-lg text-zinc-900 group-hover:text-amber-600 transition-colors">Campus Housing</h3>
              <p className="text-zinc-500 text-sm mt-2 leading-snug">
                View detailed apartment sizes, pricing guides, scholarship rates, and floor details.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-semibold uppercase tracking-wider mt-6 group-hover:text-amber-600 transition-colors">
              Housing info →
            </div>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white py-8 mt-auto">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-500">
          <div>&copy; {new Date().getFullYear()} INT Portal. All rights reserved.</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-zinc-800 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-zinc-800 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-zinc-800 transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
