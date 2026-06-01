# Aztec Noir Boilerplate

<div align="center"><strong>Start your next Aztec project with Noir in seconds</strong></div>
<div align="center">A highly scalable foundation for building privacy-preserving smart contracts on Aztec</div>

<br />

## Features

<dl>
  <dt>Sample Noir contract</dt>
  <dd>Basic Counter contract demonstrating private-to-public execution patterns and owner access control.</dd>

  <dt>Aztec development setup</dt>
  <dd>Pre-configured Aztec workspace with Noir contract compilation and TypeScript artifact generation.</dd>

  <dt>TypeScript integration</dt>
  <dd>Complete TypeScript setup with generated contract bindings and utilities for interacting with Aztec sandbox.</dd>

  <dt>Comprehensive testing</dt>
  <dd>Noir unit tests for contract logic and TypeScript integration tests using Vitest. Tests automatically start and manage the Aztec sandbox - no manual setup required.</dd>

  <dt>Automated benchmarking</dt>
  <dd>GitHub Actions workflow that automatically benchmarks your contracts on every PR, comparing Gates, DA Gas and L2 Gas against the base branch.</dd>

  <dt>Development tooling</dt>
  <dd>Integrated linting with Prettier and streamlined build commands for rapid development.</dd>

  <dt>Template composition</dt>
  <dd>A local, editable <a href="https://github.com/defi-wonderland/aztec-nr">aztec-nr</a> fork vendored as a submodule, adding a <code>compose()</code> macro so contracts can pull in reusable templates instead of re-implementing them. See <a href="#composing-templates">Composing templates</a>.</dd>
</dl>

## Setup

