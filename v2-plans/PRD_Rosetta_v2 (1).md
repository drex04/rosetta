# Rosetta v2 — Product Requirements Document

**Version:** 0.2 — Draft
**Date:** [Insert Date]
**Author:** Drew Nollsch
**Status:** Proposed

---

## 1. Product Overview

Rosetta v2 adds AI-assisted mapping to the existing Rosetta ontology mapping application. The core principle is **keep the client-side architecture** — no backend, no database, no authentication. The only new external dependency is an LLM inference endpoint, which the user configures themselves.

Rosetta v1 is a pure client-side SPA that lets data architects visually map source fields to a shared OWL ontology, generate RML mapping rules, and validate output with SHACL. Everything runs in the browser with IndexedDB persistence.

Rosetta v2 adds one new capability: **AI-assisted mapping suggestions.** The user connects the app to any OpenAI-compatible inference endpoint (local Ollama, vLLM, or a cloud API key), and the app uses it to analyse source fields, propose mappings, and answer ontology questions. All state — including prompt templates — remains client-side, editable, and exportable.

Features deferred to v3: multi-user support, backend persistence, authentication, cross-project conflict detection, gap analysis dashboards, audit trails, and role-based access.

---

## 2. Design Principles

**Still no backend.** The only server-side component is the LLM inference endpoint, which Rosetta treats as a dumb API — send prompt, receive completion. All application logic, state, and prompts live in the browser.

**Bring Your Own Model (BYOM).** The user configures their own inference endpoint. This could be a local Ollama instance, a vLLM server on the programme's AI workstation, an OpenAI API key, an Anthropic API key, or any OpenAI-compatible endpoint. Rosetta doesn't care what's behind the API — it speaks the OpenAI chat completions format.

**The model proposes; the human disposes.** AI suggestions appear as proposals in the existing mapping workflow. Accepting a suggestion creates a standard Mapping object identical to a manually-created one. No mapping is committed without explicit user action.

**Prompts are data, not code.** Prompt templates are stored alongside the project state, shipped with sensible defaults, and fully editable by the user. This makes the AI behaviour transparent, debuggable, and tuneable without code changes — critical during early development and pilot.

**AI is optional.** The app works exactly like v1 with no model connected. AI features appear when a valid endpoint is configured and disappear gracefully when it isn't.

---

## 3. What Changes from v1

| Aspect                  | v1                               | v2                                                            |
| ----------------------- | -------------------------------- | ------------------------------------------------------------- |
| AI mapping suggestions  | No                               | Yes — analyse source fields, propose mappings                 |
| Ontology chat assistant | No                               | Yes — conversational Q&A about ontology and mappings          |
| LLM connection          | None                             | User-configured OpenAI-compatible endpoint                    |
| Prompt management       | N/A                              | Editable prompt templates stored in project state             |
| Backend / database      | None                             | None (unchanged)                                              |
| Authentication          | None                             | None (unchanged)                                              |
| Persistence             | IndexedDB + .rosetta.json export | IndexedDB + .rosetta.json export (unchanged, schema extended) |

Everything else — canvas, mapping panel, source panel, Turtle editor, RML/YARRRML generation, SHACL validation, formula engine, fusion, onboarding — is unchanged.

---

## 4. Functional Requirements

### 4.1 Model Connection Settings

**FR-01.** The application shall provide a settings dialog where the user configures an LLM inference endpoint. Required fields: endpoint URL, model name. Optional fields: API key, request timeout, max tokens.

**FR-02.** The settings dialog shall include preset configurations for common setups:

- Ollama (local): `http://localhost:11434/v1/chat/completions`, no API key
- vLLM (local server): `http://<server>:8000/v1/chat/completions`, no API key
- OpenAI API: `https://api.openai.com/v1/chat/completions`, API key required
- Anthropic API (via compatible proxy): configurable
- Custom endpoint: fully user-defined

**FR-03.** The application shall validate the connection by sending a lightweight test request on save. The UI shall display connection status: connected (green), disconnected (grey), error (red with message).

**FR-04.** Connection settings shall be persisted in IndexedDB (separate from project data) and restored on page load. API keys shall be stored locally only and never included in project exports.

**FR-05.** When no valid endpoint is configured or the endpoint is unreachable, all AI features shall be hidden or display a "Connect a model" prompt. All other functionality remains available.

### 4.2 Prompt Management

**FR-06.** The application shall ship with a set of default prompt templates stored as static assets (same pattern as the example project content in `src/data/`). Initial templates:

