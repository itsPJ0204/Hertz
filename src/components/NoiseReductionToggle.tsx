"use client";

import { usePlayer } from '@/components/player/PlayerContext';
import { Mic, MicOff, X, Settings, CheckCircle2, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { useState, useEffect } from 'react';

const SETUP_DONE_KEY = 'hertz_noise_reduction_setup_done';

export function NoiseReductionToggle() {
    const { isNoiseReductionEnabled, toggleNoiseReduction } = usePlayer();
    const [showSetupModal, setShowSetupModal] = useState(false);
    const [activeStep, setActiveStep] = useState(0);
    const [isSetupComplete, setIsSetupComplete] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsSetupComplete(localStorage.getItem(SETUP_DONE_KEY) === 'true');
        }
    }, []);

    const handleToggleClick = () => {
        if (isNoiseReductionEnabled) {
            // Turning OFF — just toggle directly
            toggleNoiseReduction();
            return;
        }

        // Turning ON — check if setup is done
        if (isSetupComplete) {
            toggleNoiseReduction();
        } else {
            setShowSetupModal(true);
            setActiveStep(0);
        }
    };

    const handleSetupComplete = () => {
        localStorage.setItem(SETUP_DONE_KEY, 'true');
        setIsSetupComplete(true);
        setShowSetupModal(false);
        toggleNoiseReduction();
    };

    const steps = [
        {
            title: "Open Windows Sound Settings",
            description: "Right-click the speaker icon in your taskbar (bottom-right) and click \"Sound settings\". Then scroll down and click \"More sound settings\".",
            detail: "This opens the classic Sound control panel where we can adjust a specific setting.",
        },
        {
            title: "Go to the Communications Tab",
            description: "In the Sound window that opens, click the \"Communications\" tab at the top.",
            detail: "This tab controls what Windows does to your audio when it detects communication activity (like a microphone being used).",
        },
        {
            title: "Select \"Do nothing\"",
            description: "Select the \"Do nothing\" radio button, then click \"OK\" to save.",
            detail: "By default, Windows reduces other sounds by 80% when a mic is active. Setting this to \"Do nothing\" ensures your music plays at full quality while Adaptive Noise is enabled.",
        },
    ];

    return (
        <>
            <button
                onClick={handleToggleClick}
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

            {/* Setup Wizard Modal */}
            {showSetupModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowSetupModal(false)}>
                    <div 
                        className="bg-[#E8E4D9] border-4 border-black shadow-[8px_8px_0px_0px_#000000] w-full max-w-lg max-h-[90vh] overflow-y-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b-4 border-black bg-black text-white">
                            <div className="flex items-center gap-3">
                                <Settings size={24} className="animate-spin-slow" />
                                <h2 className="font-black uppercase text-lg tracking-tight">One-Time Setup</h2>
                            </div>
                            <button onClick={() => setShowSetupModal(false)} className="p-1 hover:bg-white/20 transition-colors rounded">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Intro */}
                        <div className="p-6 border-b-2 border-black/20">
                            <p className="font-bold text-sm leading-relaxed">
                                Adaptive Noise uses your microphone to detect ambient sounds. Windows has a default setting that reduces audio quality when a mic is active. 
                                Let&apos;s fix that in <span className="underline">3 quick steps</span>:
                            </p>
                        </div>

                        {/* Steps */}
                        <div className="p-6 space-y-4">
                            {steps.map((step, i) => (
                                <div 
                                    key={i}
                                    className={clsx(
                                        "border-2 border-black transition-all cursor-pointer",
                                        activeStep === i 
                                            ? "bg-white shadow-[4px_4px_0px_0px_#000000]" 
                                            : activeStep > i 
                                                ? "bg-green-50 border-green-600 opacity-70"
                                                : "bg-white/50 opacity-50 hover:opacity-70"
                                    )}
                                    onClick={() => setActiveStep(i)}
                                >
                                    <div className="p-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            {activeStep > i ? (
                                                <CheckCircle2 size={22} className="text-green-600 flex-shrink-0" />
                                            ) : (
                                                <div className={clsx(
                                                    "w-6 h-6 border-2 border-black flex items-center justify-center font-black text-xs flex-shrink-0",
                                                    activeStep === i && "bg-black text-white"
                                                )}>
                                                    {i + 1}
                                                </div>
                                            )}
                                            <h3 className="font-black uppercase text-sm">{step.title}</h3>
                                        </div>
                                        {activeStep === i && (
                                            <div className="ml-9 space-y-2 animate-in fade-in duration-200">
                                                <p className="text-sm font-semibold">{step.description}</p>
                                                <p className="text-xs opacity-60 italic">{step.detail}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Footer Actions */}
                        <div className="p-6 border-t-4 border-black flex items-center justify-between gap-4">
                            {activeStep < steps.length - 1 ? (
                                <>
                                    <button 
                                        onClick={() => setShowSetupModal(false)}
                                        className="px-4 py-2 border-2 border-black font-bold uppercase text-xs hover:bg-black/5 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={() => setActiveStep(prev => prev + 1)}
                                        className="flex items-center gap-2 px-6 py-3 bg-black text-white border-2 border-black font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] active:shadow-none transition-all"
                                    >
                                        Next Step <ChevronRight size={18} />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button 
                                        onClick={() => setShowSetupModal(false)}
                                        className="px-4 py-2 border-2 border-black font-bold uppercase text-xs hover:bg-black/5 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleSetupComplete}
                                        className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white border-2 border-black font-black uppercase text-sm shadow-[4px_4px_0px_0px_#000000] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#000000] active:shadow-none transition-all"
                                    >
                                        <CheckCircle2 size={18} /> Done — Enable Adaptive Noise
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
