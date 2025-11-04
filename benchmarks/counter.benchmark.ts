import { createAztecNodeClient, type AztecNode } from "@aztec/aztec.js/node";
import { TestWallet } from "@aztec/test-wallet/server";
import { type AccountWithSecretKey } from "@aztec/aztec.js/account";
import { type ContractFunctionInteractionCallIntent } from "@aztec/aztec.js/authorization";
import {
  Benchmark,
  type BenchmarkContext,
} from "@defi-wonderland/aztec-benchmark";
import { type NamedBenchmarkedInteraction } from "@defi-wonderland/aztec-benchmark/dist/types.js";

import { CounterContract } from "../src/artifacts/Counter.js";
import { deployCounter } from "../src/ts/utils.js";

// Extend the BenchmarkContext from the new package
interface CounterBenchmarkContext extends BenchmarkContext {
  wallet: TestWallet;
  deployer: AccountWithSecretKey;
  accounts: AccountWithSecretKey[];
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
    const node: AztecNode = createAztecNodeClient(`${BASE_PXE_URL}:8080`);
    const wallet = await TestWallet.create(node, {}, {});

    // Create test accounts
    const alice = await (await wallet.createAccount()).getAccount();
    const bob = await (await wallet.createAccount()).getAccount();
    const carl = await (await wallet.createAccount()).getAccount();

    const accounts = [alice, bob, carl];
    const deployer = alice;

    const deployedCounterContract = await deployCounter(
      wallet,
      deployer.getAddress(),
    );
    const counterContract = await CounterContract.at(
      deployedCounterContract.address,
      wallet,
    );
    return { wallet, deployer, accounts, counterContract };
  }

  /**
   * Returns the list of CounterContract methods to be benchmarked.
   */
  getMethods(
    context: CounterBenchmarkContext,
  ): Array<
    ContractFunctionInteractionCallIntent | NamedBenchmarkedInteraction
  > {
    const { counterContract, wallet, deployer } = context;

    const methods: NamedBenchmarkedInteraction[] = [
      {
        interaction: {
          caller: deployer.getAddress(),
          action: counterContract.withWallet(wallet).methods.increment(),
        },
        name: "increment",
      },
    ];

    return methods;
  }
}
