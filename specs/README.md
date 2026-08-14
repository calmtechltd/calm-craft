# CalmCraft Product Specs

[`references/spec-format.md`](../references/spec-format.md) defines the format for every spec in this directory. Do not repeat the format rules here.

## Visualizer v1

| Spec                                                                           | Design coverage                                                                                   |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| [`calmcraft/repository-sources.md`](./calmcraft/repository-sources.md)         | Command-line contract, repository sources, snapshot inputs, base inference, and session lifecycle |
| [`calmcraft/spec-model.md`](./calmcraft/spec-model.md)                         | CalmCraft spec model, parsing, validation, relationships, flow contracts, and safe Markdown       |
| [`calmcraft/branch-review.md`](./calmcraft/branch-review.md)                   | Snapshot provenance and semantic comparison                                                       |
| [`calmcraft/visualizer-ui.md`](./calmcraft/visualizer-ui.md)                   | Atlas, Feature, Branch Review, Health, navigation, visual direction, and accessibility            |
| [`calmcraft/local-session-security.md`](./calmcraft/local-session-security.md) | Loopback server, session token, path boundary, browser policy, privacy, and sanitization          |
| [`calmcraft/cli-distribution.md`](./calmcraft/cli-distribution.md)             | CLI commands, failures, packaging, runtime support, provenance, and release contract              |

The source design lives outside this public repository while delivery is in progress. Each spec below carries the observable contract needed to implement and review v1 without that private planning context.
