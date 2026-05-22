"use client";

import { useEffect } from "react";
import PageHeader from "@/components/PageHeader";
import { Layers, MapPin, ZoomIn } from "lucide-react";
import { Box } from "@/components/ui/box";
import LocalPhotogrammetryMap from "./components/LocalPhotogrammetryMap";

export default function Campus3DPage() {
    useEffect(() => {
        document.title = "Campus 3D | PalantINT";
    }, []);

    return (
        <div className="min-h-screen bg-zinc-950 selection:bg-campus-500/30 font-sans">
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[20%] left-[-10%] w-[30%] h-[50%] bg-campus-600/10 blur-[150px] mix-blend-screen" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[40%] bg-campus-600/10 blur-[150px] mix-blend-screen" />
                </div>

                <main className="relative z-10 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 mt-4 sm:mt-8 pb-32">
                <div className="space-y-12">
                    <PageHeader
                        badgeText="Satellite Data // Active"
                        title1="Campus"
                        title2="Digital Twin"
                        titleGradient="from-campus-400 to-campus-600"
                        subtitle="High-density 3D geometric reconstruction of the campus environment from PalantINT's space telescope data."
                        colorName="campus"
                    />

                    <Box 
                        className="w-full h-[800px] p-1"
                        contentClassName="bg-zinc-950/80 w-full h-full"
                        title="Campus 3D Map"
                        icon={<MapPin className="w-4 h-4 text-campus-500" />}
                    >
                        <LocalPhotogrammetryMap />
                    </Box>
                </div>
            </main>
        </div>
    );
}
