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
│   │   ├── counter_contract/   # Example Counter contract
│   │   ├── contract_templates/ # Reusable templates (lib) — e.g. the `counter` template
│   │   └── composed_counter/   # Host contract that composes the `counter` template
│   ├── ts/                     # TypeScript tests and utilities
│   └── artifacts/              # Generated TypeScript bindings
├── benchmarks/                 # Performance benchmarking
├── target/                     # Compiled Noir artifacts
└── .github/
    └── workflows/              # CI/CD pipelines
```

## Contract architecture

The Counter contract demonstrates key Aztec patterns:

### Private-to-Public execution pattern
The `increment()` function is private but enqueues a public `increment_internal()` call. This pattern maintains privacy while updating public state.

### Storage
- **Owner**: Immutable address set at deployment
- **Counter**: Mutable public value

### Functions
- `constructor`: Initializes contract with owner
- `get_owner`: Returns owner address (public)
- `increment`: Private function that enqueues public state update
- `increment_internal`: Internal public function for state modification
- `get_counter`: Returns current counter value (public)

## Composing templates

This boilerplate depends on a [defi-wonderland fork of aztec-nr](https://github.com/defi-wonderland/aztec-nr), vendored as a submodule at `lib/aztec-nr` and wired in via a Noir `path` dependency in each contract's `Nargo.toml`:

```toml
aztec = { path = "../../../lib/aztec-nr/aztec" }
```

Vendoring it locally (instead of a remote git tag) means the framework source is in-tree: editable, greppable, and pinned to an exact commit so builds are reproducible. The submodule tracks the `feat/template-composition` branch — advance it deliberately with `git submodule update --remote lib/aztec-nr`.

### What it adds

The fork adds **contract template composition** to the macro layer. Define a reusable template once, then pull its whole surface (externals, internals, events, library methods) into any host contract — no copy-paste:

```noir
// 1. Define a template (src/nr/contract_templates/src/counter_template.nr)
#[contract_template("counter")]
#[aztec]
pub contract CounterTemplate { /* increment(), current(), _set(), Counted event */ }

// 2. Compose it into a host (src/nr/composed_counter/src/main.nr)
#[aztec(AztecConfig::new().compose("counter"))]
pub contract ComposedCounter {
    // increment(), current(), _set() are injected as if written here;
    // the host layers on its own owner state and entrypoints.
}
```

The host must depend on the template package (that's what registers the `"counter"` id at compile time) and re-declare any storage fields the template uses (Noir can't inject struct fields). Name collisions across templates are hard compile errors unless an override is declared.

Beyond this basic case, the fork supports multi-template compose, transitive (diamond-safe) flattening, `#[template_virtual]` + `override_template(...)`, abstract templates, and cross-crate library methods. See `lib/aztec-nr/composition_tests/` for worked examples and `composition_failure_tests/` for the guardrails.

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