| Template ID         | Purpose                                             |
| ------------------- | --------------------------------------------------- |
| `mapping-single`    | Analyse a single source field and suggest a mapping |
| `mapping-batch`     | Analyse multiple unmapped fields in one request     |
| `mapping-explain`   | Explain why a specific mapping was suggested        |
| `chat-ontology`     | General-purpose ontology Q&A                        |
| `chat-mapping-help` | Help with a specific mapping decision               |

**FR-07.** Each prompt template shall consist of: a template ID, a display name, a description, a system prompt (string with template variables), and a user prompt template (string with template variables).

**FR-08.** Template variables are substituted at runtime from application state. Available variables include:

| Variable                | Resolves to                                                |
| ----------------------- | ---------------------------------------------------------- |
| `{{ontology_turtle}}`   | Current ontology Turtle source                             |
| `{{ontology_summary}}`  | Condensed class/property listing (names, types, hierarchy) |
| `{{source_name}}`       | Active source system name                                  |
| `{{source_schema}}`     | Active source schema (field names, types, descriptions)    |
| `{{source_field}}`      | Single field being analysed (name, type, description)      |
| `{{unmapped_fields}}`   | All unmapped fields for the active source                  |
| `{{existing_mappings}}` | All confirmed mappings for the active source               |
| `{{all_mappings}}`      | All confirmed mappings across all sources in the project   |
| `{{user_feedback}}`     | Accumulated rejection feedback from the current session    |
| `{{user_message}}`      | User's chat message (for chat templates)                   |

**FR-09.** The application shall provide a prompt editor (new panel or dialog) where the user can view, edit, and test prompt templates. The editor shall show:

- The raw template text with variable placeholders highlighted
- A "Preview" mode that substitutes current application state into the variables, showing the full prompt that would be sent to the model
- A "Test" button that sends the previewed prompt to the configured model and displays the raw response

**FR-10.** The user shall be able to reset any template to its default (shipped) version.

**FR-11.** The user shall be able to export all prompt templates as a JSON file and import prompt templates from a JSON file. This enables sharing prompt configurations between team members.

**FR-12.** Prompt templates shall be included in the .rosetta.json project export if the user has modified them from defaults. On import, modified prompts in the project file override the current templates (with confirmation).

**FR-13.** The prompt template schema shall include a `version` field to support future template format changes.

### 4.3 AI-Assisted Mapping

**FR-14.** The user shall be able to select one or more unmapped source fields and trigger an AI analysis from:

- A new "Suggest Mappings (AI)" button in the mapping panel
- A context menu action on source nodes on the canvas ("Suggest Mappings")

**FR-15.** For single-field analysis, the system shall use the `mapping-single` prompt template. For multiple fields, the system shall use the `mapping-batch` template.

**FR-16.** The system shall parse the model's response into structured mapping suggestions. Each suggestion shall include: the source field, the suggested target class and property (as URIs matching the loaded ontology), a confidence level (high / medium / low), a suggested mapping kind (direct, typecast, template, formula) with pre-filled parameters where applicable, and a natural-language explanation.

**FR-17.** The system shall validate parsed suggestions against the current ontology — if a suggested target class or property URI doesn't exist in the loaded ontology, the suggestion shall be flagged as "target not found" rather than silently dropped.

**FR-18.** AI suggestions shall be presented in the mapping panel as a new collapsible "AI Suggestions" section above the existing mapping list. Each suggestion card shall display:

- Source field name and type
- Suggested target (class.property) with confidence badge
- Suggested mapping kind with pre-filled parameters
- Natural-language explanation
- Accept / Reject / Override buttons

**FR-19.** Accepting a suggestion shall create a standard Rosetta `Mapping` object (same interface as v1 manual mappings) and render it as a `MappingEdge` on the canvas. From that point forward it is indistinguishable from a manually-created mapping.

**FR-20.** Rejecting a suggestion shall prompt the user for optional feedback (free text). The feedback shall be accumulated in the `aiStore` for the current session and included in subsequent analysis requests via the `{{user_feedback}}` variable.

**FR-21.** Override shall allow the user to accept the suggestion but change the target property, mapping kind, or parameters before committing. This opens the standard mapping editor pre-filled with the suggestion's values.

**FR-22.** The user shall be able to dismiss all pending suggestions for the active source with a single action.

**FR-23.** Suggestion state shall be stored in the new `aiStore` Zustand store and persisted to IndexedDB. Suggestions survive page refreshes but are scoped to the current project — clearing the project clears suggestions.

