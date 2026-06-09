import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Download, Copy, ZoomIn, ZoomOut, Maximize2, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type LightboxItem = {
  src: string;
  prompt?: string;
  provider?: string;
  resolution?: string;
  character?: string | null;
  date?: string | Date | null;
};

type Props = {
  open: boolean;
  items: LightboxItem[];
  index: number;
  onClose: () => void;
  onIndexChange?: (i: number) => void;
};

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 8;

export function ImageLightbox({ open, items, index, onClose, onIndexChange }: Props) {
  const item = items[index];
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const pinchStart = useRef<{ dist: number; zoom: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const reset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    if (open) reset();
  }, [open, index, reset]);

  const go = useCallback(
    (delta: number) => {
      if (!onIndexChange || items.length <= 1) return;
      const next = (index + delta + items.length) % items.length;
      onIndexChange(next);
    },
    [index, items.length, onIndexChange],
  );

  const zoomBy = useCallback((factor: number) => {
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor)));
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "+" || e.key === "=") zoomBy(1.2);
      else if (e.key === "-" || e.key === "_") zoomBy(1 / 1.2);
      else if (e.key === "0") reset();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, zoomBy, reset, go]);

  if (!open || !item) return null;

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1 / 1.1 : 1.1;
    zoomBy(factor);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (zoom <= 1) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || !dragStart.current) return;
    setPan({
      x: dragStart.current.px + (e.clientX - dragStart.current.x),
      y: dragStart.current.py + (e.clientY - dragStart.current.y),
    });
  };
  const onPointerUp = () => {
    setDragging(false);
    dragStart.current = null;
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStart.current = { dist: Math.hypot(dx, dy), zoom };
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStart.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const next = (pinchStart.current.zoom * dist) / pinchStart.current.dist;
      setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next)));
    }
  };
  const onTouchEnd = () => {
    pinchStart.current = null;
  };

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = item.src;
    a.download = `imagen-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  const handleCopy = () => {
    if (!item.prompt) return;
    navigator.clipboard.writeText(item.prompt).then(
      () => toast.success("Prompt copiado."),
      () => toast.error("No se pudo copiar."),
    );
  };

  const dateStr =
    item.date instanceof Date
      ? item.date.toLocaleString()
      : typeof item.date === "string"
        ? new Date(item.date).toLocaleString()
        : "";

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/90 backdrop-blur-sm motion-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-black/40 px-4 py-2 text-white">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {item.provider && <Badge variant="secondary" className="uppercase">{item.provider}</Badge>}
          {item.resolution && <span className="text-white/70">{item.resolution}</span>}
          {item.character && <span className="text-white/70">· {item.character}</span>}
          {dateStr && <span className="text-white/50">· {dateStr}</span>}
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/10" onClick={() => zoomBy(1 / 1.2)} title="Zoom out (-)"><ZoomOut className="h-4 w-4" /></Button>
          <span className="w-12 text-center text-xs tabular-nums">{Math.round(zoom * 100)}%</span>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/10" onClick={() => zoomBy(1.2)} title="Zoom in (+)"><ZoomIn className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/10" onClick={reset} title="Reset (0)"><RotateCcw className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/10" onClick={reset} title="Ajustar a pantalla"><Maximize2 className="h-4 w-4" /></Button>
          <div className="mx-1 h-5 w-px bg-white/20" />
          {item.prompt && (
            <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/10" onClick={handleCopy} title="Copiar prompt"><Copy className="h-4 w-4" /></Button>
          )}
          <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/10" onClick={handleDownload} title="Descargar"><Download className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/10" onClick={onClose} title="Cerrar (Esc)"><X className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Image area */}
      <div
        ref={containerRef}
        className="relative flex flex-1 select-none items-center justify-center overflow-hidden"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onDoubleClick={() => (zoom === 1 ? zoomBy(2) : reset())}
        style={{ cursor: zoom > 1 ? (dragging ? "grabbing" : "grab") : "zoom-in" }}
      >
        {items.length > 1 && onIndexChange && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); go(-1); }}
              className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
              title="Anterior (←)"
            ><ChevronLeft className="h-5 w-5" /></button>
            <button
              onClick={(e) => { e.stopPropagation(); go(1); }}
              className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
              title="Siguiente (→)"
            ><ChevronRight className="h-5 w-5" /></button>
          </>
        )}
        <img
          src={item.src}
          alt={item.prompt ?? "imagen"}
          draggable={false}
          className={cn("max-h-full max-w-full object-contain will-change-transform", dragging ? "" : "transition-transform duration-150")}
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
        />
      </div>

      {/* Prompt footer */}
      {item.prompt && (
        <div className="max-h-32 overflow-y-auto border-t border-white/10 bg-black/40 px-4 py-2 text-xs text-white/80">
          {item.prompt}
        </div>
      )}
    </div>,
    document.body,
  );
}
