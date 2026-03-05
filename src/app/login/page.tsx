"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

export default function LoginPage() {
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

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
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-50 relative overflow-hidden">
            {/* Background gradients for aesthetics */}
            <div className="absolute top-0 blur-[150px] bg-zinc-800/50 w-full h-[500px] rounded-full -translate-y-1/2" />

            <div className="w-full max-w-sm p-8 z-10">
                <div className="flex flex-col items-center mb-10">
                    <div className="w-12 h-12 bg-white/10 rounded-xl border border-white/20 flex items-center justify-center mb-4">
                        <Lock className="w-5 h-5 text-zinc-300" />
                    </div>
                    <h1 className="text-3xl font-semibold tracking-tight">Life OS</h1>
                    <p className="text-zinc-500 text-sm mt-2">Enter your password to access the portal</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <input
                            type="password"
                            placeholder="Admin Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-700 transition-all"
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
