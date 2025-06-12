import { CounterContract } from "../artifacts/Counter.js";
import { AccountWallet, PXE } from "@aztec/aztec.js";
import { getDeployedTestAccountsWallets } from "@aztec/accounts/testing";
import { deployCounter, setupSandbox } from "./utils.js";

describe("Counter Contract", () => {
  let pxe: PXE;
  let wallets: AccountWallet[] = [];

  let alice: AccountWallet;
  let bob: AccountWallet;
  let carl: AccountWallet;

  let counter: CounterContract;

  beforeAll(async () => {
    pxe = await setupSandbox();
    wallets = await getDeployedTestAccountsWallets(pxe);
    [alice, bob, carl] = wallets;
  });

  beforeEach(async () => {
    counter = await deployCounter(alice, alice.getAddress());
  });

  it("can increment the counter", async () => {
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
