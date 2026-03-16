/**
 * Hypothesis: what parts of B propagate into A's class ID?
 *
 * Setup
 * ─────
 * contract_b_v1  ContractB { fn compute(x: u64) -> u64 { x + 1 } }
 *                no storage
 *
 * contract_b_v2  ContractB { fn compute(x: u64) -> u64 { x * 2 } }  ← same signature, different body
 *                            + fn extra_public(x: u64, y: u64) -> u64
 *                            + fn extra_private(secret: Field)
 *                            + storage { counter: PublicMutable<u64> }
 *
 * contract_a1    ContractA (stores B address, calls B.compute via self.enqueue)
 *                depends on contract_b_v1 (aliased as `contract_b`)
 * contract_a2    identical Noir source to A1
 *                depends on contract_b_v2 (aliased as `contract_b`)
 *
 * Findings
 * ────────
 * A's ACIR bytecode    → identical (B's function body / extra functions never inline)
 * A's artifact hash    → identical (private fn + utility fn bytecodes unchanged)
 * A's metadata hash    → DIFFERS   (B's storage slot map is baked into A's outputs.globals)
 * A's class ID         → DIFFERS   (metadata hash feeds into artifact hash -> class ID)
 * A's deployed address → DIFFERS   (class ID feeds into partial_address -> address)
 */
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import {
  computeContractClassId,
  computeArtifactMetadataHash,
  getContractClassFromArtifact,
  getContractInstanceFromInstantiationParams,
} from "@aztec/stdlib/contract";
import { AztecAddress } from "@aztec/stdlib/aztec-address";
import { Fr } from "@aztec/aztec.js/fields";
import { join } from "path";

const TARGET = join(process.cwd(), "target");

function loadArtifact(filename: string) {
  return JSON.parse(readFileSync(join(TARGET, filename), "utf8"));
}

describe("Cross-contract class-ID hypothesis", () => {
  let classIdA1: string;
  let classIdA2: string;
  let classIdB1: string;
  let classIdB2: string;

  let callB1Bytecode: string;
  let callB2Bytecode: string;

  const DEPLOYER = AztecAddress.fromField(new Fr(0xdeadbeefn));
  const SALT = new Fr(42n);
  const B_ADDRESS = AztecAddress.fromField(new Fr(0xb0b0b0b0n));

  let addrA1: string;
  let addrA2: string;

  beforeAll(async () => {
    const [a1Art, a2Art, b1Art, b2Art] = [
      loadArtifact("contract_a1-ContractA.json"),
      loadArtifact("contract_a2-ContractA.json"),
      loadArtifact("contract_b_v1-ContractB.json"),
      loadArtifact("contract_b_v2-ContractB.json"),
    ];

    const [classA1, classA2, classB1, classB2] = await Promise.all([
      getContractClassFromArtifact(a1Art),
      getContractClassFromArtifact(a2Art),
      getContractClassFromArtifact(b1Art),
      getContractClassFromArtifact(b2Art),
    ]);

    [classIdA1, classIdA2, classIdB1, classIdB2] = await Promise.all(
      [classA1, classA2, classB1, classB2].map((c) =>
        computeContractClassId(c).then((id) => id.toString()),
      ),
    );

    callB1Bytecode = a1Art.functions.find(
      (f: { name: string }) => f.name === "call_b",
    )?.bytecode;
    callB2Bytecode = a2Art.functions.find(
      (f: { name: string }) => f.name === "call_b",
    )?.bytecode;

    const opts = {
      constructorArgs: [B_ADDRESS],
      salt: SALT,
      deployer: DEPLOYER,
    };
    const [inst1, inst2] = await Promise.all([
      getContractInstanceFromInstantiationParams(a1Art, opts),
      getContractInstanceFromInstantiationParams(a2Art, opts),
    ]);
    addrA1 = inst1.address.toString();
    addrA2 = inst2.address.toString();
  });

  describe("B's function bodies and extra functions do NOT affect A's circuit", () => {
    it("A1.call_b and A2.call_b ACIR bytecodes are byte-for-byte identical", () => {
      // The macro embeds only the selector constant (hash of the signature
      // "compute(u64)"). B's body, extra_public, and extra_private never appear
      // in A's ACIR — so both A1 and A2 compile to the exact same private circuit.
      expect(callB1Bytecode).toBeDefined();
      expect(callB1Bytecode).toBe(callB2Bytecode);
    });

    it("B1 and B2 have different AVM bytecodes — B versions are genuinely different", () => {
      const b1Fn = loadArtifact("contract_b_v1-ContractB.json").functions.find(
        (f: { name: string }) => f.name === "compute",
      );
      const b2Fn = loadArtifact("contract_b_v2-ContractB.json").functions.find(
        (f: { name: string }) => f.name === "compute",
      );
      expect(b1Fn.bytecode).not.toBe(b2Fn.bytecode);
    });

    it("B2 has extra functions that B1 does not", () => {
      const b1Names = loadArtifact(
        "contract_b_v1-ContractB.json",
      ).functions.map((f: { name: string }) => f.name);
      const b2Names = loadArtifact(
        "contract_b_v2-ContractB.json",
      ).functions.map((f: { name: string }) => f.name);
      expect(b2Names).toContain("extra_public");
      expect(b2Names).toContain("extra_private");
      expect(b1Names).not.toContain("extra_public");
      expect(b1Names).not.toContain("extra_private");
    });
  });

  describe("B's storage layout DOES propagate into A's artifact metadata", () => {
    it("B_v2 has storage that B_v1 does not", () => {
      const b1Art = loadArtifact("contract_b_v1-ContractB.json");
      const b2Art = loadArtifact("contract_b_v2-ContractB.json");
      expect(b1Art.outputs?.globals?.storage).toBeUndefined();
      expect(b2Art.outputs?.globals?.storage).toBeDefined();
    });

    it("A2's outputs.globals embeds B_v2's storage layout; A1's does not", () => {
      const a1Art = loadArtifact("contract_a1-ContractA.json");
      const a2Art = loadArtifact("contract_a2-ContractA.json");
      const findBLayout = (art: ReturnType<typeof loadArtifact>) =>
        art.outputs?.globals?.storage?.find(
          (g: { fields: { name: string; value: { value: string } }[] }) =>
            g.fields?.some(
              (f) =>
                f.name === "contract_name" && f.value?.value === "ContractB",
            ),
        );
      expect(JSON.stringify(findBLayout(a1Art))).not.toBe(
        JSON.stringify(findBLayout(a2Art)),
      );
    });

    it("A1 and A2 artifact metadata hashes differ", async () => {
      const [m1, m2] = await Promise.all([
        computeArtifactMetadataHash(loadArtifact("contract_a1-ContractA.json")),
        computeArtifactMetadataHash(loadArtifact("contract_a2-ContractA.json")),
      ]);
      expect(m1.toString()).not.toBe(m2.toString());
    });

    it("A1 and A2 class IDs differ", () => {
      expect(classIdA1).not.toBe(classIdA2);
    });

    it("A1 and A2 deployed with identical (deployer, salt, constructorArgs) land at different addresses", () => {
      // address = pedersen([partial_address, public_keys_hash])
      // partial_address = pedersen([class_id, salted_init_hash])
      // class_id differs -> partial_address differs -> address differs
      expect(addrA1).not.toBe(addrA2);
    });
  });

  describe("B's extra private function affects B's own class ID", () => {
    it("B1 and B2 have different class IDs because B2 has extra_private (new VK in privateFunctionsRoot)", () => {
      expect(classIdB1).not.toBe(classIdB2);
    });
  });
});
