import { AztecAddress } from "@aztec/aztec.js/addresses";
import { createAztecNodeClient, waitForNode } from "@aztec/aztec.js/node";
import { type ContractFunctionInteractionCallIntent } from "@aztec/aztec.js/authorization";
import { EmbeddedWallet } from "@aztec/wallets/embedded";
import { registerInitialLocalNetworkAccountsInWallet } from "@aztec/wallets/testing";
import {
  Benchmark,
  type BenchmarkContext,
} from "@defi-wonderland/aztec-benchmark";

import { CounterContract } from "../src/artifacts/Counter.js";

// Extend the BenchmarkContext from the new package
interface CounterBenchmarkContext extends BenchmarkContext {
  wallet: EmbeddedWallet;
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

    const wallet: EmbeddedWallet = await EmbeddedWallet.create(aztecNode);
    const accounts: AztecAddress[] =
      await registerInitialLocalNetworkAccountsInWallet(wallet);

    const [deployer] = accounts;

    const { contract: counterContract } = await CounterContract.deploy(
      wallet,
      deployer,
    ).send({ from: deployer });

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
}
