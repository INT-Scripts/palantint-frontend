export interface Apartment {
  Logement: string;
  Bâtiment: string;
  Etage: number | string;
  Type: string;
  Superficie: number;
  Tarif: number;
  "Allocation boursier": number;
  "Allocation non boursier": number;
  _req_b: boolean;
  _req_e: boolean;
}

export function parseNumeric(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  const cleaned = String(val).replace(",", ".").replace(/[^\d.-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function matchFloor(apt: Apartment, targetFloor: string): boolean {
  if (!targetFloor || targetFloor === "ALL") return true;
  const rawFloor = String(apt.Etage ?? "").trim();
  if (rawFloor === targetFloor) return true;
  const numApt = parseFloat(rawFloor);
  const numTarget = parseFloat(targetFloor);
  if (!isNaN(numApt) && !isNaN(numTarget) && numApt === numTarget) return true;
  if (targetFloor === "0") {
    const lower = rawFloor.toLowerCase();
    if (lower.includes("rdc") || lower.includes("rez")) return true;
  }
  const extracted = rawFloor.match(/-?\d+(\.\d+)?/);
  if (extracted && extracted[0] === targetFloor) return true;
  if (apt.Logement && apt.Logement.length === 4) {
    if (apt.Logement.charAt(1) === targetFloor) return true;
  }
  return false;
}
