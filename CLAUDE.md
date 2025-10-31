# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Development Workflow
- `yarn ccc` - Clean, compile, and codegen (full rebuild pipeline)
- `yarn clean` - Remove artifacts and target directories
- `yarn compile` - Compile Noir contracts using aztec-nargo
- `yarn codegen` - Generate TypeScript artifacts from compiled contracts
- `yarn benchmark` - Run performance benchmarks

### Testing
- `yarn test` - Run all tests (Noir + TypeScript integration tests; sandbox auto-managed)
- `yarn test:nr` - Run Noir contract tests only
- `yarn test:js` - Run TypeScript integration tests only (sandbox auto-managed)

### Code Quality
- `yarn lint:prettier` - Format TypeScript/JavaScript files

## Architecture Overview

This is an Aztec Protocol boilerplate project for building privacy-preserving smart contracts using Noir and TypeScript. Uses Aztec version **3.0.0-devnet.2**.

### Project Structure
- `src/nr/counter_contract/` - Noir contracts (zero-knowledge smart contracts)
- `src/ts/` - TypeScript tests and deployment utilities
- `src/artifacts/` - Generated TypeScript bindings (auto-generated via codegen)
- `benchmarks/` - Performance benchmarks using `@defi-wonderland/aztec-benchmark`
- `target/` - Compiled Noir artifacts
- `scripts/` - Setup utilities (version checking, sandbox management)

### Contract Compilation Flow
1. Noir contracts compiled with `aztec-nargo compile` → outputs to `target/`
2. TypeScript artifacts generated via `aztec codegen` → outputs to `src/artifacts/`
3. TypeScript code imports generated artifacts for type-safe contract interaction

### Testing Environment
- **Test Framework**: Vitest (configured in vitest.config.ts)
- **Sandbox Management**: Automatically starts/stops Aztec sandbox via vitest.setup.ts
  - No manual sandbox startup required for tests
  - Detects and connects to existing sandbox if port 8080 is in use
  - Global setup checks Aztec CLI version compatibility
- **Test Accounts**: Created via `TestWallet.create()` with `AccountWithSecretKey`
- **Contract Deployment**: Each test deploys fresh contract instances via `deployCounter()` utility

### Benchmarking
- Extend `Benchmark` class from `@defi-wonderland/aztec-benchmark`
- Implement `setup()` to initialize contracts and `getMethods()` to return benchmarked interactions
- Measures Gates, DA Gas, and L2 Gas
- GitHub Actions auto-runs benchmarks on PRs with comparison reports
- Configurable PXE URL via `BASE_PXE_URL` environment variable (defaults to `http://localhost:8080`)

## Aztec Contract Patterns (Noir)

### Contract Structure
- Use `#[aztec]` macro for contract definition
- Define storage struct with `#[storage]` and appropriate state variables
- Apply function decorators: `#[external("public")]`, `#[external("private")]`, `#[internal]`, `#[view]`, `#[initializer]`

### Private-to-Public Execution Pattern
The Counter contract demonstrates a core Aztec pattern:
- `increment()` is `#[external("private")]` - private function that enqueues public execution
- `increment_internal()` is `#[external("public")]` `#[internal]` - internal public function for state modification
- Pattern: private function calls `Contract::at(context.this_address()).public_method().enqueue(&mut context)`
- Maintains privacy while updating public state

### State Variables
- `PublicImmutable<T, Context>` - Set once in constructor, read-only thereafter
- `PublicMutable<T, Context>` - Mutable public state
- Private state uses note-based system (not demonstrated in Counter)

### Privacy & Authorization Patterns
From project Cursor rules (`.cursor/rules/Aztec/`):
- Implement both private and public versions of core functions when needed
- Use commitment pattern for privacy entrance (private functions return `Field`)
- Always validate authorization with `assert_current_call_valid_authwit` for transfers
- Check `nonce == 0` when `from == msg_sender` (self-authorization)
- Handle note encryption with `encode_and_encrypt_note` for recipient discovery
- Define note limits for recursive operations when handling large note sets

## Development Workflow

1. **Modify Noir contracts** in `src/nr/`
2. **Run `yarn ccc`** to rebuild and regenerate TypeScript artifacts (critical step!)
3. **Write tests** in `src/ts/` using generated artifacts
4. **Run tests** with `yarn test` (sandbox starts automatically)
5. **Format code** with `yarn lint:prettier`
6. **Commit with conventional commits** (enforced via commitlint)
7. **Create PR** → automated benchmarks run and compare against base branch

## Important Notes

- **Always run `yarn ccc` after modifying Noir contracts** - TypeScript artifacts must be regenerated
- **Node.js ≥22.0.0 required** (specified in package.json engines)
- **Docker required** for Aztec sandbox
- Tests automatically manage sandbox lifecycle - no manual `aztec start --sandbox` needed
- Sandbox runs on port 8080 by default
- Each test deploys fresh contract instances for isolation