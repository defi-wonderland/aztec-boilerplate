import { CounterContract } from "../artifacts/Counter.js";
import { AccountWallet, PXE, AccountManager } from "@aztec/aztec.js";
import { getInitialTestAccounts } from "@aztec/accounts/testing";
import { deployCounter, setupSandbox } from "./utils.js";
import { getSchnorrAccount } from "@aztec/accounts/schnorr";
import { deriveSigningKey } from "@aztec/stdlib/keys";

describe("Counter Contract", () => {
  let pxe: PXE;
  let wallets: AccountWallet[] = [];
  let accounts: AccountManager[] = [];

  let alice: AccountWallet;
  let bob: AccountWallet;
  let carl: AccountWallet;

  let counter: CounterContract;

  beforeAll(async () => {
    pxe = await setupSandbox();

    accounts = await Promise.all(
      (await getInitialTestAccounts()).map(async (acc) => {
        const wallet = await getSchnorrAccount(
          pxe,
          acc.secret,
          deriveSigningKey(acc.secret),
          acc.salt,
        );
        return wallet;
      }),
    );
    wallets = await Promise.all(accounts.map((acc) => acc.getWallet()));

    [alice, bob, carl] = wallets;
  });

  beforeEach(async () => {
    counter = await deployCounter(alice, alice.getAddress());
  });

  it("e2e", async () => {
    const owner = await counter.methods.get_owner().simulate();
    expect(owner).toStrictEqual(alice.getAddress());
    // default counter's value is 0
    expect(await counter.methods.get_counter().simulate()).toBe(0n);
    // call to `increment`
    await counter.methods.increment().send().wait();
    // now the counter should be incremented.
    expect(await counter.methods.get_counter().simulate()).toBe(1n);
  });
});
