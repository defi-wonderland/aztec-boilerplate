import { getInitialTestAccountsData } from "@aztec/accounts/testing";
import {
  CounterContract,
  CounterContractArtifact,
} from "../artifacts/Counter.js";
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { PXE } from "@aztec/pxe/server";
import { AccountWithSecretKey } from "@aztec/aztec.js/account";
import { TestWallet } from "@aztec/test-wallet/server";
import { createAztecNodeClient } from "@aztec/aztec.js/node";
import { deployCounter } from "./utils.js";

describe("Counter Contract", () => {
  let pxe: PXE;
  let wallet: TestWallet;

  let alice: AccountWithSecretKey;
  let bob: AccountWithSecretKey;
  let carl: AccountWithSecretKey;

  let counter: CounterContract;

  beforeAll(async () => {
    // pxe = await setupSandbox();

    const aztecNode = await createAztecNodeClient("http://localhost:8080", {});
    wallet = await TestWallet.create(aztecNode, {}, {});
    // const accounts = await wallet.getAccounts();

    alice = await (await wallet.createAccount()).getAccount();
    bob = await (await wallet.createAccount()).getAccount();
    carl = await (await wallet.createAccount()).getAccount();
  });

  beforeEach(async () => {
    counter = await deployCounter(wallet, alice.getAddress());
  });

  it("e2e", async () => {
    const owner = await counter.methods.get_owner().simulate({
      from: alice.getAddress(),
    });
    expect(owner).toStrictEqual(alice.getAddress());
    // default counter's value is 0
    expect(
      await counter.methods.get_counter().simulate({
        from: alice.getAddress(),
      }),
    ).toBe(0n);
    // call to `increment`
    await counter.methods
      .increment()
      .send({
        from: alice.getAddress(),
      })
      .wait();
    // now the counter should be incremented.
    expect(
      await counter.methods.get_counter().simulate({
        from: alice.getAddress(),
      }),
    ).toBe(1n);
  });
});
