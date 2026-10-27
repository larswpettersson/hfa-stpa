# Guided STPA analysis in the workbench — implementation plan

Goal: the workbench should **guide** an STPA analysis one step at a time instead of asking the model to do the whole analysis at once. The analyst decides what is accepted, and the LLM proposes, asks and reviews.

Out of scope: a separate scope picker. Scope stays the Shift+click selection in the diagram, as it works today.

All changes are in `workbench/index.html` (single file, no build step) and its README. Tests go in `hfa-ds/tests/stpa/`.

## STPA steps the tool follows

Based on the STPA Handbook (Leveson & Thomas 2018):

| Step | Content | Stored in |
|---|---|---|
| 1 Purpose | Losses, system-level hazards (→ losses), system-level constraints (→ hazards) | `losses`, `hazards`, `constraints` |
| 2 Control structure | Controllers and their responsibilities, control actions, feedback, process models, actuators, sensors | existing sections + `responsibilities` |
| 3 UCAs | For each control action, all four types, each with a context and linked hazards. Cells that are not hazardous get a rationale. | `ucas`, `uca_reviews` |
| 4 Loss scenarios | 4a: why the controller issues the UCA. 4b: why a correct action is not carried out, or carried out wrongly | `scenarios` |
| 5 Constraints and requirements | A controller constraint for each UCA, a requirement or mitigation for each scenario | `controller_constraints`, `requirements` |

## Today and the gaps

- `DEFAULT_SYSTEM_PROMPT` lists all four method steps, and `QUICK_ACTIONS` ask for "every control action" / "each controller". The model therefore runs ahead of the analyst.
- Model output can be applied as a patch, but it is applied as accepted fact. Nothing marks it as a proposal.
- There is nowhere to store "considered, not hazardous", scenarios, controller constraints or requirements. So the tool can't show progress or continue where the analyst stopped.

## Phase 0 — Editing the structure (done)

- **Switch to**: a process block can change type (controller, controlled process, actuator, sensor), from **Switch to…** in the selection bar or the **Type** column of the blocks table.
  - The id, name and links stay.
  - Fields that only the old type has go into `switched_from`, and they come back when the block is switched back.
  - The model can do the same with a patch: `remove` now runs before the merge, so removing an id and adding it to another section switches its type. The system prompt explains this.
- **Structure tables** (blocks, control actions, feedback) are where text is typed and added.
  - Clicking an element in the diagram opens its row and focuses its name or labels.
  - A change is one undoable edit of the JSON.
  - New rows start from the selection.
  - Deleting a block deletes its links.
- **Several labels**: a control action's `action` and a feedback's `signal` can be a list. Each label is typed on its own line, and the diagram stacks the labels.
- **Layout**:
  - Every view has Compress and Expand.
  - The panels split ¼ to ¾ with a draggable, keyboard-accessible divider and ⇤ ⇥ buttons, so the control structure can take ⅔ or ¾ with the analysis in view.
  - The state is saved in the browser.
- Tests: `hfa-ds/tests/stpa/structure-tables.spec.mjs`, plus the switch test in `scope.spec.mjs`.

Later phases build on this: the worksheets in Phases 3 and 5 are new views with the same Compress/Expand controls, and they edit the JSON the same way the structure tables do (`editStructure`).

## Phase 1 — Data model for step-wise work

Schema additions (all optional, so existing files stay valid):

```jsonc
{
  "controllers": [{ "id": "c1", "responsibilities": ["R1: …"], … }],
  "ucas":        [{ "id": "UCA-1", …, "status": "proposed" | "accepted" | "rejected", "rationale": "…", "stale": true }],
  "uca_reviews": [{ "id": "UR-1", "control_action": "ca1", "type": "wrong_duration",
                    "rationale": "Braking cannot be applied too long: …", "status": "accepted" }],
  "scenarios":   [{ "id": "LS-1", "uca": "UCA-1", "kind": "4a" | "4b",
                    "factor": "process_model" | "feedback" | "algorithm" | "input" | "actuator" | "process" | "other_controller",
                    "description": "…", "status": "…" }],
  "controller_constraints": [{ "id": "CC-1", "ucas": ["UCA-1"], "description": "…", "status": "…" }],
  "requirements": [{ "id": "REQ-1", "scenarios": ["LS-1"], "description": "…", "status": "…" }]
}
```

