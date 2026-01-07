"use client";

import { createClient } from "@/lib/supabase/client";
import { UploadCloud, CheckCircle, AlertTriangle, Music, Lock, Camera } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function UploadPage() {
    const supabase = createClient();
    const router = useRouter();

    const [file, setFile] = useState<File | null>(null);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    const [title, setTitle] = useState("");
    const [artist, setArtist] = useState("");
    const [language, setLanguage] = useState("English");

    const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
    const [agreed, setAgreed] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState<"idle" | "hashing" | "checking" | "uploading" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState("");
    // Simplified logs for internal use if needed, but removing UI display
    // const [logs, setLogs] = useState<string[]>([]);
    const addLog = (msg: string) => console.log(msg);

    const GENRE_LIST = [
        "Romance", "Bollywood", "Sad", "Party", "Long Drive", "Gym",
        "Lo-Fi", "Hip Hop", "Electronic", "Rock", "Pop", "Classical",
        "Jazz", "Metal", "Country", "Indie", "R&B", "Reggae",
        "90s Hits", "Devotional", "Folk", "Punk", "Ambient", "Trap"
    ];

    const LANGUAGE_LIST = [
        "English", "Hindi", "Bengali", "Korean", "Spanish", "Punjabi",
        "Tamil", "Telugu", "Malayalam", "Japanese", "French", "German"
    ];

    const toggleGenre = (g: string) => {
        if (selectedGenres.includes(g)) {
            setSelectedGenres(selectedGenres.filter(i => i !== g));
        } else {
            if (selectedGenres.length >= 3) {
                alert("You can select up to 3 genres.");
                return;
            }
            setSelectedGenres([...selectedGenres, g]);
        }
    };

    // Calculate SHA-256 Hash
    async function calculateHash(file: File): Promise<string> {
        addLog(`Hashing file: ${file.name} (${file.size} bytes)`);
        const buffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        addLog(`Hash calculated: ${hashHex.substring(0, 8)}...`);
        return hashHex;
    }

    // Calculate Audio Duration
    function getAudioDuration(file: File): Promise<number> {
        return new Promise((resolve) => {
            const objectUrl = URL.createObjectURL(file);
            const audio = new Audio(objectUrl);
            audio.onloadedmetadata = () => {
                URL.revokeObjectURL(objectUrl);
                resolve(Math.round(audio.duration));
            };
            audio.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                resolve(180); // Fallback to 3 mins
            };
        });
    }

    async function handleUpload(e: React.FormEvent) {
        e.preventDefault();
        if (!file || !agreed || !title || !artist || selectedGenres.length === 0) {
            alert("Please fill in all fields (at least 1 genre) and agree to the terms.");
            return;
        }

        const genre = selectedGenres.join(", ");

        try {
            setUploading(true);
            setErrorMessage("");
            // setLogs([]); // Clear previous logs
            addLog("Starting upload process...");

            // 1. Authenticate
            addLog("Checking auth...");
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                addLog("User not logged in. Redirecting.");
                router.push("/login");
                return; // Guard clause
            }
            addLog(`User authenticated: ${user.id}`);

            // 2. Hash File & Get Duration
            setStatus("hashing");
            const fileHash = await calculateHash(file);
            addLog(`File Hash: ${fileHash.substring(0, 10)}...`);

            addLog("Calculating duration...");
            const duration = await getAudioDuration(file);
            addLog(`Duration detected: ${duration} seconds`);

            // 3. Duplicate Check
            setStatus("checking");
            addLog("Checking for duplicates...");
            const { data: existing } = await supabase
                .from('songs')
                .select('id')
                .eq('file_hash', fileHash)
                .single();

            if (existing) {
                const existingRec = existing as any;
                addLog(`Duplicate found! Song ID: ${existingRec.id}`);
                throw new Error("This audio file already exists on the platform. Duplicate uploads are not allowed.");
            }
            addLog("No duplicates found.");

            // 4. Secure Upload
            setStatus("uploading");
            const fileExt = file.name.split('.').pop();
            const filePath = `${user.id}/${fileHash}.${fileExt}`;
            addLog(`Uploading to storage path: ${filePath}`);

            const { error: uploadError } = await supabase.storage
                .from('private_songs')
                .upload(filePath, file, { upsert: true });

            if (uploadError) {
                addLog(`Storage Upload Error: ${JSON.stringify(uploadError)}`);
                throw uploadError;
            }
            addLog("Storage upload success.");

            // 4.5. Upload Cover (if exists)
            let coverUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&background=random`;
            if (coverFile) {
                addLog("Uploading cover art...");
                const coverExt = coverFile.name.split('.').pop();
                const coverPath = `${user.id}/${Date.now()}_cover.${coverExt}`;
                const { error: coverError } = await supabase.storage
                    .from('song_covers')
                    .upload(coverPath, coverFile);

                if (coverError) {
                    addLog(`Cover Upload Warning: ${coverError.message}`);
                } else {
                    const { data: { publicUrl } } = supabase.storage.from('song_covers').getPublicUrl(coverPath);
                    coverUrl = publicUrl;
                    addLog("Cover upload success.");
                }
            }

            // 5. Create Metadata Record
            addLog("Inserting metadata into DB...");
            const { error: dbError } = await supabase
                .from('songs')
                .insert({
                    title,
                    artist,
                    genre,
                    language,
                    url: "local_upload", // Placeholder for DB constraint
                    origin: 'local', // REQUIRED for Home Page filter
                    duration, // Dynamic Duration
                    uploader_id: user.id,
                    file_path: filePath,
                    file_hash: fileHash,
                    is_original: true,
                    cover_url: coverUrl
                } as any);

            if (dbError) {
                addLog(`DB Insert Error: ${JSON.stringify(dbError)}`);
                throw dbError;
            }
            addLog("DB Insert success!");

            setStatus("success");
            // Reset form after delay
            setTimeout(() => {
                router.push("/profile");
            }, 2000);

        } catch (error: any) {
            console.error(error);
            addLog(`FATAL ERROR: ${error.message || JSON.stringify(error)}`);
            setStatus("error");
            setErrorMessage(error.message);
        } finally {
            setUploading(false);
        }
    }

    return (
        <div className="min-h-screen bg-clay-bg p-8">
            <div className="max-w-3xl mx-auto">
                <Link href="/" className="inline-flex items-center gap-2 font-black mb-8 hover:underline uppercase italic">
                    <Music size={20} /> Back to Studio
                </Link>

                <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_black]">
                    <h1 className="text-4xl font-black uppercase mb-2 flex items-center gap-3">
                        <UploadCloud size={40} />
                        Secure Upload
                    </h1>
                    <p className="mb-8 opacity-60 font-bold">Use this studio to upload your original tracks.</p>

                    {status === 'success' ? (
                        <div className="bg-green-100 border-2 border-green-600 p-8 text-center animate-pulse">
                            <CheckCircle size={48} className="mx-auto mb-4 text-green-600" />
                            <h2 className="text-2xl font-black text-green-800">UPLOAD SECURED</h2>
                            <p className="font-bold">Your track is now encrypted and safe.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleUpload} className="space-y-6">

                            {/* File Inputs Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Audio Input */}
                                <div className="space-y-2">
                                    <label className="block text-xs font-black uppercase">Audio File</label>
                                    <div className="border-2 border-dashed border-black p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors relative h-48 flex items-center justify-center">
                                        <input
                                            type="file"
                                            accept="audio/*"
                                            onChange={(e) => {
                                                const f = e.target.files?.[0];
                                                setFile(f || null);
                                                addLog(f ? `Audio selected: ${f.name}` : "No audio selected");
                                            }}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50"
                                        />
                                        {file ? (
                                            <div className="flex flex-col items-center pointer-events-none">
                                                <Music size={40} className="mb-2" />
                                                <span className="font-black text-sm truncate w-32">{file.name}</span>
                                                <span className="text-xs font-bold opacity-50">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center opacity-50 pointer-events-none">
                                                <UploadCloud size={40} className="mb-2" />
                                                <span className="font-black text-sm">AUDIO</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Cover Input */}
                                <div className="space-y-2">
                                    <label className="block text-xs font-black uppercase">Cover Art</label>
                                    <div className="border-2 border-dashed border-black p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors relative h-48 flex items-center justify-center group overflow-hidden">
                                        {coverPreview && (
                                            <img src={coverPreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-40 transition-opacity" />
                                        )}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const f = e.target.files?.[0];
                                                if (f) {
                                                    setCoverFile(f);
                                                    setCoverPreview(URL.createObjectURL(f));
                                                    addLog(`Cover selected: ${f.name}`);
                                                }
                                            }}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50"
                                        />
                                        <div className="relative z-10 flex flex-col items-center pointer-events-none">
                                            <Camera size={40} className="mb-2" />
                                            <span className="font-black text-sm">{coverFile ? "CHANGE COVER" : "UPLOAD COVER"}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Metadata */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black uppercase mb-1">Track Title</label>
                                    <input
                                        value={title} onChange={e => setTitle(e.target.value)}
                                        className="w-full border-2 border-black p-2 font-bold focus:outline-none focus:shadow-[4px_4px_0px_0px_black] transition-shadow"
                                        placeholder="My Masterpiece"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase mb-1">Artist Name</label>
                                    <input
                                        value={artist} onChange={e => setArtist(e.target.value)}
                                        className="w-full border-2 border-black p-2 font-bold focus:outline-none focus:shadow-[4px_4px_0px_0px_black] transition-shadow"
                                        placeholder="Stage Name"
                                    />
                                </div>
                            </div>

                            {/* Language Selector */}
                            <div>
                                <label className="block text-xs font-black uppercase mb-1">Language</label>
                                <select
                                    value={language}
                                    onChange={e => setLanguage(e.target.value)}
                                    className="w-full border-2 border-black p-2 font-bold focus:outline-none focus:shadow-[4px_4px_0px_0px_black] transition-shadow bg-white"
                                >
                                    {LANGUAGE_LIST.map(l => (
                                        <option key={l} value={l}>{l}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Genre Selector */}
                            <div>
                                <label className="block text-xs font-black uppercase mb-1">Genres (Max 3)</label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {selectedGenres.map(g => (
                                        <span key={g} onClick={() => toggleGenre(g)} className="cursor-pointer bg-black text-white px-2 py-1 text-sm font-bold flex items-center gap-1 hover:bg-red-500">
                                            {g} ×
                                        </span>
                                    ))}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {GENRE_LIST.filter(g => !selectedGenres.includes(g)).map(g => (
                                        <span
                                            key={g}
                                            onClick={() => toggleGenre(g)}
                                            className="cursor-pointer border-2 border-black px-2 py-1 text-xs font-bold hover:bg-black hover:text-white transition-colors"
                                        >
                                            + {g}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Legal Checkbox */}
                            <div className="bg-yellow-50 border-2 border-orange-500 p-4 flex gap-4 items-start">
                                <input
                                    type="checkbox"
                                    id="legal"
                                    checked={agreed}
                                    onChange={e => setAgreed(e.target.checked)}
                                    className="mt-1 w-6 h-6 border-2 border-black accent-black"
                                />
                                <label htmlFor="legal" className="text-sm font-bold cursor-pointer">
                                    <div className="flex items-center gap-1 text-orange-600 mb-1">
                                        <Lock size={14} />
                                        <span className="uppercase font-black">Strict Copyright Affirmation</span>
                                    </div>
                                    I certify that I am the <span className="underline">original creator</span> of this audio or hold explicit legal rights to distribute it. I understand that this track will be <strong>fingerprinted</strong> and duplicate uploads will be rejected.
                                </label>
                            </div>

                            {/* Error Message */}
                            {status === 'error' && (
                                <div className="bg-red-100 border-2 border-red-500 p-4 flex items-center gap-2 text-red-700 font-bold">
                                    <AlertTriangle />
                                    {errorMessage}
                                </div>
                            )}

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={uploading}
                                className="w-full bg-black text-white font-black py-4 uppercase text-xl hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {status === 'idle' && "Secure Upload"}
                                {status === 'hashing' && "Fingerprinting..."}
                                {status === 'checking' && "Checking Registry..."}
                                {status === 'uploading' && "Encrypting & Uploading..."}
                                {status === 'error' && "Try Again"}
                            </button>
                        </form>
                    )}
                </div>


            </div>
        </div>
    );
}

