import { Wallet } from "@aztec/aztec.js/wallet";
import {
  CounterContract,
  CounterContractArtifact,
} from "../artifacts/Counter.js";
import { AztecAddress } from "@aztec/stdlib/aztec-address";
import { Contract } from "@aztec/aztec.js/contracts";

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
