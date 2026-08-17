"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchPrivate } from "@/lib/api";
import { ArrowLeft, ArrowUpRight, BookOpen, ExternalLink, UserRound } from "lucide-react";

interface LinkedPerson {
  id: string;
  first_name: string;
  last_name: string;
  kind: string;
}

interface Teacher {
  name: string;
  role: string;
  url: string | null;
  // Resolved by name on every read, so a teacher added to the directory later
  // starts linking here without re-scraping the catalog.
  person: LinkedPerson | null;
}

interface CourseDetails {
  id: string;
  external_id: string;
  code: string | null;
  title: string;
  url: string | null;
  schools: string[];
  school_labels: string[];
  niveau: string | null;
  graduate: string | null;
  domaine: string | null;
  programme: string | null;
  langue_enseignement: string | null;
  periode: string | null;
  lieu: string | null;
  credits_ects: number | null;
  heures_programmees: number | null;
  coefficient: string | null;
  departements: string[];
  responsables: Teacher[];
  equipe_pedagogique: Teacher[];
  organisation: string | null;
  population: string | null;
  mode_calcul_moyenne: string | null;
  mode_calcul_credits: string | null;
  introduction: string | null;
  objectif: string | null;
  contenu: string | null;
  evaluations: string | null;
  plan_cours: string | null;
  charge_travail_etudiant: string | null;
  description: string | null;
  extra_sections: Record<string, string>;
}

// Camel-cased keys straight from the course sheet (prerequis, competencesCDIO…).
const EXTRA_SECTION_LABELS: Record<string, string> = {
  prerequis: "Prérequis",
  bibliographie: "Bibliographie",
  references: "Références",
  motcles: "Mots-clés",
  semester: "Semestre",
  chargeTotale: "Charge totale",
  competencesCDIO: "Compétences CDIO",
  objectifsApprentissages: "Objectifs d'apprentissage",
  approchePedagogique: "Approche pédagogique",
  methodePedagogique: "Méthode pédagogique",
  apprentissage: "Apprentissage",
  contributionODD: "Contribution ODD",
  nombreODD: "Nombre d'ODD",
  reglementModule: "Règlement du module",
  structureAgenda: "Structure de l'agenda",
  nbGroupes: "Nombre de groupes",
  finaliteApprentissage: "Finalité de l'apprentissage",
  attentesCours: "Attentes en cours",
  evaluationFormule: "Formule d'évaluation",
  traitsCompetences: "Traits de compétences",
  vapMsMsc: "VAP MS/MSc",
  sequencement: "Séquencement",
  acquisitionCompetences: "Acquisition des compétences",
};

const humanizeKey = (key: string) =>
  EXTRA_SECTION_LABELS[key] ||
  key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());

function TextSection({ title, body }: { title: string; body: string | null }) {
  if (!body || !body.trim()) return null;
  return (
    <section className="border border-zinc-800/60 bg-zinc-900/30 backdrop-blur-xl p-6 relative">
      <div className="absolute top-0 left-0 w-1 h-full bg-zinc-800" />
      <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-3">
        <span className="w-1.5 h-4 bg-course-500" />
        {title}
      </h3>
      <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-line">{body}</p>
    </section>
  );
}

function StatCell({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="border border-zinc-800/60 bg-zinc-950/50 px-4 py-3">
      <span className="block text-[9px] text-zinc-600 font-mono uppercase tracking-widest">
        {label}
      </span>
      <span className="text-sm font-mono font-bold text-course-400 truncate block">
        {value === null || value === "" ? "—" : value}
      </span>
    </div>
  );
}

function PeopleList({
  title,
  people,
  onOpenPerson,
}: {
  title: string;
  people: Teacher[];
  onOpenPerson: (personId: string) => void;
}) {
  if (!people || people.length === 0) return null;
  return (
    <div>
      <h4 className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-3">{title}</h4>
      <div className="flex flex-wrap gap-2">
        {people.map((teacher, i) =>
          teacher.person ? (
            <button
              key={`${teacher.name}-${i}`}
              onClick={() => onOpenPerson(teacher.person!.id)}
              className="inline-flex items-center gap-2 border border-course-500/40 bg-course-500/5 hover:bg-course-500/10 hover:border-course-500 px-3 py-2 text-xs font-mono text-course-300 hover:text-white transition-all cursor-pointer group"
              title="Open directory profile"
            >
              <UserRound className="w-3.5 h-3.5 text-course-500 shrink-0" />
              {teacher.name}
              <ArrowUpRight className="w-3 h-3 text-course-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          ) : (
            <span
              key={`${teacher.name}-${i}`}
              className="inline-flex items-center gap-2 border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-mono text-zinc-300"
              title="No directory profile matches this name yet"
            >
              <UserRound className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
              {teacher.name}
            </span>
          )
        )}
      </div>
    </div>
  );
}

