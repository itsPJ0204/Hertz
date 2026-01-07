"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

interface ImageModalProps {
    src: string;
    alt: string;
    isOpen: boolean;
    onClose: () => void;
}

export function ImageModal({ src, alt, isOpen, onClose }: ImageModalProps) {
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 animate-in fade-in duration-200" onClick={onClose}>
            <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white hover:text-red-500 transition-colors"
            >
                <X size={32} />
            </button>
            <img
                src={src}
                alt={alt}
                className="max-w-full max-h-[90vh] object-contain border-4 border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                onClick={(e) => e.stopPropagation()}
            />
        </div>
    );
}
