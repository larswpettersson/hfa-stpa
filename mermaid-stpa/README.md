# mermaid-stpa

An `stpa-beta` diagram type for [Mermaid](https://mermaid.js.org), registered as an external diagram. It draws STPA (System-Theoretic Process Analysis) control structures: controllers and controlled processes linked by control actions and feedback.

```mermaid-example
stpa-beta
    title Automatic Emergency Braking
    controller aeb["AEB controller"]
    process car["Vehicle"]

    aeb -->|"Brake request"| car
    car -.->|"Wheel speed"| aeb
```

## Install

```bash
npm install mermaid-stpa mermaid
```

`mermaid` is a peer dependency (`^11.0.0 || ^12.0.0`).

## Usage

```js
import mermaid from 'mermaid';
import stpa from 'mermaid-stpa';

await mermaid.registerExternalDiagrams([stpa]);
mermaid.initialize({ startOnLoad: true });
```

Diagram syntax, configuration options, and more examples are documented in [`docs/syntax/stpa.md`](docs/syntax/stpa.md). A live demo is in [`demo/index.html`](demo/index.html) (open it via a static file server, since it loads `mermaid` and `dist/index.js` as ES modules).

## Development

```bash
npm test        # vitest
npm run typecheck
npm run build    # tsup -> dist/
```

## License

MIT