### 4.4 Conversational Ontology Assistant

**FR-24.** A new "AI" tab in the right panel shall provide a chat interface where the user can ask natural-language questions.

**FR-25.** The chat shall use the `chat-ontology` or `chat-mapping-help` prompt templates (selected based on context or user choice). The ontology structure and current mappings are injected as context via template variables.

**FR-26.** Chat history shall be stored in the `aiStore` and persisted to IndexedDB. It shall be clearable by the user.

**FR-27.** The chat panel shall display a "model not connected" state when no valid endpoint is configured.

### 4.5 Response Parsing and Error Handling

**FR-28.** The system shall expect model responses in a specified JSON format (defined in the prompt templates). If the response cannot be parsed, the system shall display the raw response text and a "Could not parse response" warning, allowing the user to interpret the output manually.

**FR-29.** Network errors, timeouts, and non-200 responses from the inference endpoint shall display user-friendly error messages with the option to retry.

**FR-30.** The system shall enforce a configurable request timeout (default: 120 seconds for batch analysis, 30 seconds for single-field and chat).

**FR-31.** Requests to the inference endpoint shall be cancellable — if the user navigates away or triggers a new analysis, the pending request should be aborted.

---

## 5. Non-Functional Requirements

**NFR-01. No backend.** The application shall remain a pure client-side SPA. The only external dependency is the user-configured LLM inference endpoint.

**NFR-02. No backward compatibility required.** Rosetta v1 is an unreleased demo. The v2 project file schema may break from v1 without migration support. This simplifies persistence and export/import implementation.

**NFR-03. Browser compatibility.** Chrome, Firefox, and Edge (current versions). No client-side installation required.

**NFR-04. CORS.** The application shall document CORS requirements for common inference setups. Ollama enables CORS by default. vLLM and custom endpoints may require configuration. The settings dialog shall include a CORS troubleshooting hint when connection fails.

**NFR-05. API key security.** API keys are stored in IndexedDB only, never in project exports, never in prompts sent to the model, and never logged to the console.

**NFR-06. Performance.** AI features shall not block or delay canvas rendering, schema inference, RML generation, or SHACL validation. Inference requests run asynchronously with loading indicators.

**NFR-07. Test coverage.** Existing v1 test suite (Vitest 70% threshold + Playwright E2E) shall continue to pass. New AI features shall include unit tests for prompt template substitution, response parsing, and store actions. E2E tests for AI features shall use mocked inference responses.

**NFR-08. Bundle size.** The AI feature additions (store, API client, prompt templates, UI components) shall not increase the production bundle size by more than 50KB gzipped (excluding prompt template text files).

---

## 6. Technical Architecture

### 6.1 New Modules

| Module                                           | Type          | Purpose                                                                                                       |
| ------------------------------------------------ | ------------- | ------------------------------------------------------------------------------------------------------------- |
| `src/store/aiStore.ts`                           | Zustand store | AI suggestions, chat history, session feedback, prompt templates, connection settings                         |
| `src/lib/inference.ts`                           | Utility       | OpenAI-compatible chat completions client; handles request construction, cancellation, timeout, error mapping |
| `src/lib/promptEngine.ts`                        | Utility       | Template loading, variable substitution, preview generation                                                   |
| `src/lib/parseAiResponse.ts`                     | Utility       | Parse structured JSON from model response; validate against ontology; produce typed suggestion objects        |
| `src/data/prompts/`                              | Static assets | Default prompt template files (JSON)                                                                          |
| `src/components/panels/AiPanel.tsx`              | Component     | Chat interface (new right-panel tab)                                                                          |
| `src/components/panels/AiSuggestionsSection.tsx` | Component     | Suggestion cards rendered inside MappingPanel                                                                 |
| `src/components/dialogs/ModelSettingsDialog.tsx` | Component     | Connection configuration                                                                                      |
| `src/components/dialogs/PromptEditorDialog.tsx`  | Component     | Prompt template viewer/editor with preview and test                                                           |

### 6.2 State Shape (aiStore)

