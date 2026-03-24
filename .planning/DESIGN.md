---
created: 2026-03-24
type: design-context
---

## Design Context

### Users

Two primary users in the same session:

1. **Defense analyst (learner):** Technical but not a Semantic Web specialist. Hands-on with the tool, building ontologies and mappings. Needs to feel capable and in control — not overwhelmed by RDF jargon. The tool is also their teacher.

2. **Operational stakeholder (demo audience):** Non-technical. Watching a demonstration of the interoperability concept. Needs to immediately grasp *why this matters* without understanding the underlying technology. The tool must look credible and polished enough to build confidence in the approach.

**Job to be done:** Demonstrate that NATO interoperability problems (heterogeneous schemas across nations) can be solved systematically using Semantic Web technologies — visually, interactively, in the browser.

**Emotional goals:** Confidence, clarity, a sense of technical sophistication. Not intimidation or confusion.

### Brand Personality

**Three words:** Modern, clean, technical.

The tool should feel like it belongs in the same family as Snowflake or Databricks — professional data tooling with a strong visual identity, not academic software. On the canvas specifically, the graph aesthetics should evoke Neo4j: purposeful node/edge layout, clear visual hierarchy, not a cluttered whiteboard.

### Aesthetic Direction

**Overall feel:** Snowflake/Databricks — crisp white backgrounds, generous whitespace, strong typographic hierarchy, subtle borders, confident use of color as signal (not decoration). Data tooling that takes itself seriously.

**Canvas feel:** Neo4j — clean graph visualization with purposeful color coding. Not Miro/FigJam (too casual). Not legacy enterprise (too dense). Nodes should look like components, not Post-it notes.

**Established color semantics (from plan — must be honored):**
- Amber/orange: source schema nodes (nation-specific systems)
- Blue/indigo: master ontology nodes (NATO common schema)
- Dashed green: mapping edges between source and master
- These are functional colors, not decorative — keep them consistent throughout the UI

**Light mode only.** Clean white canvas with high contrast. No dark mode needed.

**Anti-references:** Legacy Windows enterprise UI (dense toolbars, gray backgrounds, small fonts). Academic/research-tool aesthetic (unstyled, utilitarian). Avoid anything that looks like it was built in 2010.

**Typography:** Strong hierarchy. Clear distinction between headings, labels, and code. Monospace for all RDF/SPARQL/JSON content (code editors and inline code).

**shadcn/ui preset:** `bcivVKZU` — custom color/font/radius configuration. Phosphor Icons as the icon library.

### Design Principles

1. **Signal over noise.** Every color, border, and visual element should carry meaning. The amber/blue/green color coding is a data language — reinforce it everywhere. Remove anything that doesn't communicate.

2. **Technical credibility.** The tool is used in front of stakeholders who need to trust it. Visual polish, consistent spacing, and professional typography signal that the underlying technology is serious.

3. **Clarity at every layer.** A defense analyst and a non-technical stakeholder are both looking at the screen. The UI must make the workflow legible to both — labels, status indicators, and empty states should be self-explanatory without requiring Semantic Web knowledge.

4. **Canvas-first layout.** The node graph is the primary interface. Everything else (panels, tabs, toolbars) is secondary. Give the canvas maximum breathing room and keep peripheral controls minimal.

5. **Educational without being condescending.** Contextual tooltips and onboarding exist to teach, not to apologize for complexity. Write them with the confidence of a technical expert explaining something important — not a help desk apologizing for a confusing UI.
