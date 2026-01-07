"use client";

import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { JamendoTrack } from '@/lib/jamendo';
import { createClient } from '@/lib/supabase/client';
import { getRecommendations } from '@/lib/recommendations';

interface PlayerContextType {
    currentTrack: JamendoTrack | null;
    isPlaying: boolean;
    play: (track: JamendoTrack) => void;
    pause: () => void;
    toggle: () => void;
    seek: (time: number) => void;
    next: () => void;
    prev: () => void;
    currentTime: number;
    duration: number;
    queue: JamendoTrack[];
    currentIndex: number;
    playQueue: (tracks: JamendoTrack[], startIndex?: number) => void;
    autoplay: boolean;
    toggleAutoplay: () => void;
    isMuted: boolean;
    toggleMute: () => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
    const [currentTrack, setCurrentTrack] = useState<JamendoTrack | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [queue, setQueue] = useState<JamendoTrack[]>([]);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [autoplay, setAutoplay] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const autoplayRef = useRef(true); // Ref for access in event listeners

    // Sync ref
    useEffect(() => { autoplayRef.current = autoplay; }, [autoplay]);

    const toggleAutoplay = () => setAutoplay(prev => !prev);

    // Mute Logic
    const toggleMute = () => {
        if (audioRef.current) {
            const newState = !isMuted;
            audioRef.current.muted = newState;
            setIsMuted(newState);
        }
    };

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const listeningTimeRef = useRef(0); // Total time listened to current track
    const hasReportedRef = useRef(false); // Only report once per "session" of 30s

