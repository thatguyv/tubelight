"use client";

import * as React from "react";
import { Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCcw, List, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionStatus } from "@/components/section-status";
import { useNotesStore } from "@/store/notes";
import { cn } from "@/lib/utils";
import type { MindMapNode } from "@/lib/types";

// ─── Tree layout ──────────────────────────────────────────────────────────────

interface LaidOutNode {
  node: MindMapNode;
  depth: number;
  x: number;
  y: number;
  width: number;
  height: number;
  children: LaidOutNode[];
  parent?: LaidOutNode;
}

interface Layout {
  root: LaidOutNode;
  flat: LaidOutNode[];
  width: number;
  height: number;
}

// Approximate width/height of a node card based on label text
function measureNode(label: string, depth: number) {
  const minW = depth === 0 ? 200 : depth === 1 ? 180 : 160;
  const maxW = depth === 0 ? 260 : 220;
  const charW = depth === 0 ? 9 : 7;
  const padding = 28;
  const w = Math.min(maxW, Math.max(minW, label.length * charW + padding));
  // Rough wrap: figure out number of lines if text exceeds w
  const lines = Math.max(1, Math.ceil((label.length * charW) / (w - padding)));
  const lineH = depth === 0 ? 22 : depth === 1 ? 18 : 16;
  const h = lines * lineH + (depth === 0 ? 28 : 22);
  return { w, h };
}

const X_GAP = 80;   // horizontal gap between depth levels
const Y_GAP = 14;   // vertical gap between sibling subtrees

function buildLayout(root: MindMapNode): Layout {
  const flat: LaidOutNode[] = [];

  function buildNode(n: MindMapNode, depth: number, parent?: LaidOutNode): LaidOutNode {
    const { w, h } = measureNode(n.label || "", depth);
    const ln: LaidOutNode = {
      node: n,
      depth,
      x: 0,
      y: 0,
      width: w,
      height: h,
      children: [],
      parent,
    };
    ln.children = (n.children ?? []).map((c) => buildNode(c, depth + 1, ln));
    flat.push(ln);
    return ln;
  }
  const rootLN = buildNode(root, 0);

  // First pass: y based on subtree height (Reingold-Tilford-ish, simple)
  function assignY(n: LaidOutNode, top: number): number {
    if (n.children.length === 0) {
      n.y = top;
      return top + n.height;
    }
    let cursor = top;
    for (const c of n.children) {
      cursor = assignY(c, cursor) + Y_GAP;
    }
    cursor -= Y_GAP;
    // Center this node between its children
    const first = n.children[0];
    const last = n.children[n.children.length - 1];
    n.y = (first.y + last.y + last.height - n.height) / 2;
    return cursor;
  }
  assignY(rootLN, 0);

  // Second pass: assign x based on depth, accumulating widths of previous columns.
  // Compute max width at each depth so columns align nicely.
  const maxWidthAtDepth: number[] = [];
  for (const ln of flat) {
    maxWidthAtDepth[ln.depth] = Math.max(maxWidthAtDepth[ln.depth] ?? 0, ln.width);
  }
  // Prefix sum of column widths
  const colStart: number[] = [];
  let acc = 0;
  for (let d = 0; d < maxWidthAtDepth.length; d++) {
    colStart[d] = acc;
    acc += maxWidthAtDepth[d] + X_GAP;
  }
  for (const ln of flat) {
    ln.x = colStart[ln.depth];
  }

  // Normalize y to start at 0 (no negative offsets)
  const minY = Math.min(...flat.map((n) => n.y));
  for (const ln of flat) ln.y -= minY;

  const width = (colStart[colStart.length - 1] ?? 0) + (maxWidthAtDepth[maxWidthAtDepth.length - 1] ?? 0);
  const height = Math.max(...flat.map((n) => n.y + n.height));

  return { root: rootLN, flat, width, height };
}

// Curved connector path from parent right edge to child left edge
function connectorPath(p: LaidOutNode, c: LaidOutNode): string {
  const x1 = p.x + p.width;
  const y1 = p.y + p.height / 2;
  const x2 = c.x;
  const y2 = c.y + c.height / 2;
  const mid = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
}

