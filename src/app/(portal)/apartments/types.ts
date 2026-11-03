export interface Apartment {
  Logement: string;
  plan: {building:string;floor:string} | null;
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
  return apt.plan?.floor === targetFloor;
}