    useEffect(() => {
        if (!audioRef.current) {
            audioRef.current = new Audio();
            // Restore mute state if persisted or just sync
            audioRef.current.muted = isMuted;
        }

        const audio = audioRef.current;

        const handleTimeUpdate = () => {
            setCurrentTime(audio.currentTime);
            if (isPlaying) {
                listeningTimeRef.current += 1; // Approx 1s (timeUpdate fires ~250ms but clean enough logic for now, better to use delta)
                // Actually timeUpdate fires 4Hz. 
                // Better logic: capture start time.
            }
        };

        const handleLoadedMetadata = () => {
            setDuration(audio.duration);
        };

        const handleEnded = () => {
            setIsPlaying(false);
            reportListening(currentTrack, listeningTimeRef.current, true);
            if (autoplayRef.current) {
                next(); // Auto-play next if enabled
            }
        };

        const handleError = (e: any) => {
            const error = audioRef.current?.error;
            console.error("[Player] Media Error:", error);
            console.error("[Player] Current Source:", audioRef.current?.src);
            // Error Code 4: MEDIA_ERR_SRC_NOT_SUPPORTED
            if (error?.code === 4) {
                console.error("[Player] Source not supported. Check MIME type or URL validity.");
            }
            setIsPlaying(false);
        };

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('error', handleError);

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('error', handleError);
        };
    }, [currentTrack]);

    // Precise 30s tracking
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isPlaying && currentTrack) {
            interval = setInterval(() => {
                listeningTimeRef.current += 1; // Increment by 1s

                // "Smart Player" Logic: > 30s
                if (listeningTimeRef.current >= 30 && !hasReportedRef.current) {
                    console.log(`[Smart Player] logging interest for ${currentTrack.name}`);
                    reportListening(currentTrack, 30, false);
                    hasReportedRef.current = true;
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isPlaying, currentTrack]);

    const [playedIds, setPlayedIds] = useState<Set<string>>(new Set());

    const fetchRecommendations = async (currentQueue: JamendoTrack[]) => {
        try {
            const exclude = Array.from(playedIds);
            currentQueue.forEach(t => exclude.push(t.id));

            let recs = await getRecommendations(5, undefined, undefined, exclude);

            // Fallback
            if (!recs || recs.length === 0) {
                const lastFew = currentQueue.slice(-5).map(t => t.id);
                recs = await getRecommendations(5, undefined, undefined, lastFew);
            }

            if (recs && recs.length > 0) {
                const mappedTracks: any[] = recs.map(track => ({
                    id: track.external_id || track.id,
                    name: track.title,
                    artist_name: track.artist,
                    audio: track.url,
                    image: track.cover_url || '',
                    duration: track.duration || 180,
                    musicinfo: { tags: { genres: [track.genre || 'Pop'] } }
                }));
                return mappedTracks;
            }
        } catch (e) {
            console.error(e);
        }
        return [];
    };

    const play = async (track: JamendoTrack) => {
        // Add to played IDs
        setPlayedIds(prev => new Set(prev).add(track.id));

        // If queue is empty or this is a standalone play, initialize queue
        // We only want to reset queue if we are playing something NOT in the current queue context
        // But for simplicity in this logic, user clicked a track.

        let newQueue = [...queue];
        let newIndex = currentIndex;

        const existingSchema = queue.find(t => t.id === track.id);

        if (currentTrack?.id === track.id) {
            audioRef.current?.play();
            setIsPlaying(true);
            return;
        }

        if (existingSchema) {
            // Track exists in queue, jump to it
            newIndex = queue.findIndex(t => t.id === track.id);
        } else {
            // New track, replace queue or append? 
            // Usually "Play" on a track listing replaces queue. "Add to queue" appends.
            // We'll assume replace for direct play, but maybe we should keep it simpler.
            // Let's start fresh queue with this track.
            newQueue = [track];
            newIndex = 0;

            // IMMEDIATE POPULATION: Fetch next songs
            const recs = await fetchRecommendations(newQueue);
            if (recs.length > 0) {
                newQueue.push(...recs);
            }
            setQueue(newQueue);
            setCurrentIndex(0);
        }

        setCurrentTrack(track); // Opt update
        setCurrentIndex(newIndex);
        setQueue(newQueue);

        if (audioRef.current) {
            // Secure Streaming Logic
            console.log(`[Player] Requesting Playback for: ${track.name} (ID: ${track.id})`);
            if (track.audio && track.audio.startsWith('http')) {
                audioRef.current.src = track.audio;
            } else {
                audioRef.current.src = `/api/stream/${track.id}`;
            }

            audioRef.current.play()
                .then(() => setIsPlaying(true))
                .catch(e => console.error("[Player] Playback FAILED:", e));

            listeningTimeRef.current = 0;
            hasReportedRef.current = false;
        }
    };

    const pause = () => {
        audioRef.current?.pause();
        setIsPlaying(false);
    };

    const toggle = () => {
        if (isPlaying) pause();
        else if (currentTrack) {
            audioRef.current?.play();
            setIsPlaying(true);
        }
    };

    const seek = (time: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const playQueue = (tracks: JamendoTrack[], startIndex = 0) => {
        setQueue(tracks);
        setCurrentIndex(startIndex);
        play(tracks[startIndex]);
    };

    const next = async () => {
        if (queue.length > 0 && currentIndex < queue.length - 1) {
            const nextIndex = currentIndex + 1;
            setCurrentIndex(nextIndex);
            play(queue[nextIndex]);

            // Pre-fetch if getting close to end
            if (queue.length - (nextIndex + 1) < 5) {
                const recs = await fetchRecommendations(queue);
                if (recs.length > 0) {
                    setQueue(prev => [...prev, ...recs]);
                }
            }
        } else {
            // Should not happen often if we pre-fetch, but as fallback
            const recs = await fetchRecommendations(queue);
            if (recs.length > 0) {
                setQueue(prev => [...prev, ...recs]);
                // Play first new one
                const nextIndex = queue.length;
                setCurrentIndex(nextIndex);
                play(recs[0]);
            } else {
                setIsPlaying(false);
            }
        }
    };

    const prev = () => {
        if (currentTime > 3) {
            seek(0);
        } else if (currentIndex > 0) {
            const prevIndex = currentIndex - 1;
            setCurrentIndex(prevIndex);
            play(queue[prevIndex]);
        } else {
            // If at index 0 and time < 3, just restart logic
            seek(0);
        }
    };

    const reportListening = async (track: JamendoTrack | null, duration: number, completed: boolean) => {
        if (!track) return;
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Log history linked to profiles
            // Check if it's a Local Upload (URL is 'local_upload' or ID is UUID)
            // If Local: Song already exists in DB. Do NOT upsert (avoids duplicate/ghost creation).
            // If Jamendo: Upsert to ensure it exists for foreign key.

            let songId = track.id;
            const isLocal = track.audio === 'local_upload' || (track.audio && track.audio.includes('/api/stream/'));

            if (!isLocal) {
                const { data: song, error: songError } = await (supabase
                    .from('songs') as any)
                    .upsert({
                        external_id: track.id,
                        title: track.name,
                        artist: track.artist_name,
                        url: track.audio,
                        cover_url: track.image,
                        genre: track.musicinfo?.tags?.genres?.[0] || 'Unknown',
                        duration: track.duration,
                        origin: 'jamendo'
                    }, { onConflict: 'external_id' })
                    .select()
                    .single();

                if (songError) {
                    console.error("Error upserting song:", songError);
                    return;
                }
                songId = song.id;
            }

            // 2. Insert History
            const { error: historyError } = await (supabase
                .from('listening_history') as any)
                .insert({
                    user_id: user.id,
                    song_id: songId,
                    duration_listened: Math.round(duration),
                    completed: completed
                });

            if (historyError) {
                console.error("Error saving history:", historyError);
                return;
            }

            console.log(`[Hertz] History synchronized: ${track.name}`);
        } catch (e) {
            console.error("Failed to save history", e);
        }
    };

    // Instant History Recording
    useEffect(() => {
        if (currentTrack) {
            reportListening(currentTrack, 0, false);
        }
    }, [currentTrack]);

    return (
        <PlayerContext.Provider value={{ currentTrack, isPlaying, play, pause, toggle, currentTime, duration, seek, next, prev, queue, currentIndex, playQueue, autoplay, toggleAutoplay, isMuted, toggleMute }}>
            {children}
        </PlayerContext.Provider>
    );
}

export function usePlayer() {
    const context = useContext(PlayerContext);
    if (context === undefined) {
        throw new Error('usePlayer must be used within a PlayerProvider');
    }
    return context;
}
