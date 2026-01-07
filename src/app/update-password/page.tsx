"use client";

import { createClient } from "@/lib/supabase/client";
import { Lock, ArrowRight, CheckCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function UpdatePassword() {
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [message, setMessage] = useState("");
    const supabase = createClient();
    const router = useRouter();

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage("");

        if (password !== confirm) {
            setStatus("error");
            setMessage("Passwords do not match.");
            return;
        }

        setStatus("loading");

        const { error } = await supabase.auth.updateUser({ password });

        if (error) {
            setStatus("error");
            setMessage(error.message);
        } else {
            setStatus("success");
            setTimeout(() => {
                router.push("/");
            }, 3000);
        }
    };

    return (
        <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
            {/* Left: Branding */}
            <div className="bg-black text-white p-12 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-800 to-black animate-pulse" />
                <div className="z-10">
                    <h1 className="text-6xl font-black tracking-tighter italic mb-4">HERTZ</h1>
                    <p className="text-xl font-bold opacity-80">Secure your account.</p>
                </div>
            </div>

            {/* Right: Form */}
            <div className="bg-clay-bg flex items-center justify-center p-8">
                <div className="w-full max-w-md bg-white border-4 border-black p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
                    <h2 className="text-3xl font-black uppercase mb-8">New Password</h2>

                    {status === 'success' ? (
                        <div className="bg-green-100 border-2 border-green-500 p-6 flex flex-col items-center text-center">
                            <CheckCircle size={48} className="text-green-600 mb-4" />
                            <h3 className="text-xl font-bold text-green-800 mb-2">Password Updated!</h3>
                            <p className="text-sm font-medium opacity-80 mb-4">
                                Your password has been changed securely. Redirecting you to home...
                            </p>
                            <Link href="/" className="bg-black text-white px-6 py-2 font-bold uppercase hover:bg-gray-800">
                                Go Home Now
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleUpdate} className="space-y-6">
                            {status === 'error' && (
                                <div className="bg-red-100 border-2 border-red-500 p-4 flex items-center gap-3 text-red-700 font-bold text-sm">
                                    <AlertTriangle size={20} />
                                    {message}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-wider">New Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50" size={20} />
                                        <input
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full border-2 border-black p-4 pl-12 font-bold focus:outline-none focus:shadow-[4px_4px_0px_0px_black] transition-shadow"
                                            placeholder="••••••••"
                                            minLength={6}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-wider">Confirm Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50" size={20} />
                                        <input
                                            type="password"
                                            required
                                            value={confirm}
                                            onChange={(e) => setConfirm(e.target.value)}
                                            className="w-full border-2 border-black p-4 pl-12 font-bold focus:outline-none focus:shadow-[4px_4px_0px_0px_black] transition-shadow"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={status === 'loading'}
                                className="w-full bg-black text-white font-black py-4 uppercase hover:bg-clay-primary hover:border-black border-2 border-transparent transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {status === 'loading' ? "Updating..." : "Update Password"}
                                {!status.includes('loading') && <ArrowRight className="group-hover:translate-x-1 transition-transform" />}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
