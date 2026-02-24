"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MoreVertical, Play, ListPlus, PlusCircle, Check, Loader2 } from "lucide-react";
import { JamendoTrack } from "@/lib/jamendo";
import { usePlayer } from "./player/PlayerContext";
import { getUserPlaylists, addSongToPlaylist } from "@/actions/playlists";
import clsx from "clsx";

export function SongActionMenu({ track }: { track: JamendoTrack }) {
    const [isOpen, setIsOpen] = useState(false);
    const [playlists, setPlaylists] = useState<any[]>([]);
    const [isFetchingPlaylists, setIsFetchingPlaylists] = useState(false);
    const [addingToPlaylistId, setAddingToPlaylistId] = useState<string | null>(null);
    const [justAddedToId, setJustAddedToId] = useState<string | null>(null);

    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

    const { playNext, addToQueue } = usePlayer();

    // Fetch user playlists when opening menu
    useEffect(() => {
        if (isOpen) {
            setIsFetchingPlaylists(true);
            getUserPlaylists().then(res => {
                if (res.success && res.playlists) {
                    setPlaylists(res.playlists);
                }
                setIsFetchingPlaylists(false);
            });
            setJustAddedToId(null);
        }
    }, [isOpen]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                menuRef.current && !menuRef.current.contains(event.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            // Also handle scroll to close or update position (simpler to just close context menu on scroll)
            document.addEventListener("scroll", () => setIsOpen(false), { capture: true, once: true });
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    // Calculate position
    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const menuHeight = 250; // estimate

            let top: number | undefined = rect.bottom + 4;
            let bottom: number | undefined = undefined;

            if (spaceBelow < menuHeight) {
                top = undefined;
                bottom = window.innerHeight - rect.top + 4;
            }

            setMenuStyle({
                position: 'fixed',
                top,
                bottom,
                left: Math.max(16, rect.right - 192),
                zIndex: 99999
            });
        }
    }, [isOpen]);

    return (
        <div onClick={e => e.stopPropagation()}>
            <button
                ref={buttonRef}
                onClick={(e) => { e.preventDefault(); setIsOpen(!isOpen); }}
                className="p-2 hover:bg-black/10 rounded-full transition-colors text-gray-500 hover:text-black"
                title="More options"
            >
                <MoreVertical size={20} />
            </button>

            {mounted && isOpen && typeof document !== 'undefined' && createPortal(
                <div
                    ref={menuRef}
                    style={menuStyle}
                    className="w-48 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col py-1 animate-in fade-in zoom-in duration-150"
                    onClick={e => e.stopPropagation()}
                >
                    <button
                        onClick={() => { playNext(track); setIsOpen(false); }}
                        className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 text-left w-full font-bold text-sm"
                    >
                        <Play size={16} /> Play Next
                    </button>
                    <button
                        onClick={() => { addToQueue(track); setIsOpen(false); }}
                        className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 text-left w-full font-bold text-sm"
                    >
                        <ListPlus size={16} /> Add to Queue
                    </button>

                    <div className="my-1 border-t border-gray-200"></div>
                    <div className="px-4 py-1 text-xs font-bold text-gray-400 uppercase tracking-widest">Add to Playlist</div>

                    {isFetchingPlaylists ? (
                        <div className="px-4 py-2 text-xs text-gray-500 italic flex items-center gap-2">
                            <Loader2 size={12} className="animate-spin" /> Loading...
                        </div>
                    ) : playlists.length === 0 ? (
                        <div className="px-4 py-2 text-xs text-gray-500 italic">No playlists yet</div>
                    ) : (
                        <div className="max-h-32 overflow-y-auto w-full flex flex-col items-stretch">
                            {playlists.map(p => (
                                <button
                                    key={p.id}
                                    disabled={addingToPlaylistId === p.id}
                                    onClick={async () => {
                                        setAddingToPlaylistId(p.id);
                                        const res = await addSongToPlaylist(p.id, track);
                                        setAddingToPlaylistId(null);
                                        if (res.success) {
                                            setJustAddedToId(p.id);
                                            setTimeout(() => setIsOpen(false), 1000);
                                        } else {
                                            alert(res.error || "Failed to add song");
                                        }
                                    }}
                                    className="flex items-center justify-between px-4 py-2 hover:bg-gray-100 text-left w-full font-bold text-sm truncate"
                                    title={p.name}
                                >
                                    <span className="truncate pr-2">{p.name}</span>
                                    {addingToPlaylistId === p.id ? (
                                        <Loader2 size={14} className="animate-spin text-gray-400 flex-shrink-0" />
                                    ) : justAddedToId === p.id ? (
                                        <Check size={14} className="text-green-500 flex-shrink-0" />
                                    ) : null}
                                </button>
                            ))}
                        </div>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
}
