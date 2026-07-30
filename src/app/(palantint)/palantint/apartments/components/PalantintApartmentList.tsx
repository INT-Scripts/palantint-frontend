"use client";

import { PalantintApartmentOccupant } from "./PalantintApartmentDetailCard";

interface PalantintApartmentListProps {
    apartments: string[];
    occupied: Record<string, PalantintApartmentOccupant[]>;
    selectedRoomId: string | null;
    onSelectRoom: (roomId: string) => void;
}

export default function PalantintApartmentList({
    apartments,
    occupied,
    selectedRoomId,
    onSelectRoom,
}: PalantintApartmentListProps) {
    return (
        <div>
            {apartments.map((apt) => (
                <div
                    key={apt}
                    className={`border-b border-zinc-800/30 p-4 transition-all cursor-pointer ${
                        selectedRoomId === apt ? "bg-housing-500/5 border-l-2 border-housing-500" : "hover:bg-zinc-900/40 border-l-2 border-transparent"
                    }`}
                    onClick={() => onSelectRoom(apt)}
                >
                    <div className="flex items-center justify-between font-mono">
                        <span className="text-sm font-bold text-white">{apt}</span>
                        <span className="text-[10px] text-zinc-500">{occupied[apt]?.length || 0} residents</span>
                    </div>
                </div>
            ))}
        </div>
    );
}
