"use client";

import { useState } from "react";
import { Music } from "lucide-react";

export function PlaylistCover({ src, alt }: { src: string; alt: string }) {
    const [imgSrc, setImgSrc] = useState(src);
    const [hasError, setHasError] = useState(false);

    return (
        <div className="w-48 h-48 bg-clay-primary border-4 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_black] overflow-hidden relative">
            {!hasError ? (
                <img
                    src={imgSrc}
                    alt={alt}
                    className="w-full h-full object-cover"
                    onError={() => {
                        setImgSrc("https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=300");
                        setHasError(true); // Prevent infinite loop if fallback fails or just simple toggle
                        // Try fallback once. If that fails too, we show icon.
                    }}
                />
            ) : (
                <Music size={64} className="text-white" />
            )}
            <div className="absolute inset-0 bg-black/10"></div>
        </div>
    );
}
