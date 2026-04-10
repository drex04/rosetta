# Product Requirements Document: Ontology Mapping Tool

**Version:** 0.1 — Draft
**Date:** [Insert Date]
**Author:** Drew Nollsch
**Status:** Proposed
**Programme:** eAirC2 Infrastructure Accelerator

---

## 1. Purpose

This document defines the requirements for a purpose-built Ontology Mapping Tool that supports data architects in mapping diverse source schemas to the eAirC2 programme's master organizational ontology. The tool provides a structured, AI-assisted workflow that replaces the current manual process of reading source field definitions, interpreting semantics, and proposing alignments by hand.

The tool is a Phase 2 deliverable of the Sovereign AI Capability approved under the Infrastructure Accelerator. It builds on the Gemma 4 model and server infrastructure deployed in Phase 1.

---

## 2. Design Principles

**The model proposes; the human disposes.** Every AI-generated mapping is a suggestion that requires explicit human approval. No mapping is committed autonomously. This is critical for both quality and the programme's governance posture.

**Structured workflow over free-form chat.** The tool guides architects through a repeatable process — import, analyse, review, approve, export — rather than relying on ad-hoc conversations with a chatbot. Chat is available as a supplement, not the primary interface.

**Programme-wide consistency.** The tool tracks mappings across all source systems, not just within a single schema. Cross-system conflicts and inconsistencies are surfaced automatically.

**Sovereign and self-contained.** The entire stack runs on the programme's local server with no external dependencies after initial setup.

---

## 3. Users

**Primary users:** Data architects and ontology engineers responsible for integrating source systems into the master ontology. Expected 3–5 active users.

**Secondary users:** Programme leadership and architecture governance staff who consume coverage dashboards and mapping documentation. Expected 5–10 read-only users.

---

## 4. Functional Requirements

### 4.1 Schema Import and Normalisation

**FR-01.** The system shall accept source schema files in the following formats: SQL DDL, XSD/XML Schema, JSON Schema, and CSV (header row with optional type annotations).

**FR-02.** The system shall parse uploaded schemas into a normalised internal representation consisting of: field name, data type, description (if available in the source), hierarchical parent (for nested schemas), and sample values (if provided).

**FR-03.** The user shall be able to review and manually correct the parsed schema before proceeding to mapping. Corrections include editing field names, types, descriptions, and hierarchical relationships.

**FR-04.** The system shall store imported schemas persistently and associate them with a source system name, version identifier, and import date.

**FR-05.** The system shall support re-importing updated versions of a previously imported schema and show a diff of changes (added, removed, modified fields) against the prior version.

### 4.2 Ontology Management

**FR-06.** The system shall import and display the master ontology as a browsable, searchable hierarchical tree of concepts.

**FR-07.** Each ontology concept shall display: its name, definition, parent concept, data type constraints, and the number of source systems currently mapped to it.

**FR-08.** The system shall support importing ontology definitions from structured formats (RDF/OWL, JSON-LD, or a programme-defined YAML/JSON schema).

**FR-09.** The system shall support ontology versioning. When a new version of the master ontology is imported, existing mappings shall be flagged if their target concepts have been modified or removed.

### 4.3 AI-Assisted Mapping

**FR-10.** The user shall be able to select one or more source fields and trigger an AI analysis that proposes candidate mappings to ontology concepts.

**FR-11.** Each proposed mapping shall include: the source field, the suggested target ontology concept, a confidence level (high / medium / low), and a natural-language explanation of the rationale (e.g., semantic similarity, naming patterns, data type compatibility, consistency with other mapped systems).

**FR-12.** The system shall send the following context to the model with each mapping request: the source field's name, type, and description; the full ontology structure (or relevant subset); and existing approved mappings from other source systems, to enable cross-system consistency reasoning.

**FR-13.** The user shall be able to accept, reject, or override each proposed mapping. Override allows the user to manually select a different ontology concept as the target.

**FR-14.** When a user rejects a mapping, the system shall allow the user to provide a reason (free text). This feedback shall be included as context in subsequent analysis requests within the same session to improve suggestion quality.

**FR-15.** For source fields where the model cannot identify a suitable ontology concept (confidence: low / no match), the system shall flag the field and suggest that it may indicate a gap in the ontology requiring extension.

### 4.4 Semantic Conflict Detection

**FR-16.** The system shall automatically detect and flag the following conflict types across all imported source systems:

- **Same-name divergence:** Two source fields with the same or highly similar names are mapped to different ontology concepts.
- **Same-target divergence:** Two source fields mapped to the same ontology concept use different units, formats, or value domains.
- **Semantic overlap:** Two source fields with different names but similar descriptions are mapped to different ontology concepts where a single concept may be more appropriate.

**FR-17.** Each detected conflict shall display the involved source systems, fields, current mappings, and a natural-language explanation of why the system considers it a conflict.

**FR-18.** The user shall be able to resolve conflicts by updating one or both mappings, or dismissing the conflict with a documented rationale.

### 4.5 Gap Analysis Dashboard

**FR-19.** The system shall provide a dashboard view showing ontology coverage: which concepts have approved mappings from at least one source system, which have mappings from multiple systems, and which have no mappings.

**FR-20.** The dashboard shall display unmapped source fields — fields from any imported schema that have no approved mapping and no active "no match" determination.

**FR-21.** The dashboard shall be filterable by source system, ontology domain (top-level branch), and mapping status.

**FR-22.** Coverage statistics shall be exportable as a summary report (Markdown or PDF) for inclusion in architecture governance documentation.

### 4.6 Mapping Export and Documentation

**FR-23.** The system shall export approved mappings in the following machine-readable formats: JSON (programme-defined schema), and CSV.

**FR-24.** The system shall export RDF/OWL alignment files if the master ontology is managed in RDF/OWL format.

**FR-25.** The system shall generate a human-readable mapping specification document for each source system, containing: source system metadata, a table of all field-to-concept mappings with rationale, noted conflicts and their resolutions, identified ontology gaps, and review/approval status.

**FR-26.** Each mapping record shall include an audit trail: who proposed it (AI or manual), who approved it, when, and any associated notes or rejection feedback.

### 4.7 Conversational Interface

**FR-27.** The system shall include a chat panel where users can ask natural-language questions about the ontology, source schemas, or mapping decisions. Examples: "What's the difference between Platform.Identifier and Track.Number?", "How did we handle altitude units in the ACCS mapping?", "Suggest how to represent a composite identifier."

**FR-28.** The chat interface shall have access to the current ontology structure and all approved mappings as context, enabling answers grounded in the programme's actual data.

### 4.8 User Management

