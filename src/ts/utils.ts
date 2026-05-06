import { Wallet } from "@aztec/aztec.js/wallet";
import { CounterContract } from "../artifacts/Counter.js";
import { AztecAddress } from "@aztec/stdlib/aztec-address";

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
  const { contract } = await CounterContract.deploy(deployer, owner).send({
    from: deployerAddress,
  });
  return contract;
}
