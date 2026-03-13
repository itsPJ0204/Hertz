"use client";

import { usePlayer } from '@/components/player/PlayerContext';
import { Mic, MicOff } from 'lucide-react';
import clsx from 'clsx';

export function NoiseReductionToggle() {
    const { isNoiseReductionEnabled, toggleNoiseReduction } = usePlayer();

    return (
        <button
            onClick={toggleNoiseReduction}
            className={clsx(
                "flex items-center gap-2 px-4 py-2 border-2 transition-all font-bold uppercase text-xs md:text-sm group focus:outline-none",
                isNoiseReductionEnabled 
                    ? "bg-black text-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]" 
                    : "bg-[#E8E4D9] hover:bg-white text-black border-black hover:-translate-y-1 shadow-[4px_4px_0px_0px_#000000]"
            )}
            title={isNoiseReductionEnabled ? "Disable Adaptive Noise Reduction" : "Enable Adaptive Noise Reduction"}
        >
            {isNoiseReductionEnabled ? (
                <>
                    <Mic className="animate-pulse text-green-400" size={18} />
                    <span>Adaptive Noise: <span className="text-green-400">ON</span></span>
                </>
            ) : (
                <>
                    <MicOff className="opacity-70 group-hover:opacity-100 transition-opacity" size={18} />
                    <span>Adaptive Noise: <span className="opacity-70 group-hover:opacity-100 transition-opacity">OFF</span></span>
                </>
            )}
        </button>
    );
}
