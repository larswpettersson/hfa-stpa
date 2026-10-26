# HFA STPA Workbench

A single-file, zero-dependency tool for editing an STPA (System-Theoretic Process Analysis) control structure and analysing it with an LLM. You can use Anthropic Claude, Google Gemini or a local model (Ollama, LM Studio, LocalAI).

## Run

Open `index.html` in a browser. It works from `file://` or any static server (for example `python3 -m http.server`). There is no build step and nothing to install.

## What it does

- **Editor (left):** a JSON editor for the control structure. It loads presets (AEB, railway level crossing, insulin pump), validates live and draws a layered SVG diagram. Control actions point down; feedback points up as dashed lines. Lines are horizontal or vertical only: each controller pair gets a channel with the control line on the left and the feedback line beside it, and boxes widen so those channels run straight (as in the Penpot UC759 example). Labels move along their line to avoid boxes, other labels and other lines wherever there is room.
  - Validation catches duplicate ids, dangling `source`/`target` references, feedback that doesn't point to a controller, open control loops (a control action with no feedback path back), controllers without process-model variables, and dangling or malformed `ucas` entries (unknown `control_action`/hazard ids, invalid `type`).
  - **Safety case (below the diagram):** collapsible tables for Losses, Hazards, Unsafe Control Actions and Safety constraints, generated from the same JSON. Click a row or an id chip to highlight everything it's linked to — losses ↔ hazards ↔ constraints, hazards ↔ UCAs — across all four tables and on the matching control-action line in the diagram.
- **Analysis (right):** a chat with the selected model. Every request includes the STPA system prompt and the current structure. Quick actions:
  - Identify UCAs
  - Loss scenarios
  - Check feedback latency
  - Process-model flaws
  - Suggest reconfiguration
  - Safety constraints

  Any JSON structure the model proposes gets a **Load into editor** button, and a structure *patch* gets **Apply to editor**. You can export the conversation as Markdown.
