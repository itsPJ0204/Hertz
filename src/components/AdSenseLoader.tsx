"use client";

import { useEffect, useRef } from "react";

export function AdSenseLoader() {
    const loaded = useRef(false);

    useEffect(() => {
        if (loaded.current) return;

        // Wait for layout/animations to settle (Sidebar transition is 300ms)
        const timer = setTimeout(() => {
            try {
                // @ts-ignore
                (window.adsbygoogle = window.adsbygoogle || []).push({});
                loaded.current = true;
            } catch (e) {
                console.error("AdSense error", e);
            }
        }, 1000); // 1s delay to be safe

        return () => clearTimeout(timer);
    }, []);

    return null;
}
