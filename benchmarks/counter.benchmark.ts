import { type Wallet } from "@aztec/aztec.js/wallet";
import { AztecAddress } from "@aztec/aztec.js/addresses";
import { createAztecNodeClient, waitForNode } from "@aztec/aztec.js/node";
import { type ContractFunctionInteractionCallIntent } from "@aztec/aztec.js/authorization";
import {
  registerInitialLocalNetworkAccountsInWallet,
  TestWallet,
} from "@aztec/test-wallet/server";
import {
  Benchmark,
  type BenchmarkContext,
} from "@defi-wonderland/aztec-benchmark";
import { deriveKeys, generatePublicKey } from "@aztec/aztec.js/keys";
import { Fr } from "@aztec/aztec.js/fields";
import { computePartialAddress } from "@aztec/stdlib/contract";
import { GrumpkinScalar } from "@aztec/foundation/curves/grumpkin";
import { Capsule } from "@aztec/stdlib/tx";
import { poseidon2Hash } from "@aztec/foundation/crypto/poseidon";
import { getContractClassFromArtifact } from "@aztec/aztec.js/contracts";
import { computeContractAddressFromInstance } from "@aztec/stdlib/contract";
import { PublicKeys } from "@aztec/stdlib/keys";

import { ConstantContractContract } from "../src/artifacts/ConstantContract.js";

// Extend the BenchmarkContext from the new package
interface CounterBenchmarkContext extends BenchmarkContext {
  wallet: Wallet;
  deployer: AztecAddress;
  accounts: AztecAddress[];
  counterContract: ConstantContractContract;
  nonInitializedContract: ConstantContractContract;
  constantsSlot: Fr;
  constantsData: Fr[];
}

// Use export default class extending Benchmark
export default class CounterContractBenchmark extends Benchmark {
  /**
   * Sets up the benchmark environment for the CounterContract.
   * Creates PXE client, gets accounts, and deploys the contract.
   */
  async setup(): Promise<CounterBenchmarkContext> {
    const aztecNode = createAztecNodeClient("http://localhost:8080");
    await waitForNode(aztecNode);

    const wallet: TestWallet = await TestWallet.create(aztecNode);
    const accounts: AztecAddress[] =
      await registerInitialLocalNetworkAccountsInWallet(wallet);

    const [deployer] = accounts;

    // Generate a secret key for the contract to derive its viewing keys
    const contractSecretKey = Fr.random();

    // Derive public keys (including incoming viewing public key) from the secret
    const contractPublicKeys = (await deriveKeys(contractSecretKey)).publicKeys;

    // Generate a valid signing key pair
    const signingPrivateKey = GrumpkinScalar.random();
    const signingPublicKey = await generatePublicKey(signingPrivateKey);

    // Create the deployment with the public keys
    const counterDeployment = ConstantContractContract.deployWithPublicKeys(
      contractPublicKeys,
      wallet,
      signingPublicKey.x, // signing_pub_key_x
      signingPublicKey.y, // signing_pub_key_y
    );

    // Get the instance to compute the partial address
    const counterInstance = await counterDeployment.getInstance();

    // Register the contract's keys with PXE so it can decrypt notes sent during deployment
    const pxe = (wallet as any).pxe;
    await pxe.registerAccount(
      contractSecretKey,
      await computePartialAddress(counterInstance),
    );

    // Now deploy the contract
    const counterContract = await counterDeployment
      .send({ from: deployer })
      .deployed();

    // Create capsule for fetch_from_constants benchmark
    // The CONSTANTS_SLOT value from the contract
    const CONSTANTS_SLOT = new Fr(0x31415926535n);

    // Create Constants struct: { signing_public_key: PublicKeyNote { x, y } }
    // When serialized, this is just [x, y]
    const constantsData = [
      new Fr(signingPublicKey.x),
      new Fr(signingPublicKey.y),
    ];

    // Deploy a non-initialized contract with proper initialization_hash
    // Compute the constants_commitment which should match initialization_hash
    const constantsCommitment = await poseidon2Hash(constantsData);

    // Get the contract class from the artifact
    const contractClass = await getContractClassFromArtifact(
      ConstantContractContract.artifact,
    );

    // Create contract instance with initialization_hash = constants_commitment
    const nonInitializedInstance = {
      version: 1 as const,
      salt: Fr.random(),
      deployer: AztecAddress.ZERO,
      currentContractClassId: contractClass.id,
      originalContractClassId: contractClass.id,
      initializationHash: constantsCommitment,
      publicKeys: contractPublicKeys,
    };

    // Compute the address for this instance
    const nonInitializedAddress = await computeContractAddressFromInstance(
      nonInitializedInstance,
    );

    // Create the full instance with address
    const nonInitializedInstanceWithAddress = {
      ...nonInitializedInstance,
      address: nonInitializedAddress,
    };

    // Register the non-initialized contract with the wallet
    await wallet.registerContract(
      nonInitializedInstanceWithAddress,
      ConstantContractContract.artifact,
    );

    // Create a ConstantContractContract instance for the non-initialized contract
    const nonInitializedContract = await ConstantContractContract.at(
      nonInitializedAddress,
      wallet,
    );

    return {
      wallet,
      deployer,
      accounts,
      counterContract,
      nonInitializedContract,
      constantsSlot: CONSTANTS_SLOT,
      constantsData,
    };
  }

  /**
   * Returns the list of CounterContract methods to be benchmarked.
   */
  getMethods(
    context: CounterBenchmarkContext,
  ): ContractFunctionInteractionCallIntent[] {
    const {
      counterContract,
      nonInitializedContract,
      wallet,
      deployer,
      constantsSlot,
      constantsData,
    } = context;

    // Create capsule only for the non-initialized contract
    const capsule = new Capsule(
      nonInitializedContract.address,
      constantsSlot,
      constantsData,
    );

    const methods: ContractFunctionInteractionCallIntent[] = [
      {
        caller: deployer,
        action: counterContract.withWallet(wallet).methods.do_nothing(),
      },
      {
        caller: deployer,
        action: counterContract.withWallet(wallet).methods.fetch_from_storage(),
      },
      {
        caller: deployer,
        action: nonInitializedContract
          .withWallet(wallet)
          .methods.fetch_from_constants()
          .with({ capsules: [capsule] }),
      },
    ];

    return methods;
  }
}
