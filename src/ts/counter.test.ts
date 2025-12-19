import { CounterContract } from "../artifacts/Counter.js";
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import {
  registerInitialLocalNetworkAccountsInWallet,
  TestWallet,
} from "@aztec/test-wallet/server";
import { createAztecNodeClient } from "@aztec/aztec.js/node";
import { deployCounter } from "./utils.js";
import { AztecAddress } from "@aztec/stdlib/aztec-address";

describe("Counter Contract", () => {
  let wallet: TestWallet;
  let alice: AztecAddress;
  let counter: CounterContract;

  beforeAll(async () => {
    const aztecNode = await createAztecNodeClient("http://localhost:8080", {});
    wallet = await TestWallet.create(
      aztecNode,
      {
        dataDirectory: "pxe-test",
        proverEnabled: false,
      },
      {},
    );

    // Local network starts with predeployed funded accounts; register them in PXE for private execution.
    [alice] = await registerInitialLocalNetworkAccountsInWallet(wallet);
  });

  beforeEach(async () => {
    counter = await deployCounter(wallet, alice);
  });

  it("e2e", async () => {
    const owner = await counter.methods.get_owner().simulate({
      from: alice,
    });
    expect(owner).toStrictEqual(alice);
    // default counter's value is 0
    expect(
      await counter.methods.get_counter().simulate({
        from: alice,
      }),
    ).toBe(0n);
    // call to `increment`
    await counter.methods
      .increment()
      .send({
        from: alice,
      })
      .wait();
    // now the counter should be incremented.
    expect(
      await counter.methods.get_counter().simulate({
        from: alice,
      }),
    ).toBe(1n);
  });
});
