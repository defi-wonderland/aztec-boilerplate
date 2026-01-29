import { readFile } from "node:fs/promises";

export type ArtifactRegistryUploadResponse =
  | {
      success: true;
      filename?: string;
      classId?: string;
      contractName?: string;
      functionCount?: number;
      [key: string]: unknown;
    }
  | {
      success: false;
      error?: string;
      message?: string;
      [key: string]: unknown;
    };

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

export function getArtifactRegistryBaseUrl(): string {
  return (
    process.env.AZTEC_ARTIFACT_REGISTRY_URL ??
    "https://devnet.aztec-registry.xyz/"
  );
}

export function shouldUploadArtifacts(): boolean {
  const v = process.env.AZTEC_ARTIFACT_REGISTRY_UPLOAD ?? "";
  return v === "1" || v.toLowerCase() === "true";
}

export function isStrictUpload(): boolean {
  const v = process.env.AZTEC_ARTIFACT_REGISTRY_STRICT ?? "";
  return v === "1" || v.toLowerCase() === "true";
}

export async function uploadArtifactToRegistry(params: {
  artifact: unknown;
  filename: string;
  registryBaseUrl?: string;
}): Promise<ArtifactRegistryUploadResponse> {
  const base = normalizeBaseUrl(
    params.registryBaseUrl ?? getArtifactRegistryBaseUrl(),
  );
  const uploadUrl = new URL("api/upload", base).toString();

  const body = new FormData();
  const payload = JSON.stringify(params.artifact);
  body.set(
    "file",
    new Blob([payload], { type: "application/json" }),
    params.filename,
  );

  const res = await fetch(uploadUrl, { method: "POST", body });

  // The registry commonly returns JSON even on 409; treat duplicates as non-fatal by default.
  const text = await res.text();
  const parsed: unknown = text ? safeJsonParse(text) : { success: res.ok };

  if (res.ok) {
    return (parsed as ArtifactRegistryUploadResponse) ?? { success: true };
  }

  // Duplicate artifact (already uploaded) should not break deploys unless strict mode is enabled.
  if (res.status === 409) {
    return (
      (parsed as ArtifactRegistryUploadResponse) ?? {
        success: true,
        message: "Artifact already exists in registry",
      }
    );
  }

  const msg =
    typeof parsed === "object" && parsed
      ? JSON.stringify(parsed)
      : text || `HTTP ${res.status} ${res.statusText}`;
  throw new Error(`Artifact registry upload failed (${res.status}): ${msg}`);
}

export async function uploadArtifactFileToRegistry(params: {
  artifactPath: string;
  filename?: string;
  registryBaseUrl?: string;
}): Promise<ArtifactRegistryUploadResponse> {
  const buf = await readFile(params.artifactPath, "utf8");
  const artifact = JSON.parse(buf) as unknown;
  const filename =
    params.filename ?? params.artifactPath.split("/").pop() ?? "artifact.json";
  return await uploadArtifactToRegistry({
    artifact,
    filename,
    registryBaseUrl: params.registryBaseUrl,
  });
}

export async function maybeUploadArtifactToRegistry(params: {
  artifact: unknown;
  filename: string;
  registryBaseUrl?: string;
}): Promise<ArtifactRegistryUploadResponse | null> {
  if (!shouldUploadArtifacts()) return null;
  try {
    const resp = await uploadArtifactToRegistry(params);
    return resp;
  } catch (err) {
    if (isStrictUpload()) throw err;
    // Best-effort upload; do not fail deployments by default.
    console.warn(
      `[artifact-registry] Upload failed (continuing): ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return null;
  }
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}
