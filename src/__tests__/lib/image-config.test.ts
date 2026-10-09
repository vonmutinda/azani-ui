import { describe, expect, it } from "vitest";
import { buildRemoteImagePatterns, getRemoteImagePatterns } from "@/lib/image-config";

describe("buildRemoteImagePatterns", () => {
  it("allows comma-separated Railway image hosts from the environment", () => {
    expect(buildRemoteImagePatterns("minio-staging-0e36.up.railway.app,cdn.example.com")).toEqual([
      { protocol: "https", hostname: "minio-staging-0e36.up.railway.app" },
      { protocol: "https", hostname: "cdn.example.com" },
    ]);
  });
});

it("shares default and configured hosts with the category artwork reader", () => {
  expect(getRemoteImagePatterns("https://minio-staging-0e36.up.railway.app")).toContainEqual({
    protocol: "https",
    hostname: "minio-staging-0e36.up.railway.app",
  });
  expect(getRemoteImagePatterns(undefined)).toContainEqual({
    protocol: "https",
    hostname: "minio-production-5367.up.railway.app",
  });
  expect(getRemoteImagePatterns(undefined)).not.toContainEqual({
    protocol: "http",
    hostname: "localhost",
    port: "9002",
  });
  expect(getRemoteImagePatterns(undefined, true)).toContainEqual({
    protocol: "http",
    hostname: "localhost",
    port: "9002",
  });
});
