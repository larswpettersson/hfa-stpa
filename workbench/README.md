# HFA STPA Workbench

A single-file, zero-dependency tool for editing an STPA (System-Theoretic Process Analysis) control structure and analysing it with an LLM. You can use Anthropic Claude, Google Gemini or a local model (Ollama, LM Studio, LocalAI).

## Run

Open `index.html` in a browser. It works from `file://` or any static server (for example `python3 -m http.server`). There is no build step and nothing to install.

## What it does

- **Editor (left):** a JSON editor for the control structure. It loads presets (AEB, railway level crossing, insulin pump), validates live and draws a layered SVG diagram. Control actions point down; feedback points up as dashed lines.
  - Validation catches duplicate ids, dangling `source`/`target` references, feedback that doesn't point to a controller, open control loops (a control action with no feedback path back) and controllers without process-model variables.
- **Analysis (right):** a chat with the selected model. Every request includes the STPA system prompt and the current structure. Quick actions:
  - Identify UCAs
  - Loss scenarios
  - Check feedback latency
  - Process-model flaws
  - Suggest reconfiguration
  - Safety constraints

  Any JSON structure the model proposes gets a **Load into editor** button. You can export the conversation as Markdown.
- **Settings drawer:** holds the API key, model and endpoint for each provider, plus Claude effort and refusal fallback, MCP options, an editable system prompt and key storage.

## Data model

```jsonc
{
  "system": "…",
  "losses":       [{ "id": "L1", "description": "…" }],
  "hazards":      [{ "id": "H1", "description": "…", "losses": ["L1"] }],
  "constraints":  [{ "id": "SC1", "description": "…", "hazards": ["H1"] }],
  "controllers":  [{ "id": "c1", "name": "…", "level": 0,
                     "process_model": { "variables": ["…"], "assumptions": ["…"] } }],
  "controlled_processes": [{ "id": "p1", "name": "…", "states": ["…"] }],
  "control_actions": [{ "id": "ca1", "source": "c1", "target": "p1", "action": "…", "parameters": ["…"] }],
  "feedback":        [{ "id": "fb1", "source": "p1", "target": "c1", "signal": "…", "latency_tolerance_ms": 20 }]
}
```

`losses`, `hazards`, `constraints` and `level` are optional. A control action can target another controller, which is how you model hierarchical structures. When `level` is missing, the diagram ranks a controller from the control actions that point at it.

## Providers

| Provider | Endpoint | Notes |
|---|---|---|
| Claude | `https://api.anthropic.com/v1/messages` | Sends `anthropic-dangerous-direct-browser-access: true`. Default model `claude-opus-5-5`. Server-side refusal fallback is on by default (`anthropic-beta: server-side-fallback-2026-07-01`, `fallbacks: "default"`). |
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
