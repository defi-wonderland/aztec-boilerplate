import { AztecAddress } from "@aztec/aztec.js/addresses";
import { createAztecNodeClient, waitForNode } from "@aztec/aztec.js/node";
import {
  registerInitialSandboxAccountsInWallet,
  TestWallet,
} from "@aztec/test-wallet/server";
import {
  Benchmark,
  type BenchmarkContext,
} from "@defi-wonderland/aztec-benchmark";

import { CounterContract } from "../src/artifacts/Counter.js";

// Extend the BenchmarkContext from the new package
interface CounterBenchmarkContext extends BenchmarkContext {
  wallet: TestWallet;
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
    const { NODE_URL = "http://localhost:8080" } = process.env;
    const aztecNode = createAztecNodeClient(NODE_URL);
    await waitForNode(aztecNode);

    const wallet: TestWallet = await TestWallet.create(aztecNode);
    const accounts: AztecAddress[] =
      await registerInitialSandboxAccountsInWallet(wallet);

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
  ): { caller: AztecAddress; action: unknown }[] {
    const { counterContract, wallet, deployer } = context;

    const methods: { caller: AztecAddress; action: unknown }[] = [
      {
        caller: deployer,
        action: counterContract.withWallet(wallet).methods.increment(),
      },
    ];

    return methods;
  }
}
