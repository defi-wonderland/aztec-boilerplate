import { type AccountWallet, type PXE, createPXEClient } from "@aztec/aztec.js";
import { getInitialTestAccountsWallets } from "@aztec/accounts/testing";

// Import types from benchmark package
import {
  Benchmark,
  type BenchmarkContext,
  type BenchmarkedInteraction,
} from "@defi-wonderland/aztec-benchmark";

import { CounterContract } from "../src/artifacts/Counter.js";
import { deployCounter } from "../src/ts/utils.js";

// Extend the BenchmarkContext from the new package
interface CounterBenchmarkContext extends BenchmarkContext {
  pxe: PXE;
  deployer: AccountWallet;
  accounts: AccountWallet[];
  counterContract: CounterContract;
}

// Use export default class extending Benchmark
export default class CounterContractBenchmark extends Benchmark {
  /**
   * Sets up the benchmark environment for the CounterContract.
   * Creates PXE client, gets accounts, and deploys the contract.
   */
  async setup(): Promise<CounterBenchmarkContext> {
    const { BASE_PXE_URL = "http://localhost" } = process.env;
    const pxe = createPXEClient(`${BASE_PXE_URL}:8080`);
    const accounts = await getInitialTestAccountsWallets(pxe);
    const deployer = accounts[0]!;
    const deployedCounterContract = await deployCounter(
      deployer,
      deployer.getAddress(),
    );
    const counterContract = await CounterContract.at(
      deployedCounterContract.address,
      deployer,
    );
    return { pxe, deployer, accounts, counterContract };
  }

  /**
   * Returns the list of CounterContract methods to be benchmarked.
   */
  getMethods(context: CounterBenchmarkContext): BenchmarkedInteraction[] {
    const { counterContract, accounts } = context;
    const [alice] = accounts;

    const methods = [
      counterContract.withWallet(alice).methods.increment(),
    ] as BenchmarkedInteraction[];

    return methods.filter(Boolean);
  }
}
