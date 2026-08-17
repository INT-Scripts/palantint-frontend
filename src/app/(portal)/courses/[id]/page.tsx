"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fetchPublic } from "@/lib/api";
import { ArrowLeft, BookOpen, ExternalLink, UserRound } from "lucide-react";

interface Teacher {
  name: string;
  role: string;
  url: string | null;
}

interface CourseDetails {
  id: string;
  external_id: string;
  code: string | null;
  title: string;
  url: string | null;
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
    <section className="rounded-2xl border border-zinc-200/80 dark:border-stone-800/60 bg-white/80 dark:bg-stone-900/70 backdrop-blur-sm p-5 sm:p-6 shadow-sm">
      <h2 className="font-semibold text-zinc-900 dark:text-stone-100 mb-3">{title}</h2>
      <p className="text-sm text-zinc-600 dark:text-stone-400 leading-relaxed whitespace-pre-line">
        {body}
      </p>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="rounded-xl border border-zinc-200/80 dark:border-stone-800/60 bg-white/70 dark:bg-stone-900/60 px-4 py-3">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-stone-500 font-semibold">
        {label}
      </p>
      <p className="text-sm font-semibold text-zinc-900 dark:text-stone-100 truncate">
        {value === null || value === "" ? "—" : value}
      </p>
    </div>
  );
}

export default function PublicCourseDetailsPage() {
  const { id } = useParams();
  const [course, setCourse] = useState<CourseDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCourse = useCallback(() => {
    if (!id) return;
    fetchPublic(`/courses/${id}`)
      .then((data) => {
        setCourse(data);
        document.title = data.code ? `${data.code} — ${data.title}` : data.title;
      })
      .catch(() => setError("This course could not be found."))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  if (loading) {
    return (
      <section className="flex-1 max-w-5xl w-full mx-auto px-4 py-24 text-center text-sm text-zinc-500 dark:text-stone-400 animate-pulse">
        Loading the course sheet…
      </section>
    );
  }

  if (error || !course) {
    return (
      <section className="flex-1 max-w-5xl w-full mx-auto px-4 py-24 text-center space-y-4">
        <p className="text-zinc-500 dark:text-stone-400 text-sm">{error || "Course not found."}</p>
        <Link
          href="/courses"
          className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to the catalog
        </Link>
      </section>
    );
  }

  const allTeachers = [...course.responsables, ...course.equipe_pedagogique];
  const extraSections = Object.entries(course.extra_sections || {}).filter(
    ([, value]) => value && String(value).trim()
  );

  return (
    <section className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 relative z-10 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/courses"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 dark:text-stone-400 hover:text-zinc-900 dark:hover:text-stone-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Course catalog
        </Link>
        {course.url && (
          <a
            href={course.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-zinc-500 dark:text-stone-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            Official course sheet <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* Header */}
      <div className="rounded-2xl border border-zinc-200/80 dark:border-stone-800/60 bg-white/80 dark:bg-stone-900/70 backdrop-blur-sm p-6 sm:p-8 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 shrink-0 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100/60 dark:border-indigo-900/20">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              {course.code || `#${course.external_id}`}
            </p>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-zinc-950 dark:text-stone-50 mt-1">
              {course.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-4">
              {course.school_labels.map((label) => (
                <span
                  key={label}
                  className="text-xs font-semibold px-2.5 py-1 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300"
                >
                  {label}
                </span>
              ))}
              {course.domaine && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400">
                  {course.domaine}
                </span>
              )}
            </div>
            {course.departements.length > 0 && (
              <p className="text-sm text-zinc-500 dark:text-stone-400 mt-3">
                {course.departements.join(" · ")}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Key facts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <Stat label="ECTS" value={course.credits_ects} />
        <Stat label="Level" value={course.niveau} />
        <Stat label="Cycle" value={course.graduate} />
        <Stat label="Period" value={course.periode} />
        <Stat label="Hours" value={course.heures_programmees} />
        <Stat label="Coefficient" value={course.coefficient} />
        <Stat label="Campus" value={course.lieu} />
      </div>

      {allTeachers.length > 0 && (
        <div className="rounded-2xl border border-zinc-200/80 dark:border-stone-800/60 bg-white/80 dark:bg-stone-900/70 backdrop-blur-sm p-5 sm:p-6 shadow-sm">
          <h2 className="font-semibold text-zinc-900 dark:text-stone-100 mb-4">Teaching staff</h2>
          <div className="flex flex-wrap gap-2">
            {allTeachers.map((teacher, i) => (
              <span
                key={`${teacher.name}-${i}`}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/60 px-3 py-2 text-sm text-zinc-700 dark:text-stone-300"
              >
                <UserRound className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                {teacher.name}
                {teacher.role === "RESPONSABLE" && (
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-stone-500">
                    Leader
                  </span>
                )}
              </span>
            ))}
          </div>
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
          <div className="rounded-2xl border border-zinc-200/80 dark:border-stone-800/60 bg-white/80 dark:bg-stone-900/70 backdrop-blur-sm p-5 sm:p-6 shadow-sm space-y-4">
            <h2 className="font-semibold text-zinc-900 dark:text-stone-100">Administration</h2>
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
                <div
                  key={label as string}
                  className="border-b border-zinc-100 dark:border-stone-800/60 pb-3 last:border-0 last:pb-0"
                >
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-stone-500 font-semibold mb-1">
                    {label}
                  </p>
                  <p className="text-sm text-zinc-700 dark:text-stone-300 whitespace-pre-line">
                    {value}
                  </p>
                </div>
              ))}
          </div>

          {extraSections.map(([key, value]) => (
            <TextSection key={key} title={humanizeKey(key)} body={String(value)} />
          ))}
        </div>
      </div>
    </section>
  );
}
