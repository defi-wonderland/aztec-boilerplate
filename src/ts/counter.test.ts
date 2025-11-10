import { CounterContract } from "../artifacts/Counter.js";
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { TestWallet } from "@aztec/test-wallet/server";
import { createAztecNodeClient } from "@aztec/aztec.js/node";
import { deployCounter } from "./utils.js";
import { AztecAddress } from "@aztec/stdlib/aztec-address";

import {
  INITIAL_TEST_SECRET_KEYS,
  INITIAL_TEST_ACCOUNT_SALTS,
  INITIAL_TEST_ENCRYPTION_KEYS,
} from "@aztec/accounts/testing";

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

    // Register initial test accounts manually because of this:
    // https://github.com/AztecProtocol/aztec-packages/blame/next/yarn-project/accounts/src/schnorr/lazy.ts#L21-L25
    [alice] = await Promise.all(
      INITIAL_TEST_SECRET_KEYS.map(async (secret, i) => {
        const accountManager = await wallet.createSchnorrAccount(
          secret,
          INITIAL_TEST_ACCOUNT_SALTS[i],
          INITIAL_TEST_ENCRYPTION_KEYS[i],
        );
        return accountManager.address;
      }),
    );
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