Rules:
- A missing `status` means `accepted`, so presets and existing files keep working.
- `status` and `rationale` apply to every analysis item: losses, hazards, constraints, UCAs, reviews, scenarios, controller constraints, requirements.
- A cell (control action × UCA type) is **considered** when it has a UCA or a `uca_review` that is not rejected.

Code changes:
- Section 2: `validateModel` checks the new references (scenario → UCA, CC → UCA, REQ → scenario, review → control action), valid `kind`/`factor`/`status` values, and duplicate `(control_action, type)` reviews.
- `STRUCT_KEYS` gets the new sections, so patches and `remove` work for them.
- `buildLinkGraph` gets the new edges, so the trace highlight follows UCA → scenario → requirement.
- Update the data-model comment at the top of section 2, the README and `STRUCTURE_PROMPT`.

Tests: validation of each new reference, and a patch that adds and removes each new section.

## Phase 2 — Step rail and step prompts

UI: a step rail at the top of the Analysis panel replaces the quick-action row:

```
[1 Purpose ✓] [2 Structure ✓] [3 UCAs ◐ 9/24] [4 Scenarios ○] [5 Constraints ○]
```

- The active step is saved in `localStorage` (guarded, like the selection).
- Each step has a progress figure computed from the model:
  - 1: every hazard links to a loss and has a constraint.
  - 2: no validation errors or open loops, and every controller has responsibilities and process-model variables.
  - 3: considered cells / all cells.
  - 4: accepted UCAs with at least one 4a and one 4b scenario.
  - 5: accepted UCAs with a controller constraint, and scenarios with a requirement.
- The active step decides which worksheet is shown (Phases 3 and 5) and which buttons appear.

Prompts: `QUICK_ACTIONS` becomes `STEPS = [{ id, label, progress(m), actions: [[label, prompt]], contract }]`.

- `contract` is added to the user turn after `scopePreamble`. Example for step 3: *"Work on STPA step 3 only. Return a patch with only `ucas` and `uca_reviews`. Do not write scenarios, constraints or requirements."*
- A new constant appended after the system prompt (as `STRUCTURE_PROMPT` is, so saved custom prompts get it too) says:
  - Do only the step that the user turn names.
  - Every item you add has `"status": "proposed"`.
  - Never change or re-propose items with `status` `accepted` or `rejected`. Read the `rationale` of rejected items.
- Change `DEFAULT_SYSTEM_PROMPT`: the "Method" list stays as background, but the closing instruction no longer asks for all of it.
- The free-text chat stays and is sent with the active step's contract. A "No step" option in the rail sends it without one, as today.

Tests (with `mockClaude` from `scope.spec.mjs`): switching steps changes the buttons, the contract is in the request, and a progress figure updates after editing the JSON.

## Phase 3 — UCA worksheet (step 3)

UI: in step 3, a matrix sits between the step rail and the chat (resizable split, chat below):

| Control action | Not provided | Provided | Too early / late / order | Too long / short |
|---|---|---|---|---|
| ca1 ApplyBrakingForce (c1 → p1) | UCA-1 ✓ | UCA-2 ◌ | — | not hazardous ✓ |

- **Rows come from the selection.** If a controller is selected, the rows are its control actions. If a process (or actuator) is selected, they are the control actions that reach it, also through an actuator. A selected control action gives that row only. Nothing selected gives all control actions, grouped by controller under collapsible headings. This gives "UCAs for one controller" without a new picker.
- **Cell states**:
  - empty: not considered
  - ◌: proposed (dashed outline)
  - ✓: accepted
  - rejected: hidden; a toggle shows them
