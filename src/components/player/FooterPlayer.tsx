"use client";

import { usePlayer } from "./PlayerContext";
import { ReportModal } from "../report/ReportModal";
import { Play, Pause, SkipForward, SkipBack, Volume2, ChevronUp, ChevronDown, ListMusic, Repeat, Flag } from "lucide-react";
import clsx from "clsx";
import { useState } from "react";

export function FooterPlayer() {
    const { currentTrack, isPlaying, toggle, currentTime, duration, seek, next, prev, queue, currentIndex, playQueue, autoplay, toggleAutoplay, isMuted, toggleMute } = usePlayer();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isReportOpen, setIsReportOpen] = useState(false);

    const formatTime = (time: number) => {
        if (!time) return "0:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    if (!currentTrack) return null;

    const progress = duration ? (currentTime / duration) * 100 : 0;

    return (
        <>
            <ReportModal
                isOpen={isReportOpen}
                onClose={() => setIsReportOpen(false)}
                songId={currentTrack.id}
            />

            {/* --- EXPANDED MODE (Full Screen Overlay) --- */}
            <div
                className={clsx(
                    "fixed inset-0 z-50 bg-clay-bg flex flex-col overflow-y-auto transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
                    isExpanded ? "translate-y-0" : "translate-y-full"
                )}
            >
                {/* Header */}
                <div className="p-6 flex items-center justify-between">
                    <button
                        onClick={() => setIsExpanded(false)}
                        className="p-2 border-2 border-transparent hover:border-black rounded-full transition-all"
                    >
                        <ChevronDown size={32} />
                    </button>
                    <span className="font-black uppercase tracking-widest text-sm opacity-50">Now Playing</span>

                    {/* Report Button */}
                    <button
                        onClick={() => setIsReportOpen(true)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors flex items-center gap-2"
                        title="Report Song"
                    >
                        <Flag size={20} />
                        <span className="font-bold text-xs uppercase hidden md:inline">Report</span>
                    </button>
                </div>

                <div className="flex-1 max-w-4xl mx-auto w-full p-6 flex flex-col md:flex-row gap-12">
                    {/* Left: Cover & Info */}
                    <div className="flex-1 flex flex-col justify-center items-center text-center">
                        <div className="w-64 h-64 md:w-96 md:h-96 bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000000] mb-8 relative overflow-hidden">
                            {currentTrack.image ? (
                                <img src={currentTrack.image} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-clay-primary opacity-20" />
                            )}
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black uppercase italic leading-none mb-2">{currentTrack.name}</h2>
                        <p className="text-xl font-bold opacity-60">{currentTrack.artist_name}</p>
                    </div>

                    {/* Right: Controls & Queue */}
                    <div className="flex-1 flex flex-col justify-center gap-8">
                        {/* Progress */}
                        <div className="w-full">
                            <div
                                className="w-full h-4 bg-white border-2 border-black rounded-full overflow-hidden cursor-pointer relative group"
                                onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const p = (e.clientX - rect.left) / rect.width;
                                    if (duration) seek(p * duration);
                                }}
                            >
                                <div className="h-full bg-clay-primary absolute top-0 left-0" style={{ width: `${progress}%` }} />
                            </div>
                            <div className="flex justify-between mt-2 font-mono font-bold text-sm">
                                <span>{formatTime(currentTime)}</span>
                                <span>{formatTime(duration)}</span>
                            </div>
                        </div>

                        {/* Main Controls */}
                        <div className="flex items-center justify-center gap-8">
                            <button onClick={prev} className="p-4 hover:scale-110 transition-transform">
                                <SkipBack size={32} fill="currentColor" />
                            </button>
                            <button
                                onClick={toggle}
                                className="w-20 h-20 bg-black text-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl"
                            >
                                {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" />}
                            </button>
                            <button onClick={next} className="p-4 hover:scale-110 transition-transform">
                                <SkipForward size={32} fill="currentColor" />
                            </button>
                        </div>

                        {/* Toggles (Mute & Autoplay) */}
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={toggleMute}
                                className={clsx(
                                    "flex items-center gap-2 px-4 py-2 border-2 border-black font-bold uppercase text-xs transition-all",
                                    isMuted ? "bg-red-500 text-white shadow-[2px_2px_0px_0px_black]" : "hover:bg-black/5"
                                )}
                            >
                                {isMuted ? <Volume2 size={14} className="opacity-50" /> : <Volume2 size={14} />}
                                {isMuted ? "MUTED" : "MUTE"}
                            </button>
                            <button
                                onClick={toggleAutoplay}
                                className={clsx(
                                    "flex items-center gap-2 px-4 py-2 border-2 border-black font-bold uppercase text-xs transition-all",
                                    autoplay ? "bg-clay-secondary shadow-[2px_2px_0px_0px_black]" : "opacity-50 hover:opacity-100"
                                )}
                            >
                                <Repeat size={14} /> Autoplay: {autoplay ? "ON" : "OFF"}
                            </button>
                        </div>

                        {/* Queue Preview */}
                        <div className="mt-8 border-t-4 border-black pt-8">
                            <h3 className="font-black uppercase mb-4 flex items-center gap-2">
                                <ListMusic /> Next Up {queue.length > 0 && <span className="text-xs opacity-50">({queue.length - (currentIndex + 1)})</span>}
                            </h3>
                            <div className="h-64 overflow-y-auto space-y-2 border-2 border-black p-2 bg-white">
                                {queue.slice(currentIndex + 1).map((track, i) => (
                                    <div key={i} className="flex items-center gap-3 p-2 hover:bg-gray-100 cursor-pointer" onClick={() => playQueue(queue, currentIndex + 1 + i)}>
                                        <img src={track.image || "https://placehold.co/40"} className="w-10 h-10 border border-black object-cover" />
                                        <div className="flex-1 overflow-hidden">
                                            <p className="font-bold text-sm truncate">{track.name}</p>
                                            <p className="text-xs opacity-60 truncate">{track.artist_name}</p>
                                        </div>
                                    </div>
                                ))}
                                {queue.length > 0 && queue.slice(currentIndex + 1).length === 0 && <p className="opacity-50 text-center py-4">End of queue.</p>}
                                {queue.length === 0 && <p className="opacity-50 text-center py-4">Autoplay will find new vibes...</p>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- MINIMIZED MODE --- */}
            <div
                className={clsx(
                    "fixed bottom-0 left-0 right-0 h-24 bg-clay-bg border-t-2 border-black z-[60] flex items-center justify-between px-8 shadow-[0_-4px_10px_rgba(0,0,0,0.1)] cursor-pointer hover:bg-[#eae6db] transition-transform duration-300",
                    isExpanded ? "translate-y-full" : "translate-y-0"
                )}
                onClick={() => setIsExpanded(true)}
            >
                {/* Track Info */}
                <div className="flex items-center gap-4 w-1/3">
                    <div className="w-16 h-16 bg-black/10 border-2 border-black flex-shrink-0 relative group">
                        {currentTrack.image && <img src={currentTrack.image} alt={currentTrack.name} className="w-full h-full object-cover" />}
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <ChevronUp className="text-white" />
                        </div>
                    </div>
                    <div>
                        <h3 className="font-bold text-lg truncate leading-tight">{currentTrack.name}</h3>
                        <p className="text-sm opacity-70 truncate">{currentTrack.artist_name}</p>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex flex-col items-center w-1/3 gap-2" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-6">
                        <button onClick={prev} className="p-2 hover:scale-110 transition-transform">
                            <SkipBack size={24} fill="currentColor" />
                        </button>
                        <button
                            onClick={toggle}
                            className="w-12 h-12 bg-clay-primary text-white border-2 border-black shadow-[3px_3px_0px_0px_#000000] flex items-center justify-center hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_#000000] active:translate-y-[3px] active:shadow-none transition-all"
                        >
                            {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                        </button>
                        <button onClick={next} className="p-2 hover:scale-110 transition-transform">
                            <SkipForward size={24} fill="currentColor" />
                        </button>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full flex items-center gap-3">
                        <span className="text-xs font-mono font-bold w-10 text-right">{formatTime(currentTime)}</span>
                        <div
                            className="flex-1 h-3 bg-white border-2 border-black rounded-full overflow-hidden relative group cursor-pointer"
                            onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = e.clientX - rect.left;
                                const p = x / rect.width;
                                if (duration) seek(p * duration);
                            }}
                        >
                            <div
                                className="h-full bg-clay-primary absolute top-0 left-0"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <span className="text-xs font-mono font-bold w-10">{formatTime(duration)}</span>
                    </div>
                </div>

                {/* Volume / Extra */}
                <div className="w-1/3 flex justify-end gap-4" onClick={e => e.stopPropagation()}>
                    <button onClick={toggleMute} className="p-2 hover:bg-black/5 rounded-full" title={isMuted ? "Unmute" : "Mute"}>
                        {isMuted ? <Volume2 size={24} className="text-red-500" /> : <Volume2 size={24} />}
                    </button>
                    <button onClick={() => setIsExpanded(true)} className="p-2 hover:bg-black/5 rounded-full" title="Expand">
                        <ListMusic size={24} />
                    </button>
                </div>
            </div>
        </>
    );
}
