
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Heart, UploadCloud, User, MessageCircle, LogOut, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getUnreadCounts, UnreadCounts } from "@/actions/notifications";
import { AdSenseLoader } from "./AdSenseLoader";

interface SidebarProps {
    collapsed?: boolean;
    toggle?: () => void;
    isMobile?: boolean; // Prop to indicate if we are in mobile view (optional usage)
    onCloseMobile?: () => void; // Callback to close mobile menu on navigation
}

export function Sidebar({ collapsed = false, toggle, onCloseMobile }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();
    const [counts, setCounts] = useState<UnreadCounts>({ messages: 0, matches: 0, notifications: 0 });
    const [spotifyLinked, setSpotifyLinked] = useState(false);

    const isActive = (path: string) => pathname === path;

    useEffect(() => {
        // Initial Fetch
        getUnreadCounts().then(setCounts);
        fetch('/api/auth/spotify/status')
            .then(res => {
                if (!res.ok) throw new Error('Status check failed');
                const contentType = res.headers.get("content-type");
                if (!contentType || !contentType.includes("application/json")) {
                    throw new Error("Received non-JSON response");
                }
                return res.json();
            })
            .then(data => setSpotifyLinked(data.linked))
            .catch(err => {
                // Silently fail - likely unauthenticated or redirecting
                // console.error("Failed to fetch spotify status", err)
            });

        // Poll every 3 seconds for updates
        const interval = setInterval(() => {
            getUnreadCounts().then(setCounts);
        }, 3000);

        window.addEventListener("refresh-notifications", () => getUnreadCounts().then(setCounts));

        return () => {
            clearInterval(interval);
            window.removeEventListener("refresh-notifications", () => getUnreadCounts().then(setCounts));
        };
    }, [pathname]);

    const navItems = [
        { name: "Home", href: "/", icon: Home },
        {
            name: "Matches",
            href: "/feed",
            icon: Users,
            badge: counts.matches > 0 ? counts.matches : 0
        },
        { name: "Liked Songs", href: "/liked", icon: Heart },
        { name: "Secure Studio", href: "/upload", icon: UploadCloud },
        {
            name: "My Frequencies",
            href: "/chat",
            icon: MessageCircle,
            badge: counts.messages > 0 ? counts.messages : 0
        },
        { name: "Profile", href: "/profile", icon: User },
    ];

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.refresh();
        router.push("/login");
    };

    const handleSpotifyLink = () => {
        window.location.href = "/api/auth/spotify/login";
    };

    return (
        <div className={`bg-black text-white h-screen fixed left-0 top-0 flex flex-col transition-all duration-300 z-50 overflow-y-auto no-scrollbar pb-32 ${collapsed ? "w-20 p-4 items-center" : "w-64 p-6"}`}>
            {/* Header / Toggle */}
            <div className={`mb-6 md:mb-10 flex ${collapsed ? "justify-center" : "justify-between items-center"}`}>
                <div className="flex items-center gap-3">
                    <div className="relative shrink-0 w-12 h-12 md:w-16 md:h-16 flex items-center justify-center overflow-hidden">
                        {/* Logo Image */}
                        <img src="/logo_new.png" alt="Hertz Logo" className="w-full h-full object-contain" />
                    </div>
                    {!collapsed && (
                        <div className="flex flex-col leading-none">
                            <h1 className="text-2xl md:text-3xl font-black tracking-tighter italic whitespace-nowrap">HERTZ</h1>
                            <span className="text-[8px] md:text-[10px] font-bold tracking-widest text-gray-400 uppercase self-end -mt-1 mr-0.5">hz</span>
                        </div>
                    )}
                </div>
                {toggle && (
                    <button
                        onClick={toggle}
                        className={`hidden md:block hover:bg-white/20 p-1 rounded-full bg-black border border-white/20 ${collapsed ? "mt-4" : ""}`}
                        title={collapsed ? "Expand" : "Collapse"}
                    >
                        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                    </button>
                )}
            </div>

            {/* Nav */}
            <nav className="flex-1 space-y-2 w-full">
                {navItems.map((item) => {
                    const active = isActive(item.href);
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => onCloseMobile && onCloseMobile()}
                            title={collapsed ? item.name : ""}
                            className={`flex items-center gap-3 md:gap-4 p-2 md:p-3 rounded-lg transition-all group relative ${active
                                ? "bg-white text-black font-bold shadow-[4px_4px_0px_0px_#444]"
                                : "hover:bg-white/10 text-gray-300 hover:text-white"
                                } ${collapsed ? "justify-center" : ""}`}
                        >
                            <div className="relative">
                                <item.icon size={20} className={`shrink-0 ${active ? "text-black" : "group-hover:scale-110 transition-transform"}`} />
                                {collapsed && item.badge && item.badge > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center border-2 border-black">
                                        {item.badge}
                                    </span>
                                )}
                            </div>
                            {!collapsed && (
                                <div className="flex justify-between w-full items-center">
                                    <span className="uppercase text-sm tracking-wide whitespace-nowrap">{item.name}</span>
                                    {item.badge && item.badge > 0 && (
                                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                            {item.badge}
                                        </span>
                                    )}
                                </div>
                            )}
                        </Link>
                    )
                })}

                {/* Spotify Link Button */}
                <div className="pt-4 border-t border-gray-800 mt-4">
                    {spotifyLinked ? (
                        <div className={`flex items-center gap-3 md:gap-4 p-2 md:p-3 rounded-lg bg-green-900/20 text-green-400 group relative ${collapsed ? "justify-center" : ""}`}>
                            <div className="relative">
                                <span className="text-xl">✅</span>
                            </div>
                            {!collapsed && (
                                <span className="uppercase text-sm tracking-wide whitespace-nowrap font-bold">Spotify Linked</span>
                            )}
                        </div>
                    ) : (
                        <button
                            onClick={handleSpotifyLink}
                            title={collapsed ? "Link Spotify" : ""}
                            className={`w-full flex items-center gap-3 md:gap-4 p-2 md:p-3 rounded-lg transition-all group relative hover:bg-green-600/10 text-gray-300 hover:text-green-400 ${collapsed ? "justify-center" : ""}`}
                        >
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 group-hover:scale-110 transition-transform"><circle cx="12" cy="12" r="10"></circle><path d="M8 12h8"></path><path d="M12 8v8"></path></svg>
                            </div>
                            {!collapsed && (
                                <span className="uppercase text-sm tracking-wide whitespace-nowrap">Link Spotify</span>
                            )}
                        </button>
                    )}
                </div>
            </nav>

            {/* AdSense Unit */}
            {!collapsed && (
                <div className="mt-4 w-full px-2">
                    <div className="w-full bg-gray-800/50 rounded overflow-hidden min-h-[250px]">
                        {/* Google AdSense Unit */}
                        <ins className="adsbygoogle"
                            style={{ display: "block", width: "100%" }}
                            data-ad-client={process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_ID}
                            data-ad-slot={process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_SLOT_ID}
                            data-ad-format="auto"
                            data-full-width-responsive="true"></ins>
                        <AdSenseLoader />
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-800 w-full">
                <button
                    onClick={handleLogout}
                    title="Log Out"
                    className={`flex items-center gap-4 p-3 text-red-400 hover:bg-red-900/20 rounded-lg w-full transition-colors ${collapsed ? "justify-center" : ""}`}
                >
                    <LogOut size={20} className="shrink-0" />
                    {!collapsed && (
                        <span className="uppercase text-sm font-bold whitespace-nowrap">Log Out</span>
                    )}
                </button>
            </div>


        </div>
    );
}
