import { Navigation } from "@/components/Navigation";
import { Crown, Mic, Users, Ban, Sparkles, Waves, Zap, Shield, Check } from "lucide-react";

export default function PremiumPage() {
    const features = [
        {
            icon: Ban,
            title: "Ad-Free Experience",
            description: "No more sidebar ads. Pure, distraction-free music discovery.",
            free: "Sidebar Ads",
            premium: "Zero Ads",
        },
        {
            icon: Users,
            title: "Unlimited Connections",
            description: "Connect with every music lover you vibe with. No limits on your tribe.",
            free: "5 Connections",
            premium: "Unlimited",
        },
        {
            icon: Mic,
            title: "Adaptive Noise Reduction",
            description: "Smart ambient detection that auto-ducks your music when someone talks or traffic passes.",
            free: "Disabled",
            premium: "Full Access",
        },
        {
            icon: Sparkles,
            title: "Ambient Mode",
            description: "Immersive neon-glow visualization that reacts to your music's energy in real-time.",
            free: "Available",
            premium: "Available",
            included: true,
        },
        {
            icon: Waves,
            title: "Trance Mode",
            description: "Psychedelic floating UI with smoke effects. Enter a different dimension of listening.",
            free: "Available",
            premium: "Available",
            included: true,
        },
        {
            icon: Shield,
            title: "Secure Studio",
            description: "Upload your tracks securely. Your music, your rules.",
            free: "Available",
            premium: "Available",
            included: true,
        },
    ];

    return (
        <div className="min-h-screen pb-32 bg-[#E8E4D9]">
            <main className="max-w-5xl mx-auto p-6 md:p-8">

                {/* Hero Section */}
                <div className="relative bg-black text-white border-4 border-black shadow-[8px_8px_0px_0px_#000000] p-8 md:p-16 mb-12 overflow-hidden">
                    {/* Background gradient accents */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-amber-500/30 to-transparent rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-yellow-500/20 to-transparent rounded-full blur-3xl" />

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-4xl">👑</span>
                            <div className="bg-gradient-to-r from-amber-400 to-yellow-500 text-black px-3 py-1 font-black uppercase text-xs tracking-widest">
                                Premium
                            </div>
                        </div>

                        <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter leading-none mb-4">
                            HZ<span className="text-amber-400">+</span>
                        </h1>
                        <p className="text-xl md:text-2xl font-bold opacity-80 max-w-lg mb-8">
                            Unlock the full power of Hertz. No ads, unlimited connections, and smart features that make every listen premium.
                        </p>

                        {/* Price Tag */}
                        <div className="inline-flex items-end gap-2 bg-gradient-to-r from-amber-400 to-yellow-500 text-black px-8 py-5 border-4 border-amber-300 shadow-[6px_6px_0px_0px_#92400e]">
                            <div className="flex flex-col">
                                <span className="text-xs font-bold uppercase tracking-widest opacity-70">Starting at</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-5xl md:text-6xl font-black italic tracking-tighter">₹99</span>
                                    <span className="text-lg font-bold opacity-70">/mo</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Features Comparison Grid */}
                <div className="mb-12">
                    <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-8">What You Get</h2>

                    <div className="grid gap-4">
                        {/* Header Row */}
                        <div className="hidden md:grid grid-cols-[1fr_120px_120px] gap-4 px-6 pb-2 border-b-4 border-black">
                            <span className="font-black uppercase text-sm opacity-60">Feature</span>
                            <span className="font-black uppercase text-sm opacity-60 text-center">Free</span>
                            <span className="font-black uppercase text-sm text-amber-600 text-center">HZ+</span>
                        </div>

                        {features.map((feature, i) => (
                            <div
                                key={i}
                                className="grid grid-cols-1 md:grid-cols-[1fr_120px_120px] gap-3 md:gap-4 p-4 md:p-6 bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000000] hover:shadow-[2px_2px_0px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                            >
                                {/* Feature Info */}
                                <div className="flex items-start gap-4">
                                    <div className={`w-10 h-10 border-2 border-black flex items-center justify-center shrink-0 ${feature.included ? "bg-[#E8E4D9]" : "bg-amber-400"}`}>
                                        <feature.icon size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-black uppercase text-sm">{feature.title}</h3>
                                        <p className="text-xs opacity-60 mt-1 leading-relaxed">{feature.description}</p>
                                    </div>
                                </div>

                                {/* Free Tier */}
                                <div className="flex md:justify-center items-center">
                                    <span className={`text-xs font-bold uppercase px-3 py-1 border-2 border-black ${
                                        feature.included 
                                            ? "bg-green-100 text-green-800" 
                                            : "bg-red-50 text-red-600"
                                    }`}>
                                        {feature.free}
                                    </span>
                                </div>

                                {/* Premium Tier */}
                                <div className="flex md:justify-center items-center">
                                    <span className="text-xs font-bold uppercase px-3 py-1 border-2 border-black bg-amber-100 text-amber-800 flex items-center gap-1">
                                        <Check size={12} className="text-green-600" />
                                        {feature.premium}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* CTA Section */}
                <div className="bg-black text-white border-4 border-black p-8 md:p-12 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-yellow-500/10" />

                    <div className="relative z-10">
                        <h2 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter mb-3">
                            Ready to Go Premium?
                        </h2>
                        <p className="text-lg opacity-70 font-bold mb-8 max-w-md mx-auto">
                            Let your vibe find its tribe — without limits.
                        </p>

                        <button
                            className="group relative inline-flex items-center gap-3 bg-gradient-to-r from-amber-400 to-yellow-500 text-black px-10 py-5 border-4 border-amber-300 font-black uppercase text-lg tracking-wide shadow-[6px_6px_0px_0px_#92400e] hover:shadow-[3px_3px_0px_0px_#92400e] hover:translate-x-[3px] hover:translate-y-[3px] active:shadow-none active:translate-x-[6px] active:translate-y-[6px] transition-all"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
                            <Zap size={24} className="relative z-10" />
                            <span className="relative z-10">Subscribe to HZ+ — ₹99/mo</span>
                        </button>

                        <p className="mt-6 text-xs opacity-40 font-semibold">
                            Cancel anytime. No questions asked.
                        </p>
                    </div>
                </div>

                {/* FAQ / Trust */}
                <div className="mt-12 grid md:grid-cols-3 gap-4">
                    {[
                        { q: "Can I cancel anytime?", a: "Yes! No lock-in. Cancel from your profile whenever you want." },
                        { q: "What happens to my connections?", a: "Free users keep their first 5 connections. Upgrade to unlock new ones." },
                        { q: "Is my payment secure?", a: "100%. Powered by Razorpay with bank-grade encryption." },
                    ].map((faq, i) => (
                        <div key={i} className="p-6 bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000000]">
                            <h4 className="font-black uppercase text-sm mb-2">{faq.q}</h4>
                            <p className="text-xs opacity-60 leading-relaxed">{faq.a}</p>
                        </div>
                    ))}
                </div>

            </main>
        </div>
    );
}
