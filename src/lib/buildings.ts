export interface FloorDef {
  label: string;
  value: string;
}

// Foyer building: F0 is the basement level, physically BELOW F1, which is
// the actual rez-de-chaussée (ground floor). Room ids in the data (F0-*, F1-*)
// and plan assets (Foyer_0.svg/png, Foyer_1.svg/png) keep using "0"/"1" as
// values — only the display labels reflect the real floor order.
export const FOYER_BUILDINGS: Record<string, FloorDef[]> = {
  Foyer: [
    { label: "Sous-sol (F0)", value: "0" },
    { label: "Rez-de-chaussée (F1)", value: "1" },
  ],
};

export const APARTMENT_BUILDINGS: Record<string, FloorDef[]> = {
  U1: [{ label: "RDC", value: "0" }, { label: "1er", value: "1" }, { label: "2e", value: "2" }, { label: "3e", value: "3" }, { label: "4e", value: "4" }, { label: "5e", value: "5" }],
  U2: [{ label: "1er", value: "1" }, { label: "2e", value: "2" }, { label: "3e", value: "3" }, { label: "4e", value: "4" }, { label: "5e", value: "5" }],
  U3: [{ label: "RDC", value: "0" }, { label: "1er", value: "1" }, { label: "2e", value: "2" }],
  U4: [{ label: "1er", value: "1" }, { label: "2e", value: "2" }, { label: "3e", value: "3" }, { label: "4e", value: "4" }, { label: "5e", value: "5" }, { label: "6e", value: "6" }],
  U5: [{ label: "RDC -", value: "-0.5" }, { label: "RDC +", value: "0.5" }, { label: "1er", value: "1" }, { label: "2e", value: "2" }, { label: "3e", value: "3" }, { label: "4e", value: "4" }],
  U6: [{ label: "1er", value: "1" }, { label: "2e", value: "2" }, { label: "3e", value: "3" }],
  U7: [{ label: "1er", value: "1" }, { label: "2e", value: "2" }, { label: "3e", value: "3" }, { label: "4e", value: "4" }, { label: "5e", value: "5" }, { label: "6e", value: "6" }],
};
