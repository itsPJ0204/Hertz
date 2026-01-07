"use client";

import { User } from "lucide-react";

interface UserAvatarProps {
    src?: string | null;
    alt: string;
    className?: string; // wrapper class
}

export function UserAvatar({ src, alt, className = "w-12 h-12" }: UserAvatarProps) {
    return (
        <div className={`${className} rounded-full bg-clay-primary border-2 border-black flex items-center justify-center overflow-hidden relative`}>
            {src ? (
                <img
                    src={src}
                    alt={alt}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
                    }}
                />
            ) : (
                <User className="text-white" />
            )}
            <User className="absolute text-white fallback-icon hidden pointer-events-none" />
        </div>
    );
}
