# HFA STPA Workbench

**🔗 Live: [larswpettersson.github.io/hfa-stpa/workbench/](https://larswpettersson.github.io/hfa-stpa/workbench/)**

A zero-dependency tool for editing an STPA (System-Theoretic Process Analysis) control structure and analysing it with an LLM. The analysis panel is the AI panel shared by all HFA tools (`ai-assist.js`): Anthropic Claude, Google Gemini, Hugging Face or a local model (Ollama, LM Studio, LocalAI).

## Run

Use the [live version](https://larswpettersson.github.io/hfa-stpa/workbench/), or run it locally. There is no build step and nothing to install:

- **One file, offline:** download [`stpa_offline.html`](https://larswpettersson.github.io/hfa-stpa/workbench/stpa_offline.html) (right-click → *Save link as…*) and open the saved file in a modern browser. It is `index.html` with `ai-assist.js` inlined.
- **From a clone:** open `workbench/index.html` directly (`file://`; it loads `ai-assist.js` from the same folder), or serve the folder with `python3 -m http.server` and open `http://localhost:8000/`.

`ai-assist.js` is a copy of `hfa-ds/scripts/ai-panel/ai-assist.js`, shared with HTA and Bowtie. Do not edit it here; STPA's own part (system prompt, schema, quick actions, how a proposal is applied) is the `HFAAssist.mount({…})` call at the end of `index.html`. `stpa_offline.html` is built with `npm run build:offline` in hfa-ds.

The editor, diagram and safety-case tables work without a model. To use the analysis chat:

1. Open **Settings…** in the AI panel and pick a provider: Claude, Gemini, Hugging Face or Local (see [Providers](#providers)).
2. Paste an API key for Claude or Gemini. For Local, check the endpoint and start the model server.
3. Load a preset or paste your own structure into the editor, then press a quick action or type a question.

## What it does

- **Editor (left):** a JSON editor for the control structure. It loads presets (AEB, railway level crossing, insulin pump), validates live and draws a layered SVG diagram. Control actions point down; feedback points up as dashed lines. Lines are horizontal or vertical only: each controller pair gets a channel with the control line on the left and the feedback line beside it, and boxes widen so those channels run straight (as in the Penpot UC759 example). Labels move along their line to avoid boxes, other labels and other lines wherever there is room.
  - Validation catches duplicate ids, dangling `source`/`target` references, feedback that doesn't point to a controller, open control loops (a control action with no feedback path back), controllers without process-model variables, and dangling or malformed `ucas` entries (unknown `control_action`/hazard ids, invalid `type`).
  - **Blocks, control actions and feedback (below the diagram):** editable tables for the structure. Click a block, control action or feedback in the diagram and its row opens with the cursor in its name or labels. You can type a new name, labels (one per line), process-model variables, assumptions, states, what an actuator acts on or a sensor measures, a link's source and target, and a feedback's latency. **+ Controller**, **+ Controlled process**, **+ Actuator**, **+ Sensor**, **+ Control action** and **+ Feedback** add rows. A new control action or feedback starts at the selected blocks if there are any. ✕ deletes a row; deleting a block also deletes its control actions and feedback. Each change is written to the JSON as one edit, so **Undo** (or Ctrl/⌘+Z in the JSON) reverts it. The tables also show a structure that has validation errors, so you can fix it there.
  - **Safety case (below the structure tables):** collapsible tables for Losses, Hazards, Unsafe Control Actions and Safety constraints, generated from the same JSON. Click a row or an id chip to highlight everything it's linked to — losses ↔ hazards ↔ constraints, hazards ↔ UCAs — across all four tables and on the matching control-action line in the diagram.
- **AI panel (right):** a chat with the selected model. It is open by default; the icon button in its header hides it and moves to the right end of the toolbar (design principle 4.7). Enter sends and Shift+Enter gives a new line. Every request includes the STPA system prompt and the current structure. Quick actions:
  - Identify UCAs
  - Loss scenarios
  - Check feedback latency
  - Process-model flaws
  - Suggest reconfiguration
  - Safety constraints

  Any JSON structure the model proposes gets a **Load into editor** button, and a structure *patch* gets **Apply to editor**. You can export the conversation as Markdown.
- **Layout:** each view (JSON, diagram, blocks/control actions/feedback, safety case) has **Compress**, which shrinks it to its bar (clicking the title does the same), and **Expand**, which lets it take the free height. The AI panel is resized by dragging its left edge. The layout is saved in this browser. **Full page** in the diagram legend shows the diagram on the whole page, scaled to fit; **Close** or Esc returns.
- **Selection and scope:** Shift+click process blocks (controllers, processes, actuators, sensors), control actions or feedback in the diagram to select them. Hover and selected follow the Penpot *Process Block* variants: Hovered has a 4/4 drop shadow, Selected has a 4 px halo. The bar under the diagram lists the selection. When something is selected, each question still sends the whole structure as context, but tells the model to focus on the selected elements and to return changes as a patch.
- **Standalone questions:** each question is sent with the structure and its scope only, not the earlier chat. Tick **Send earlier turns** in the panel for follow-ups that need it.
- **Model per question:** the picker beside **Send** lists the provider's models (Claude: Fable, Opus, Sonnet and Haiku with their versions). The next question uses the model you pick. Each answer shows the model, the time and the token counts.
- **Actuators and sensors:** select control actions that end at a controlled process and press **Convert to actuator**. The tool inserts an actuator (controller → actuator → process). **Convert to sensor** does the same for feedback that starts at a process (process → sensor → controller). The control-action and feedback ids stay the same, so UCAs keep their links.
- **Switch to:** select process blocks and choose a type in **Switch to…** in the selection bar, or change the **Type** column in the blocks table. A block can become a controller, a controlled process, an actuator or a sensor. Its id, name and links stay. Fields that only the old type has (for example an actuator's `target` and `actuation`) are kept under `switched_from`, and they come back when you switch back. You can also ask the model, for example "add an actuator between c1 and p1" and later "make a1 a controlled process": it does the switch with a patch. **Undo** reverts a conversion, a switch or an applied patch.
- **Settings…** (in the AI panel) holds the API key, model and endpoint for each provider, plus Claude effort and refusal fallback. At the bottom is the system prompt: it starts as STPA's own prompt, you can edit it, and **Reset** returns to it. Provider settings are shared with HTA and Bowtie when the tools are served from the same origin; the system prompt is per tool.

## Data model

```jsonc
{
  "system": "…",
  "losses":       [{ "id": "L1", "description": "…" }],
  "hazards":      [{ "id": "H1", "description": "…", "losses": ["L1"] }],
  "constraints":  [{ "id": "SC1", "description": "…", "hazards": ["H1"] }],
  "ucas":         [{ "id": "UCA-1", "control_action": "ca1",
                     "type": "not_provided" | "provided_unsafe" | "wrong_timing" | "wrong_duration",
                     "context": "…", "hazards": ["H1"] }],
  "controllers":  [{ "id": "c1", "name": "…", "level": 0,
                     "process_model": { "variables": ["…"], "assumptions": ["…"] } }],
  "controlled_processes": [{ "id": "p1", "name": "…", "states": ["…"] }],
  "control_actions": [{ "id": "ca1", "source": "c1", "target": "p1", "action": "…" | ["…", "…"], "parameters": ["…"] }],
  "feedback":        [{ "id": "fb1", "source": "p1", "target": "c1", "signal": "…" | ["…", "…"], "latency_tolerance_ms": 20 }],
  "actuators": [{ "id": "a1", "name": "…", "target": "p1", "actuation": "…", "converted_from": "ca1" }],
  "sensors":   [{ "id": "s1", "name": "…", "source": "p1", "measures": "…",  "converted_from": "fb1" }]
}
```

A control action can target an actuator, and feedback can come from a sensor. The actuator acts on its `target` process and the sensor measures its `source` process, so the loop counts as closed. The diagram puts actuators and sensors in a row between the controllers and the processes.

**Patches.** To save output tokens, the model is asked to return only what changes:

```json
{ "patch": true, "controlled_processes": [{ "id": "p1", "name": "Vehicle Braking System" }], "remove": ["ca2"] }
```

Ids listed in `remove` are deleted first. Then an element whose id already exists is merged into that element, and a new id is added. To switch an element's type, a patch removes the id and adds the complete element with the same id to the new section:

```json
{ "patch": true, "remove": ["a1"], "controlled_processes": [{ "id": "a1", "name": "Hydraulic unit", "states": ["Idle", "Pressurised"] }] }
```

`action` (control action) and `signal` (feedback) hold one label or a list of labels. The diagram stacks the labels of a list along the line.

`losses`, `hazards`, `constraints`, `ucas` and `level` are optional. A control action can target another controller, which is how you model hierarchical structures. When `level` is missing, the diagram ranks a controller from the control actions that point at it. Each `ucas` entry is one of STPA's four unsafe-control-action types for one control action, and `hazards` traces it back to the hazard(s) it can cause.

## Providers

| Provider | Endpoint | Notes |
|---|---|---|
| Claude | `https://api.anthropic.com/v1/messages` | Sends `anthropic-dangerous-direct-browser-access: true`. Default model `claude-opus-5-5`. Streams the response; **Max output tokens** (default 64000) is capped at the model's limit. Effort is sent only to models that accept it, and server-side refusal fallback (`fallbacks: "default"`) only to Fable 5.1, Opus 5.5, Opus 5 and Sonnet 5.5. The system prompt and structure are prompt-cached. |
| Gemini | `…/v1beta/models/{model}:generateContent` | The key goes in the `x-goog-api-key` header, not the URL. |
| Hugging Face | `https://router.huggingface.co/v1/chat/completions` | Inference Providers, OpenAI-compatible, with open models such as Gemma, Qwen and Llama. The key is a Hugging Face token. |
| Local | `http://localhost:11434/v1/chat/completions` | The endpoint path picks the format: OpenAI-compatible, or Ollama native `/api/chat` or `/api/generate`. For Ollama from `file://`, start it with `OLLAMA_ORIGINS=*`. |

API keys stay in this browser's `localStorage`. They are sent only to the provider you select. Use restricted keys, because anyone with access to this browser profile can read them.
