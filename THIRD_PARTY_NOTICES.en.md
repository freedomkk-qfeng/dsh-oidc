# Third-party notices

[简体中文](THIRD_PARTY_NOTICES.md) | **English**

`dsh-oidc` is MIT-licensed and interoperates with the following directly declared packages. Exact versions are recorded in `package-lock.json`; transitive dependency license files remain in their distributed packages.

## Runtime peers (not copied into this repository)

- DeepSeek Harness packages `0.1.2-alpha.1` and `@deepseek-ai/cordis` `4.0.1` — MIT, Copyright (c) 2026 DeepSeek, <https://github.com/deepseek-ai/deepseek-harness>
- `@earendil-works/pi-ai` `^0.84.2` (`0.84.4` in the reviewed source Runtime) — MIT, <https://github.com/earendil-works/pi>
- React `18.x` — MIT, Copyright (c) Facebook, Inc. and its affiliates, <https://github.com/facebook/react>

This repository uses public package APIs and does not vendor their source. Their presence as peer dependencies does not imply endorsement of this project.

## Code embedded in the browser artifact

The generated `lib/client.js` bundles Zod:

### Zod 4.4.3

MIT License

Copyright (c) 2025 Colin McDonnell

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

Source: <https://github.com/colinhacks/zod>

## Development-only tools

The repository also declares tsdown (MIT), TypeScript (Apache-2.0), Ajv (MIT), YAML (ISC), and `@types/react` (MIT) for build and validation. They are not included in the npm package's runtime files. Review their transitive licenses and install scripts from the lockfile before release.

At the alpha.1 lockfile, npm reports install scripts on `@google/genai` (a no-op preinstall) and `protobufjs` (postinstall), both reached through the `@earendil-works/pi-ai` peer tree. npm's allow-scripts policy left them unapproved during the preparation install. Release managers must re-review this fact whenever the lockfile changes; `npm audit` reporting zero known vulnerabilities does not replace that review.

The prepared lockfile contains 255 package entries with declared license metadata: MIT (190), Apache-2.0 (48), BSD-3-Clause (12), ISC (3), Python-2.0 (1, `argparse`), and 0BSD (1). This is an inventory result, not legal advice; the release manager must regenerate and review it from the final lockfile.
