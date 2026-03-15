"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LoginPage() {
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [siteTitle, setSiteTitle] = useState("Life OS");
    const [siteIcon, setSiteIcon] = useState<string | null>(null);
    const [loaded, setLoaded] = useState(false);
    const router = useRouter();

    useEffect(() => {
        fetch("/api/system")
            .then(r => r.json())
            .then(d => {
                if (d.data?.site_title) setSiteTitle(d.data.site_title);
                if (d.data?.site_icon) setSiteIcon(d.data.site_icon);
            })
            .catch(() => {})
            .finally(() => setLoaded(true));
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password }),
        });

        if (res.ok) {
            router.push("/admin");
        } else {
            setError("Invalid password");
        }
    };

    return (
        <div suppressHydrationWarning className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-50 relative overflow-hidden">
            <div className="absolute top-0 blur-[150px] bg-zinc-800/50 w-full h-[500px] rounded-full -translate-y-1/2" />

            <div className="w-full max-w-sm p-8 z-10">
                <div className="flex flex-col items-center mb-10">
                    <AnimatePresence mode="wait">
                        {siteIcon ? (
                            <motion.div
                                key="custom-icon"
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="w-14 h-14 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm flex items-center justify-center mb-4 shadow-lg"
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={siteIcon} alt="" className="w-9 h-9 object-contain" />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="lock-icon"
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="w-14 h-14 bg-white/10 rounded-2xl border border-white/20 flex items-center justify-center mb-4"
                            >
                                <Lock className="w-6 h-6 text-zinc-300" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <motion.h1
                        key={siteTitle}
                        initial={loaded ? { opacity: 0, y: 4 } : false}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-3xl font-semibold tracking-tight"
                    >
                        {siteTitle}
                    </motion.h1>
                    <p className="text-zinc-500 text-sm mt-2">Enter your password to access the portal</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <input
                            type="password"
                            placeholder="Admin Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-700 transition-all"
                        />
                    </div>

                    {error && <p className="text-red-400 text-sm">{error}</p>}

                    <button
                        type="submit"
                        className="w-full bg-zinc-100 hover:bg-white text-zinc-950 font-medium py-3 rounded-lg text-sm transition-colors"
                    >
                        Enter Command Center
                    </button>
                </form>
            </div>
        </div>
    );
}
