// ─── Tree Layout ──────────────────────────────────────────────────────────────
//
// Arranges nodes in a directory-tree style: parents above, children below and
// indented to the right. Uses a DFS traversal from root nodes.
//
// Compatible with both subclassEdge (source=parent, target=child) and
// objectPropertyEdge (source=domain/parent, target=range/child).
//
// Vertical spacing is height-aware: each node's estimated rendered height is
// used so tall nodes (many properties) never overlap their siblings.
//
// For large ontologies, root subtrees are wrapped into multiple columns once
// the column exceeds MAX_COLUMN_HEIGHT, preventing a single 50 000 px tall
// canvas for ontologies like C2SIM.

export const TREE_BASE_Y = 80;
export const TREE_INDENT_X = 120;
const NODE_HEADER_HEIGHT = 52; // header row: icon + label + URI (~2 lines)
const NODE_PROPERTY_HEIGHT = 33; // per property row: label + range + handles
const NODE_VERTICAL_GAP = 20; // minimum gap between adjacent nodes
const NODE_APPROX_WIDTH = 260; // estimated rendered node width
const MAX_COLUMN_HEIGHT = 1800; // wrap to next column after this height
const COLUMN_H_GAP = 60; // extra horizontal gap between columns
const MAX_PROPS_VISIBLE = 6; // matches max-h-48 cap on ClassNode properties list

interface LayoutNode {
  id: string;
  data?: { properties?: unknown[] };
}

function estimateNodeHeight(node: LayoutNode): number {
  const propCount = Math.min(
    node.data?.properties?.length ?? 0,
    MAX_PROPS_VISIBLE,
  );
  return NODE_HEADER_HEIGHT + propCount * NODE_PROPERTY_HEIGHT;
}

export function applyTreeLayout(
  nodes: LayoutNode[],
  edges: { source: string; target: string }[],
  baseX: number,
): Map<string, { x: number; y: number }> {
  // Build a lookup from id → node for height estimation
  const nodeById = new Map<string, LayoutNode>(nodes.map((n) => [n.id, n]));

  // Build parent → children adjacency (source = parent, target = child)
  const children = new Map<string, string[]>();
  const hasParent = new Set<string>();

  for (const edge of edges) {
    if (!children.has(edge.source)) children.set(edge.source, []);
    children.get(edge.source)!.push(edge.target);
    hasParent.add(edge.target);
  }

  const nodeIds = nodes.map((n) => n.id);
  // Roots: nodes that are not the target (child) of any edge
  const roots = nodeIds.filter((id) => !hasParent.has(id));

  // ── Pass 1: compute each root subtree's total height and max depth ──────────
  const statsSeen = new Set<string>();
  function subtreeStats(
    nodeId: string,
    depth: number,
  ): { height: number; maxDepth: number } {
    if (statsSeen.has(nodeId)) return { height: 0, maxDepth: depth };
    statsSeen.add(nodeId);
    const node = nodeById.get(nodeId);
    let h = estimateNodeHeight(node ?? { id: nodeId }) + NODE_VERTICAL_GAP;
    let maxDepth = depth;
    for (const childId of children.get(nodeId) ?? []) {
      const child = subtreeStats(childId, depth + 1);
      h += child.height;
      if (child.maxDepth > maxDepth) maxDepth = child.maxDepth;
    }
    return { height: h, maxDepth };
  }

  // ── Pass 2: place subtrees in columns, wrapping when column gets too tall ──
  const positions = new Map<string, { x: number; y: number }>();
  let columnX = baseX;
  let currentY = TREE_BASE_Y;
  let columnMaxDepth = 0; // tracks widest subtree in current column

  function visit(nodeId: string, depth: number, colX: number): void {
    if (positions.has(nodeId)) return; // skip already-placed nodes (multiple inheritance)
    const node = nodeById.get(nodeId);
    positions.set(nodeId, { x: colX + depth * TREE_INDENT_X, y: currentY });
    currentY += estimateNodeHeight(node ?? { id: nodeId }) + NODE_VERTICAL_GAP;
    if (depth > columnMaxDepth) columnMaxDepth = depth;

    for (const childId of children.get(nodeId) ?? []) {
      visit(childId, depth + 1, colX);
    }
  }

  for (const root of roots) {
    const { height, maxDepth } = subtreeStats(root, 0);

    // Wrap to a new column if this subtree would push the column too far down
    // (but always place at least one subtree per column to avoid infinite loops)
    if (currentY > TREE_BASE_Y && currentY + height > MAX_COLUMN_HEIGHT) {
      const prevColumnWidth =
        columnMaxDepth * TREE_INDENT_X + NODE_APPROX_WIDTH + COLUMN_H_GAP;
      columnX += prevColumnWidth;
      currentY = TREE_BASE_Y;
      columnMaxDepth = 0;
    }

    visit(root, 0, columnX);
    if (maxDepth > columnMaxDepth) columnMaxDepth = maxDepth;
  }

  // Any nodes not yet placed (should not occur in well-formed data, but be safe)
  for (const id of nodeIds) {
    if (!positions.has(id)) {
      const node = nodeById.get(id);
      positions.set(id, { x: columnX, y: currentY });
      currentY += estimateNodeHeight(node ?? { id }) + NODE_VERTICAL_GAP;
    }
  }

  return positions;
}
