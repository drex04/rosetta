import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  MiniMap,
  Controls,
  Background,
  Panel,
  applyNodeChanges,
  useReactFlow,
} from '@xyflow/react';
import type {
  NodeChange,
  Connection,
  Edge,
  Node as RFNode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCanvasData } from '../../hooks/useCanvasData';
import { generateConstruct } from '@/lib/sparql';
import { useOntologyStore } from '../../store/ontologyStore';
import { useSourcesStore } from '../../store/sourcesStore';
import { useMappingStore } from '../../store/mappingStore';
import { useUiStore } from '../../store/uiStore';
import { useValidationStore } from '../../store/validationStore';
import { ClassNode } from '../nodes/ClassNode';
import { SourceNode as SourceNodeComponent } from '../nodes/SourceNode';
import { SubclassEdge } from '../edges/SubclassEdge';
import { ObjectPropertyEdge } from '../edges/ObjectPropertyEdge';
import { MappingEdge } from '../edges/MappingEdge';
import { CanvasContextMenu } from './CanvasContextMenu';
import { NodeContextMenu } from './NodeContextMenu';
import { AddPropertyDialog } from './AddPropertyDialog';
import type {
  OntologyNode,
  OntologyEdge,
  SourceNodeData,
  PropertyData,
  ClassEditPatch,
} from '@/types/index';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContextMenuState {
  x: number;
  y: number;
  flowX: number;
  flowY: number;
}

interface NodeMenuState {
  x: number;
  y: number;
  nodeId: string;
  nodeType: 'classNode' | 'sourceNode';
  nodeLabel: string;
  nodePrefix: string;
}

interface EdgePickerState {
  x: number;
  y: number;
  connection: Connection | null; // null in edit mode
  mode: 'create-onto' | 'create-source' | 'edit';
  edgeId?: string; // set only in edit mode
}

interface GroupPromptState {
  x: number;
  y: number;
  mappingIds: string[];
  sourceId: string;
}

// ─── nodeTypes must be stable (outside component) ────────────────────────────

const nodeTypes = {
  classNode: ClassNode,
  sourceNode: SourceNodeComponent,
} as const;

const edgeTypes = {
  subclassEdge: SubclassEdge,
  objectPropertyEdge: ObjectPropertyEdge,
  mappingEdge: MappingEdge,
} as const;

interface OntologyCanvasProps {
  onCanvasChange?: (nodes: OntologyNode[], edges: OntologyEdge[]) => void;
  onSourceCanvasChange?: (
    nodes: SourceNodeData[],
    edges: OntologyEdge[],
  ) => void;
}

// Only these change types modify the RDF graph — position/select/dimensions do not
const STRUCTURAL_CHANGE_TYPES = new Set(['add', 'remove', 'reset']);

// ─── Inner component (needs useReactFlow) ────────────────────────────────────