1. Install Aztec by following the instructions from [their documentation](https://docs.aztec.network/developers/getting_started).
2. Fetch the vendored aztec-nr fork: `git submodule update --init --recursive`
   (or clone with `git clone --recurse-submodules`).
3. Install the dependencies by running: `yarn install`

## Build

The complete build pipeline includes cleaning, compiling Noir contracts, and generating TypeScript artifacts:

```bash
yarn ccc
```

This runs:
- `yarn clean` - Removes all build artifacts
- `yarn compile` - Compiles Noir contracts using aztec
- `yarn codegen` - Generates TypeScript bindings from compiled contracts

## Running tests

### Prerequisites
The tests **automatically start and manage the Aztec sandbox** for you. 

**Option 1: Automatic**
Just run the tests and the sandbox will be handled automatically:

```bash
yarn test  # Sandbox starts automatically and stops when tests complete
```

**Option 2: Manual Control** 
If you prefer to manage the sandbox yourself (e.g., for debugging or multiple test runs):

```bash
aztec start --sandbox  # Start manually in separate terminal
yarn test              # Run tests against existing sandbox
```

The sandbox runs on `http://localhost:8080` by default.

### All tests
Run both Noir contract tests and TypeScript integration tests:

```bash
yarn test
```

### Noir tests only
Test your contract logic directly:

```bash
yarn test:nr
```

### TypeScript integration tests only
Test contract interactions through TypeScript:

```bash
yarn test:js
```

## Benchmarking

This repository includes automated benchmarking that measures and compares performance metrics across pull requests.

### Metrics tracked
- **Gates**: Total gate count in zero-knowledge circuits (measures circuit complexity)
- **DA Gas**: Data Availability gas costs
- **L2 Gas**: Layer 2 execution gas costs

### GitHub Actions integration
Every pull request automatically:
1. Runs benchmarks on the base branch
2. Runs benchmarks on your PR branch
3. Generates a comparison report as a PR comment
4. Shows performance improvements or regressions

### Running benchmarks locally

Benchmarks also benefit from automatic sandbox management:

```bash
# Option 1: Automatic sandbox management (recommended)
yarn benchmark  # Sandbox starts automatically

# Option 2: Manual sandbox control
aztec start --sandbox  # Start manually in separate terminal
yarn benchmark          # Run against existing sandbox
```

Benchmark results are saved to `benchmarks/` directory.

### Adding new benchmarks

Create a new benchmark file extending the base `Benchmark` class or add a new method line to your existing setup:

```typescript
import { Benchmark } from '@defi-wonderland/aztec-benchmark';

export class MyContractBenchmark extends Benchmark {
  async setup() {
    // Initialize your contract and dependencies
  }

  getMethods(context: CounterBenchmarkContext): BenchmarkedInteraction[] {
    const { contract, accounts } = context;
    const [alice] = accounts;

    const methods = [
      // Add the function calls that you want to benchmark here
      contract.withWallet(alice).methods.method(1),
    ] as BenchmarkedInteraction[];

    return methods.filter(Boolean);
  }
}
```

## Project structure

```
├── lib/
│   └── aztec-nr/               # Vendored aztec-nr fork (submodule) — editable framework source
├── src/
│   ├── nr/                     # Noir contracts
│   │   ├── counter_contract/   # Counter (the host) that composes `ownable` + `pausable`
│   │   └── contract_templates/ # Reusable templates (lib): `ownable` + `pausable`
│   ├── ts/                     # TypeScript tests and utilities
│   └── artifacts/              # Generated TypeScript bindings
├── benchmarks/                 # Performance benchmarking
├── target/                     # Compiled Noir artifacts
└── .github/
    └── workflows/              # CI/CD pipelines
```

## Contract architecture

The `Counter` host owns the counter logic and pulls in cross-cutting concerns (ownership, pausing) from reusable templates via `compose(...)`.

### Storage
- **owner** (re-declared from `ownable`): `PublicImmutable<AztecAddress>`, set at deployment
- **paused** (re-declared from `pausable`): `PublicMutable<bool>`, defaults to false
- **count** (host's own): `PublicMutable<u128>`

### Functions
- `constructor(owner)`: initializes the owner
- `increment()`: refuses while paused, refuses for non-owner callers, then bumps `count`
- `get_counter()`: returns the current count
- `get_owner()`: composed from `ownable`
- `pause()` / `unpause()` / `is_paused()`: composed from `pausable`

## Composing templates

This boilerplate depends on a [defi-wonderland fork of aztec-nr](https://github.com/defi-wonderland/aztec-nr), vendored as a submodule at `lib/aztec-nr` and wired in via a Noir `path` dependency in each contract's `Nargo.toml`:

```toml
aztec = { path = "../../../lib/aztec-nr/aztec" }
```

Vendoring it locally (instead of a remote git tag) means the framework source is in-tree: editable, greppable, and pinned to an exact commit so builds are reproducible. The submodule tracks the `feat/template-composition` branch — advance it deliberately with `git submodule update --remote lib/aztec-nr`.

### What it adds

The fork adds **contract template composition** to the macro layer. Reusable cross-cutting concerns (ownership, pausing, reentrancy guards, token surfaces) get written once as templates, then any host contract pulls them in:

```noir
// Define reusable templates (src/nr/contract_templates/src/...)
#[contract_template("ownable")]
#[aztec]
pub contract OwnableTemplate {
    // owner storage convention + get_owner() + an `_assert_is_owner` library-method guard
}

#[contract_template("pausable")]
#[aztec]
pub contract PausableTemplate {
    // paused storage + pause()/unpause()/is_paused() + PauseToggled event
}
```

The Counter host owns the domain logic (count + increment) and pulls in both mixins:

```noir
#[aztec(AztecConfig::new().compose("ownable").compose("pausable"))]
pub contract Counter {
    #[storage]
    struct Storage<Context> {
        owner: PublicImmutable<AztecAddress, Context>,   // from ownable
        paused: PublicMutable<bool, Context>,            // from pausable
        count: PublicMutable<u128, Context>,             // host's own
    }

    #[external("public")]
    fn increment() {
        assert(!self.storage.paused.read(), "Counter: paused");
        _assert_is_owner(
            self.context.maybe_msg_sender().unwrap(),
            self.storage.owner.read(),
        );
        let new_val = self.storage.count.read() + 1;
        self.storage.count.write(new_val);
    }
}
```

A few things to keep in mind:

- **The host depends on the template package** (`contract_templates = { path = "..." }`). That's what registers the template ids at compile time so `compose(...)` can resolve them.
- **Storage fields from a composed template must be re-declared in the host's `#[storage]` struct.** Noir cannot inject struct fields, so the host holds the canonical layout and template functions read/write against it.
- **Library methods are inline, internals are dispatched.** A `#[contract_library_method]` (like `_assert_is_owner`) is migrated to the host as a free function and runs inside the host's call frame — so it can see the real `msg_sender` via the passed-in context value. An `#[internal("public")]` would dispatch as a separate public call where the caller becomes the contract itself, which is the wrong frame for an ownership check.

Beyond this basic case the fork supports multi-template compose, transitive (diamond-safe) flattening, `#[template_virtual]` + `override_template(...)`, abstract templates, internal overrides, and cross-crate library methods. See `lib/aztec-nr/composition_tests/` for worked examples and `composition_failure_tests/` for the guardrails.

> **Noir comment gotcha:** the toolchain on this branch (nargo beta.19) rejects non-ASCII characters in Noir comments. Keep `.nr` source ASCII-only — no em-dashes, smart quotes, etc.

## Development workflow

1. **Modify Noir contracts** in `src/nr/`
2. **Run `yarn build`** to rebuild and regenerate TypeScript artifacts
3. **Write tests** in `src/ts/` using generated artifacts
4. **Run tests** with `yarn test` (sandbox starts automatically)
5. **Format code** with `yarn lint:prettier`
6. **Create PR** and review automated benchmark results

## Code quality

Format all TypeScript and JavaScript files:

```bash
yarn lint:prettier
```

## Commit Guidelines

This project uses [Conventional Commits](https://www.conventionalcommits.org/) to ensure consistent and meaningful commit messages. All commits are automatically validated using commitlint.


## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests for your changes
4. Ensure all tests pass and benchmarks are acceptable
5. Follow commit guidelines
6. Commit your changes (`git commit -m 'feat: add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

The automated benchmarking will run on your PR, providing performance insights compared to the base branch.

## Resources

- [Aztec Documentation](https://docs.aztec.network/)
- [Noir Language Documentation](https://noir-lang.org/)
- [Aztec Sandbox Quickstart](https://docs.aztec.network/developers/getting_started)
- [Aztec Contracts Guide](https://docs.aztec.network/aztec/smart_contracts_overview)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
