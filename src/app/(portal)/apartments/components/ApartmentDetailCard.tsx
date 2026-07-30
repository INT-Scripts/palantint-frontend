"use client";

import DirectoryDetailCard, { PortalStatItem } from "../../components/DirectoryDetailCard";
import { Apartment, parseNumeric } from "../types";

interface ApartmentDetailCardProps {
  apartment: Apartment;
  activeFloor: string;
  onClose: () => void;
}

export default function ApartmentDetailCard({ apartment, activeFloor, onClose }: ApartmentDetailCardProps) {
  const baseRent = parseNumeric(apartment.Tarif);
  const allocBoursier = parseNumeric(apartment["Allocation boursier"]);
  const allocNonBoursier = parseNumeric(apartment["Allocation non boursier"]);
  const netBoursier = baseRent > 0 && allocBoursier > 0 ? baseRent - allocBoursier : (baseRent || 0);
  const netNonBoursier = baseRent > 0 && allocNonBoursier > 0 ? baseRent - allocNonBoursier : (baseRent || 0);
  const surf = parseNumeric(apartment.Superficie);

  const stats: PortalStatItem[] = [
    { label: "Localisation", value: `${apartment.Bâtiment} — F${activeFloor}` },
    { label: "Superficie", value: surf > 0 ? `${surf} m²` : (apartment.Superficie || "-") },
    { label: "Loyer Brut (Base)", value: baseRent > 0 ? `${baseRent} €/mois` : (apartment.Tarif || "-"), span: 2, variant: "accent" },
    { label: "Boursier", value: netBoursier > 0 ? `${netBoursier} €` : "—", variant: "success" },
    { label: "Non-Boursier", value: netNonBoursier > 0 ? `${netNonBoursier} €` : "—" },
  ];

  return (
    <DirectoryDetailCard
      accentColor="amber"
      title={`Logement ${apartment.Logement}`}
      badge={apartment.Type || "Chambre"}
      onClose={onClose}
      stats={stats}
    />
  );
}