```typescript
interface AiState {
  // Connection
  connection: {
    endpointUrl: string;
    modelName: string;
    apiKey?: string; // stored in IDB only, never exported
    timeoutMs: number;
    jsonMode: 'ollama' | 'openai' | 'prompt-only'; // how to request JSON output
    status: 'disconnected' | 'connected' | 'error';
    errorMessage?: string;
  };

  // Prompt templates
  prompts: Record<string, PromptTemplate>; // keyed by template ID
  promptsModified: boolean; // true if any template differs from defaults

  // Suggestions (per source)
  suggestions: Record<string, AiSuggestion[]>; // keyed by sourceId
  isAnalysing: boolean;
  analysisError?: string;

  // Chat
  chatHistory: ChatMessage[];

  // Session feedback (rejected suggestion reasons)
  sessionFeedback: string[];

  // Actions
  setConnection: (config: Partial<AiState['connection']>) => void;
  testConnection: () => Promise<void>;
  updatePrompt: (id: string, patch: Partial<PromptTemplate>) => void;
  resetPrompt: (id: string) => void;
  resetAllPrompts: () => void;
  exportPrompts: () => string; // JSON string
  importPrompts: (json: string) => void;
  analyseSingle: (sourceId: string, fieldUri: string) => Promise<void>;
  analyseBatch: (sourceId: string) => Promise<void>;
  acceptSuggestion: (sourceId: string, suggestionId: string) => void;
  rejectSuggestion: (
    sourceId: string,
    suggestionId: string,
    reason?: string,
  ) => void;
  dismissAllSuggestions: (sourceId: string) => void;
  sendChatMessage: (message: string) => Promise<void>;
  clearChat: () => void;
  hydrate: (saved: Partial<AiState>) => void;
}

interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  version: number;
  systemPrompt: string; // template text with {{variables}}
  userPrompt: string; // template text with {{variables}}
  responseFormat?: string; // JSON schema hint included in system prompt
  isDefault: boolean; // true if unmodified from shipped default
}

interface AiSuggestion {
  id: string;
  sourceFieldUri: string;
  sourceFieldName: string;
  targetClassUri: string | null;
  targetPropUri: string | null;
  confidence: 'high' | 'medium' | 'low';
  suggestedKind: Mapping['kind'];
  suggestedParams?: {
    // pre-filled mapping parameters
    templatePattern?: string;
    constantValue?: string;
    formulaExpression?: string;
    targetDatatype?: string;
    languageTag?: string;
  };
  explanation: string;
  targetValid: boolean; // false if suggested URI not found in ontology
  status: 'pending' | 'accepted' | 'rejected';
  rejectionReason?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}
```

### 6.3 Inference Client (inference.ts)

```typescript
interface InferenceRequest {
  messages: { role: string; content: string }[];
  model: string;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' };
}

async function complete(
  connection: AiState['connection'],
  request: InferenceRequest,
  signal?: AbortSignal,
): Promise<string>;
```

The client speaks the OpenAI `/v1/chat/completions` format, which is supported by Ollama, vLLM, LM Studio, and most compatible servers. It handles:

- API key injection via `Authorization: Bearer` header (if configured)
- Request timeout via AbortController
- Error mapping (network errors, 4xx/5xx, timeout, CORS)
- Response extraction: `response.choices[0].message.content`
- JSON mode hints: when enabled in connection settings, appends the appropriate parameter for the endpoint type — Ollama's `format: "json"`, OpenAI's `response_format: { type: "json_object" }`, or prompt-only hint for unsupported endpoints

### 6.4 Prompt Engine (promptEngine.ts)

```typescript
function substituteVariables(template: string, context: PromptContext): string;

function buildPromptContext(
  ontologyStore: OntologyState,
  sourcesStore: SourcesState,
  mappingStore: MappingState,
  aiStore: AiState,
  overrides?: Partial<PromptContext>,
): PromptContext;

function generateOntologySummary(turtleSource: string): string; // condensed class/property listing for prompt efficiency
```

The `generateOntologySummary` function is important — sending the full Turtle source to the model may exceed context limits for large ontologies. The summary function extracts class names, property names, types, and hierarchy into a compact structured format that uses roughly 20% of the tokens Turtle would require while preserving enough semantics for mapping reasoning. Output format:

```
Classes:
  Platform [props: identifier(string), type(string), affiliation(string)]
  Track [props: number(int), quality(float), status(string)]
    → subClassOf: Entity
  Position [props: latitude(float), longitude(float), altitude(float)]
```

The `{{ontology_summary}}` variable uses this compact format (default for mapping prompts). The `{{ontology_turtle}}` variable provides the full Turtle source for prompts that need it (e.g., chat questions about RDF syntax).

### 6.5 Response Parser (parseAiResponse.ts)

