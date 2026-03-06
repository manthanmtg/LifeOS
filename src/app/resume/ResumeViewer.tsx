"use client";

import { useEffect, useState } from "react";

export default function ResumeViewer() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setTimeout(() => setMounted(true), 0);
    }, []);

    if (!mounted) {
        return <div className="fixed inset-0 bg-zinc-950" />;
    }

    return (
        <div className="fixed inset-0 w-full h-full bg-zinc-900 overflow-hidden">
            <iframe
                src="/api/portfolio/resume"
                className="w-full h-full border-none"
                title="Resume PDF Viewer"
            />
        </div>
    );
}