// ─── Color palette for branches ───────────────────────────────────────────────

const BRANCH_COLORS = [
  "#a78bfa", // brand violet
  "#60a5fa", // blue
  "#34d399", // emerald
  "#fbbf24", // amber
  "#f472b6", // pink
  "#fb7185", // rose
  "#22d3ee", // cyan
];

function colorForRootChildIndex(i: number) {
  return BRANCH_COLORS[i % BRANCH_COLORS.length];
}

// Find which root-child subtree a node belongs to (for coloring)
function tagBranches(layout: Layout): Map<LaidOutNode, number> {
  const tag = new Map<LaidOutNode, number>();
  layout.root.children.forEach((child, idx) => {
    const stack: LaidOutNode[] = [child];
    while (stack.length) {
      const n = stack.pop()!;
      tag.set(n, idx);
      stack.push(...n.children);
    }
  });
  return tag;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MindMapTab() {
  const payload = useNotesStore((s) => s.payload);
  const status = useNotesStore((s) => s.sectionStatus.mindmap);
  const root = payload?.mindmap;

  const [view, setView] = React.useState<"graph" | "tree">("graph");
  const [scale, setScale] = React.useState(1);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const [fullscreen, setFullscreen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const draggingRef = React.useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  if (!root || (!root.label && !root.children?.length)) {
    return (
      <SectionStatus
        loading={status.loading}
        error={status.error}
        empty={!status.loading && !status.error}
        emptyMessage="No mind map yet."
      />
    );
  }

  const layout = React.useMemo(() => buildLayout(root), [root]);
  const branchTag = React.useMemo(() => tagBranches(layout), [layout]);

  function onPointerDown(e: React.PointerEvent) {
    draggingRef.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = draggingRef.current;
    if (!d) return;
    setPan({ x: d.px + (e.clientX - d.x), y: d.py + (e.clientY - d.y) });
  }
  function onPointerUp(e: React.PointerEvent) {
    draggingRef.current = null;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }
  function reset() {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }

  const padding = 40;
  const vbW = layout.width + padding * 2;
  const vbH = layout.height + padding * 2;

  // Fit-to-container scale on first render / when fullscreen toggles
  React.useEffect(() => {
    if (!containerRef.current) return;
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    if (cw === 0 || ch === 0) return;
    const fit = Math.min(cw / vbW, ch / vbH, 1);
    setScale(fit);
    setPan({ x: 0, y: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullscreen, vbW, vbH]);

  return (
    <div
      className={cn(
        "relative",
        fullscreen && "fixed inset-0 z-50 bg-background p-4",
      )}
    >
      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-lg border bg-card p-0.5">
          <button
            type="button"
            onClick={() => setView("graph")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition",
              view === "graph" ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Network className="size-3.5" />
            Graph
          </button>
          <button
            type="button"
            onClick={() => setView("tree")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition",
              view === "tree" ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <List className="size-3.5" />
            Outline
          </button>
        </div>

        {view === "graph" && (
          <>
            <div className="flex items-center rounded-lg border bg-card">
              <Button variant="ghost" size="sm" onClick={() => setScale((s) => Math.max(0.3, s - 0.15))} title="Zoom out">
                <ZoomOut />
              </Button>
              <span className="px-1 font-mono text-xs text-muted-foreground tabular-nums">
                {Math.round(scale * 100)}%
              </span>
              <Button variant="ghost" size="sm" onClick={() => setScale((s) => Math.min(2.5, s + 0.15))} title="Zoom in">
                <ZoomIn />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={reset} title="Reset view">
              <RotateCcw /> Reset
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFullscreen((f) => !f)}
              title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {fullscreen ? <Minimize2 /> : <Maximize2 />}
            </Button>
          </>
        )}
      </div>

      {view === "graph" ? (
        <div
          ref={containerRef}
          className={cn(
            "relative overflow-hidden rounded-2xl border bg-gradient-to-br from-muted/30 to-background",
            "cursor-grab active:cursor-grabbing",
            fullscreen ? "h-[calc(100vh-110px)]" : "h-[600px]",
          )}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* Dotted grid background */}
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "radial-gradient(circle, currentColor 1px, transparent 1px)",
              backgroundSize: "24px 24px",
              color: "var(--muted-foreground)",
            }}
          />

          <svg
            viewBox={`0 0 ${vbW} ${vbH}`}
            width="100%"
            height="100%"
            preserveAspectRatio="xMidYMid meet"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transformOrigin: "center center",
              transition: draggingRef.current ? "none" : "transform 0.15s ease",
            }}
          >
            <g transform={`translate(${padding}, ${padding})`}>
              {/* Connectors */}
              {layout.flat.map((n) =>
                n.children.map((c, ci) => {
                  const branchIdx = branchTag.get(c) ?? ci;
                  const color = colorForRootChildIndex(branchIdx);
                  return (
                    <path
                      key={`${n.x}-${n.y}-${ci}`}
                      d={connectorPath(n, c)}
                      stroke={color}
                      strokeWidth={n.depth === 0 ? 2 : 1.4}
                      strokeOpacity={n.depth === 0 ? 0.7 : 0.5}
                      fill="none"
                    />
                  );
                }),
              )}

              {/* Nodes */}
              {layout.flat.map((n, i) => {
                const branchIdx = branchTag.get(n);
                const isRoot = n.depth === 0;
                const color = isRoot
                  ? "#a78bfa"
                  : colorForRootChildIndex(branchIdx ?? 0);
                return (
                  <g key={i} transform={`translate(${n.x}, ${n.y})`}>
                    <rect
                      width={n.width}
                      height={n.height}
                      rx={isRoot ? 14 : n.depth === 1 ? 10 : 8}
                      fill={isRoot ? `${color}33` : `${color}1A`}
                      stroke={color}
                      strokeWidth={isRoot ? 2 : 1.2}
                    />
                    <foreignObject x={0} y={0} width={n.width} height={n.height}>
                      <div
                        style={{
                          width: n.width,
                          height: n.height,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          textAlign: "center",
                          padding: "0 12px",
                          fontFamily: "inherit",
                          fontWeight: isRoot ? 700 : n.depth === 1 ? 600 : 500,
                          fontSize: isRoot ? 15 : n.depth === 1 ? 13 : 12,
                          color: "var(--foreground)",
                          lineHeight: 1.25,
                          overflow: "hidden",
                          wordBreak: "break-word",
                        }}
                      >
                        {n.node.label}
                      </div>
                    </foreignObject>
                  </g>
                );
              })}
            </g>
          </svg>

          <div className="pointer-events-none absolute bottom-2 right-3 text-[10px] text-muted-foreground">
            Drag to pan · Scroll buttons to zoom
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border bg-card p-5">
          <OutlineView node={layout.root} colors={branchTag} />
        </div>
      )}
    </div>
  );
}

// ─── Outline (fallback) view ──────────────────────────────────────────────────

function OutlineView({
  node,
  colors,
  depth = 0,
}: {
  node: LaidOutNode;
  colors: Map<LaidOutNode, number>;
  depth?: number;
}) {
  const branchIdx = colors.get(node);
  const color = depth === 0 ? "#a78bfa" : colorForRootChildIndex(branchIdx ?? 0);
  return (
    <div
      className={cn(
        depth > 0 && "border-l-2 pl-4 ml-2",
      )}
      style={depth > 0 ? { borderColor: `${color}55` } : undefined}
    >
      <div className="flex items-center gap-2 py-1">
        <span
          className="size-2 rounded-full"
          style={{ background: color }}
        />
        <span
          className={cn(
            depth === 0 && "text-lg font-bold",
            depth === 1 && "text-base font-semibold",
            depth >= 2 && "text-sm",
          )}
        >
          {node.node.label}
        </span>
      </div>
      {node.children.length > 0 && (
        <div className="mt-1 space-y-0.5">
          {node.children.map((c, i) => (
            <OutlineView key={i} node={c} colors={colors} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
