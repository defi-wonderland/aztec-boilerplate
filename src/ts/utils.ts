import {
  waitForPXE,
  createPXEClient,
  AccountWallet,
  Contract,
  AztecAddress,
} from "@aztec/aztec.js";
import {
  CounterContract,
  CounterContractArtifact,
} from "../artifacts/Counter.js";

export const createPXE = async (id: number = 0) => {
  const { BASE_PXE_URL = `http://localhost` } = process.env;
  const url = `${BASE_PXE_URL}:${8080 + id}`;
  const pxe = createPXEClient(url);
  await waitForPXE(pxe);
  return pxe;
};

export const setupSandbox = async () => {
  return createPXE();
};

/**
 * Deploys the Counter contract.
 * @param deployer - The wallet to deploy the contract with.
 * @param owner - The address of the owner of the contract.
 * @returns A deployed contract instance.
 */
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
