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
