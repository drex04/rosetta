import type { Step } from 'react-joyride';

export const tourSteps: Step[] = [
  {
    target: '[data-tour="load-tab"]',
    title: 'Load Source Data',
    content:
      'Start by loading your source systems here. Each source can be JSON or XML data from a different nation or system.',
    placement: 'right',
    skipBeacon: true,
  },
  {
    target: '[data-tour="add-source"]',
    title: 'Add a Source',
    content:
      'Click here to add a new data source. Give it a name and paste in the raw JSON or XML from that system.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="ontology-tab"]',
    title: 'Master Ontology',
    content:
      'The BUILD tab shows your shared data model — the classes and properties all sources will be mapped to.',
    placement: 'right',
  },
  {
    target: '[data-tour="canvas"]',
    title: 'Visual Canvas',
    content:
      'Source schema nodes appear on the left (amber). Ontology class nodes appear on the right (blue). Drag edges between them to create mappings.',
    placement: 'center',
  },
  {
    target: '[data-tour="map-tab"]',
    title: 'Manage Mappings',
    content:
      'The MAP tab lists all field mappings for the active source. You can edit mapping kinds, formulas, and SPARQL queries here.',
    placement: 'right',
  },
  {
    target: '[data-tour="validate-tab"]',
    title: 'Validate with SHACL',
    content:
      'Run SHACL validation to check that your mappings satisfy the ontology constraints. Violations are listed with the affected property.',
    placement: 'right',
  },
  {
    target: '[data-tour="output-tab"]',
    title: 'Transform & Export',
    content:
      'Transform all sources into a unified RDF graph and export as JSON-LD, RML, or YARRRML for downstream ETL pipelines.',
    placement: 'right',
  },
];
