"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";

export function SidebarShell({ children }: { children: React.ReactNode }) {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    // Close mobile sidebar on navigation (optional, but good UX)
    // For now, let's just handle the layout.

    return (
        <div className="flex min-h-screen">
            {/* Mobile Toggle (only visible on small screens) */}
            {!mobileOpen && (
                <div className="md:hidden fixed top-4 right-4 z-[60]">
                    <button
                        onClick={() => setMobileOpen(true)}
                        className="p-3 bg-black/80 backdrop-blur-md text-white rounded-full shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] border border-white/10 active:translate-y-1 active:shadow-none transition-all"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                    </button>
                </div>
            )}

            {/* Sidebar:
                - Desktop: Fixed pos, normal behavior.
                - Mobile: Fixed pos, full height, z-50, transform based on open state.
            */}
            <div className={`
                fixed inset-y-0 left-0 z-50 bg-black transition-transform duration-300
                md:translate-x-0
                ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
                ${collapsed ? 'md:w-20' : 'md:w-64'}
                w-64
            `}>
                <Sidebar
                    collapsed={collapsed}
                    toggle={() => setCollapsed(!collapsed)}
                    // isMobile and onCloseMobile are not yet in Sidebar interface in the other file,
                    // but we will add them next. For now, this is correct usage for the future.
                    onCloseMobile={() => setMobileOpen(false)}
                />
            </div>

            {/* Overlay for mobile when sidebar is open */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Main Content Area */}
            <div className={`
                flex-1 transition-all duration-300 w-full
                ${collapsed ? "md:ml-20" : "md:ml-64"}
                ml-0 
                pt-16 md:pt-0
            `}>
                {children}
            </div>
        </div>
    );
}