export default function CourseDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [course, setCourse] = useState<CourseDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCourse = useCallback(() => {
    if (!id) return;
    fetchPrivate(`/courses/${id}`)
      .then((data) => {
        setCourse(data);
        document.title = data.code ? `${data.code} — ${data.title}` : data.title;
      })
      .catch((err) => {
        console.error("Error fetching course details", err);
        setError("Course not found.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  if (!loading && (error || !course)) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col font-mono uppercase text-xs tracking-widest">
        <div className="flex-1 flex flex-col items-center justify-center pt-20">
          <p className="text-zinc-500">{error || "COURSE_OFFLINE"}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 text-course-500 hover:text-white transition-colors border border-course-500/30 px-4 py-2 bg-course-500/5"
          >
            Return
          </button>
        </div>
      </div>
    );
  }

  if (!course) return <div className="min-h-screen bg-zinc-950" />;

  const extraSections = Object.entries(course.extra_sections || {}).filter(
    ([, value]) => value && String(value).trim()
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24 selection:bg-course-500/30 font-sans">
      {/* Ambient Background */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[10%] right-[10%] w-[30%] h-[40%] blur-[150px] rounded-none mix-blend-screen opacity-20 bg-course-600/10" />
      </div>

      <main className="relative z-10 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 mt-4 sm:mt-8">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.back()}
            className="group text-zinc-500 hover:text-zinc-100 font-mono uppercase text-[10px] tracking-widest rounded-none p-0 flex items-center transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Go Back
          </button>

          {course.url && (
            <a
              href={course.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group text-zinc-500 hover:text-course-400 font-mono uppercase text-[10px] tracking-widest flex items-center gap-2 transition-colors"
            >
              Official course sheet
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {/* Header Card */}
        <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/60 p-8 mb-10 relative shadow-2xl flex flex-col md:flex-row items-center md:items-start gap-10 rounded-none overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-course-500" />

          <div className="w-28 h-28 bg-zinc-900 flex flex-shrink-0 items-center justify-center overflow-hidden border border-zinc-800 shadow-inner rounded-none relative">
            <BookOpen className="w-14 h-14 text-course-500" />
            <div className="absolute inset-0 border border-white/5 pointer-events-none" />
          </div>

          <div className="flex-1 text-center md:text-left space-y-5 min-w-0">
            <p className="text-xs font-mono text-course-500 uppercase tracking-widest font-bold">
              {course.code || `REF:${course.external_id}`}
            </p>
            <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter mix-blend-difference break-words">
              {course.title}
            </h1>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              {course.school_labels.map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-950 border border-zinc-800"
                >
                  <span className="w-1.5 h-1.5 bg-course-500" />
                  <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">
                    {label}
                  </span>
                </span>
              ))}
              {course.domaine && (
                <span className="px-3 py-1 bg-course-500/5 border border-course-500/20 text-[10px] font-mono font-bold text-course-400 uppercase tracking-widest">
                  {course.domaine}
                </span>
              )}
            </div>

            {course.departements.length > 0 && (
              <p className="text-xs text-zinc-500 font-mono uppercase tracking-tight border-l-2 border-zinc-800 pl-4 text-left">
                {course.departements.join(" · ")}
              </p>
            )}
          </div>
        </div>

        {/* Key facts */}
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-1.5 mb-10">
          <StatCell label="ECTS" value={course.credits_ects} />
          <StatCell label="Level" value={course.niveau} />
          <StatCell label="Cycle" value={course.graduate} />
          <StatCell label="Period" value={course.periode} />
          <StatCell label="Hours" value={course.heures_programmees} />
          <StatCell label="Coefficient" value={course.coefficient} />
          <StatCell label="Campus" value={course.lieu} />
        </div>

        {/* Teaching staff */}
        {(course.responsables.length > 0 || course.equipe_pedagogique.length > 0) && (
          <div className="border border-zinc-800/60 bg-zinc-900/30 backdrop-blur-xl p-6 mb-10 space-y-6">
            <PeopleList
              title="Course leaders"
              people={course.responsables}
              onOpenPerson={(personId) => router.push(`/palantint/students/${personId}`)}
            />
            <PeopleList
              title="Teaching team"
              people={course.equipe_pedagogique}
              onOpenPerson={(personId) => router.push(`/palantint/students/${personId}`)}
            />
            <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest pt-2 border-t border-zinc-800/60">
              Highlighted names have a directory profile — the others link automatically once added.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <TextSection title="Introduction" body={course.introduction} />
            <TextSection title="Objectifs" body={course.objectif} />
            <TextSection title="Contenu" body={course.contenu} />
            <TextSection title="Plan du cours" body={course.plan_cours} />
            <TextSection title="Description" body={course.description} />
            <TextSection title="Évaluations" body={course.evaluations} />
            <TextSection title="Charge de travail" body={course.charge_travail_etudiant} />
          </div>

          <div className="space-y-6">
            <div className="border border-zinc-800/60 bg-zinc-900/30 backdrop-blur-xl p-6 space-y-4">
              <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3">
                <span className="w-1.5 h-4 bg-course-500" />
                Administration
              </h3>
              {[
                ["Langue", course.langue_enseignement],
                ["Programme", course.programme],
                ["Public visé", course.population],
                ["Organisation", course.organisation],
                ["Calcul de la moyenne", course.mode_calcul_moyenne],
                ["Calcul des crédits", course.mode_calcul_credits],
              ]
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label as string} className="border-b border-zinc-800/60 pb-3">
                    <span className="block text-[9px] text-zinc-600 font-mono uppercase tracking-widest mb-1">
                      {label}
                    </span>
                    <span className="text-xs text-zinc-300 font-mono whitespace-pre-line">
                      {value}
                    </span>
                  </div>
                ))}
            </div>

            {extraSections.map(([key, value]) => (
              <TextSection key={key} title={humanizeKey(key)} body={String(value)} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
