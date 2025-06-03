import {
  CounterContract,
  CounterContractArtifact,
} from "../artifacts/Counter.js";
import {
  AccountWallet,
  CompleteAddress,
  PXE,
  AccountWalletWithSecretKey,
  Contract,
  AztecAddress,
} from "@aztec/aztec.js";
import { getInitialTestAccountsWallets } from "@aztec/accounts/testing";
import { setupSandbox } from "./utils.js";

export async function deployCounter(
  deployer: AccountWallet,
  owner: AztecAddress,
): Promise<CounterContract> {
  const contract = await Contract.deploy(
    deployer,
    CounterContractArtifact,
    [owner],
    "constructor", // not actually needed since it's the default constructor
  )
    .send()
    .deployed();
  return contract as CounterContract;
}

describe("Counter Contract", () => {
  let pxe: PXE;
  let wallets: AccountWalletWithSecretKey[] = [];
  let accounts: CompleteAddress[] = [];

  let alice: AccountWallet;
  let bob: AccountWallet;
  let carl: AccountWallet;

  let counter: CounterContract;

  beforeAll(async () => {
    pxe = await setupSandbox();

    wallets = await getInitialTestAccountsWallets(pxe);
    accounts = wallets.map((w) => w.getCompleteAddress());

    alice = wallets[0];
    bob = wallets[1];
    carl = wallets[2];
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
