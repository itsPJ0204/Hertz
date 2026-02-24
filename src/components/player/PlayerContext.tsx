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
    playNext: (track: JamendoTrack) => void;
    addToQueue: (track: JamendoTrack) => void;
    removeFromQueue: (index: number) => void;
    reorderQueue: (startIndex: number, endIndex: number) => void;
    autoplay: boolean;
    toggleAutoplay: () => void;
    isMuted: boolean;
    toggleMute: () => void;
    audioElement: HTMLAudioElement | null;
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

    // Track how many upcoming tracks were explicitly added by the user (playNext/addToQueue)
    const [userQueueCount, setUserQueueCount] = useState(0);
    // Prevent re-fetching autoplay recommendations on every song change
    const lastAutoplayFetchId = useRef<string | null>(null);
    // Track whether the current play was triggered by autoplay (not user action)
    const isAutoplayTransition = useRef(false);

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

    const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const listeningTimeRef = useRef(0); // Total time listened to current track
    const hasReportedRef = useRef(false); // Only report once per "session" of 30s

    useEffect(() => {
        if (!audioRef.current) {
            audioRef.current = new Audio();
            setAudioElement(audioRef.current);
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

    // Proactive autoplay seeding: keep the queue populated with recommendations
    // Only fetches when autoplay is on, queue is running low on auto-tracks,
    // and we haven't already fetched for the current playback context.
    useEffect(() => {
        if (!currentTrack || !autoplay) return;
        if (queue.length === 0) return;

        const upcomingTotal = queue.length - (currentIndex + 1);
        const autoTracksAhead = Math.max(0, upcomingTotal - userQueueCount);

        // Only fetch if auto-tracks are running low AND we haven't fetched for this track already
        // (unless it was an autoplay transition, in which case don't refetch)
        if (autoTracksAhead <= 2 && lastAutoplayFetchId.current !== currentTrack.id && !isAutoplayTransition.current) {
            lastAutoplayFetchId.current = currentTrack.id;
            fetchRecommendations(queue).then(recs => {
                if (recs.length > 0) {
                    setQueue(prev => {
                        const existingIds = new Set(prev.map(t => t.id));
                        const newRecs = recs.filter(r => !existingIds.has(r.id));
                        return [...prev, ...newRecs];
                    });
                }
            }).catch(e => console.error("Failed to seed autoplay queue:", e));
        }
        // Reset autoplay transition flag after processing
        isAutoplayTransition.current = false;
    }, [currentTrack, currentIndex, autoplay]);

    // Core audio playback helper — only handles audio source + play.
    // Does NOT touch queue/index state. Callers must set queue/index themselves.
    const startPlayback = (track: JamendoTrack) => {
        setPlayedIds(prev => new Set(prev).add(track.id));
        setCurrentTrack(track);

        if (audioRef.current) {
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

    // Public play: user clicked a specific track (not from a playlist/queue context)
    const play = async (track: JamendoTrack) => {
        if (currentTrack?.id === track.id) {
            audioRef.current?.play();
            setIsPlaying(true);
            return;
        }

        const existingIndex = queue.findIndex(t => t.id === track.id);

        if (existingIndex !== -1) {
            // Track exists in current queue, just jump to it
            setCurrentIndex(existingIndex);
            // Decrease userQueueCount if we're jumping past user-queued tracks
            if (existingIndex > currentIndex) {
                const skippedUserTracks = Math.min(userQueueCount, existingIndex - currentIndex - 1);
                setUserQueueCount(prev => Math.max(0, prev - skippedUserTracks - (existingIndex <= currentIndex + userQueueCount ? 1 : 0)));
            }
        } else {
            // Standalone play: Start a fresh queue with this track
            setQueue([track]);
            setCurrentIndex(0);
            setUserQueueCount(0);
            lastAutoplayFetchId.current = null;
        }

        startPlayback(track);
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
        setUserQueueCount(0);
        lastAutoplayFetchId.current = null;
        // Use startPlayback directly — NOT play() — to avoid stale-state overwrites
        startPlayback(tracks[startIndex]);
    };

    const playNext = (track: JamendoTrack) => {
        setQueue(prevQueue => {
            const newQueue = [...prevQueue];
            // Insert right after current track, at the front of the user-queued section
            newQueue.splice(currentIndex + 1, 0, track);
            return newQueue;
        });
        setUserQueueCount(prev => prev + 1);
    };

    const addToQueue = (track: JamendoTrack) => {
        setQueue(prevQueue => {
            const newQueue = [...prevQueue];
            // Insert after all user-queued tracks but before autoplay tracks
            const insertAt = currentIndex + 1 + userQueueCount;
            newQueue.splice(insertAt, 0, track);
            return newQueue;
        });
        setUserQueueCount(prev => prev + 1);
    };

    const removeFromQueue = (index: number) => {
        // Check if removed track is in the user-queued section
        const isUserQueued = index > currentIndex && index <= currentIndex + userQueueCount;
        setQueue(prevQueue => {
            const newQueue = [...prevQueue];
            newQueue.splice(index, 1);
            return newQueue;
        });
        if (isUserQueued) {
            setUserQueueCount(prev => Math.max(0, prev - 1));
        }
        if (currentIndex > index) {
            setCurrentIndex(prev => prev - 1);
        } else if (currentIndex === index && currentTrack) {
            next();
        }
    };

    const reorderQueue = (startIndex: number, endIndex: number) => {
        setQueue(prevQueue => {
            const result = Array.from(prevQueue);
            const [removed] = result.splice(startIndex, 1);
            result.splice(endIndex, 0, removed);
            return result;
        });

        // Adjust currentIndex if the currently playing track was moved or shifted
        setCurrentIndex(prevIndex => {
            if (startIndex === prevIndex) {
                return endIndex;
            } else if (startIndex < prevIndex && endIndex >= prevIndex) {
                return prevIndex - 1;
            } else if (startIndex > prevIndex && endIndex <= prevIndex) {
                return prevIndex + 1;
            }
            return prevIndex;
        });
    };

    const next = async () => {
        // Decrease userQueueCount if the next track is a user-queued one
        if (userQueueCount > 0) {
            setUserQueueCount(prev => Math.max(0, prev - 1));
        }

        if (queue.length > 0 && currentIndex < queue.length - 1) {
            const nextIndex = currentIndex + 1;
            // Mark autoplay transition if we're past all user-queued tracks
            if (userQueueCount <= 0) {
                isAutoplayTransition.current = true;
            }
            setCurrentIndex(nextIndex);
            startPlayback(queue[nextIndex]);
        } else if (autoplayRef.current) {
            // At the end of queue — fetch fresh recommendations
            isAutoplayTransition.current = true;
            setIsPlaying(false);
            const recs = await fetchRecommendations(queue);
            if (recs.length > 0) {
                const existingIds = new Set(queue.map(t => t.id));
                const newRecs = recs.filter(r => !existingIds.has(r.id));
                const newQueue = [...queue, ...newRecs];
                const nextIndex = queue.length; // First new rec is at old queue end
                setQueue(newQueue);
                setCurrentIndex(nextIndex);
                startPlayback(newRecs[0]);
            } else {
                setIsPlaying(false);
            }
        } else {
            setIsPlaying(false);
        }
    };

    const prev = () => {
        if (currentTime > 3) {
            seek(0);
        } else if (currentIndex > 0) {
            const prevIndex = currentIndex - 1;
            setCurrentIndex(prevIndex);
            startPlayback(queue[prevIndex]);
        } else {
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
        <PlayerContext.Provider value={{ currentTrack, isPlaying, play, pause, toggle, currentTime, duration, seek, next, prev, queue, currentIndex, playQueue, playNext, addToQueue, removeFromQueue, reorderQueue, autoplay, toggleAutoplay, isMuted, toggleMute, audioElement }}>
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
