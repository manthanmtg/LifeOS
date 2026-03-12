"use client";

import { useState, useEffect } from "react";
import { Heart, ExternalLink } from "lucide-react";

interface SocialLink {
    platform: string;
    url: string;
}

export default function PublicFooter() {
    const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);

    useEffect(() => {
        fetch("/api/content?module_type=portfolio_profile")
            .then((r) => r.json())
            .then((d) => {
                if (d.data?.length > 0) {
                    setSocialLinks(d.data[0].payload.social_links || []);
                }
            })
            .catch(() => { });
    }, []);

    return (
        <footer className="border-t border-zinc-800 py-8 mt-auto">
            <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-500">
                <p className="flex items-center gap-1.5">
                    Built with <Heart className="w-3.5 h-3.5 text-red-400" /> using Life OS
                </p>
                {socialLinks.filter((l) => l.platform && l.url).length > 0 && (
                    <div className="flex items-center gap-4">
                        {socialLinks.filter((l) => l.platform && l.url).map((l, i) => (
                            <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300 transition-colors">
                                <ExternalLink className="w-3 h-3" /> {l.platform}
                            </a>
                        ))}
                    </div>
                )}
                <p>&copy; {new Date().getFullYear()} Life OS</p>
            </div>
        </footer>
    );
}
