# Dev Toolbox

[![CI](https://github.com/thailoc-dev/orca-dev-toolbox/actions/workflows/ci.yml/badge.svg)](https://github.com/thailoc-dev/orca-dev-toolbox/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/tag/thailoc-dev/orca-dev-toolbox?label=release&sort=semver)](CHANGELOG.md)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Decode a JWT, convert a timestamp or format some JSON without leaving [Orca](https://www.onorca.dev)
or asking an agent. 49 small tools in the right sidebar, all offline.

![Dev Toolbox in Orca's sidebar](images/cover.png)

## Install

From the community catalog: open
[Dev Toolbox on onorca.dev](https://www.onorca.dev/plugins/thailoc-dev/orca-dev-toolbox) and click
**Open in Orca**, or search for it in Settings → Plugins.

To get the latest release before the catalog picks it up, install from Git in Settings → Plugins:

```
https://github.com/thailoc-dev/orca-dev-toolbox.git#v0.8.1
```

Requires Orca 1.4.246 or later.

## Usage

Open the panel from the wrench icon in the right sidebar, then paste something into the search
box. Dev Toolbox recognises JWTs, timestamps, JSON, YAML, TOML, CSV, SQL, URLs, cron expressions, curl
and docker run commands, `.env` lines, certificates, SSH keys, colours, IP ranges, version ranges,
User-Agents, terminal output with colour codes and more, and opens the matching tool with your input.

You can also type to search (`sha256`, `epoch`, `snake`…). <kbd>Enter</kbd> opens the first result,
<kbd>Esc</kbd> goes back to the list. Each tool keeps its input while you switch between them, and
the ☆ in a tool's header pins it to the top of the list. Pins and recent tools are kept between
sessions.

## Tools

**Inspect** · JWT (decode, verify and sign HS256/384/512) · Certificate & CSR · SSH Key fingerprints ·
User-Agent · Timestamp · Cron · Semver ranges · HTTP Status ·
Ports · Subnet / CIDR · Character Inspector

**Encode** · Base64 · Image to Base64 · URL · HTML / JSON / Unicode escapes

**Convert** · YAML ↔ JSON · TOML ↔ JSON / YAML · CSV ↔ JSON · `.env` ↔ JSON, Kubernetes Secret or ConfigMap ·
docker run ↔ Compose · JSON to TypeScript, Go, Rust or Python · cURL to fetch, requests or HTTPie ·
HTML to JSX · px ↔ rem · Size & Duration · Color (HEX, RGB, HSL, OKLCH) · Number Base · Chmod

**Format** · JSON · JSON Diff (by path, any key order) · JSON Query (JSONPath) · SQL · XML · Clean Terminal Output (strip ANSI codes)

**Generate** · Password · UUID v4/v7, ULID, Nano ID · TOTP / 2FA codes · Hash & HMAC · bcrypt &
Basic Auth · Mock data (English or Vietnamese) · QR Code

**Text** · Redact Secrets (tokens, keys and passwords in logs) · Token Counter (LLM tokens, context window share, cost) · Transform (remove accents, slugify, lists to SQL `IN`…) · Case Converter · Regex Tester · Diff · Line Tools · Stats

See the [changelog](CHANGELOG.md) for what changed in each release.

## Privacy

The panel runs in Orca's sandboxed frame, which blocks all network access. Nothing you paste
leaves your machine. The only permission the plugin asks for is its own storage folder, where Orca
keeps your pinned and recent tools.

## Contributing

If Dev Toolbox saves you a trip to a website, a ⭐ on this repository helps other Orca users find it.

Bug reports and tool requests are welcome in [issues](https://github.com/thailoc-dev/orca-dev-toolbox/issues).
See [CONTRIBUTING.md](CONTRIBUTING.md) to build and test locally.

## License

[MIT](LICENSE). Bundled libraries are listed in [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
