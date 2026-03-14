"use client";

import React, { useEffect, useRef } from 'react';
import { usePlayer } from './PlayerContext';
import { initVideoMode, destroyVideoMode } from '@/lib/videoMode';
import { X } from 'lucide-react';

interface VideoModeVisualizerProps {
    onClose: () => void;
}

const VideoModeVisualizer: React.FC<VideoModeVisualizerProps> = ({ onClose }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { audioElement, currentTrack, mediaSourceNode, musicAudioContext } = usePlayer();

    useEffect(() => {
        const canvas = canvasRef.current;

        if (audioElement && canvas && mediaSourceNode && musicAudioContext) {
            const genres = currentTrack?.musicinfo?.tags?.genres || [];
            initVideoMode(musicAudioContext, mediaSourceNode, canvas, genres);
        }

        return () => {
            destroyVideoMode();
        };
    }, [audioElement, currentTrack, mediaSourceNode, musicAudioContext]);

    return (
        <div className="fixed inset-0 z-[9999] bg-black">
            <canvas
                ref={canvasRef}
                className="w-full h-full block"
            />

            {/* Overlay Controls */}
            <div className="absolute top-6 right-6 z-50">
                <button
                    onClick={onClose}
                    className="p-3 bg-black/50 hover:bg-black/80 text-white rounded-full backdrop-blur-md transition-all border border-white/10 group"
                    aria-label="Exit Video Mode"
                >
                    <X className="w-6 h-6 group-hover:scale-110 transition-transform" />
                </button>
            </div>

            {/* Song Info Overlay (Optional, for better UX) */}
            <div className="absolute bottom-24 left-6 z-50 pointer-events-none">
                {/* Could add track info here later */}
            </div>
        </div>
    );
};

export default VideoModeVisualizer;
