# Agent Instructions

## Build rules
- Compile with `em++` using `--bind` and `-lembind`.
- Enable flags `-s WASM=1 -s MODULARIZE=1 -s EXPORT_NAME='WolfAIModule' -s ALLOW_MEMORY_GROWTH=1 -s NO_EXIT_RUNTIME=1 -s ENVIRONMENT='web,worker'`.
- Do not emit asm.js or other fallback outputs.
- After editing `game.html`, run `./remove_js_fallback.sh`.

## Testing
- Avoid generating HTML test pages.
- Verify builds via Node scripts:
  - `node test-wolf-module-node.js`
  - `node verify-wolf-ai.js`
  - `./run-wasm-tests.sh`

## Script conventions
- Start shell scripts with `#!/bin/bash` and `set -euo pipefail`.
- Use `command -v em++` to check the compiler.

## Repository hygiene
- Keep generated artifacts out of version control except required loader and `.wasm` files.
