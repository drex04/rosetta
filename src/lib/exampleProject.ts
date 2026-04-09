import { useOntologyStore, SEED_TURTLE } from '@/store/ontologyStore';
import { useSourcesStore, generateSourceId } from '@/store/sourcesStore';
import { useMappingStore } from '@/store/mappingStore';
import { useValidationStore } from '@/store/validationStore';
import { jsonToSchema } from '@/lib/jsonToSchema';
import { xmlToSchema } from '@/lib/xmlToSchema';
import sampleShapesTtl from '@/data/sample-shapes.ttl?raw';
import sampleNorwegianRaw from '@/data/sample-source-a-norwegian.json?raw';
import sampleGermanRaw from '@/data/sample-source-b-german.json?raw';
import sampleUkRaw from '@/data/sample-source-c-uk.xml?raw';

export async function loadExampleProject(): Promise<void> {
  // Reset all stores
  useOntologyStore.getState().reset();
  useSourcesStore.getState().reset();
  useMappingStore.getState().reset();

  // Load ontology
  await useOntologyStore.getState().loadTurtle(SEED_TURTLE);

  // Parse sources
  const resultA = jsonToSchema(sampleNorwegianRaw, 'Norway');
  const resultB = jsonToSchema(sampleGermanRaw, 'Germany');
  const resultC = xmlToSchema(sampleUkRaw, 'United Kingdom');
  const idA = generateSourceId();
  const idB = generateSourceId();
  const idC = generateSourceId();

  const sources = [
    {
      id: idA,
      name: 'Norway',
      order: 0,
      rawData: sampleNorwegianRaw,
      dataFormat: 'json' as const,
      schemaNodes: resultA.nodes,
      schemaEdges: resultA.edges,
      parseError: null,
    },
    {
      id: idB,
      name: 'Germany',
      order: 1,
      rawData: sampleGermanRaw,
      dataFormat: 'json' as const,
      schemaNodes: resultB.nodes,
      schemaEdges: resultB.edges,
      parseError: null,
    },
    {
      id: idC,
      name: 'United Kingdom',
      order: 2,
      rawData: sampleUkRaw,
      dataFormat: 'xml' as const,
      schemaNodes: resultC.nodes,
      schemaEdges: resultC.edges,
      parseError: null,
    },
  ];

  useSourcesStore.setState({ sources, activeSourceId: idA });
  useValidationStore.getState().setUserShapesTurtle(sampleShapesTtl);

  // Pre-seed Norway mappings
  const radarTracksNode = resultA.nodes.find(
    (n) => n.data.uri === 'http://src_norway_#RadarTracks',
  );
  const airTrackNode = useOntologyStore
    .getState()
    .nodes.find((n) => n.data.uri === 'http://nato.int/onto#AirTrack');

  if (radarTracksNode && airTrackNode) {
    const mappingPairs: Array<[string, string]> = [
      ['trkNo', 'trackNumber'],
      ['lat', 'latitude'],
      ['lon', 'longitude'],
      ['spd_kts', 'speedKts'],
      ['time', 'timestamp'],
    ];

    for (const [srcLabel, tgtLabel] of mappingPairs) {
      const srcProp = radarTracksNode.data.properties.find(
        (p) => p.label === srcLabel,
      );
      const tgtProp = airTrackNode.data.properties.find(
        (p) => p.label === tgtLabel,
      );
      if (srcProp && tgtProp) {
        useMappingStore.getState().addMapping({
          sourceId: idA,
          sourceClassUri: radarTracksNode.data.uri,
          sourcePropUri: srcProp.uri,
          targetClassUri: airTrackNode.data.uri,
          targetPropUri: tgtProp.uri,
          sourceHandle: `prop_${srcLabel}`,
          targetHandle: `target_prop_${tgtLabel}`,
          kind: 'direct',
        });
      }
    }
  }

  // Pre-seed Germany mappings
  // breite/laenge are nested under `position` → Position class node
  // geschwindigkeit_kmh and zeitstempel are direct on ErkannteZiele
  const erkannteZieleNode = resultB.nodes.find(
    (n) => n.data.uri === 'http://src_germany_#ErkannteZiele',
  );
  const positionNode = resultB.nodes.find(
    (n) => n.data.uri === 'http://src_germany_#Position',
  );

  if (airTrackNode) {
    const germanyMappings: Array<[typeof erkannteZieleNode, string, string]> = [
      [positionNode, 'breite', 'latitude'],
      [positionNode, 'laenge', 'longitude'],
      [erkannteZieleNode, 'zeitstempel', 'timestamp'],
      [erkannteZieleNode, 'geschwindigkeit_kmh', 'speedKts'],
    ];

    for (const [srcNode, srcLabel, tgtLabel] of germanyMappings) {
      if (!srcNode) continue;
      const srcProp = srcNode.data.properties.find((p) => p.label === srcLabel);
      const tgtProp = airTrackNode.data.properties.find(
        (p) => p.label === tgtLabel,
      );
      if (srcProp && tgtProp) {
        useMappingStore.getState().addMapping({
          sourceId: idB,
          sourceClassUri: srcNode.data.uri,
          sourcePropUri: srcProp.uri,
          targetClassUri: airTrackNode.data.uri,
          targetPropUri: tgtProp.uri,
          sourceHandle: `prop_${srcLabel}`,
          targetHandle: `target_prop_${tgtLabel}`,
          kind: 'direct',
        });
      }
    }
  }
}