- **Clicking a cell** opens a small editor: add a UCA (context, hazard chips), or mark the cell "not hazardous" with a rationale.
- **Per-cell buttons**:
  - **Suggest** asks only for that cell, sending the control action, the type and the controller's process model.
  - **Ask me** makes the model ask the analyst 2–3 questions about the cell instead of answering.
  - **Review** critiques what is in the cell: vague contexts, missing hazard links, duplicates.
- **Row and column buttons**: **Suggest row** / **Suggest column**, for analysts who want bigger steps.
- **Cell threads**: a cell keeps its own short chat thread, so "Ask me" can continue without the global "Send earlier turns". The thread is held in memory only, keyed by `ca:type`.
- The safety-case UCA table stays and gets a status column.

Code: a new section 3c "Worksheets". `renderWorksheet(m)` is called from `refreshEditor` next to `renderSafetyCase`, and the cell editor writes to the JSON through `replaceEditor`, so Ctrl/⌘+Z works.

Tests:
- Row filtering for controller, process, actuator and control-action selections.
- The coverage count.
- Suggest sends only that cell.
- The cell editor writes a `uca_reviews` entry.

## Phase 4 — Proposals: accept, edit, reject

- **Model output**: `applyPatch(base, patch, { fromModel: true })` sets `status: "proposed"` on new items that have no status.
- **Changes to existing items**: the apply card lists each change (add / change / remove) with a checkbox and applies only the ticked ones.
- **Proposed rows** in the worksheets and safety-case tables get **Accept / Edit / Reject**. Reject asks for an optional rationale.
- **Bulk action**: an "Accept all proposed in view" button.
- **Rejected items** stay in the JSON. They are hidden by default in tables, and the model sees them through the structure and is told not to re-propose them.
- **Diagram**: proposed elements (for example a proposed feedback path) are drawn ghosted (lower opacity, dashed outline).

Tests:
- Model patches get `proposed` status.
- Unticked changes are not applied.
- Accept and reject set the status, and reject keeps the rationale.

## Phase 5 — Scenarios and constraints worksheets (steps 4 and 5)

- **Step 4**: select an accepted UCA (in the matrix or the safety-case table). A scenario panel shows the causal-factor slots:
  - 4a: control algorithm, process model, feedback, inputs from other controllers
  - 4b: actuator / control path, controlled process, other controllers

  The diagram highlights the loop involved: controller, the control action, the feedback path, actuator and sensor. Suggest / Ask me / Review work per slot, as in Phase 3.
- **Step 5**: a two-part table:
  - accepted UCAs → controller constraint
  - scenarios → requirement / mitigation

  Each row has Suggest. Rows without a constraint or requirement count as open in the progress figure.
- The safety-case area gets **Loss scenarios**, **Controller constraints** and **Requirements** tables, reusing `buildScTable` and the link graph.

## Phase 6 — Progress, next gap and iteration

- **Badges on diagram blocks**: a controller shows `3/8`, its considered cells out of all cells. They use the theme tokens and must stay readable in both themes (see the `penpot-color-a11y` rules in hfa-ds).
- **Next gap** in the step rail jumps to the next open item of the active step: an empty cell, a UCA without scenarios, or a scenario without a requirement.
- **Stale marking**: when a structure edit changes a control action, its feedback, or a controller's process model, the UCAs, reviews and scenarios that depend on it get `stale: true` and a "review" marker. Accepting or editing the item clears the marker. `refreshEditor` compares the previous and new model by id to find what changed.

## Order and dependencies

1. Phase 1 (data model) comes first, because everything else depends on it.
2. Phase 2 (step rail and prompts) already reduces "do everything" behaviour without new worksheets.
3. Phases 3 and 4 together give the main use case: UCAs for one controller, one cell at a time, with the analyst accepting each item.
4. Phase 5, then Phase 6.

For each phase:
- Update `workbench/README.md`.
- Add specs under `hfa-ds/tests/stpa/`.
- Run `npm test` in hfa-ds. The shared clean-load and token checks also cover any new colours.
