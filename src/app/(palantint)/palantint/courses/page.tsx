"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchPrivate } from "@/lib/api";
import { BookOpen, ChevronRight } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const PAGE_SIZE = 30;

interface CourseSummary {
  id: string;
  external_id: string;
  code: string | null;
  title: string;
  schools: string[];
  niveau: string | null;
  graduate: string | null;
  domaine: string | null;
  langue_enseignement: string | null;
  periode: string | null;
  lieu: string | null;
  credits_ects: number | null;
  heures_programmees: number | null;
  departements: string[];
  responsables: { name: string; url: string | null }[];
}

interface CourseFilters {
  schools: { code: string; label: string }[];
  niveaux: string[];
  domaines: string[];
  langues: string[];
  periodes: string[];
  lieux: string[];
}

const EMPTY_FILTERS: CourseFilters = {
  schools: [],
  niveaux: [],
  domaines: [],
  langues: [],
  periodes: [],
  lieux: [],
};

const SCHOOL_SHORT: Record<string, string> = {
  tsp: "TSP",
  "imt-bs": "IMT-BS",
  lsh: "LSH",
};

// Declared at module level: a component re-created on every render would be
// remounted by React, closing the dropdown as soon as a filter changes.
function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
  span,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  allLabel: string;
  span: string;
}) {
  return (
    <div className={`${span} border border-zinc-800/80 bg-zinc-950/40 p-4 relative group`}>
      <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest font-black block mb-2 group-focus-within:text-course-400 transition-colors">
        {label}
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-zinc-950 border border-zinc-850 hover:border-zinc-700 text-zinc-300 text-xs font-mono py-3 pl-4 pr-10 rounded-none outline-none focus:border-course-500 appearance-none cursor-pointer hover:bg-zinc-900/40 transition-all uppercase tracking-wider truncate"
        >
          <option value="">{allLabel}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 text-[10px] font-mono font-bold">
          ▼
        </div>
      </div>
    </div>
  );
}