```typescript
interface ParsedMappingResponse {
  suggestions: AiSuggestion[];
  parseErrors: string[]; // per-suggestion parse failures
  rawResponse: string; // preserved for debugging
}

function parseMappingResponse(
  raw: string,
  ontologyNodes: OntologyNode[],
  sourceFields: PropertyData[],
): ParsedMappingResponse;
```

The parser:

1. Strips markdown code fences if present
2. Attempts JSON.parse
3. Validates each suggestion against a schema (required fields, valid enum values)
4. Cross-references suggested target URIs against the loaded ontology
5. Sets `targetValid: false` for URIs not found (rather than dropping the suggestion)
6. Returns both valid suggestions and parse errors for transparency

### 6.6 IDB Persistence Extension

The existing `useAutoSave` hook is extended to include `aiStore` state. The IDB key remains `rosetta-project`. The serialised shape adds:

```typescript
interface ProjectFile {
  // ... existing v1 fields ...
  ai?: {
    prompts?: Record<string, PromptTemplate>; // only if modified from defaults
    suggestions?: Record<string, AiSuggestion[]>;
    chatHistory?: ChatMessage[];
  };
  // connection settings stored separately (not in project export)
}
```

Connection settings (endpoint URL, API key) are stored under a separate IDB key (`rosetta-connection`) and are NOT included in project exports.

### 6.7 Project Export/Import

- .rosetta.json exports include the full `ai` block: prompts (if modified from defaults), suggestions, and chat history
- .rosetta.json exports NEVER include connection settings or API keys
- No backward compatibility with v1 project files is required

---

## 7. Default Prompt Templates

Shipped as JSON files in `src/data/prompts/`. Example structure for the single-field mapping template:

```json
{
  "id": "mapping-single",
  "name": "Single Field Mapping",
  "description": "Analyse one source field and suggest a mapping to the ontology",
  "version": 1,
  "systemPrompt": "You are an ontology mapping assistant for a NATO defense data interoperability programme. You help data architects map source system fields to a shared OWL ontology.\n\nThe master ontology structure:\n{{ontology_summary}}\n\nExisting confirmed mappings for context:\n{{all_mappings}}\n\nPrevious feedback from the user on rejected suggestions:\n{{user_feedback}}\n\nRespond with a JSON object only (no markdown, no preamble). Schema:\n{\n  \"suggestions\": [{\n    \"sourceField\": \"field URI\",\n    \"targetClass\": \"class URI or null\",\n    \"targetProperty\": \"property URI or null\",\n    \"confidence\": \"high|medium|low\",\n    \"mappingKind\": \"direct|typecast|template|formula\",\n    \"params\": { ... optional kind-specific parameters },\n    \"explanation\": \"why this mapping makes sense\"\n  }]\n}",
  "userPrompt": "Analyse this source field from {{source_name}} and suggest the best mapping to the ontology.\n\nField: {{source_field}}",
  "responseFormat": "json_object",
  "isDefault": true
}
```

Prompt templates are intentionally verbose and explicit about response format — this is what makes the response parser reliable. Users can edit them to improve quality for their specific ontology and source systems.

---

## 8. User Interface Changes

### 8.1 Header Toolbar

- New model connection indicator (right side): green/grey/red dot with model name. Click opens Model Settings dialog.

### 8.2 Model Settings Dialog

- Endpoint URL input with preset dropdown (Ollama, vLLM, OpenAI, Custom)
- Model name input
- API key input (password field, optional)
- Timeout slider
- "Test Connection" button with status feedback
- CORS troubleshooting hint (collapsible)

### 8.3 Mapping Panel — AI Suggestions Section

New collapsible section at the top of the existing MappingPanel:

- When model is not connected: "Connect a model to enable AI suggestions" with link to settings
- When connected with no suggestions: "Analyse unmapped fields" button
- When analysing: loading spinner with cancel button
- When suggestions are present: suggestion cards (see FR-18) with Accept/Reject/Override
- "Dismiss all" action in section header

### 8.4 Source Node Context Menu

New item: "Suggest Mappings (AI)" — triggers batch analysis for all unmapped properties on the selected source node. Disabled (greyed) when model not connected.

### 8.5 AI Chat Tab

New tab in the right panel: "AI" (alongside SOURCE, ONTOLOGY, MAP, OUTPUT, VALIDATE).

- Chat message list with user/assistant bubbles
- Input field with send button
- "Clear chat" action
- "Model not connected" state when no endpoint configured

### 8.6 Prompt Editor Dialog

