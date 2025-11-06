import { Wallet } from "@aztec/aztec.js/wallet";
import {
  CounterContract,
  CounterContractArtifact,
} from "../artifacts/Counter.js";
import { AztecAddress } from "@aztec/stdlib/aztec-address";
import { Contract } from "@aztec/aztec.js/contracts";

import { type PXE } from "@aztec/pxe/server";
import { createStore } from "@aztec/kv-store/lmdb-v2";
import { createPXE, getPXEConfig } from "@aztec/pxe/server";
import { type AztecLMDBStoreV2 } from "@aztec/kv-store/lmdb-v2";
import { createAztecNodeClient, waitForNode } from "@aztec/aztec.js/node";
import {
  registerInitialSandboxAccountsInWallet,
  TestWallet,
} from "@aztec/test-wallet/server";

const { NODE_URL = "http://localhost:8080" } = process.env;
const node = createAztecNodeClient(NODE_URL);
await waitForNode(node);
const { PXE_VERSION = "2" } = process.env;
const pxeVersion = parseInt(PXE_VERSION);
const l1Contracts = await node.getL1ContractAddresses();
const config = getPXEConfig();
const fullConfig = { ...config, l1Contracts };
fullConfig.proverEnabled = false;

/**
 * Setup the PXE and the store
 * @param suffix - optional - The suffix to use for the store directory.
 * @returns The PXE and the store
 */
export const setupPXE = async (suffix?: string) => {
  const storeDir = suffix ? `store-${suffix}` : "store";
  const store: AztecLMDBStoreV2 = await createStore("pxe", pxeVersion, {
    dataDirectory: storeDir,
    dataStoreMapSizeKb: 1e6,
  });
  const pxe: PXE = await createPXE(node, fullConfig, { store });
  return { pxe, store };
};

/**
 * Setup the PXE, the store and the wallet
 * @param suffix - optional - The suffix to use for the store directory.
 * @returns The PXE, the store, the wallet and the accounts
 */
export const setupTestSuite = async (suffix?: string) => {
  const { pxe, store } = await setupPXE(suffix);
  const aztecNode = createAztecNodeClient(NODE_URL);
  const wallet: TestWallet = await TestWallet.create(aztecNode);
  const accounts: AztecAddress[] =
    await registerInitialSandboxAccountsInWallet(wallet);

  return {
    pxe,
    store,
    wallet,
    accounts,
  };
};

/**
 * Deploys the Counter contract.
 * @param deployer - The wallet to deploy the contract with.
 * @param owner - The address of the owner of the contract.
 * @returns A deployed contract instance.
 */
export async function deployCounter(
  deployer: Wallet,
  owner: AztecAddress,
): Promise<CounterContract> {
  const deployerAddress = (await deployer.getAccounts())[0]!.item;
  const deployMethod = await Contract.deploy(
    deployer,
    CounterContractArtifact,
    [owner],
    "constructor", // not actually needed since it's the default constructor
  );
  const tx = await deployMethod.send({
    from: deployerAddress,
  });
  const contract = await tx.deployed();
  return contract as CounterContract;
}