export default function CourseCatalogPage() {
  const router = useRouter();

  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [skip, setSkip] = useState(0);

  const [search, setSearch] = useState("");
  const [school, setSchool] = useState("");
  const [niveau, setNiveau] = useState("");
  const [domaine, setDomaine] = useState("");
  const [langue, setLangue] = useState("");
  const [periode, setPeriode] = useState("");

  const [filters, setFilters] = useState<CourseFilters>(EMPTY_FILTERS);

  const loadCourses = useCallback(
    (currentSkip: number, append: boolean) => {
      if (!append) setLoading(true);

      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        skip: String(currentSkip),
      });
      if (search) params.set("q", search);
      if (school) params.set("school", school);
      if (niveau) params.set("niveau", niveau);
      if (domaine) params.set("domaine", domaine);
      if (langue) params.set("langue", langue);
      if (periode) params.set("periode", periode);

      fetchPrivate(`/courses?${params.toString()}`)
        .then((res) => {
          setTotal(res.total || 0);
          setCourses((prev) => (append ? [...prev, ...(res.courses || [])] : res.courses || []));
        })
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    },
    [search, school, niveau, domaine, langue, periode]
  );

  // Debounced so typing in the search bar doesn't fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSkip(0);
      loadCourses(0, false);
    }, 250);
    return () => clearTimeout(timer);
  }, [loadCourses]);

  useEffect(() => {
    fetchPrivate("/courses/filters")
      .then((res) => setFilters({ ...EMPTY_FILTERS, ...res }))
      .catch(() => {});
  }, []);

  const handleLoadMore = () => {
    const nextSkip = skip + PAGE_SIZE;
    setSkip(nextSkip);
    loadCourses(nextSkip, true);
  };

  return (
    <div className="min-h-screen bg-zinc-950 selection:bg-course-500/30 font-sans">
      {/* Background Orbs */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-course-600/10 blur-[150px] rounded-none mix-blend-screen" />
        <div className="absolute top-[30%] right-[-10%] w-[35%] h-[40%] bg-course-600/10 blur-[150px] rounded-none mix-blend-screen" />
      </div>

      <main className="relative z-10 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 mt-4 sm:mt-8">
        <div className="space-y-10">
          <PageHeader
            badgeText="Course catalog // Public source"
            title1="Course"
            title2="Catalog"
            titleGradient="from-course-400 to-course-600"
            subtitle="Every course sheet published by Télécom SudParis, IMT-BS and LSH, merged into a single searchable catalog."
            colorName="course"
            searchPlaceholder="QUERY: TITLE, CODE OR TOPIC"
            searchValue={search}
            onSearchChange={(val) => {
              setSearch(val);
              setSkip(0);
            }}
          />

          {/* Filters Panel */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-1.5 bg-zinc-900/40 border border-zinc-800 shadow-2xl overflow-hidden backdrop-blur-3xl p-1.5 rounded-none relative">
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-course-500/50 m-1" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-course-500/50 m-1" />

            <FilterSelect
              label="School Catalog"
              value={school}
              onChange={setSchool}
              allLabel="[ALL_SCHOOLS]"
              span="col-span-12 md:col-span-4"
              options={filters.schools.map((s) => ({ value: s.code, label: s.label }))}
            />
            <FilterSelect
              label="Academic Level"
              value={niveau}
              onChange={setNiveau}
              allLabel="[ALL_LEVELS]"
              span="col-span-12 md:col-span-2"
              options={filters.niveaux.map((n) => ({ value: n, label: n }))}
            />
            <FilterSelect
              label="Domain"
              value={domaine}
              onChange={setDomaine}
              allLabel="[ALL_DOMAINS]"
              span="col-span-12 md:col-span-3"
              options={filters.domaines.map((d) => ({ value: d, label: d }))}
            />
            <FilterSelect
              label="Language"
              value={langue}
              onChange={setLangue}
              allLabel="[ALL_LANGUAGES]"
              span="col-span-12 md:col-span-2"
              options={filters.langues.map((l) => ({ value: l, label: l }))}
            />
            <FilterSelect
              label="Period"
              value={periode}
              onChange={setPeriode}
              allLabel="[ALL]"
              span="col-span-12 md:col-span-1"
              options={filters.periodes.map((p) => ({ value: p, label: p }))}
            />
          </div>

          {/* Catalog Grid */}
          <div className="space-y-8 min-h-[600px] flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b-2 border-zinc-800 pb-4 gap-4">
              <h2 className="text-3xl font-black text-white flex items-center gap-4 uppercase tracking-tighter">
                <div className="p-2 bg-course-500/10 border border-course-500/30 shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                  <BookOpen className="w-6 h-6 text-course-500" />
                </div>
                Module Registry
              </h2>
              <div className="flex items-center gap-6 bg-course-500/5 border border-course-500/10 px-6 py-2">
                <span className="font-mono text-zinc-500 uppercase tracking-widest text-xs">
                  Matching modules
                </span>
                <span className="text-xl font-black font-mono text-course-400 tracking-tighter">
                  {loading && courses.length === 0 ? "---" : total}
                </span>
              </div>
            </div>

            {loading && courses.length === 0 ? (
              <div className="min-h-[400px] flex items-center justify-center">
                <div className="p-4 bg-zinc-900 border border-zinc-800 text-zinc-500 font-mono text-xs uppercase tracking-widest animate-pulse">
                  Loading course catalog...
                </div>
              </div>
            ) : courses.length === 0 ? (
              <div className="text-center py-24 border border-dashed border-zinc-800 bg-zinc-900/20 rounded-none">
                <BookOpen className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                <h3 className="text-sm font-mono font-bold text-zinc-600 uppercase tracking-widest">
                  No course matches these criteria
                </h3>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {courses.map((course) => (
                    <Card
                      key={course.id}
                      onClick={() => router.push(`/palantint/courses/${course.id}`)}
                      className="group p-0 rounded-none border-zinc-800 hover:border-course-500/50 bg-zinc-900/40 backdrop-blur-xl hover:bg-zinc-900/70 cursor-pointer transition-all shadow-xl hover:shadow-[0_0_40px_-10px_rgba(99,102,241,0.25)] relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-zinc-800 group-hover:bg-course-500 transition-colors z-10" />

                      <CardContent className="p-0 flex flex-col h-full">
                        <div className="flex items-start justify-between gap-4 p-5 pb-3">
                          <div className="min-w-0">
                            <p className="text-[10px] font-mono text-course-500 uppercase tracking-widest font-bold truncate">
                              {course.code || `REF:${course.external_id}`}
                            </p>
                            <h3 className="text-base font-black text-white leading-tight uppercase tracking-wide mt-2 group-hover:text-course-400 transition-colors line-clamp-2">
                              {course.title}
                            </h3>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {course.schools.map((s) => (
                              <span
                                key={s}
                                className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest border border-zinc-800 bg-zinc-950 px-2 py-1"
                              >
                                {SCHOOL_SHORT[s] || s}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="px-5 pb-4 flex-1">
                          <p className="text-[11px] text-zinc-500 font-mono uppercase tracking-tight truncate">
                            {course.domaine || "Domaine non renseigné"}
                          </p>
                          {course.responsables.length > 0 && (
                            <p className="text-[11px] text-zinc-600 font-mono mt-1 truncate">
                              {course.responsables.map((r) => r.name).join(", ")}
                            </p>
                          )}
                        </div>

                        <div className="grid grid-cols-4 border-t border-zinc-800/80 bg-zinc-950/40 group-hover:bg-course-500/5 transition-colors">
                          <div className="px-3 py-2 border-r border-zinc-800/60">
                            <span className="block text-[8px] text-zinc-600 font-mono uppercase tracking-widest">
                              ECTS
                            </span>
                            <span className="text-xs font-mono font-bold text-course-400">
                              {course.credits_ects ?? "—"}
                            </span>
                          </div>
                          <div className="px-3 py-2 border-r border-zinc-800/60">
                            <span className="block text-[8px] text-zinc-600 font-mono uppercase tracking-widest">
                              Level
                            </span>
                            <span className="text-xs font-mono font-bold text-zinc-300">
                              {course.niveau || "—"}
                            </span>
                          </div>
                          <div className="px-3 py-2 border-r border-zinc-800/60">
                            <span className="block text-[8px] text-zinc-600 font-mono uppercase tracking-widest">
                              Period
                            </span>
                            <span className="text-xs font-mono font-bold text-zinc-300">
                              {course.periode || "—"}
                            </span>
                          </div>
                          <div className="px-3 py-2">
                            <span className="block text-[8px] text-zinc-600 font-mono uppercase tracking-widest">
                              Hours
                            </span>
                            <span className="text-xs font-mono font-bold text-zinc-300">
                              {course.heures_programmees ?? "—"}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {courses.length < total && (
                  <div className="mt-16 flex justify-center pb-12 w-full">
                    <Button
                      onClick={handleLoadMore}
                      variant="outline"
                      size="lg"
                      disabled={loading}
                      className="w-full max-w-md bg-zinc-950 hover:bg-zinc-900 border-zinc-800 hover:border-course-500 text-zinc-400 font-mono uppercase tracking-widest text-xs h-14 rounded-none transition-all hover:text-course-400 group"
                    >
                      Load More Modules ({courses.length}/{total})
                      <ChevronRight className="w-4 h-4 ml-4 group-hover:translate-x-2 transition-transform text-course-500" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
