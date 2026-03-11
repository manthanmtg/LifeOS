"use client";

import { Briefcase, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface PortfolioProfile {
    full_name?: string;
    hero_title: string;
    sub_headline?: string;
    bio?: string;
    skills: string[];
    social_links: { platform: string; url: string }[];
    available_for_hire: boolean;
}





function cleanSocialLinks(profile: PortfolioProfile) {
    return (profile.social_links || []).filter((link) => link.platform?.trim() && link.url?.trim());
}

export default function PortfolioShowcase({
    profile,
    resume
}: {
    profile: PortfolioProfile;
    resume?: { filename: string; content: string } | null;
}) {
    const socialLinks = cleanSocialLinks(profile);
    const skills = profile.skills || [];
    const displayName = profile.full_name?.trim() || profile.hero_title?.trim() || "Life OS";

    return (
        <div className="flex-1 relative overflow-hidden pb-10">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-72 w-[48rem] bg-accent/10 blur-[140px] rounded-full" />
                <div className="absolute top-72 -left-24 h-64 w-64 bg-zinc-800/40 blur-[90px] rounded-full" />
                <div className="absolute bottom-0 -right-20 h-80 w-80 bg-accent/10 blur-[140px] rounded-full" />
            </div>

            <section className="relative z-10 pt-20 md:pt-32 px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="space-y-8"
                    >
                        <div className="space-y-6">
                            {profile.available_for_hire && (
                                <motion.span
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-300 text-[10px] uppercase tracking-widest font-bold"
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                    Open to new projects
                                </motion.span>
                            )}

                            <h1 className="text-5xl md:text-8xl font-bold tracking-tight text-zinc-50 leading-[0.95] max-w-4xl">
                                {profile.hero_title || displayName}
                            </h1>

                            {profile.sub_headline && (
                                <p className="text-zinc-400 text-lg md:text-xl leading-relaxed max-w-2xl font-light">
                                    {profile.sub_headline}
                                </p>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 pt-4">
                            {socialLinks.map((link, i) => (
                                <motion.a
                                    key={`${link.platform}-${i}`}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    whileHover={{ y: -2 }}
                                    className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900/50 border border-zinc-800 text-zinc-400 hover:text-zinc-50 hover:border-zinc-600 transition-all text-sm backdrop-blur-md"
                                >
                                    <ExternalLink className="w-3.5 h-3.5 group-hover:text-accent transition-colors" />
                                    {link.platform}
                                </motion.a>
                            ))}
                            {resume && (
                                <motion.a
                                    href="/resume"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    whileHover={{ y: -2, scale: 1.02 }}
                                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-zinc-50 text-zinc-950 hover:bg-white transition-all text-sm font-bold shadow-xl shadow-white/5"
                                >
                                    <Briefcase className="w-3.5 h-3.5" />
                                    View Resume
                                </motion.a>
                            )}
                        </div>
                    </motion.div>
                </div>
            </section>

            {!!profile.bio?.trim() && (
                <section className="relative z-10 px-6 mt-20 md:mt-32">
                    <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-12">
                        <div className="space-y-4">
                            <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-accent">Background</p>
                            <div className="h-px w-12 bg-accent/30" />
                        </div>
                        <div>
                            <p className="text-zinc-300 text-lg md:text-xl leading-relaxed whitespace-pre-wrap font-light italic opacity-90">
                                &ldquo;{profile.bio}&rdquo;
                            </p>
                        </div>
                    </div>
                </section>
            )}

            {skills.length > 0 && (
                <section className="relative z-10 px-6 mt-20 md:mt-32">
                    <div className="max-w-5xl mx-auto">
                        <div className="flex items-center justify-between gap-3 mb-10">
                            <div className="space-y-1">
                                <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-accent">Skill Surface</p>
                                <p className="text-zinc-500 text-xs">A collection of technologies and specialized tools.</p>
                            </div>
                            <div className="h-px flex-1 bg-zinc-800 mx-8 hidden md:block" />
                            <p className="text-zinc-500 text-[10px] uppercase tracking-widest">{skills.length} Expertise</p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {skills.map((skill, i) => (
                                <motion.div
                                    key={`${skill}-${i}`}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.05 }}
                                    whileHover={{ y: -4, borderColor: "rgba(var(--accent-rgb), 0.4)" }}
                                    className={cn(
                                        "group relative rounded-2xl border p-5 transition-all duration-300 backdrop-blur-sm",
                                        "bg-zinc-900/40 border-zinc-800/80 hover:bg-zinc-900/60"
                                    )}
                                >
                                    <div className="relative z-10">
                                        <p className="text-zinc-200 font-medium tracking-tight group-hover:text-zinc-50 transition-colors uppercase text-xs tracking-[0.05em]">{skill}</p>
                                        <div className="mt-2 h-0.5 w-0 group-hover:w-full bg-accent/40 transition-all duration-300" />
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            <section className="relative z-10 px-6 mt-32 md:mt-48 pb-20">
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="max-w-5xl mx-auto rounded-[2rem] bg-gradient-to-b from-zinc-900/80 to-zinc-950 border border-zinc-800 p-8 md:p-16 text-center relative overflow-hidden group"
                >
                    <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-3xl" />

                    <div className="relative z-10 space-y-6">
                        <h2 className="text-3xl md:text-5xl font-bold text-zinc-50 tracking-tight leading-tight">
                            Let&apos;s work together.
                        </h2>
                        <p className="text-zinc-400 text-base md:text-lg max-w-xl mx-auto font-light">
                            If you&apos;re looking for a focused builder to join your team or collaborate on a high-impact project, I&apos;m always open to talking.
                        </p>
                        <div className="pt-4">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => {
                                    const firstLink = socialLinks[0]?.url;
                                    if (firstLink) window.open(firstLink, '_blank');
                                }}
                                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-zinc-50 text-zinc-950 font-bold text-sm shadow-2xl shadow-white/10"
                            >
                                Get in Touch
                                <ExternalLink className="w-4 h-4" />
                            </motion.button>
                        </div>
                    </div>
                </motion.div>
            </section>
        </div>
    );
}
