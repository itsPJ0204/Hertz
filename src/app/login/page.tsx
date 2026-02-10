"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const router = useRouter();
    const supabase = createClient();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                router.push("/");
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                            avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${Math.random()}`,
                        },
                        emailRedirectTo: `${window.location.origin}/auth/callback`,
                    },
                });
                if (error) throw error;
                alert("User created successfully. Please login.");
                setIsLogin(true);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-clay-bg p-4">
            <div className="w-full max-w-md bg-white border-2 border-black p-8 shadow-[8px_8px_0px_0px_#000000]">

                <div className="flex justify-center mb-8">
                    <div className="w-16 h-16 bg-clay-primary border-2 border-black rounded-full animate-bounce"></div>
                </div>

                <h1 className="text-3xl font-black text-center mb-2">
                    {isLogin ? "WELCOME BACK" : "JOIN THE FREQ"}
                </h1>
                <p className="text-center opacity-60 mb-8 font-bold italic">
                    Vibe With Hz
                </p>

                {error && (
                    <div className="bg-red-100 border-2 border-red-500 text-red-700 p-3 mb-6 font-bold text-sm">
                        {error.toUpperCase()}
                    </div>
                )}

                <form onSubmit={handleAuth} className="space-y-4">
                    {!isLogin && (
                        <div>
                            <label className="block font-bold text-sm mb-1">FULL NAME</label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full border-2 border-black p-3 font-medium focus:outline-none focus:shadow-[4px_4px_0px_0px_#000000] focus:-translate-y-1 transition-all"
                                placeholder="ALEX RIVERA"
                                required
                            />
                        </div>
                    )}

                    <div>
                        <label className="block font-bold text-sm mb-1">EMAIL</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full border-2 border-black p-3 font-medium focus:outline-none focus:shadow-[4px_4px_0px_0px_#000000] focus:-translate-y-1 transition-all"
                            placeholder="ALEX@EXAMPLE.COM"
                            required
                        />
                    </div>

                    <div>
                        <label className="block font-bold text-sm mb-1">PASSWORD</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full border-2 border-black p-3 font-medium focus:outline-none focus:shadow-[4px_4px_0px_0px_#000000] focus:-translate-y-1 transition-all"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {isLogin && (
                        <div className="flex justify-end">
                            <a href="/forgot-password" className="text-xs font-bold underline hover:text-clay-primary">
                                FORGOT PASSWORD?
                            </a>
                        </div>
                    )}

                    <button
                        disabled={loading}
                        className="w-full bg-clay-primary text-white font-bold py-4 border-2 border-black shadow-[4px_4px_0px_0px_#000000] hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#000000] active:translate-y-2 active:shadow-none transition-all mt-4"
                    >
                        {loading ? "LOADING..." : (isLogin ? "LOG IN" : "CREATE ACCOUNT")}
                    </button>
                </form>

                <div className="mt-8 text-center text-sm">
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="font-bold underline decoration-2 hover:bg-black hover:text-white transition-colors px-2 py-1"
                    >
                        {isLogin ? "NEED AN ACCOUNT? SIGN UP" : "ALREADY HAVE AN ACCOUNT? LOG IN"}
                    </button>
                </div>

            </div>
        </div>
    );
}
