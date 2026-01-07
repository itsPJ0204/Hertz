"use client";

import { useState } from "react";
import { ImageModal } from "@/components/ui/ImageModal";
import { User } from "lucide-react";

interface UserAvatarProps {
    src?: string | null;
    alt: string;
    className?: string; // wrapper class
}

export function UserAvatar({ src, alt, className = "w-12 h-12" }: UserAvatarProps) {
    const [isOpen, setIsOpen] = useState(false);

    const handleClick = (e: React.MouseEvent) => {
        if (src) {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(true);
        }
    };

    return (
        <>
            <div
                className={`${className} rounded-full bg-clay-primary border-2 border-black flex items-center justify-center overflow-hidden relative ${src ? 'cursor-pointer hover:border-white transition-colors' : ''}`}
                onClick={handleClick}
            >
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

            <ImageModal
                src={src || ""}
                alt={alt}
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
            />
        </>
    );
}
