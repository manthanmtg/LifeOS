export default function Loading() {
  return (
    <main
      role="status"
      aria-label="Loading shared expense space"
      className="mx-auto max-w-6xl animate-pulse space-y-5 p-6"
    >
      <div className="h-40 rounded-3xl bg-zinc-800" />
      <div className="h-32 rounded-3xl bg-zinc-800" />
      <div className="h-72 rounded-3xl bg-zinc-800" />
    </main>
  );
}
