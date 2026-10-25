---
title: STPA control structure diagrams
---

# STPA control structure diagrams

> An `stpa-beta` diagram draws an STPA (System-Theoretic Process Analysis) control structure: controllers and controlled processes linked by control actions and feedback.

```mermaid-example
stpa-beta
    title Automatic Emergency Braking
    accTitle: AEB control structure
    accDescr: An AEB controller commands the brakes of a vehicle and receives speed feedback.

    controller aeb["AEB controller"]
    process car["Vehicle"]

    aeb -->|"Brake request"| car
    car -.->|"Wheel speed"| aeb
    car -.->|"Radar range"| aeb
```

```mermaid
stpa-beta
    title Automatic Emergency Braking
    accTitle: AEB control structure
    accDescr: An AEB controller commands the brakes of a vehicle and receives speed feedback.

    controller aeb["AEB controller"]
    process car["Vehicle"]

    aeb -->|"Brake request"| car
    car -.->|"Wheel speed"| aeb
    car -.->|"Radar range"| aeb
```

## Header

Every diagram starts with the keyword `stpa-beta` (the bare `stpa` keyword is accepted as well):

```
stpa-beta
```

## Nodes

Two node kinds are supported:

```
controller <id>[Label]
process <id>[Label]
```

- `id` is a word (letters, digits, underscore; cannot start with a digit).
- `[Label]` is optional. It can be quoted (`["AEB controller"]`) or unquoted (`[Plant]`); quote it when the label contains spaces or punctuation that would otherwise end the bracket. When omitted, the label defaults to the id.
- Each id can only be declared once.

```mermaid-example
stpa-beta
    controller aeb["AEB controller"]
    process car
```

## Edges

Two edge kinds are supported, drawn between two previously declared node ids:

```
<controllerId> --> <id>[|"Label"|]
<id> -.-> <controllerId>[|"Label"|]
```

| Syntax | Meaning | Rendering |
| --- | --- | --- |
| `-->` | Control action | Solid arrow |
| `-.->` | Feedback | Dashed arrow |

The label is optional and, like node labels, can be quoted or unquoted:

```mermaid-example
stpa-beta
    controller aeb["AEB controller"]
    process car["Vehicle"]
    aeb -->|"Brake request"| car
    car -.->|Wheel speed| aeb
```

Validation rules, enforced after parsing:

- Both the source and the target must already be declared.
- A control action's source must be a `controller`.
- A feedback edge's target must be a `controller`.
- An edge cannot connect a node to itself.

Breaking any of these rules is a parse error that points at the offending line.

## Title and accessibility

```
title <text>
accTitle: <text>
accDescr: <text>
```

`accDescr` also accepts a multi-line block, for longer accessible descriptions:

```
accDescr {
  First line.
  Second line.
}
```

## Comments

Lines starting with `%%` are ignored:

```
%% this line is a comment
```

## Multiple controllers

Controllers can command other controllers; the renderer ranks them top-to-bottom by command distance, with controlled processes on the bottom row.

```mermaid-example
stpa-beta
    title Level crossing
    controller ops["Operator"]
    controller ctl["Level crossing controller"]
    process xing["Crossing"]

    ops -->|"Set mode"| ctl
    ctl -.->|"Status"| ops
    ctl -->|"Lower barrier"| xing
    xing -.->|"Barrier position"| ctl
    ops -->|"Emergency stop"| xing
```

```mermaid
stpa-beta
    title Level crossing
    controller ops["Operator"]
    controller ctl["Level crossing controller"]
    process xing["Crossing"]

    ops -->|"Set mode"| ctl
    ctl -.->|"Status"| ops
    ctl -->|"Lower barrier"| xing
    xing -.->|"Barrier position"| ctl
    ops -->|"Emergency stop"| xing
```

## Configuration

Pass an `stpa` block to `mermaid.initialize()` to override layout defaults:

```js
mermaid.initialize({
  stpa: {
    useMaxWidth: true,
    nodeMinWidth: 140,
    nodeHeight: 56,
    rowGap: 90,
    padding: 24,
  },
});
```

| Option | Default | Effect |
| --- | --- | --- |
| `useMaxWidth` | `true` | Scale the SVG to the width of its container |
| `nodeMinWidth` | `140` | Minimum node width in pixels |
| `nodeHeight` | `56` | Node height in pixels |
| `rowGap` | `90` | Minimum vertical gap between rows |
| `padding` | `24` | Outer padding around the diagram |

## Registering the diagram

`stpa-beta` is an external diagram and must be registered before use:

```js
import mermaid from 'mermaid';
import stpa from 'mermaid-stpa';

await mermaid.registerExternalDiagrams([stpa]);
mermaid.initialize({ startOnLoad: true });
```
