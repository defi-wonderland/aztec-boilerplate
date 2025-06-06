import {
  waitForPXE,
  createPXEClient,
  AccountWallet,
  Contract,
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
 * @returns A deployed contract instance.
 */
export async function deployCounter(
  deployer: AccountWallet,
): Promise<CounterContract> {
  const receipt = await Contract.deploy(
    deployer,
    CounterContractArtifact,
    [deployer.getAddress()],
    "constructor",
  )
    .send()
    .wait();
  return receipt.contract as CounterContract;
}
