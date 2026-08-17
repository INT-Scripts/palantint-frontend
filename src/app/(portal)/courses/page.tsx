"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { fetchPublic } from "@/lib/api";
import { BookOpen, Search, GraduationCap, Clock } from "lucide-react";
import PortalHeader from "@/components/PortalHeader";

const PAGE_SIZE = 30;

interface CourseSummary {
  id: string;
  external_id: string;
  code: string | null;
  title: string;
  schools: string[];
  niveau: string | null;
  domaine: string | null;
  langue_enseignement: string | null;
  periode: string | null;
  lieu: string | null;
  credits_ects: number | null;
  heures_programmees: number | null;
  responsables: { name: string }[];
}

interface CourseFilters {
  schools: { code: string; label: string }[];
  niveaux: string[];
  domaines: string[];
  langues: string[];
  periodes: string[];
}

const EMPTY_FILTERS: CourseFilters = {
  schools: [],
  niveaux: [],
  domaines: [],
  langues: [],
  periodes: [],
};

const SCHOOL_SHORT: Record<string, string> = {
  tsp: "TSP",
  "imt-bs": "IMT-BS",
  lsh: "LSH",
};

const selectClass =
  "w-full rounded-lg border border-zinc-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-2 text-sm text-zinc-700 dark:text-stone-300 outline-hidden focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors";

export default function PublicCoursesPage() {
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [skip, setSkip] = useState(0);

  const [search, setSearch] = useState("");
  const [school, setSchool] = useState("");
  const [niveau, setNiveau] = useState("");
  const [domaine, setDomaine] = useState("");
  const [langue, setLangue] = useState("");

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

      fetchPublic(`/courses?${params.toString()}`)
        .then((res) => {
          setTotal(res.total || 0);
          setCourses((prev) => (append ? [...prev, ...(res.courses || [])] : res.courses || []));
          setError(null);
        })
        .catch((err: unknown) =>
          setError(err instanceof Error ? err.message : "Failed to load the course catalog.")
        )
        .finally(() => setLoading(false));
    },
    [search, school, niveau, domaine, langue]
  );

  // Debounced so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSkip(0);
      loadCourses(0, false);
    }, 250);
    return () => clearTimeout(timer);
  }, [loadCourses]);

  useEffect(() => {
    fetchPublic("/courses/filters")
      .then((res) => setFilters({ ...EMPTY_FILTERS, ...res }))
      .catch(() => {});
  }, []);

  const handleLoadMore = () => {
    const nextSkip = skip + PAGE_SIZE;
    setSkip(nextSkip);
    loadCourses(nextSkip, true);
  };

  return (
    <section className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 relative z-10 space-y-8">
      <PortalHeader
        icon={<BookOpen className="w-4 h-4 text-blue-500" />}
        badgeText="Academics"
        title="Course Catalog"
        subtitle="Browse every course sheet published by Télécom SudParis, IMT-BS and LSH — credits, level, language, teaching staff and full syllabus, in one searchable place."
        accentColor="blue"
        rightContent={
          <div className="text-right">
            <p className="text-3xl font-bold text-zinc-900 dark:text-stone-100 tabular-nums">
              {loading && courses.length === 0 ? "—" : total}
            </p>
            <p className="text-xs uppercase tracking-wider text-zinc-500 dark:text-stone-400 font-semibold">
              Courses found
            </p>
          </div>
        }
      />

      {/* Search & filters */}
      <div className="rounded-2xl border border-zinc-200/80 dark:border-stone-800/60 bg-white/80 dark:bg-stone-900/70 backdrop-blur-sm p-4 sm:p-5 shadow-sm space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-stone-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, course code or topic…"
            className="w-full rounded-lg border border-zinc-200 dark:border-stone-800 bg-white dark:bg-stone-950 pl-10 pr-4 py-2.5 text-sm text-zinc-800 dark:text-stone-200 placeholder:text-zinc-400 dark:placeholder:text-stone-600 outline-hidden focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <select value={school} onChange={(e) => setSchool(e.target.value)} className={selectClass}>
            <option value="">All schools</option>
            {filters.schools.map((s) => (
              <option key={s.code} value={s.code}>
                {s.label}
              </option>
            ))}
          </select>
          <select value={niveau} onChange={(e) => setNiveau(e.target.value)} className={selectClass}>
            <option value="">All levels</option>
            {filters.niveaux.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <select value={domaine} onChange={(e) => setDomaine(e.target.value)} className={selectClass}>
            <option value="">All domains</option>
            {filters.domaines.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select value={langue} onChange={(e) => setLangue(e.target.value)} className={selectClass}>
            <option value="">All languages</option>
            {filters.langues.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {loading && courses.length === 0 ? (
        <div className="py-24 text-center text-zinc-500 dark:text-stone-400 text-sm animate-pulse">
          Loading the course catalog…
        </div>
      ) : courses.length === 0 ? (
        <div className="py-24 text-center">
          <BookOpen className="w-10 h-10 mx-auto mb-4 text-zinc-300 dark:text-stone-700" />
          <p className="text-zinc-500 dark:text-stone-400 text-sm">
            No course matches these criteria.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courses.map((course) => (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className="group rounded-2xl border border-zinc-200/80 dark:border-stone-800/60 bg-white/80 dark:bg-stone-900/70 backdrop-blur-sm p-5 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-800/60 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      {course.code || `#${course.external_id}`}
                    </span>
                    <div className="flex gap-1 shrink-0">
                      {course.schools.map((s) => (
                        <span
                          key={s}
                          className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300"
                        >
                          {SCHOOL_SHORT[s] || s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <h3 className="font-semibold text-zinc-900 dark:text-stone-100 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {course.title}
                  </h3>

                  <p className="text-sm text-zinc-500 dark:text-stone-400 mt-1">
                    {course.domaine || "Domaine non renseigné"}
                  </p>

                  {course.responsables.length > 0 && (
                    <p className="text-xs text-zinc-400 dark:text-stone-500 mt-2 truncate">
                      {course.responsables.map((r) => r.name).join(", ")}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-4 pt-3 border-t border-zinc-100 dark:border-stone-800/60 text-xs text-zinc-500 dark:text-stone-400">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-indigo-600 dark:text-indigo-400">
                    {course.credits_ects ?? "—"} ECTS
                  </span>
                  {course.niveau && (
                    <span className="inline-flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5" /> {course.niveau}
                    </span>
                  )}
                  {course.periode && <span>{course.periode}</span>}
                  {course.heures_programmees && (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> {course.heures_programmees}h
                    </span>
                  )}
                  {course.langue_enseignement && (
                    <span className="truncate max-w-[10rem]">{course.langue_enseignement}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {courses.length < total && (
            <div className="flex justify-center pt-4">
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="rounded-lg border border-zinc-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-6 py-3 text-sm font-semibold text-zinc-700 dark:text-stone-300 hover:border-indigo-300 dark:hover:border-indigo-800/60 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors disabled:opacity-50"
              >
                Load more ({courses.length}/{total})
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
