import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { Maximize2, Minus, Plus, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  src: string;
  alt?: string;
  className?: string;
  /** Zoom levels cycled by double-click. Default [1, 2]. */
  doubleClickLevels?: number[];
};

export type InlineImageZoomHandle = {
  zoomIn: () => void;
  reset: () => void;
};

const MIN = 1;
const MAX = 5;

export const InlineImageZoom = forwardRef<InlineImageZoomHandle, Props>(function InlineImageZoom(
  { src, alt, className, doubleClickLevels = [1, 2] },
  ref,
) {
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Reset pan when image changes or scale returns to 1.
  useEffect(() => {
    setScale(1);
    setTx(0);
    setTy(0);
  }, [src]);

  useEffect(() => {
    if (scale <= 1) {
      setTx(0);
      setTy(0);
    }
  }, [scale]);

  useImperativeHandle(ref, () => ({
    zoomIn: () => cycleDoubleClick(),
    reset: () => {
      setScale(1);
      setTx(0);
      setTy(0);
    },
  }));

  function cycleDoubleClick() {
    const levels = doubleClickLevels.length > 0 ? doubleClickLevels : [1, 2];
    const idx = levels.findIndex((l) => Math.abs(l - scale) < 0.01);
    const next = levels[(idx + 1) % levels.length] ?? 1;
    setScale(next);
  }

  function onWheel(e: React.WheelEvent) {
    if (e.ctrlKey) return; // let browser zoom
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    setScale((s) => Math.min(MAX, Math.max(MIN, +(s + s * delta).toFixed(3))));
  }

  function onMouseDown(e: React.MouseEvent) {
    if (scale <= 1) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, tx, ty };
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!dragging || !dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setTx(dragStart.current.tx + dx);
    setTy(dragStart.current.ty + dy);
  }
  function endDrag() {
    setDragging(false);
    dragStart.current = null;
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && scale > 1) {
        setScale(1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [scale]);

  const cursor = scale > 1 ? (dragging ? "grabbing" : "grab") : "zoom-in";

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden rounded-md bg-muted/30 select-none",
        className,
      )}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
      onDoubleClick={cycleDoubleClick}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        title="Doble clic para zoom · Rueda para acercar · Arrastra cuando esté ampliada"
        className="max-h-full max-w-full object-contain transition-transform duration-150 ease-out will-change-transform"
        style={{
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          cursor,
          transitionDuration: dragging ? "0ms" : "150ms",
        }}
      />
      {/* Controls */}
      <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md border border-border/50 bg-background/70 px-1.5 py-1 text-[10px] backdrop-blur">
        <button
          type="button"
          onClick={() => setScale((s) => Math.max(MIN, +(s - 0.25).toFixed(2)))}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Alejar"
        >
          <Minus className="h-3 w-3" />
        </button>
        <span className="min-w-[36px] text-center font-mono tabular-nums text-foreground">
          {Math.round(scale * 100)}%
        </span>
        <button
          type="button"
          onClick={() => setScale((s) => Math.min(MAX, +(s + 0.25).toFixed(2)))}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Acercar"
        >
          <Plus className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={() => {
            setScale(1);
            setTx(0);
            setTy(0);
          }}
          className="ml-1 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Reset"
          title="Reset (Esc)"
        >
          <RotateCcw className="h-3 w-3" />
        </button>
      </div>
      {scale === 1 && (
        <div className="pointer-events-none absolute bottom-2 left-2 hidden items-center gap-1 rounded-md border border-border/40 bg-background/60 px-2 py-1 text-[10px] text-muted-foreground backdrop-blur sm:flex">
          <Maximize2 className="h-3 w-3" /> Doble clic o rueda para zoom
        </div>
      )}
    </div>
  );
});