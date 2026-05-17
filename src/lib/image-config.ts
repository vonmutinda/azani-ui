type RemoteImagePattern = {
  protocol: "http" | "https";
  hostname: string;
  port?: string;
};

export function buildRemoteImagePatterns(hosts: string | undefined): RemoteImagePattern[] {
  if (!hosts) return [];

  const seen = new Set<string>();

  return hosts
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean)
    .map((host) => {
      try {
        const url = new URL(host.includes("://") ? host : `https://${host}`);
        return {
          protocol: url.protocol.replace(":", "") as "http" | "https",
          hostname: url.hostname,
          ...(url.port ? { port: url.port } : {}),
        };
      } catch {
        return undefined;
      }
    })
    .filter((pattern): pattern is RemoteImagePattern => Boolean(pattern))
    .filter((pattern) => {
      const key = `${pattern.protocol}:${pattern.hostname}:${pattern.port ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
