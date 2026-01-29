import { type Wallet } from "@aztec/aztec.js/wallet";
import { AztecAddress } from "@aztec/aztec.js/addresses";
import { createAztecNodeClient, waitForNode } from "@aztec/aztec.js/node";
import { type ContractFunctionInteractionCallIntent } from "@aztec/aztec.js/authorization";
import {
  registerInitialLocalNetworkAccountsInWallet,
  TestWallet,
} from "@aztec/test-wallet/server";
import {
  Benchmark,
  type BenchmarkContext,
} from "@defi-wonderland/aztec-benchmark";

import { CounterContract } from "../src/artifacts/Counter.js";

// Extend the BenchmarkContext from the new package
interface CounterBenchmarkContext extends BenchmarkContext {
  wallet: Wallet;
  deployer: AztecAddress;
  accounts: AztecAddress[];
  counterContract: CounterContract;
}

// Use export default class extending Benchmark
export default class CounterContractBenchmark extends Benchmark {
  /**
   * Sets up the benchmark environment for the CounterContract.
   * Creates PXE client, gets accounts, and deploys the contract.
   */
  async setup(): Promise<CounterBenchmarkContext> {
    const aztecNode = createAztecNodeClient("http://localhost:8080");
    await waitForNode(aztecNode);

    const wallet: TestWallet = await TestWallet.create(aztecNode);
    const accounts: AztecAddress[] =
      await registerInitialLocalNetworkAccountsInWallet(wallet);

    const [deployer] = accounts;

    const counterContract = await CounterContract.deploy(wallet, deployer)
      .send({ from: deployer })
      .deployed();

    return { wallet, deployer, accounts, counterContract };
  }

  /**
   * Returns the list of CounterContract methods to be benchmarked.
   */
  getMethods(
    context: CounterBenchmarkContext,
  ): ContractFunctionInteractionCallIntent[] {
    const { counterContract, wallet, deployer } = context;

    const methods: ContractFunctionInteractionCallIntent[] = [
      {
        caller: deployer,
        action: counterContract.withWallet(wallet).methods.increment(),
      },
    ];

    return methods;
  }

  async teardown(context: BenchmarkContext): Promise<void> {
    process.exit(0);
  }
}
