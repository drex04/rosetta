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

export const TREE_BASE_Y = 80;
export const TREE_INDENT_X = 120;
const NODE_HEADER_HEIGHT = 52; // header row: icon + label + URI (~2 lines)
const NODE_PROPERTY_HEIGHT = 33; // per property row: label + range + handles
const NODE_VERTICAL_GAP = 20; // minimum gap between adjacent nodes

interface LayoutNode {
  id: string;
  data?: { properties?: unknown[] };
}

function estimateNodeHeight(node: LayoutNode): number {
  const propCount = node.data?.properties?.length ?? 0;
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

  const positions = new Map<string, { x: number; y: number }>();
  let currentY = TREE_BASE_Y;

  function visit(nodeId: string, depth: number): void {
    const node = nodeById.get(nodeId);
    positions.set(nodeId, { x: baseX + depth * TREE_INDENT_X, y: currentY });
    currentY += estimateNodeHeight(node ?? { id: nodeId }) + NODE_VERTICAL_GAP;

    for (const childId of children.get(nodeId) ?? []) {
      visit(childId, depth + 1);
    }
  }

  for (const root of roots) {
    visit(root, 0);
  }

  // Any nodes not yet placed (should not occur in well-formed data, but be safe)
  for (const id of nodeIds) {
    if (!positions.has(id)) {
      const node = nodeById.get(id);
      positions.set(id, { x: baseX, y: currentY });
      currentY += estimateNodeHeight(node ?? { id }) + NODE_VERTICAL_GAP;
    }
  }

  return positions;
}
