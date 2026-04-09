import type { Step } from 'react-joyride';

// react-joyride's Step type omits disableBeacon in some package versions
type StepWithBeacon = Step & { disableBeacon?: boolean };

export const tourSteps: StepWithBeacon[] = [
  {
    target: '[data-tour="load-tab"]',
    title: 'Load Source Data',
    content:
      'Start by loading your source systems here. Each source can be JSON or XML data from a different nation or system.',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="add-source"]',
    title: 'Add a Source',
    content:
      'Click here to add a new data source. Give it a name and paste in the raw JSON or XML from that system.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="ontology-tab"]',
    title: 'Master Ontology',
    content:
      'The ONTOLOGY tab shows your shared data model — the classes and properties all sources will be mapped to.',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="canvas"]',
    title: 'Visual Canvas',
    content:
      'Source schema nodes appear on the left (amber). Ontology class nodes appear on the right (blue). Drag edges between them to create mappings.',
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '[data-tour="map-tab"]',
    title: 'Manage Mappings',
    content:
      'The MAP tab lists all field mappings for the active source. You can edit mapping kinds and formula expressions here.',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="output-tab"]',
    title: 'Transform & Export',
    content:
      'Transform all sources into a unified RDF graph and export as JSON-LD, RML, or YARRRML for downstream ETL pipelines.',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="validate-tab"]',
    title: 'Validate with SHACL',
    content:
      'Run SHACL validation to check that your mappings satisfy the ontology constraints. Violations are listed with the affected property.',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="project-menu"]',
    title: 'Start Your Own Project',
    content:
      'Ready to map your own data? Open the project menu to clear this example and start fresh. You can also import an existing .rosetta.json project file.',
    placement: 'bottom',
    disableBeacon: true,
  },
];
