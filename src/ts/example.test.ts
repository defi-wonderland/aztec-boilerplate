import { ExampleContract, ExampleContractArtifact } from '../artifacts/Example.js';
import {
  AccountWallet,
  CompleteAddress,
  PXE,
  AccountWalletWithSecretKey,
  Contract,
  AztecAddress,
} from '@aztec/aztec.js';
import { getInitialTestAccountsWallets } from '@aztec/accounts/testing';
import { setupSandbox } from './utils.js';

export async function deployExample(deployer: AccountWallet, owner: AztecAddress): Promise<ExampleContract> {
  const contract = await Contract.deploy(
    deployer,
    ExampleContractArtifact,
    [owner],
    'constructor', // not actually needed since it's the default constructor
  )
    .send()
    .deployed();
  return contract as ExampleContract;
}


describe('Example Contract', () => {
  let pxe: PXE;
  let wallets: AccountWalletWithSecretKey[] = [];
  let accounts: CompleteAddress[] = [];

  let alice: AccountWallet;
  let bob: AccountWallet;
  let carl: AccountWallet;

  let example: ExampleContract;

  beforeAll(async () => {
    pxe = await setupSandbox();

    wallets = await getInitialTestAccountsWallets(pxe);
    accounts = wallets.map((w) => w.getCompleteAddress());

    alice = wallets[0];
    bob = wallets[1];
    carl = wallets[2];
  });
  
  beforeEach(async () => {
    example = (await deployExample(alice, alice.getAddress())) ;
  });

  it('should work properly (?)', async () => {
    
    const owner = await example.methods.get_owner().simulate();
    expect(owner).toStrictEqual(alice.getAddress());

    // default value is 0
    expect(await example.methods.get_value().simulate()).toBe(0n);
    const newValue = 100;
    // set the new value
    await example.methods.set_value(newValue).send().wait();
    // the value is now updated
    expect(await example.methods.get_value().simulate()).toBe(newValue);
  })


});