- **Selection and scope:** Shift+click process blocks (controllers, processes, actuators, sensors), control actions or feedback in the diagram to select them. Hover and selected follow the Penpot *Process Block* variants: Hovered has a 4/4 drop shadow, Selected has a 4 px halo. The bar under the diagram lists the selection. When something is selected, each question still sends the whole structure as context, but tells the model to focus on the selected elements and to return changes as a patch.
- **Standalone questions:** each question is sent with the structure and its scope only, not the earlier chat. Tick **Send earlier turns** above the chat for follow-ups that need it.
- **Model per question:** the picker beside **Send** lists the provider's models (Claude: Fable, Opus, Sonnet and Haiku with their versions). The next question uses the model you pick. Each answer shows the model, the time and the token counts.
- **Actuators and sensors:** select control actions that end at a controlled process and press **Convert to actuator**. The tool inserts an actuator (controller → actuator → process). **Convert to sensor** does the same for feedback that starts at a process (process → sensor → controller). The control-action and feedback ids stay the same, so UCAs keep their links. **Back to control action** and **Back to feedback** undo the conversion: select an actuator (or a control action that ends at one) and the control action goes straight to the process again. A sensor works the same way for feedback. An actuator or sensor that nothing points at any more is removed. Ctrl/⌘+Z in the editor undoes a conversion or an applied patch.
- **Follow Penpot selection:** the diagram copies the style of whatever is selected in Penpot and keeps updating while the link is on (see [Penpot live style](#penpot-live-style)).
- **Settings drawer:** holds the API key, model and endpoint for each provider, plus Claude effort and refusal fallback, MCP options, an editable system prompt and key storage.

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
  "control_actions": [{ "id": "ca1", "source": "c1", "target": "p1", "action": "…", "parameters": ["…"] }],
  "feedback":        [{ "id": "fb1", "source": "p1", "target": "c1", "signal": "…", "latency_tolerance_ms": 20 }],
  "actuators": [{ "id": "a1", "name": "…", "target": "p1", "actuation": "…", "converted_from": "ca1" }],
  "sensors":   [{ "id": "s1", "name": "…", "source": "p1", "measures": "…",  "converted_from": "fb1" }]
}
```

A control action can target an actuator, and feedback can come from a sensor. The actuator acts on its `target` process and the sensor measures its `source` process, so the loop counts as closed. The diagram puts actuators and sensors in a row between the controllers and the processes.

**Patches.** To save output tokens, the model is asked to return only what changes:

```json
{ "patch": true, "controlled_processes": [{ "id": "p1", "name": "Vehicle Braking System" }], "remove": ["ca2"] }
```

An element whose id already exists is merged into that element. A new id is added, and ids listed in `remove` are deleted.

`losses`, `hazards`, `constraints`, `ucas` and `level` are optional. A control action can target another controller, which is how you model hierarchical structures. When `level` is missing, the diagram ranks a controller from the control actions that point at it. Each `ucas` entry is one of STPA's four unsafe-control-action types for one control action, and `hazards` traces it back to the hazard(s) it can cause.

## Providers

| Provider | Endpoint | Notes |
|---|---|---|
| Claude | `https://api.anthropic.com/v1/messages` | Sends `anthropic-dangerous-direct-browser-access: true`. Default model `claude-opus-5-5`. Streams the response; **Max output tokens** (default 64000) is capped at the model's limit. Effort is sent only to models that accept it, and server-side refusal fallback (`fallbacks: "default"`) only to Fable 5.1, Opus 5.5, Opus 5 and Sonnet 5.5. The system prompt and structure are prompt-cached. |
| Gemini | `…/v1beta/models/{model}:generateContent` | The key goes in the `x-goog-api-key` header, not the URL. |
| Local | `http://localhost:11434/v1/chat/completions` | The endpoint path picks the format: OpenAI-compatible, or Ollama native `/api/chat` or `/api/generate`. For Ollama from `file://`, start it with `OLLAMA_ORIGINS=*`. |

API keys stay in this browser's `localStorage`, and only if "Remember API keys" is ticked. They are sent only to the provider you select. Use restricted keys, because anyone with access to this browser profile can read them.

## MCP

Browsers can't start stdio MCP servers, so the page uses MCP's JSON-RPC 2.0 messages in two ways:

1. **Local tools** (`get_control_structure`, `validate_control_structure`, `list_control_loops`, `propose_reconfiguration`) are defined as MCP `Tool` objects and run inside the page. The model calls one by replying with a fenced `mcp` block that contains a `tools/call` request. This works with every provider.
2. **Remote tools** go through an MCP-over-SSE gateway. Put its URL in Settings → MCP and press **Connect**. Example:

   ```bash
   npx -y supergateway --stdio "npx -y @modelcontextprotocol/server-filesystem ./" --port 8808 --cors
   # then use http://localhost:8808/sse
   ```

   The model sees remote tools alongside the local ones, and calls to them are forwarded over the bridge. Comments in `index.html` (section 5) cover the transport and how to adapt it to Streamable HTTP.

## Penpot live style

**Follow Penpot selection** (under the diagram) makes the diagram copy the style of the object selected in Penpot. While the link is on, the page checks the selection every few seconds, so selecting a different board or component restyles the diagram.

How it works:
1. The page calls the Penpot MCP server's `execute_code` tool, using MCP's Streamable HTTP transport.
2. The code it runs reads `penpot.selection` and searches the selected shapes for the STPA components by layer or component name.
3. Each match's fill, stroke, dash style, corner radius, size and font is applied to the matching part of the diagram:

| Penpot component | Applied to |
|---|---|
| Controller | Controller boxes |
| Controlled Process | Controlled-process boxes |
| Connector Control | Control-action arrows |
| Connector Feedback | Feedback arrows |
| Group Identity Frame | A system boundary around the whole diagram, labelled with `system` |

If the selection contains none of these components, its own style is used for every box. **Reset style** goes back to the theme colours. The last style is saved in this browser, so the diagram looks the same after a reload.

### Setup

The hosted Penpot MCP doesn't allow requests from a web page (no CORS headers), and its URL contains your user token. Run the included relay, which has no dependencies:

```bash
cd workbench
PENPOT_MCP_URL=<your Penpot MCP user token> node penpot-relay.mjs   # listens on http://127.0.0.1:4410/mcp
```

`PENPOT_MCP_URL` is the same value that `hfa-ds/.mcp.json` uses. You can also give it a full MCP URL, for example a local Penpot MCP server. Leave **Settings → Penpot MCP URL** at its default (`http://127.0.0.1:4410/mcp`).

In Penpot, open the STPA file and make sure its MCP connection is active. Select the **Control Model — Draft** board, or any of the components, then press **Follow Penpot selection**.
