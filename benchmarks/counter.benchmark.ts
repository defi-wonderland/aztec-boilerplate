import { createAztecNodeClient, type AztecNode } from "@aztec/aztec.js/node";
import { TestWallet } from "@aztec/test-wallet/server";
import { AztecAddress } from "@aztec/aztec.js/addresses";
import type { ContractFunctionInteractionCallIntent } from "@aztec/aztec.js/authorization";
import {
  Benchmark,
  type BenchmarkContext,
} from "@defi-wonderland/aztec-benchmark";

import { CounterContract } from "../src/artifacts/Counter.js";
import { deployCounter } from "../src/ts/utils.js";

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
    const { BASE_PXE_URL = "http://localhost" } = process.env;
    const node: AztecNode = createAztecNodeClient(`${BASE_PXE_URL}:8080`);
    const wallet = await TestWallet.create(node, {}, {});

    // Create test accounts
    const aliceAccount = await (await wallet.createAccount()).getAccount();
    const bobAccount = await (await wallet.createAccount()).getAccount();
    const carlAccount = await (await wallet.createAccount()).getAccount();

    const accounts = [
      aliceAccount.getAddress(),
      bobAccount.getAddress(),
      carlAccount.getAddress(),
    ];
    const deployer = aliceAccount.getAddress();

    const deployedCounterContract = await deployCounter(wallet, deployer);
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
