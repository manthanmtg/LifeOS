export default function ResumeViewer() {
  return (
    <div className="fixed inset-0 h-dvh w-full bg-zinc-900 overflow-hidden [padding-top:env(safe-area-inset-top)] [padding-bottom:env(safe-area-inset-bottom)]">
      <iframe
        src="/api/portfolio/resume"
        className="w-full h-full border-none"
        title="Resume PDF Viewer"
      />
    </div>
  );
}