**FR-29.** The system shall support user authentication (local accounts or integration with the programme's identity provider if available).

**FR-30.** The system shall support two roles: Editor (can import schemas, run analysis, approve/reject mappings) and Viewer (read-only access to mappings, dashboards, and documentation).

**FR-31.** All user actions that modify data (imports, approvals, rejections, overrides, conflict resolutions) shall be logged with user identity and timestamp.

---

## 5. Non-Functional Requirements

**NFR-01. Deployment.** The system shall run entirely on the programme's local AI server. No external network calls after initial setup.

**NFR-02. Performance.** AI mapping analysis of a batch of up to 50 source fields shall return results within 120 seconds. Individual field analysis shall return within 15 seconds.

**NFR-03. Data persistence.** All schemas, ontology versions, mappings, conflicts, and audit logs shall be stored in a local database (PostgreSQL or SQLite) on the server.

**NFR-04. Browser compatibility.** The frontend shall work in current versions of Chrome, Firefox, and Edge. No client-side software installation required.

**NFR-05. Concurrent users.** The system shall support up to 10 concurrent users, with the understanding that AI inference requests are serialised through the single-GPU model endpoint.

**NFR-06. Data classification.** The system shall operate on the programme's unclassified network segment. No classified data shall be processed unless the system receives appropriate accreditation. Field names and schema structures from classified systems may be processed if sanitised representations are used per programme security guidance.

---

## 6. Technical Architecture

### 6.1 Stack

| Layer        | Technology           | Notes                                             |
| ------------ | -------------------- | ------------------------------------------------- |
| Frontend     | React                | Single-page application, Tailwind CSS for styling |
| Backend API  | Python / FastAPI     | REST API for all data operations                  |
| Database     | PostgreSQL or SQLite | Schema storage, mapping records, audit log        |
| AI inference | Ollama or vLLM API   | Local endpoint serving Gemma 4 26B MoE            |
| Server       | Linux (Ubuntu)       | Same physical server as Open WebUI deployment     |

### 6.2 Key Integration Points

**Model API.** The backend calls the local Gemma 4 endpoint via HTTP (OpenAI-compatible API format exposed by Ollama/vLLM). Prompts are constructed server-side, assembling source field context, ontology structure, and existing mapping history into structured prompts. Responses are parsed for mapping suggestions, confidence indicators, and explanations.

**Ontology import.** The system reads ontology definitions from file uploads (RDF/OWL, JSON-LD, or YAML). The ontology is stored internally as a tree structure in the database and serialised into prompt context as needed.

**Export.** Mapping exports are generated server-side as downloadable files. The mapping specification document is generated as Markdown and optionally converted to PDF.

### 6.3 Prompt Design Considerations

The quality of mapping suggestions depends heavily on prompt design. Key considerations:

- Include the full ontology structure (or relevant subtree) in each analysis prompt so the model can reason about concept relationships, not just name matching.
- Include approved mappings from other source systems as few-shot examples, so the model learns the programme's mapping conventions.
- For conflict detection, present the two conflicting mappings side-by-side and ask the model to explain the semantic difference and recommend a resolution.
- Use structured output formatting (JSON) in prompts to ensure parsing reliability. Validate model output against expected schema before presenting to the user.
- Prompt templates should be version-controlled and iterable. Expect to refine prompts based on pilot feedback.

---

## 7. User Interface

### 7.1 Layout

Three-panel workspace:

- **Left panel (300px):** Source field list for the currently selected schema. Each field shows name, type, description, and mapping status (mapped / review / no match / pending). Filterable and sortable.
- **Centre panel (flexible):** Tabbed view with three tabs:
  - **AI Mapping Suggestions:** Cards for each proposed mapping showing source field, target concept, confidence, explanation, and accept/reject/override controls.
  - **Conflicts:** List of detected cross-system conflicts with review and resolution controls.
  - **Ask About Ontology:** Chat panel for ad-hoc questions grounded in ontology and mapping context.
- **Right panel (280px):** Master ontology browser as a collapsible tree. Shows mapping count per concept. Highlights the target concept when a mapping suggestion is selected. Includes search and a coverage progress bar.

### 7.2 Additional Views

- **Source Schema Manager:** List of all imported schemas with version history, field counts, and mapping progress. Entry point for new schema imports.
- **Gap Analysis Dashboard:** Full-screen coverage view with filtering and export controls.
- **Mapping History / Audit Log:** Searchable log of all mapping decisions with user, timestamp, and action type.

### 7.3 Reference Mockup

See the interactive mockup file (OntologyMapper_Mockup.jsx) for a visual reference of the mapping workspace layout, colour scheme, and interaction patterns.

---

## 8. Development Phases

### Phase 2a — Core Mapping Workflow (Weeks 1–3)

- Schema import (FR-01 through FR-04)
- Ontology import and browser (FR-06 through FR-08)
- AI-assisted mapping with accept/reject/override (FR-10 through FR-15)
- Basic mapping export as JSON/CSV (FR-23)
- Local user authentication (FR-29)

### Phase 2b — Governance and Consistency (Weeks 4–5)

- Semantic conflict detection (FR-16 through FR-18)
- Gap analysis dashboard (FR-19 through FR-22)
- Mapping specification document generation (FR-25, FR-26)
- Audit logging (FR-31)

### Phase 2c — Refinement (Week 6)

- Conversational interface (FR-27, FR-28)
- Schema versioning and diff (FR-05)
- Ontology versioning (FR-09)
- RDF/OWL export (FR-24)
- Viewer role and read-only access (FR-30)
- Prompt refinement based on pilot feedback

---

## 9. Success Criteria

- Data architects can complete a source schema mapping in under 2 hours (vs. current estimate of 1–2 days manual effort).
- At least 70% of AI-proposed high-confidence mappings are accepted without override.
- Cross-system conflicts are detected automatically, with zero reliance on manual cross-referencing.
- Programme leadership can view ontology coverage status without requesting ad-hoc reports.
- All mapping decisions are traceable to a specific user and timestamp.

---

## 10. Open Questions

- What is the preferred format for the master ontology? RDF/OWL, or a simpler programme-defined YAML/JSON structure? This affects FR-06, FR-08, FR-09, and FR-24.
- What existing source schemas are available for the pilot? Ideally 2–3 real schemas to validate the workflow against before broader rollout.
- Are there existing mapping conventions or style guides from other NATO programmes (e.g., NFFI, MTF) that should inform the prompt design?
- Should the tool integrate with any existing programme tools (e.g., a requirements management system, Confluence, or a Git-based ADR repository)?
- What is the accreditation posture for schema metadata? Can field names and types from classified source systems be processed on the unclassified server, or must all input be formally sanitised?
