"use client";

import React, { useEffect, useRef } from 'react';
import { usePlayer } from './PlayerContext';
import { initAudioAnalyzer, getAnalyser } from '@/lib/audioAnalyzer';

export function AmbientModeEffect() {
    const { audioElement, isPlaying } = usePlayer();
    const requestRef = useRef<number | null>(null);

    // Smooth variables
    const smoothBass = useRef(0);
    const hueRef = useRef(200);

    useEffect(() => {
        if (!audioElement) return;

        // Ensure the analyzer is hooked up to the player's audio
        initAudioAnalyzer(audioElement);

        const analyser = getAnalyser();
        if (!analyser) return;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const animate = () => {
            requestRef.current = requestAnimationFrame(animate);

            if (!isPlaying) {
                // Decay the effect slowly if paused
                smoothBass.current *= 0.95;
            } else {
                analyser.getByteFrequencyData(dataArray);

                // Calculate bass (indices 0 to 10 for low frequencies)
                let bassSum = 0;
                for (let i = 0; i < 10; i++) {
                    bassSum += dataArray[i];
                }
                const bassAvg = bassSum / 10;
                const normBass = bassAvg / 255;

                // Smooth it slightly for the UI (keep a base smooth for glow, but use sharper values for beat)
                smoothBass.current = smoothBass.current * 0.8 + normBass * 0.2;

                // Slowly cycle hue over time for variety
                hueRef.current = (hueRef.current + 0.1) % 360;

                // Create a sharper "heartbeat" peak
                const beatPeak = normBass > 0.6 ? normBass : smoothBass.current;

                // Expose values to CSS Variables
                // Base intensity that spikes heavily on beat (deep breaths)
                const intensity = Math.max(0.5, beatPeak * 4.0);
                const spread = Math.max(0.3, beatPeak * 2.5);

                document.documentElement.style.setProperty('--ambient-intensity', intensity.toFixed(3));
                document.documentElement.style.setProperty('--ambient-spread', spread.toFixed(3));
                document.documentElement.style.setProperty('--ambient-hue', hueRef.current.toFixed(1));
            }
        };

        requestRef.current = requestAnimationFrame(animate);

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            // reset variables on unmount
            document.documentElement.style.setProperty('--ambient-intensity', '0');
            document.documentElement.style.setProperty('--ambient-spread', '0');
        };
    }, [audioElement, isPlaying]);

    // We render a small hidden div just to have a valid React node, 
    // though returning null is usually fine, sometimes React 18 strict mode 
    // prefers a stable node if it's being conditionally mounted.
    return <div className="hidden ambient-effect-layer" aria-hidden="true" />;
}
