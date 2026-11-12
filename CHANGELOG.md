# Changelog

## 0.8.1 – 2026-11-12

### Fixed
- JSON Query: recursive (`..`) and wildcard queries on large or deeply nested documents no longer fail with "Maximum call stack size exceeded", and no longer copy each subtree into its parents. Thanks @AmethystLiang (#2).

### Changed
- TOTP / 2FA stops refreshing codes while you are on another tool, the tool list or the panel is hidden, and shows the current code straight away when you come back. Thanks @AmethystLiang (#3).
- JSON to Types: Go structs work out their column widths once instead of once per field, so large objects convert faster. Thanks @AmethystLiang (#1).

## 0.8.0 – 2026-11-07

### Added
- JSON Diff: what was added, removed or changed between two JSON documents, by path and whatever the key order, with keys to ignore and arrays in any order. For comparing API responses between environments.
- TOML ↔ JSON / YAML: Cargo.toml, pyproject.toml and other TOML configs. Pasting TOML opens it.
- Redact Secrets: masks API keys and tokens (GitHub, OpenAI, Anthropic, AWS, Stripe, Slack…), JWTs, private keys, passwords in URLs, Authorization and Cookie headers and fields named like password or token, before a log goes into an issue or a prompt.
- Token Counter: an estimate of LLM tokens for a prompt, file or diff, how much of a 32K, 128K, 200K or 1M context window it fills, and its cost at a price you enter.
- Clean Terminal Output: strips ANSI colour and cursor codes, including ones written out as `\x1b[` or `\033[`, from terminal output and CI logs. Pasting coloured output opens it.

### Changed
- Pinned and recent tools and the tool you had open are kept in Orca's plugin storage, so the plugin now asks for its own storage folder (`storage:own`). Pins saved by 0.7.0 carry over.
- Search puts a tool whose name matches exactly first.
- Text Stats uses the Token Counter's estimate, which counts accented and CJK text more closely.

### Removed
- Number to Words, Vietnam IDs and VietQR: Dev Toolbox keeps to tools for development and testing work.

## 0.7.0 – 2026-11-06

### Added
- Number to Words: amounts in Vietnamese and English words, with đồng, "lẻ" or "linh", and shorthands like 150k or 1,5 tỷ.
- User-Agent: browser, engine, OS, device, in-app browsers (Zalo, Facebook…), bots and HTTP clients, with the limits of reduced UAs.
- Vietnam IDs: citizen ID (CCCD) birth province, sex and year; tax code (MST) check digit; phone number network and +84 form.
- Ports: what usually listens on a port or range, and which IANA range it is in.
- Pin tools with the ☆ in a tool's header; pinned tools stay at the top of the list.
- Pasting a User-Agent, a Vietnamese phone number, citizen ID or tax code, an amount such as `150.000đ`, or `:5432` opens its tool.

### Changed
- Requires Orca 1.4.246 or later; the deprecated `publisher` field is gone from the manifest.

## 0.6.2 – 2026-11-05

### Changed
- Removed the Star on GitHub and Request a tool links from the panel for now, so the update needs no new domains.
- Mock Data avatar URLs use a reserved example domain.

## 0.6.1 – 2026-11-03

### Added
- Star on GitHub and Request a tool links under the tool list, and a request link when a search finds nothing. Orca 1.4.246 and later opens them in the browser; older versions copy the address.

## 0.6.0 – 2026-11-03

### Added
- Docker run ↔ Compose: `docker run` commands to a `compose.yaml`, and services back to `docker run`.
- Env Variables: `.env` ↔ JSON, Kubernetes Secret or ConfigMap, `docker -e` flags, Compose and `export`.
- JSON Query: JSONPath with filters, slices, recursive descent and `length()` / `match()`.
- Semver: check a version against npm ranges, compare, sort and bump versions.
- SSH Key: type, size and SHA256/MD5 fingerprints of public keys and `authorized_keys` files.
- TOTP / 2FA: live codes from a Base32 secret or `otpauth://` URI.
- Mock Data: fake records in English or Vietnamese as JSON, CSV, SQL or NDJSON.
- VietQR: NAPAS bank-transfer QR codes, and reading any EMVCo payment payload.
- Pasting a docker run command, `.env` lines, an SSH key, an `otpauth://` URI, a payment QR payload or a version range opens its tool.

### Changed
- Source, tests and build script moved from `build/` to the repository root; tests split per tool.
- CI builds the panel, checks the committed `panel/index.html` is current, and runs the tests.

## 0.5.0 – 2026-10-31

### Added
- Certificate Decoder: PEM certificates, chains and CSRs. Private keys are refused.
- Image to Base64: drop, pick or paste an image; data URI, CSS, `<img>` and Markdown.
- HTML to JSX, including SVG attributes and inline styles.
- px ↔ rem, with Tailwind spacing steps and whole-stylesheet conversion.
- Password Generator.
- bcrypt & Basic Auth: hash, verify, htpasswd line, `Authorization` header.

## 0.4.0 – 2026-10-31

### Added
- Text Transform: remove accents, slugify, lines to SQL `IN` / JSON array and back, Markdown tables.
- SQL Formatter and XML Formatter, grouped with JSON under Format.
- Size & Duration.
- Character Inspector: hidden characters, look-alike letters, NFC/NFD.

### Changed
- Case Converter can strip accents when building identifiers.

## 0.3.0 – 2026-10-31

### Added
- YAML ↔ JSON, CSV ↔ JSON, JSON to Types (TypeScript, Go, Rust, Python).
- cURL to Code (fetch, requests, HTTPie).
- Subnet / CIDR for IPv4 and IPv6, HTTP Status, QR Code.
- JWT signature check and signing (HS256/384/512); SHA-384; ULID and Nano ID; time zones in Timestamp.

### Fixed
- Pressing Enter in the search box no longer types a line break into the tool it opens.

## 0.2.0 – 2026-10-31

### Added
- Escape, Color, Number Base, Chmod, Text Diff, Case Converter, Line Tools, Text Stats.
- An icon for each tool.

## 0.1.0 – 2026-10-31

First release: JWT, Timestamp, Cron, Base64, URL, UUID, Hash & HMAC, JSON Formatter, Regex Tester.