Accessible from: AI tab header menu, or Model Settings dialog.

- Left sidebar: list of all prompt templates with modified/default indicator
- Main area: template editor with system prompt and user prompt text areas
- Template variable reference panel (collapsible) showing available `{{variables}}`
- "Preview" toggle: renders the template with current application state substituted
- "Test" button: sends the previewed prompt to the model, displays raw response
- "Reset to default" per template
- "Export all prompts" / "Import prompts" buttons in toolbar

---

## 9. V1 Technical Debt to Address

These v1 issues should be addressed during v2 where they intersect with new work:

| Issue                                     | v2 Relevance                                                                   | Action                                                 |
| ----------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------ |
| OntologyCanvas god component (1300 lines) | New context menu item ("Suggest Mappings") requires touching this component    | Refactor into sub-components before adding AI features |
| Schema inference blocks UI thread         | Not directly blocking for v2, but poor UX when combined with AI loading states | Defer to v3 (Web Worker migration)                     |
| No CI pipeline                            | Risk of regressions when adding new features                                   | Set up CI before v2 development begins                 |

---

## 10. Development Phases

### Phase A — Foundation (Week 1)

- `aiStore` with connection settings, prompt template management, and IDB persistence
- `inference.ts` client (OpenAI-compatible, with timeout, cancellation, error handling)
- `promptEngine.ts` with variable substitution and ontology summary generation
- Model Settings dialog with presets and connection test
- Header connection indicator
- Set up CI pipeline (tech debt)

### Phase B — Mapping Suggestions (Weeks 2–3)

- Default prompt templates for `mapping-single` and `mapping-batch`
- `parseAiResponse.ts` with ontology validation
- AI Suggestions section in MappingPanel
- Accept → create Mapping object + MappingEdge
- Reject → feedback collection → include in subsequent prompts
- Override → pre-filled mapping editor
- Source node context menu "Suggest Mappings (AI)"
- Batch analysis with progress and cancellation
- OntologyCanvas refactor (prerequisite for context menu addition)

### Phase C — Chat and Prompt Editor (Week 4)

- AI chat tab in right panel
- Default prompt templates for `chat-ontology` and `chat-mapping-help`
- Prompt Editor dialog with preview, test, reset, export/import
- Project export/import extended with AI state
- Documentation and CORS troubleshooting guide

---

## 11. Success Criteria

- Data architects complete a source schema mapping significantly faster using AI suggestions combined with the existing canvas workflow.
- At least 70% of AI-proposed high-confidence mappings are accepted without override.
- The app remains fully functional with no model connected (identical to v1 behaviour).
- Prompt templates are actively tuned during development — the edit/preview/test workflow enables rapid iteration without redeployment.
- AI features are covered by unit tests (prompt substitution, response parsing) and E2E tests (with mocked inference).
- Zero regressions in canvas, RML generation, SHACL validation, or fusion performance.

---

## 12. Resolved Design Decisions

1. **Ontology context serialisation.** A custom structured summary format is the most token-efficient option — roughly 20% of the tokens that Turtle requires, while preserving class names, property names, types, and hierarchy. The `{{ontology_summary}}` variable uses this compact format by default. The `{{ontology_turtle}}` variable remains available for prompts that need full RDF syntax (e.g., chat questions about Turtle syntax). The `generateOntologySummary` function in `promptEngine.ts` shall produce output in this format:

   ```
   Classes:
     Platform [props: identifier(string), type(string), affiliation(string)]
     Track [props: number(int), quality(float), status(string)]
       → subClassOf: Entity
     Position [props: latitude(float), longitude(float), altitude(float)]
   ```

2. **Response format hints.** The inference client shall include model-specific JSON format hints. The Model Settings dialog exposes a "JSON mode" toggle that maps to: Ollama's `format: "json"` parameter, OpenAI's `response_format: { type: "json_object" }`, or a raw prompt-only hint for endpoints that don't support structured output natively.

3. **Prompt sharing.** Deferred. Single-user workflow for now. Export/import capability is built in but no shared repository or sync mechanism. Add if needed based on team adoption.

4. **Backward compatibility.** Not required. Rosetta v1 is an unreleased demo. The v2 project file schema can break from v1 without migration support. This simplifies the IDB persistence and export/import implementation.

5. **Network environment.** Target deployment is a local, unclassified home network. CORS, firewall, and security policy constraints on classified programme networks are out of scope for v2 and will be addressed during programme onboarding.
