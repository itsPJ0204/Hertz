"use client";

import React, { useEffect, useRef } from 'react';
import { usePlayer } from './PlayerContext';
import { initAudioAnalyzer, getAnalyser } from '@/lib/audioAnalyzer';

export function TranceModeEffect() {
    const { audioElement, isPlaying } = usePlayer();
    const requestRef = useRef<number | null>(null);

    // Smooth variables
    const smoothBass = useRef(0);
    const hueRef = useRef(Math.random() * 360);

    // Each target element (up to ~6 different groups) gets its own random target coordinate
    // To make it flow, we interpolate from a current value towards a target value
    // When beat hits, target value jumps radically.

    const elementsRef = useRef(Array.from({ length: 10 }, () => ({
        currentX: 0, currentY: 0,
        targetX: 0, targetY: 0,
        currentRot: 0, targetRot: 0
    })));

    useEffect(() => {
        if (!audioElement) return;

        initAudioAnalyzer(audioElement);
        const analyser = getAnalyser();
        if (!analyser) return;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const animate = () => {
            if (!isPlaying) {
                smoothBass.current *= 0.95;
            } else {
                analyser.getByteFrequencyData(dataArray);

                let bassSum = 0;
                for (let i = 0; i < 10; i++) {
                    bassSum += dataArray[i];
                }
                const bassAvg = bassSum / 10;
                const normBass = bassAvg / 255;

                smoothBass.current = smoothBass.current * 0.8 + normBass * 0.2;

                const isBeat = normBass > 0.75; // high threshold for "trance" jumps

                // Hue rotates aggressively relative to bass, making it intensely psychedelic
                hueRef.current = (hueRef.current + 0.5 + normBass * 5.0) % 360;

                const beatPeak = normBass > 0.6 ? normBass : smoothBass.current;
                const intensity = Math.max(0.8, beatPeak * 5.0);
                const spread = Math.max(0.5, beatPeak * 3.5);

                const els = elementsRef.current;

                // If it's a massive beat drop, scramble the target coordinates wildly
                if (isBeat && Math.random() > 0.5) {
                    els.forEach(el => {
                        // Spread them across the screen randomly. 
                        // Using percentages (e.g. -150 to +150 pixels)
                        el.targetX = (Math.random() - 0.5) * 600;
                        el.targetY = (Math.random() - 0.5) * 600;
                        el.targetRot = (Math.random() - 0.5) * 90; // up to 45 deg tilt
                    });
                } else if (!isBeat) {
                    // Slowly drift targets when it's quiet just to keep everything creepy/floating
                    els.forEach(el => {
                        el.targetX += (Math.random() - 0.5) * 4;
                        el.targetY += (Math.random() - 0.5) * 4;
                        el.targetRot += (Math.random() - 0.5) * 0.5;
                    });
                }

                // Smoothly interpolate current towards target
                els.forEach((el, idx) => {
                    // Faster interpolation during high bass
                    const lerpSpeed = 0.05 + normBass * 0.15;
                    el.currentX += (el.targetX - el.currentX) * lerpSpeed;
                    el.currentY += (el.targetY - el.currentY) * lerpSpeed;
                    el.currentRot += (el.targetRot - el.currentRot) * lerpSpeed;

                    // Expose variables for each element group
                    document.documentElement.style.setProperty(`--trance-x-${idx}`, `${el.currentX.toFixed(2)}px`);
                    document.documentElement.style.setProperty(`--trance-y-${idx}`, `${el.currentY.toFixed(2)}px`);
                    document.documentElement.style.setProperty(`--trance-r-${idx}`, `${el.currentRot.toFixed(2)}deg`);
                });

                document.documentElement.style.setProperty('--trance-intensity', intensity.toFixed(3));
                document.documentElement.style.setProperty('--trance-spread', spread.toFixed(3));
                document.documentElement.style.setProperty('--trance-hue', hueRef.current.toFixed(1));
            }

            requestRef.current = requestAnimationFrame(animate);
        };

        requestRef.current = requestAnimationFrame(animate);

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            document.documentElement.style.setProperty('--trance-intensity', '0');
            document.documentElement.style.setProperty('--trance-spread', '0');

            elementsRef.current.forEach((_, idx) => {
                document.documentElement.style.setProperty(`--trance-x-${idx}`, '0px');
                document.documentElement.style.setProperty(`--trance-y-${idx}`, '0px');
                document.documentElement.style.setProperty(`--trance-r-${idx}`, '0deg');
            });
        };
    }, [audioElement, isPlaying]);

    return <div className="hidden trance-effect-layer" aria-hidden="true" />;
}
