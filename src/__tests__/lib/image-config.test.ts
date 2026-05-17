import { describe, expect, it } from "vitest";
import { buildRemoteImagePatterns } from "@/lib/image-config";

describe("buildRemoteImagePatterns", () => {
  it("allows comma-separated Railway image hosts from the environment", () => {
    expect(buildRemoteImagePatterns("minio-staging-0e36.up.railway.app,cdn.example.com")).toEqual([
      { protocol: "https", hostname: "minio-staging-0e36.up.railway.app" },
      { protocol: "https", hostname: "cdn.example.com" },
    ]);
  });
});
