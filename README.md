# STPA — System-Theoretic Process Analysis

This repository supports **STPA** (System-Theoretic Process Analysis) work for HFA safety and systems engineering: documenting control structures, unsafe control actions (UCAs), loss scenarios, and countermeasures.

STPA complements other HFA analysis artifacts (e.g. [Bowtie](../Bowtie/), [RBD](../RBD/), [HTA Tool](../HTA-tool/)) by focusing on feedback loops, controllers, and systemic causes of unsafe behavior rather than component failure alone.

This repository is **private initially** while STPA models and workshop material are in early development. Make it public later only when content is ready to share outside the core team.

## Repository layout

| Path | Purpose |
|------|---------|
| `docs/` | Reference material, workshop notes, exported diagrams |
| `analysis/` | STPA models and working artifacts (control diagrams, UCA tables, scenarios) |

## Design system

Shared tokens and Penpot integration live in [hfa-ds](../hfa-ds/). Use the same conventions as sibling HFA projects when building viewers or editors here.

### Tokens (Penpot file-local)

STPA’s Penpot file is synced from [`hfa-ds/tokens.json`](../hfa-ds/tokens.json) (HFA DS token contract):

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

1. Add control-structure and UCA artifacts under `analysis/`.
2. Keep sensitive or environment-specific values out of git (see `.gitignore`).
3. When ready, create the GitHub remote as **private** and push (see [GitHub](#github) below).

## GitHub

Create the remote as a **private** repository:

```bash
gh auth login
gh repo create larswpettersson/STPA --private --source=. --remote=origin --push
```

When the project is ready for wider sharing, change visibility in GitHub settings or with:

```bash
gh repo edit larswpettersson/STPA --visibility public --accept-visibility-change-consequences
```

## Related projects

- **hfa-ds** — design tokens and Penpot scripts
- **Bowtie** — bowtie diagram editor
- **RBD** — reliability block diagrams
- **HTA Tool** — hierarchical task analysis

## License

[MIT](LICENSE) © 2026 Lars Pettersson
