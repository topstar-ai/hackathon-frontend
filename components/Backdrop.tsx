// ============================================================================
// Lightweight backdrop. Pure CSS — a few slow-drifting blurred color blobs
// over a dark base. No WebGL, no requestAnimationFrame loop: the blobs animate
// with GPU-composited `transform` only (no per-frame repaint), so it's cheap.
// (Replaces the old per-frame fragment-shader background.)
// ============================================================================

export function Backdrop() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-bg" aria-hidden>
      <div className="blob blob-a" />
      <div className="blob blob-b" />
      <div className="blob blob-c" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/35 to-black/70" />
    </div>
  );
}
