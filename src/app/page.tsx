import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-800 p-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Life OS</h1>
        <nav>
          <button className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
            Portfolio
          </button>
        </nav>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="absolute top-1/4 blur-[120px] bg-zinc-800/20 w-full max-w-lg h-[300px] rounded-full z-0 pointer-events-none" />

        <div className="z-10 animate-in slide-in-from-bottom-4 fade-in duration-700">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tighter mb-4">
            Welcome to Life OS
          </h2>
          <p className="text-zinc-400 text-lg md:text-xl max-w-lg mx-auto mb-8">
            The high-fidelity, open-source template framework for personal management.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/login"
              className="bg-zinc-100 hover:bg-white text-zinc-950 font-medium px-6 py-3 rounded-full text-sm transition-colors"
            >
              Enter Command Center
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
