export interface FloorDef {
  label: string;
  value: string;
  assets: {geojson: string};
}
export type BuildingFloors = Record<string, FloorDef[]>;
export type BuildingCatalog = {housing: BuildingFloors; foyer: BuildingFloors; all: BuildingFloors; laundry: string[]};
