"use client";

import { Eye } from "lucide-react";
import PalantintDetailStatCard, { PalantintStatItem } from "../../components/PalantintDetailStatCard";

export interface PalantintApartmentOccupant {
    id: string;
    first_name: string;
    last_name: string;
}

export interface PalantintApartmentDetail {
    Type?: string;
    Superficie?: number | string;
    Tarif?: number | string;
    "Allocation boursier"?: number | string;
    "Allocation non boursier"?: number | string;
}

export function parseNumeric(val: any): number {
    if (val === null || val === undefined) return 0;
    if (typeof val === "number") return isNaN(val) ? 0 : val;
    const cleaned = String(val).replace(",", ".").replace(/[^\d.-]/g, "");
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
}

interface PalantintApartmentDetailCardProps {
    roomId: string;
    detail?: PalantintApartmentDetail;
    occupants: PalantintApartmentOccupant[];
    onClose: () => void;
    onNavigateToStudent: (studentId: string) => void;
}

export default function PalantintApartmentDetailCard({
    roomId,
    detail,
    occupants,
    onClose,
    onNavigateToStudent,
}: PalantintApartmentDetailCardProps) {
    const baseRent = parseNumeric(detail?.Tarif);
    const allocBoursier = parseNumeric(detail?.["Allocation boursier"]);
    const allocNonBoursier = parseNumeric(detail?.["Allocation non boursier"]);
    const netBoursier = baseRent > 0 && allocBoursier > 0 ? baseRent - allocBoursier : baseRent || 0;
    const netNonBoursier = baseRent > 0 && allocNonBoursier > 0 ? baseRent - allocNonBoursier : baseRent || 0;
    const surf = parseNumeric(detail?.Superficie);

    const stats: PalantintStatItem[] | undefined = detail
        ? [
              { label: "Type", value: detail.Type || "—", valueClassName: "uppercase" },
              { label: "Superficie", value: surf > 0 ? `${surf} m²` : detail.Superficie || "-" },
              {
                  label: "Loyer Brut",
                  value: baseRent > 0 ? `${baseRent} €/mois` : detail.Tarif || "-",
                  span: 2,
                  variant: "accent",
              },
              {
                  label: `Boursier (-${allocBoursier}€ APL/ALS)`,
                  value: netBoursier > 0 ? `${netBoursier} €/m` : "-",
                  valueClassName: "text-emerald-400",
              },
              {
                  label: `Non-Boursier (-${allocNonBoursier}€ APL/ALS)`,
                  value: netNonBoursier > 0 ? `${netNonBoursier} €/m` : "-",
              },
          ]
        : undefined;

    return (
        <PalantintDetailStatCard
            accentColor="housing"
            title={`Logement ${roomId}`}
            onClose={onClose}
            stats={stats}
            footer={
                occupants.length > 0 ? (
                    <div className="pt-2 border-t border-zinc-800/60 space-y-1 font-mono">
                        <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest font-black block mb-1">
                            Occupants enregistrés
                        </span>
                        {occupants.map((o) => (
                            <button
                                key={o.id}
                                onClick={() => onNavigateToStudent(o.id)}
                                className="w-full text-left text-[11px] font-mono text-zinc-300 hover:text-housing-400 truncate uppercase border border-zinc-800 p-1.5 bg-black/40 hover:bg-zinc-900 transition-colors flex items-center justify-between cursor-pointer"
                            >
                                <span>{o.first_name} {o.last_name}</span>
                                <Eye className="w-3 h-3 text-zinc-500" />
                            </button>
                        ))}
                    </div>
                ) : undefined
            }
        />
    );
}
