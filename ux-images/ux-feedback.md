## 🎯 Goal: Standardize Technical Panel Hierarchy

Transition from arbitrary vertical splits and mixed button styles to a predictable, top-down "Accordion Stack" that preserves canvas focus.

---

## 🛠️ Component Mapping Table

| Current UI Element          | Shadcn/UI Component                      | Why?                                                                                                |
| :-------------------------- | :--------------------------------------- | :-------------------------------------------------------------------------------------------------- |
| **Main Top Tabs**           | `<Tabs />`                               | Standardizes workflow steps. Use the `line` variant.                                                |
| **Fused/Export Buttons**    | `<TabsList />` (Secondary)               | Styled as a "segmented control" to show mutually exclusive modes.                                   |
| **Vertical Split Views**    | `<Accordion type="multiple" />`          | Allows users to expand/collapse sections. `multiple` allows seeing both RML and YARRRML if desired. |
| **Data Lists/Previews**     | `<ScrollArea />`                         | Prevents the entire panel from scrolling; keeps headers sticky at the top.                          |
| **Download/Copy Actions**   | `<Button variant="ghost" size="icon" />` | Moves actions into the Accordion header to reduce visual noise in the code block.                   |
| **Transform & Fuse Action** | `<Button variant="default" />`           | Uses the primary brand color to signal the "Main Event" of the tab.                                 |
| **Panel Resize/Hide**       | `<ResizablePanelGroup />`                | Provides a native feel for adjusting the workspace-to-code ratio.                                   |

---

## 🏗️ Proposed Layout Architecture

### 1. The Container (Layout)

Use the **Resizable** component to wrap your Canvas and Right Panel. This gives the user agency over their screen real estate.

- **Component:** `ResizablePanelGroup` with `direction="horizontal"`.
- **Pro Tip:** Add a `ResizableHandle` with a visible track to signify it's draggable.

### 2. Navigation & Sub-Navigation

In the right panel, use a nested Tab structure to distinguish between "Where I am" and "How I'm looking at it."

- **Primary:** `<Tabs />` at the very top.
- **Secondary:** Inside the `Output` content, use a second `<TabsList />` styled as a pill/segmented control to toggle between **Fused** and **Export** views. This is much cleaner than the current floating buttons.

### 3. Content Stacking (The "Accordion" Pattern)

Instead of forcing a 50/50 split (e.g., JSON on top, Schema on bottom), use the **Accordion**.

- **Header:** Put the title (e.g., "RML Preview") and the `<Button variant="ghost" />` icons for Download/Copy in the `AccordionTrigger`.
- **Content:** Wrap your code block in a `<ScrollArea className="h-[300px]" />`. This ensures that even if the JSON is 1,000 lines long, it doesn't break the layout of the rest of the panel.

### 4. Code Blocks

Use a styled `<pre>` or a dedicated code component inside the `ScrollArea`.

- **Styling:** Give it a subtle background (`bg-muted`) and rounded corners (`rounded-md`) to separate the "technical data" from the UI "chrome."

---

## 💡 UX Philosophy: "Progressive Disclosure"

By using the **Accordion** and **Tabs**, you are practicing progressive disclosure. You aren't hiding information; you're just making sure the user only sees what they are currently processing.

- **Default State:** On the "Output" tab, you might have **RML Preview** expanded by default and **YARRRML** collapsed.
- **Contextual Actions:** Don't show "Download" until the user has actually generated the output. Use Shadcn's `<Skeleton />` state while the transformation is running.
