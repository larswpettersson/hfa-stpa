# STPA — System-Theoretic Process Analysis

**🔗 Live workbench: [larswpettersson.github.io/hfa-stpa/workbench/](https://larswpettersson.github.io/hfa-stpa/workbench/)**

📖 Workbench docs: [workbench/README.md](https://github.com/larswpettersson/hfa-stpa/blob/main/workbench/README.md)

This repository supports **STPA** (System-Theoretic Process Analysis) work for HFA safety and systems engineering: documenting control structures, unsafe control actions (UCAs), loss scenarios, and countermeasures.

STPA complements other HFA analysis artifacts (e.g. [Bowtie](https://github.com/larswpettersson/hfa-bowtie), [RBD](https://github.com/larswpettersson/hfa-rbd), [HTA Tool](https://github.com/larswpettersson/hfa-hta)) by focusing on feedback loops, controllers, and systemic causes of unsafe behavior rather than component failure alone.

## The HFA tools

Human Factors Analysis (HFA) tools for safety and human factors work. Each tool is a separate repository and runs in the browser without installation, a server or an account. Nothing leaves the browser unless you export it, and the tools also work in isolated (air-gapped) environments through their single-file offline versions. All tools are under development; file formats may change.

| Tool | What it does | Links |
|---|---|---|
| **HTA** | Hierarchical Task Analysis with Tabular Task Analysis (TTA / HEI fields): a task tree and a linked table, JSON and CSV export. | [Open](https://larswpettersson.github.io/hfa-hta/HTA.html) · [offline file](https://larswpettersson.github.io/hfa-hta/hta_offline.html) · [repository](https://github.com/larswpettersson/hfa-hta) |
| **Bowtie** | Bowtie diagrams: causes, preventive and reactive barriers, top event and consequences, with printing to one A4 page. | [Open](https://larswpettersson.github.io/hfa-bowtie/Bowtie.html) · [offline file](https://larswpettersson.github.io/hfa-bowtie/Bowtie_offline.html) · [repository](https://github.com/larswpettersson/hfa-bowtie) |
| **STPA Workbench *(this repository)*** | System-Theoretic Process Analysis: a control-structure diagram built directly in the diagram, tables for losses, hazards, unsafe control actions and safety constraints, and optional AI support. | [Open](https://larswpettersson.github.io/hfa-stpa/workbench/) · [offline file](https://larswpettersson.github.io/hfa-stpa/workbench/stpa_offline.html) · [repository](https://github.com/larswpettersson/hfa-stpa) |
| **RBD (Reliability Block Diagram)** | Reliability block diagrams. Early design stage, not runnable yet. | [repository](https://github.com/larswpettersson/hfa-rbd) |
| **HFA DS** | The design system: design tokens, the Penpot library, the design principles and the shared automated tests. Contains no runnable application. | [repository](https://github.com/larswpettersson/hfa-ds) · [architecture](https://github.com/larswpettersson/hfa-ds/blob/main/docs/ARCHITECTURE.md) · [design principles](https://github.com/larswpettersson/hfa-ds/blob/main/docs/design-principles.md) |

The AI support in the tools is optional. With a local model (Ollama, LM Studio, LocalAI) no data leaves the computer; a cloud provider (Claude, Gemini, Hugging Face) receives the analysis and any attached image. The full picture is in the [architecture](https://github.com/larswpettersson/hfa-ds/blob/main/docs/ARCHITECTURE.md).

## Repository layout

| Path | Purpose |
|------|---------|
| `docs/` | Reference material, workshop notes, exported diagrams |
| `analysis/` | STPA models and working artifacts (control diagrams, UCA tables, scenarios) |
| `workbench/` | Single-file STPA control-structure editor with LLM analysis. See [workbench/README.md](https://github.com/larswpettersson/hfa-stpa/blob/main/workbench/README.md#run) for how to run it |

## Design system

Shared tokens and Penpot integration live in [hfa-ds](https://github.com/larswpettersson/hfa-ds). Use the same conventions as sibling HFA projects when building viewers or editors here.

### Tokens (Penpot file-local)

STPA’s Penpot file is synced from [`hfa-ds/tokens.json`](https://github.com/larswpettersson/hfa-ds/blob/main/tokens.json) (HFA DS token contract):

1. Connect **STPA** in Penpot MCP  
2. Run hfa-ds `scripts/penpot/import-bundle.js` (or flatten `tokens.json` → upsert `mode/light` + `mode/dark`)  
3. Keep **mode/light** active while drafting  

**Penpot note:** `brand.primary` and `brand.primary.subtle` cannot both be leaf tokens (path conflict). STPA keeps `brand.primary` and stores the subtle tint as `brand.primary-subtle`.

### Penpot components (STPA file)

On page **Control Model — Draft**:

| Component | Role |
| --- | --- |
| Controller, Actuator, Sensor, Controlled Process | Control-loop nodes |
| **Group Identity Frame** | System / subsystem boundary — thin `#0D1117` stroke, **`background.sunken`** fill (`#E6EDF3` light), 8px radius, top-left **Label**. `clipContent` off so lines can cross the border |
| **Connector Control** | Control channel — **solid** stroke + arrow |
| **Connector Feedback** | Information / feedback channel — **dashed** stroke + arrow |

Draft paths follow the same rule: control-related links solid; `Process feedback`, `Feedback`, and `Controller communication` dashed. See **Connector legend** on the page.

An example board **Example — Vehicle group identity frame** shows Vehicle-style grouping with nested system blocks.

### Example — Pharma control structure

Page **Example — Pharma control structure** recreates the published US pharmaceutical / FDA STPA control structure using the **main components from Control Model — Draft**:

| Draft component | Use on Pharma example |
| --- | --- |
| **Controller** | Authorities / hierarchy (Congress, FDA offices, business leaders, …) |
| **Actuator** | Actuation-like roles (e.g. sales/marketing, trade associations) |
| **Sensor** | Information / pressures (public & industry pressures, journals, …) |
| **Controlled Process** | Patient / insurance (and similar controlled entities) |
| **Group Identity Frame** | Boundaries: FDA, Academically-affiliated researchers, Pharmaceutical companies, Patients |
| **Connector Control** / **Connector Feedback** | Legend samples (solid control · dashed information) |

Routed diagram links are **paths** (solid = control, dashed = information) with key labels (budget, approvals, prescriptions, adverse events, …), matching the Draft connector stroke rule.

## Getting started

- **Use the workbench:** open the [live version](https://larswpettersson.github.io/hfa-stpa/workbench/), or see [workbench/README.md](https://github.com/larswpettersson/hfa-stpa/blob/main/workbench/README.md#run) to run it offline.
- **Add analysis work:** put control-structure and UCA artifacts under `analysis/`. Keep sensitive or environment-specific values out of git.

## Related projects

- **hfa-ds** — design tokens and Penpot scripts
- **Bowtie** — bowtie diagram editor
- **RBD** — reliability block diagrams
- **HTA Tool** — hierarchical task analysis

## License

[MIT](LICENSE) © 2026 Lars Pettersson
