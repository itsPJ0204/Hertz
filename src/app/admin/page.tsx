import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getPendingReports, dismissReport, banSong } from "@/actions/admin";
import { Shield, CheckCircle, Trash2, AlertTriangle, ExternalLink, Music } from "lucide-react";
import Link from "next/link";

export default async function AdminPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Hardcoded Security Check
    if (!user || user.email !== "piyushj0204@gmail.com") {
        redirect("/");
    }

    const reports = await getPendingReports();

    return (
        <div className="min-h-screen bg-gray-100 p-8 font-sans text-black">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8 border-b-4 border-black pb-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-black text-white p-3 rotate-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]">
                            <Shield size={32} />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black uppercase italic">Admin Command</h1>
                            <p className="font-bold opacity-60">Keeping the vibes clean.</p>
                        </div>
                    </div>
                    <Link href="/" className="font-bold uppercase underline hover:text-red-600">
                        Exit to App
                    </Link>
                </div>

                {reports.length === 0 ? (
                    <div className="bg-white border-4 border-black p-12 text-center shadow-[8px_8px_0px_0px_black]">
                        <CheckCircle size={64} className="mx-auto mb-6 text-green-500" />
                        <h2 className="text-3xl font-black uppercase mb-2">All Clear</h2>
                        <p className="font-bold opacity-60">No pending reports. The platform is safe.</p>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {reports.map((report: any) => (
                            <div key={report.id} className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_black] relative group">
                                <div className="absolute top-0 left-0 bg-red-500 text-white text-xs font-black px-2 py-1 uppercase">
                                    {report.reason}
                                </div>

                                <div className="flex flex-col md:flex-row gap-6 mt-4">
                                    {/* Song Info */}
                                    <div className="flex-1">
                                        <div className="flex items-start gap-4 mb-4">
                                            {report.songs?.cover_url ? (
                                                <img src={report.songs.cover_url} className="w-20 h-20 border-2 border-black object-cover bg-gray-200" />
                                            ) : (
                                                <div className="w-20 h-20 border-2 border-black bg-gray-200 flex items-center justify-center">
                                                    <Music size={24} className="opacity-20" />
                                                </div>
                                            )}
                                            <div>
                                                <h3 className="text-xl font-black uppercase leading-none mb-1">
                                                    {report.songs?.title || "Unknown Title"}
                                                </h3>
                                                <p className="font-bold text-gray-500 mb-2">
                                                    {report.songs?.artist || "Unknown Artist"}
                                                </p>
                                                <div className="text-xs font-mono bg-gray-100 p-2 border border-gray-300 inline-block">
                                                    ID: {report.song_id}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-red-50 p-4 border-l-4 border-red-500 mb-4">
                                            <p className="font-bold text-xs uppercase text-red-500 mb-1">Reporter Description:</p>
                                            <p className="italic">"{report.description || "No description provided."}"</p>
                                        </div>

                                        <p className="text-xs font-bold opacity-40 uppercase">
                                            Reported: {new Date(report.created_at).toLocaleString()}
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex md:flex-col gap-3 justify-center border-t md:border-t-0 md:border-l border-gray-200 pt-4 md:pt-0 md:pl-6 min-w-[200px]">
                                        <form action={dismissReport.bind(null, report.id)} className="w-full">
                                            <button className="w-full py-3 px-4 border-2 border-black font-black uppercase hover:bg-green-100 transition-colors flex items-center justify-center gap-2">
                                                <CheckCircle size={18} /> Dismiss
                                            </button>
                                        </form>

                                        <form action={banSong.bind(null, report.id, report.song_id)} className="w-full">
                                            <button className="w-full py-3 px-4 bg-red-600 text-white border-2 border-black font-black uppercase shadow-[4px_4px_0px_0px_black] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_black] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all flex items-center justify-center gap-2">
                                                <Trash2 size={18} /> Ban & Delete
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