function OntologyCanvasInner({
  onCanvasChange,
  onSourceCanvasChange,
}: OntologyCanvasProps) {
  const { nodes, edges } = useCanvasData();
  const setNodes = useOntologyStore((s) => s.setNodes);
  const addNode = useOntologyStore((s) => s.addNode);
  const removeNode = useOntologyStore((s) => s.removeNode);
  const addPropertyToNode = useOntologyStore((s) => s.addPropertyToNode);
  const addOntologyEdge = useOntologyStore((s) => s.addEdge);
  const removeOntologyEdge = useOntologyStore((s) => s.removeEdge);
  const updateNode = useOntologyStore((s) => s.updateNode);
  const updateProperty = useOntologyStore((s) => s.updateProperty);
  const replaceEdge = useOntologyStore((s) => s.replaceEdge);
  const updateSource = useSourcesStore((s) => s.updateSource);
  const updateSchemaNode = useSourcesStore((s) => s.updateSchemaNode);
  const addMapping = useMappingStore((s) => s.addMapping);
  const removeMapping = useMappingStore((s) => s.removeMapping);
  const mappings = useMappingStore((s) => s.mappings);
  const setSelectedMappingId = useMappingStore((s) => s.setSelectedMappingId);
  const setActiveRightTab = useUiStore((s) => s.setActiveRightTab);
  const canvasDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const sourceCanvasDebounceTimer = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const rfInstance = useRef<{
    fitView: (opts?: { padding?: number; duration?: number }) => void;
  } | null>(null);
  const prevHadNodes = useRef(false);
  const highlightedCanvasNodeId = useValidationStore(
    (s) => s.highlightedCanvasNodeId,
  );
  const { screenToFlowPosition } = useReactFlow();

  // Offset ref to stagger rapidly-added nodes
  const addNodeOffset = useRef(0);

  // ─── UI state ───────────────────────────────────────────────────────────────
  const [canvasMenu, setCanvasMenu] = useState<ContextMenuState | null>(null);
  const [nodeMenu, setNodeMenu] = useState<NodeMenuState | null>(null);
  const [addPropFor, setAddPropFor] = useState<{
    nodeId: string;
    nodePrefix: string;
    nodeType: 'classNode' | 'sourceNode';
  } | null>(null);
  const [edgePicker, setEdgePicker] = useState<EdgePickerState | null>(null);
  const [groupPrompt, setGroupPrompt] = useState<GroupPromptState | null>(null);

  // ─── fitView on first nodes ──────────────────────────────────────────────────
  useEffect(() => {
    const hasNodes = nodes.length > 0;
    if (hasNodes && !prevHadNodes.current && rfInstance.current) {
      rfInstance.current.fitView({ padding: 0.15, duration: 400 });
    }
    prevHadNodes.current = hasNodes;
  }, [nodes.length]);

  useEffect(() => {
    if (!highlightedCanvasNodeId || !rfInstance.current) return;
    rfInstance.current.fitView({ padding: 0.4, duration: 400 });
  }, [highlightedCanvasNodeId]);

  // ─── Inject onContextMenu into node data ─────────────────────────────────────
  // We inject a callback into each node's data so ClassNode/SourceNode can call
  // it on right-click without knowing about the canvas state.
  const handleNodeContextMenu = useCallback(
    (nodeId: string, x: number, y: number) => {
      // Find the node across ontology + sources
      const ontologyNodes = useOntologyStore.getState().nodes;
      const ontNode = ontologyNodes.find((n) => n.id === nodeId);
      if (ontNode) {
        setNodeMenu({
          x,
          y,
          nodeId,
          nodeType: 'classNode',
          nodeLabel: ontNode.data.label,
          nodePrefix: ontNode.data.prefix ?? 'onto',
        });
        return;
      }
      const { sources } = useSourcesStore.getState();
      for (const src of sources) {
        const srcNode = src.schemaNodes.find((n) => n.id === nodeId);
        if (srcNode) {
          setNodeMenu({
            x,
            y,
            nodeId,
            nodeType: 'sourceNode',
            nodeLabel: srcNode.data.label,
            nodePrefix: srcNode.data.prefix ?? src.name,
          });
          return;
        }
      }
    },
    [],
  );

  // ─── onStartEdit — programmatically enters inline edit mode for any node ─────
  const handleStartEdit = useCallback(
    (nodeId: string) => {
      const ontNodes = useOntologyStore.getState().nodes;
      if (ontNodes.some((n) => n.id === nodeId)) {
        setNodes(
          ontNodes.map((n) =>
            n.id === nodeId
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    editTrigger: ((n.data.editTrigger as number) ?? 0) + 1,
                  },
                }
              : n,
          ),
        );
        return;
      }
      const { sources } = useSourcesStore.getState();
      for (const src of sources) {
        const srcNode = src.schemaNodes.find((n) => n.id === nodeId);
        if (srcNode) {
          updateSource(src.id, {
            schemaNodes: src.schemaNodes.map((n) =>
              n.id === nodeId
                ? {
                    ...n,
                    data: {
                      ...n.data,
                      editTrigger: ((n.data.editTrigger as number) ?? 0) + 1,
                    },
                  }
                : n,
            ),
          });
          return;
        }
      }
    },
    [setNodes, updateSource],
  );

  // ─── onNodesChange ────────────────────────────────────────────────────────────
  const onNodesChange = useCallback(
    (changes: NodeChange<OntologyNode | SourceNodeData>[]) => {
      const { activeSourceId, sources } = useSourcesStore.getState();
      const activeSource =
        activeSourceId !== null
          ? sources.find((s) => s.id === activeSourceId)
          : undefined;
      const sourceNodeIds = new Set(
        activeSource?.schemaNodes.map((n) => n.id) ?? [],
      );

      const masterChanges = changes.filter(
        (c) => !('id' in c) || !sourceNodeIds.has(c.id),
      );
      const sourceChanges = changes.filter(
        (c) => 'id' in c && sourceNodeIds.has(c.id),
      );

      if (masterChanges.length > 0) {
        const masterNodes = useOntologyStore.getState().nodes;
        const updated = applyNodeChanges(
          masterChanges as NodeChange<OntologyNode>[],
          masterNodes,
        ) as OntologyNode[];
        setNodes(updated);

        const hasStructural = masterChanges.some((c) =>
          STRUCTURAL_CHANGE_TYPES.has(c.type),
        );
        if (hasStructural && onCanvasChange !== undefined) {
          if (canvasDebounceTimer.current !== null) {
            clearTimeout(canvasDebounceTimer.current);
          }
          canvasDebounceTimer.current = setTimeout(() => {
            const currentEdges = useOntologyStore.getState().edges;
            onCanvasChange(updated, currentEdges);
          }, 100);
        }
      }

      if (
        sourceChanges.length > 0 &&
        activeSource !== undefined &&
        sourceNodeIds.size > 0
      ) {
        const updatedSourceNodes = applyNodeChanges(
          sourceChanges as NodeChange<SourceNodeData>[],
          activeSource.schemaNodes,
        ) as SourceNodeData[];
        updateSource(activeSource.id, { schemaNodes: updatedSourceNodes });

        const hasSourceStructural = sourceChanges.some((c) =>
          STRUCTURAL_CHANGE_TYPES.has(c.type),
        );
        if (hasSourceStructural && onSourceCanvasChange !== undefined) {
          if (sourceCanvasDebounceTimer.current !== null) {
            clearTimeout(sourceCanvasDebounceTimer.current);
          }
          sourceCanvasDebounceTimer.current = setTimeout(() => {
            const currentEdges =
              useSourcesStore
                .getState()
                .sources.find((s) => s.id === activeSource.id)?.schemaEdges ??
              [];
            void onSourceCanvasChange(updatedSourceNodes, currentEdges);
          }, 100);
        }
      }
    },
    [setNodes, updateSource, onCanvasChange, onSourceCanvasChange],
  );

  // ─── isValidConnection ────────────────────────────────────────────────────────
  const isValidConnection = useCallback((connection: Connection | Edge) => {
    const { source, target, sourceHandle, targetHandle } = connection;

    // Build O(1) lookup sets
    const ontologyNodeIds = new Set(
      useOntologyStore.getState().nodes.map((n) => n.id),
    );
    const { sources } = useSourcesStore.getState();
    const sourceNodeIds = new Set(
      sources.flatMap((src) => src.schemaNodes.map((n) => n.id)),
    );

    const srcIsOnto = ontologyNodeIds.has(source ?? '');
    const srcIsSource = sourceNodeIds.has(source ?? '');
    const tgtIsOnto = ontologyNodeIds.has(target ?? '');
    const tgtIsSource = sourceNodeIds.has(target ?? '');

    // onto→onto: class-level handles (not property handles)
    if (srcIsOnto && tgtIsOnto) {
      const sh = sourceHandle ?? '';
      const th = targetHandle ?? '';
      // Must be class-level handles, not property handles
      return (
        !sh.startsWith('prop_') &&
        !sh.startsWith('target_prop_') &&
        !th.startsWith('prop_') &&
        !th.startsWith('target_prop_')
      );
    }

    // source→source: class-level handles
    if (srcIsSource && tgtIsSource) {
      const sh = sourceHandle ?? '';
      const th = targetHandle ?? '';
      return (
        !sh.startsWith('prop_') &&
        !sh.startsWith('target_prop_') &&
        !th.startsWith('prop_') &&
        !th.startsWith('target_prop_')
      );
    }

    // source-prop→onto-prop: mapping edge
    if (srcIsSource && tgtIsOnto) {
      return (
        (sourceHandle ?? '').startsWith('prop_') &&
        (targetHandle ?? '').startsWith('target_prop_')
      );
    }

    return false;
  }, []);

  // ─── onConnect ────────────────────────────────────────────────────────────────
  const onConnect = useCallback(
    (connection: Connection) => {
      const { source, sourceHandle, target, targetHandle } = connection;
      if (!source || !sourceHandle || !target || !targetHandle) return;

      const ontologyNodeIds = new Set(
        useOntologyStore.getState().nodes.map((n) => n.id),
      );
      const { sources } = useSourcesStore.getState();
      const sourceNodeIds = new Set(
        sources.flatMap((src) => src.schemaNodes.map((n) => n.id)),
      );

      const srcIsOnto = ontologyNodeIds.has(source);
      const tgtIsOnto = ontologyNodeIds.has(target);
      const srcIsSource = sourceNodeIds.has(source);
      const tgtIsSource = sourceNodeIds.has(target);

      // onto→onto: show edge type picker
      if (srcIsOnto && tgtIsOnto) {
        // Use a simple confirm-style choice via a small popover state
        setEdgePicker({ x: 200, y: 200, connection, mode: 'create-onto' });
        return;
      }

      // source→source: show edge type picker (REQ-100)
      if (srcIsSource && tgtIsSource) {
        setEdgePicker({ x: 200, y: 200, connection, mode: 'create-source' });
        return;
      }

      // source-prop→onto-prop: mapping edge (existing logic)
      if (srcIsSource && tgtIsOnto) {
        let sourceFlowNode: SourceNodeData | undefined;
        let activeSourceId: string | undefined;
        for (const src of sources) {
          const found = src.schemaNodes.find((n) => n.id === source);
          if (found) {
            sourceFlowNode = found;
            activeSourceId = src.id;
            break;
          }
        }

        const { nodes: allNodes } = useOntologyStore.getState();
        const targetNode = allNodes.find((n) => n.id === target);

        if (!sourceFlowNode || !targetNode || !activeSourceId) return;

        const propLabel = sourceHandle.replace('prop_', '');
        const targetPropLabel = targetHandle.replace('target_prop_', '');
        const sourceProp = sourceFlowNode.data.properties.find(
          (p) => p.label === propLabel,
        );
        const targetProp = targetNode.data.properties.find(
          (p) => p.label === targetPropLabel,
        );
        if (!sourceProp || !targetProp) return;

        const sparqlConstruct = generateConstruct({
          sourceId: activeSourceId,
          sourceClassUri: sourceFlowNode.data.uri,
          sourcePropUri: sourceProp.uri,
          sourceHandle,
          targetClassUri: targetNode.data.uri,
          targetPropUri: targetProp.uri,
          targetHandle,
          kind: 'direct',
        });

        const newMappingId = addMapping({
          sourceId: activeSourceId,
          sourceClassUri: sourceFlowNode.data.uri,
          sourcePropUri: sourceProp.uri,
          targetClassUri: targetNode.data.uri,
          targetPropUri: targetProp.uri,
          sourceHandle,
          targetHandle,
          kind: 'direct',
          sparqlConstruct,
        });

        // Auto-group detection: check if target prop already has mappings from this source
        const existingMappings = useMappingStore
          .getState()
          .getMappingsForSource(activeSourceId);
        const duplicates = existingMappings.filter(
          (m) =>
            m.targetClassUri === targetNode.data.uri &&
            m.targetPropUri === targetProp.uri &&
            m.id !== newMappingId,
        );

        if (duplicates.length > 0) {
          setGroupPrompt({
            x: 0,
            y: 0,
            mappingIds: [newMappingId, ...duplicates.map((m) => m.id)],
            sourceId: activeSourceId,
          });
        }
      }
    },
    [addMapping],
  );

  // ─── onEdgesDelete ────────────────────────────────────────────────────────────
  const onEdgesDelete = useCallback(
    (deletedEdges: Edge[]) => {
      for (const edge of deletedEdges) {
        if (edge.id.startsWith('mapping_')) {
          removeMapping(edge.id.slice('mapping_'.length));
        } else if (
          edge.type === 'subclassEdge' ||
          edge.type === 'objectPropertyEdge'
        ) {
          // Check if it's in the ontology store
          const ontEdges = useOntologyStore.getState().edges;
          if (ontEdges.some((e) => e.id === edge.id)) {
            removeOntologyEdge(edge.id);
          } else {
            // It's a source schema edge
            const { sources } = useSourcesStore.getState();
            for (const src of sources) {
              if (src.schemaEdges.some((e) => e.id === edge.id)) {
                updateSource(src.id, {
                  schemaEdges: src.schemaEdges.filter((e) => e.id !== edge.id),
                });
                break;
              }
            }
          }
        }
      }
    },
    [removeMapping, removeOntologyEdge, updateSource],
  );

  // ─── Canvas pane context menu ─────────────────────────────────────────────────
  const onPaneContextMenu = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      e.preventDefault();
      const mouseEvent = e as React.MouseEvent;
      const flowPos = screenToFlowPosition({
        x: mouseEvent.clientX,
        y: mouseEvent.clientY,
      });
      setCanvasMenu({
        x: mouseEvent.clientX,
        y: mouseEvent.clientY,
        flowX: flowPos.x,
        flowY: flowPos.y,
      });
    },
    [screenToFlowPosition],
  );

  // ─── Add ontology class ────────────────────────────────────────────────────────
  const handleAddClass = useCallback(() => {
    const offset = addNodeOffset.current * 30;
    addNodeOffset.current += 1;
    setTimeout(() => {
      addNodeOffset.current = Math.max(0, addNodeOffset.current - 1);
    }, 2000);

    const ts = Date.now();
    const position = canvasMenu
      ? { x: canvasMenu.flowX + offset, y: canvasMenu.flowY + offset }
      : { x: 100 + offset, y: 100 + offset };
    const newNode: OntologyNode = {
      id: `class_${ts}`,
      type: 'classNode',
      position,
      data: {
        uri: `onto:NewClass_${ts}`,
        label: 'NewClass',
        prefix: 'onto',
        properties: [],
      },
    };
    addNode(newNode);
    setCanvasMenu(null);
  }, [canvasMenu, addNode]);

  // ─── Add source class ──────────────────────────────────────────────────────────
  const handleAddSourceClass = useCallback(() => {
    const { activeSourceId, sources } = useSourcesStore.getState();
    if (!activeSourceId) return;
    const activeSrc = sources.find((s) => s.id === activeSourceId);
    if (!activeSrc) return;

    const offset = addNodeOffset.current * 30;
    addNodeOffset.current += 1;
    setTimeout(() => {
      addNodeOffset.current = Math.max(0, addNodeOffset.current - 1);
    }, 2000);

    const ts = Date.now();
    const srcPrefix = activeSrc.name.toLowerCase().replace(/\s+/g, '_');
    const position = canvasMenu
      ? { x: canvasMenu.flowX + offset, y: canvasMenu.flowY + offset }
      : { x: 100 + offset, y: 100 + offset };
    const newNode: SourceNodeData = {
      id: `source_class_${ts}`,
      type: 'sourceNode',
      position,
      data: {
        uri: `${srcPrefix}:NewClass_${ts}`,
        label: 'NewClass',
        prefix: srcPrefix,
        properties: [],
      },
    };
    updateSource(activeSourceId, {
      schemaNodes: [...activeSrc.schemaNodes, newNode],
    });
    setCanvasMenu(null);
  }, [canvasMenu, updateSource]);

  // ─── Delete node handler ───────────────────────────────────────────────────────
  const handleDeleteNode = useCallback(
    (nodeId: string, nodeType: 'classNode' | 'sourceNode') => {
      if (nodeType === 'classNode') {
        removeNode(nodeId);
      } else {
        const { sources } = useSourcesStore.getState();
        for (const src of sources) {
          if (src.schemaNodes.some((n) => n.id === nodeId)) {
            updateSource(src.id, {
              schemaNodes: src.schemaNodes.filter((n) => n.id !== nodeId),
              schemaEdges: src.schemaEdges.filter(
                (e) => e.source !== nodeId && e.target !== nodeId,
              ),
            });
            break;
          }
        }
      }

      // Build valid URI set from remaining nodes and fire mapping invalidation
      const ontologyNodes = useOntologyStore.getState().nodes;
      const { sources: updatedSources } = useSourcesStore.getState();
      const validUris = new Set<string>();
      for (const n of ontologyNodes) {
        validUris.add(n.data.uri);
        for (const p of n.data.properties) validUris.add(p.uri);
      }
      for (const src of updatedSources) {
        for (const n of src.schemaNodes) {
          validUris.add(n.data.uri);
          for (const p of n.data.properties) validUris.add(p.uri);
        }
      }
      const count = useMappingStore.getState().removeInvalidMappings(validUris);
      if (count > 0) {
        toast(`Removed ${count} invalid mapping(s)`, {
          action: {
            label: 'Undo',
            onClick: () => useMappingStore.getState().undoLastRemoval(),
          },
          duration: 5000,
        });
      }
    },
    [removeNode, updateSource],
  );

  // ─── Commit ontology edit ──────────────────────────────────────────────────────
  const handleCommitOntologyEdit = useCallback(
    (nodeId: string, patch: ClassEditPatch) => {
      const preEditNodes = useOntologyStore.getState().nodes;
      if ('propertyUri' in patch && patch.propertyUri) {
        updateProperty(nodeId, patch.propertyUri, patch.propPatch ?? {});
      } else {
        updateNode(nodeId, patch);
      }
      const { nodes: latestNodes, edges: latestEdges } =
        useOntologyStore.getState();
      try {
        onCanvasChange?.(latestNodes, latestEdges);
      } catch {
        setNodes(preEditNodes);
        toast.error(
          'Edit failed — Turtle serialization error, changes reverted',
        );
      }
    },
    [setNodes, updateNode, updateProperty, onCanvasChange],
  );

  // ─── Commit source edit ────────────────────────────────────────────────────────
  const handleCommitSourceEdit = useCallback(
    (nodeId: string, patch: ClassEditPatch) => {
      const { sources } = useSourcesStore.getState();
      const ownerSource = sources.find((s) =>
        s.schemaNodes.some((n) => n.id === nodeId),
      );
      if (!ownerSource) return;
      updateSchemaNode(ownerSource.id, nodeId, patch);
      const updatedSource = useSourcesStore
        .getState()
        .sources.find((s) => s.id === ownerSource.id);
      if (updatedSource && onSourceCanvasChange) {
        onSourceCanvasChange(
          updatedSource.schemaNodes,
          updatedSource.schemaEdges ?? [],
        );
      }
    },
    [updateSchemaNode, onSourceCanvasChange],
  );

  // ─── Augment nodes with injected callbacks ────────────────────────────────────
  const augmentedNodes = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          onContextMenu: handleNodeContextMenu,
          onCommitEdit:
            n.type === 'sourceNode'
              ? handleCommitSourceEdit
              : handleCommitOntologyEdit,
          onStartEdit: handleStartEdit,
        },
      })),
    [
      nodes,
      handleNodeContextMenu,
      handleCommitSourceEdit,
      handleCommitOntologyEdit,
      handleStartEdit,
    ],
  );

  // ─── Add property to node ──────────────────────────────────────────────────────
  const handleAddProperty = useCallback(
    (
      nodeId: string,
      nodeType: 'classNode' | 'sourceNode',
      property: PropertyData,
    ) => {
      if (nodeType === 'classNode') {
        addPropertyToNode(nodeId, property);
      } else {
        const { sources } = useSourcesStore.getState();
        for (const src of sources) {
          const srcNode = src.schemaNodes.find((n) => n.id === nodeId);
          if (srcNode) {
            updateSource(src.id, {
              schemaNodes: src.schemaNodes.map((n) =>
                n.id === nodeId
                  ? {
                      ...n,
                      data: {
                        ...n.data,
                        properties: [...n.data.properties, property],
                      },
                    }
                  : n,
              ),
            });
            break;
          }
        }
      }
    },
    [addPropertyToNode, updateSource],
  );

  // ─── Check if node has active mappings ────────────────────────────────────────
  const nodeHasMappings = useCallback(
    (nodeId: string): boolean => {
      const { nodes: ontNodes } = useOntologyStore.getState();
      const ontNode = ontNodes.find((n) => n.id === nodeId);
      if (ontNode) {
        const uris = new Set(ontNode.data.properties.map((p) => p.uri));
        uris.add(ontNode.data.uri);
        return Object.values(mappings).some((list) =>
          list.some(
            (m) => uris.has(m.targetClassUri) || uris.has(m.targetPropUri),
          ),
        );
      }
      return false;
    },
    [mappings],
  );

  // ─── Unified edge picker handler (create-onto, create-source, edit) ───────────
  const handleEdgePickerSelect = useCallback(
    (type: 'subclassEdge' | 'objectPropertyEdge') => {
      if (!edgePicker) return;
      const { mode, connection, edgeId } = edgePicker;

      const buildSubclassEdge = (
        id: string,
        conn: {
          source: string;
          target: string;
          sourceHandle?: string | null;
          targetHandle?: string | null;
        },
      ): OntologyEdge => ({
        id,
        source: conn.source,
        target: conn.target,
        sourceHandle: conn.sourceHandle ?? undefined,
        targetHandle: conn.targetHandle ?? undefined,
        type: 'subclassEdge',
        data: { predicate: 'rdfs:subClassOf' },
      });

      const buildObjectPropEdge = (
        id: string,
        conn: {
          source: string;
          target: string;
          sourceHandle?: string | null;
          targetHandle?: string | null;
        },
      ): OntologyEdge => ({
        id,
        source: conn.source,
        target: conn.target,
        sourceHandle: conn.sourceHandle ?? undefined,
        targetHandle: conn.targetHandle ?? undefined,
        type: 'objectPropertyEdge',
        data: {
          uri: `onto:relatedTo_${Date.now()}`,
          label: 'relatedTo',
          predicate: 'owl:ObjectProperty',
        },
      });

      if (mode === 'create-onto' && connection) {
        const newEdge =
          type === 'subclassEdge'
            ? buildSubclassEdge(`subclass_${Date.now()}`, connection)
            : buildObjectPropEdge(`objprop_${Date.now()}`, connection);
        addOntologyEdge(newEdge);
        // Fix pre-existing sync bug — trigger canvasToTurtle
        const { nodes: n, edges: e } = useOntologyStore.getState();
        try {
          onCanvasChange?.(n, e);
        } catch {
          /* toast already handled upstream */
        }
      } else if (mode === 'create-source' && connection) {
        const { activeSourceId, sources } = useSourcesStore.getState();
        if (!activeSourceId) {
          setEdgePicker(null);
          return;
        }
        const activeSrc = sources.find((s) => s.id === activeSourceId);
        if (!activeSrc) {
          setEdgePicker(null);
          return;
        }
        const newEdge =
          type === 'subclassEdge'
            ? buildSubclassEdge(`source_edge_${Date.now()}`, connection)
            : buildObjectPropEdge(`source_objprop_${Date.now()}`, connection);
        updateSource(activeSourceId, {
          schemaEdges: [...(activeSrc.schemaEdges ?? []), newEdge],
        });
        // Sync to source Turtle
        const updatedSrc = useSourcesStore
          .getState()
          .sources.find((s) => s.id === activeSourceId);
        if (updatedSrc)
          onSourceCanvasChange?.(
            updatedSrc.schemaNodes,
            updatedSrc.schemaEdges ?? [],
          );
      } else if (mode === 'edit' && edgeId) {
        // Find the edge — check ontology store first, then source stores
        const { edges: ontoEdges } = useOntologyStore.getState();
        const ontoEdge = ontoEdges.find((e) => e.id === edgeId);

        if (ontoEdge) {
          const newEdge =
            type === 'subclassEdge'
              ? buildSubclassEdge(edgeId, ontoEdge)
              : buildObjectPropEdge(edgeId, ontoEdge);
          replaceEdge(edgeId, newEdge);
          const { nodes: n, edges: e } = useOntologyStore.getState();
          try {
            onCanvasChange?.(n, e);
          } catch {
            /* toast handled upstream */
          }
        } else {
          // Check source schema edges
          const { sources } = useSourcesStore.getState();
          for (const src of sources) {
            const srcEdge = src.schemaEdges?.find((e) => e.id === edgeId);
            if (srcEdge) {
              const newEdge =
                type === 'subclassEdge'
                  ? buildSubclassEdge(edgeId, srcEdge)
                  : buildObjectPropEdge(edgeId, srcEdge);
              updateSource(src.id, {
                schemaEdges: [
                  ...(src.schemaEdges ?? []).filter((e) => e.id !== edgeId),
                  newEdge,
                ],
              });
              const updatedSrc = useSourcesStore
                .getState()
                .sources.find((s) => s.id === src.id);
              if (updatedSrc)
                onSourceCanvasChange?.(
                  updatedSrc.schemaNodes,
                  updatedSrc.schemaEdges ?? [],
                );
              break;
            }
          }
        }
      }

      setEdgePicker(null);
    },
    [
      edgePicker,
      addOntologyEdge,
      replaceEdge,
      updateSource,
      onCanvasChange,
      onSourceCanvasChange,
    ],
  );

  // ─── Edge double-click → open edge picker in edit mode ──────────────────────
  const handleEdgeDoubleClick = useCallback(
    (e: React.MouseEvent, edge: Edge) => {
      // Only handle schema edges — not mapping edges (those have their own click flow)
      if (edge.type !== 'subclassEdge' && edge.type !== 'objectPropertyEdge')
        return;
      setEdgePicker({
        x: e.clientX,
        y: e.clientY,
        connection: null,
        mode: 'edit',
        edgeId: edge.id,
      });
    },
    [],
  );

  // ─── Edge click → select mapping + switch tab (REQ-103) ──────────────────────
  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      if (edge.type === 'mappingEdge') {
        const mappingId = (edge.data as { mappingId?: string } | undefined)
          ?.mappingId;
        if (mappingId) {
          setSelectedMappingId(mappingId);
          setActiveRightTab('MAP');
        }
      }
    },
    [setSelectedMappingId, setActiveRightTab],
  );

  // ─── Node double-click → switch panel tab + trigger inline edit ───────────────
  const handleNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: RFNode) => {
      if (node.type === 'classNode') {
        setActiveRightTab('ONTOLOGY');
      } else if (node.type === 'sourceNode') {
        setActiveRightTab('SOURCE');
      }
      const onStartEdit = (
        node.data as { onStartEdit?: (id: string) => void } | undefined
      )?.onStartEdit;
      if (typeof onStartEdit === 'function') onStartEdit(node.id);
    },
    [setActiveRightTab],
  );

  const activeSourceId = useSourcesStore((s) => s.activeSourceId);

  return (
    <>
      <ReactFlow
        nodes={augmentedNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onConnect={onConnect}
        onEdgesDelete={onEdgesDelete}
        isValidConnection={isValidConnection}
        onEdgeClick={handleEdgeClick}
        onEdgeDoubleClick={handleEdgeDoubleClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        nodesDraggable={true}
        fitView
        onInit={(instance) => {
          rfInstance.current = instance;
        }}
        onPaneContextMenu={onPaneContextMenu}
        aria-label="Ontology mapping canvas"
      >
        <div className="hidden sm:block">
          <MiniMap />
        </div>
        <Controls aria-label="Canvas controls" />
        <Background />
        <Panel position="top-left" className="flex gap-1.5 p-1.5">
          <Button size="xs" variant="outline" onClick={handleAddClass}>
            + Ontology Class
          </Button>
          {activeSourceId && (
            <Button size="xs" variant="outline" onClick={handleAddSourceClass}>
              + Source Class
            </Button>
          )}
        </Panel>
      </ReactFlow>

      {/* Canvas context menu */}
      {canvasMenu && (
        <CanvasContextMenu
          x={canvasMenu.x}
          y={canvasMenu.y}
          hasActiveSource={activeSourceId !== null}
          onAddClass={handleAddClass}
          onAddSourceClass={handleAddSourceClass}
          onClose={() => setCanvasMenu(null)}
        />
      )}

      {/* Node context menu */}
      {nodeMenu && (
        <NodeContextMenu
          x={nodeMenu.x}
          y={nodeMenu.y}
          nodeId={nodeMenu.nodeId}
          nodeLabel={nodeMenu.nodeLabel}
          nodeType={nodeMenu.nodeType}
          hasMappings={nodeHasMappings(nodeMenu.nodeId)}
          onAddProperty={() => {
            setAddPropFor({
              nodeId: nodeMenu.nodeId,
              nodePrefix: nodeMenu.nodePrefix,
              nodeType: nodeMenu.nodeType,
            });
            setNodeMenu(null);
          }}
          onRename={() => {
            handleStartEdit(nodeMenu.nodeId);
            setNodeMenu(null);
          }}
          onDelete={() => handleDeleteNode(nodeMenu.nodeId, nodeMenu.nodeType)}
          onClose={() => setNodeMenu(null)}
        />
      )}

      {/* Add property dialog */}
      {addPropFor && (
        <AddPropertyDialog
          nodePrefix={addPropFor.nodePrefix}
          onAdd={(property) => {
            handleAddProperty(addPropFor.nodeId, addPropFor.nodeType, property);
            setAddPropFor(null);
          }}
          onClose={() => setAddPropFor(null)}
        />
      )}

      {/* Group prompt */}
      {groupPrompt && (
        <div
          className="fixed z-50 bg-popover border border-border rounded-lg shadow-xl p-3 flex flex-col gap-1 min-w-[180px]"
          style={{
            left: '50%',
            top: '40%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <p className="text-xs font-medium text-muted-foreground mb-1 px-1">
            Group these mappings?
          </p>
          {(['concat', 'coalesce', 'template'] as const).map((strategy) => (
            <button
              key={strategy}
              className="text-sm text-left px-2 py-1.5 rounded hover:bg-accent transition-colors capitalize"
              onClick={() => {
                useMappingStore
                  .getState()
                  .createGroup(
                    groupPrompt.sourceId,
                    groupPrompt.mappingIds,
                    strategy,
                  );
                setGroupPrompt(null);
              }}
            >
              {strategy.charAt(0).toUpperCase() + strategy.slice(1)}
            </button>
          ))}
          <button
            className="text-xs text-muted-foreground text-left px-2 py-1 rounded hover:bg-accent transition-colors mt-1"
            onClick={() => setGroupPrompt(null)}
          >
            Keep separate
          </button>
        </div>
      )}

      {/* Edge type picker */}
      {edgePicker && (
        <div
          className="fixed z-50 bg-popover border border-border rounded-lg shadow-xl p-3 flex flex-col gap-1 min-w-[160px]"
          style={{ left: edgePicker.x, top: edgePicker.y }}
        >
          <p className="text-xs font-medium text-muted-foreground mb-1 px-1">
            {edgePicker.mode === 'edit' ? 'Change edge type' : 'Edge type'}
          </p>
          <button
            className="text-sm text-left px-2 py-1.5 rounded hover:bg-accent transition-colors"
            onClick={() => handleEdgePickerSelect('subclassEdge')}
          >
            Subclass of
          </button>
          <button
            className="text-sm text-left px-2 py-1.5 rounded hover:bg-accent transition-colors"
            onClick={() => handleEdgePickerSelect('objectPropertyEdge')}
          >
            Object Property
          </button>
          <button
            className="text-xs text-muted-foreground text-left px-2 py-1 rounded hover:bg-accent transition-colors mt-1"
            onClick={() => setEdgePicker(null)}
          >
            Cancel
          </button>
        </div>
      )}
    </>
  );
}

// ─── Public wrapper (provides ReactFlow context) ──────────────────────────────

export function OntologyCanvas({
  onCanvasChange,
  onSourceCanvasChange,
}: OntologyCanvasProps) {
  return (
    <ReactFlowProvider>
      <OntologyCanvasInner
        onCanvasChange={onCanvasChange}
        onSourceCanvasChange={onSourceCanvasChange}
      />
    </ReactFlowProvider>
  );
}
