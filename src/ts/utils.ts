import { Wallet } from "@aztec/aztec.js/wallet";
import {
  CounterContract,
  CounterContractArtifact,
} from "../artifacts/Counter.js";
import { AztecAddress } from "@aztec/stdlib/aztec-address";
import { Contract } from "@aztec/aztec.js/contracts";
import { PXE } from "@aztec/pxe/server";

// export const createPXE = async (id: number = 0) => {
//   const { BASE_PXE_URL = `http://localhost` } = process.env;
//   const url = `${BASE_PXE_URL}:${8080 + id}`;
//   const pxe = await PXE.create(
//     node, store,
//   )
//   // await waitForPXE(pxe);
//   return pxe;
// };

// export const setupSandbox = async () => {
//   return createPXE();
// };

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
  const contract = await Contract.deploy(
    deployer,
    CounterContractArtifact,
    [owner],
    "constructor", // not actually needed since it's the default constructor
  )
    .send({
      from: deployerAddress,
    })
    .deployed();
  return contract as CounterContract;
}
