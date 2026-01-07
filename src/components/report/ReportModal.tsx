"use client";

import { useState } from "react";
import { submitReport } from "@/actions/reports";
import { X, AlertTriangle } from "lucide-react";

interface ReportModalProps {
    songId: string;
    isOpen: boolean;
    onClose: () => void;
}

export function ReportModal({ songId, isOpen, onClose }: ReportModalProps) {
    const [reason, setReason] = useState("Copyright Infringement");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await submitReport(songId, reason, description);
            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setDescription("");
            }, 2000);
        } catch (err) {
            console.error(err);
            alert("Failed to submit report. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white border-2 border-black shadow-[8px_8px_0px_0px_black] w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 hover:text-red-600 transition-colors"
                >
                    <X size={24} />
                </button>

                {success ? (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-black">
                            <AlertTriangle size={32} />
                        </div>
                        <h3 className="text-xl font-black uppercase mb-2">Report Submitted</h3>
                        <p className="text-sm font-bold opacity-60">Thank you for helping keep Hertz safe.</p>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-3 mb-6 border-b-2 border-black pb-4">
                            <AlertTriangle className="text-red-600" size={28} />
                            <h2 className="text-2xl font-black uppercase italic">Report Song</h2>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-black uppercase mb-1">Reason</label>
                                <select
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="w-full border-2 border-black p-3 font-bold bg-gray-50 focus:outline-none focus:shadow-[4px_4px_0px_0px_black] transition-all"
                                >
                                    <option value="Copyright Infringement">Copyright Infringement</option>
                                    <option value="Inappropriate Content">Inappropriate Content</option>
                                    <option value="Low Quality / Broken">Low Quality / Broken Audio</option>
                                    <option value="Spam / Misleading">Spam / Misleading Metadata</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase mb-1">Description (Optional)</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Please provide specific details..."
                                    rows={3}
                                    className="w-full border-2 border-black p-3 font-bold bg-gray-50 focus:outline-none focus:shadow-[4px_4px_0px_0px_black] transition-all resize-none placeholder:text-gray-400 placeholder:uppercase placeholder:text-xs"
                                />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 py-3 font-black uppercase border-2 border-transparent hover:bg-gray-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 bg-red-600 text-white border-2 border-black py-3 font-black uppercase shadow-[4px_4px_0px_0px_black] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_black] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-50 disabled:pointer-events-none"
                                >
                                    {loading ? "Submitting..." : "Submit Report"}
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
