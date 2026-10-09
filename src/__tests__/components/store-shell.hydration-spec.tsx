import "@testing-library/jest-dom/vitest";
import { createRequire } from "node:module";
import { startTransition, useEffect, type ReactNode } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { StoreShell } from "@/components/store-shell";

vi.mock("next/navigation", () => ({ usePathname: () => "/products" }));
vi.mock("@/components/route-scroll-restoration", () => ({ RouteScrollRestoration: () => null }));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a>,
}));
vi.mock("@/components/site-header", () => ({ SiteHeader: () => <nav>Shop navigation</nav> }));
vi.mock("@/components/site-footer", () => ({ SiteFooter: () => <footer>Shop footer</footer> }));

const require = createRequire(import.meta.url);
const { createFromReadableStream } =
  require("next/dist/compiled/react-server-dom-turbopack/client.browser") as {
    createFromReadableStream(
      stream: ReadableStream<Uint8Array>,
      options: {
        serverConsumerManifest: { moduleMap: null; serverModuleMap: null; moduleLoading: null };
      },
    ): PromiseLike<{ children: ReactNode }>;
  };

describe("StoreShell Flight hydration", () => {
  it("retains main when the server route child arrives after shell hydration begins", async () => {
    const encoder = new TextEncoder();
    let streamController!: ReadableStreamDefaultController<Uint8Array>;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        streamController = controller;
        controller.enqueue(encoder.encode('0:{"children":"$L1"}\n'));
      },
    });
    const response = await createFromReadableStream(stream, {
      serverConsumerManifest: { moduleMap: null, serverModuleMap: null, moduleLoading: null },
    });
    const container = document.createElement("div");
    document.body.append(container);
    container.innerHTML = renderToString(
      <StoreShell>
        <h1>Bottoms</h1>
      </StoreShell>,
    );
    const main = container.querySelector("main");
    const navigation = container.querySelector("nav");
    const footer = container.querySelector("footer");
    const onRecoverableError = vi.fn();
    let root!: ReturnType<typeof hydrateRoot>;
    let markCommitted!: () => void;
    const committed = new Promise<void>((resolve) => {
      markCommitted = resolve;
    });
    function HydrationProbe({ children }: { children: ReactNode }) {
      useEffect(() => markCommitted(), []);
      return children;
    }
    let markSuspended!: () => void;
    const suspended = new Promise<void>((resolve) => {
      markSuspended = resolve;
    });
    const child = response.children as unknown as {
      _init(payload: unknown): ReactNode;
      _payload: PromiseLike<ReactNode>;
    };
    // Initialize the Flight model on delivery, as the live route's readers do.
    void child._payload.then(() => {});
    const initialize = child._init;
    child._init = (payload) => {
      try {
        return initialize(payload);
      } catch (error) {
        // Deliver the actual Flight record before React's next scheduler task.
        // Waiting for a promise subscription instead would select the unwind path.
        markSuspended();
        throw error;
      }
    };
    try {
      // Match Next's concurrent hydration entrypoint.
      startTransition(() => {
        root = hydrateRoot(
          container,
          <HydrationProbe>
            <StoreShell>{response.children}</StoreShell>
          </HydrationProbe>,
          { onRecoverableError },
        );
      });
      await suspended;
      streamController.enqueue(encoder.encode('1:["$","h1",null,{"children":"Bottoms"}]\n'));
      streamController.close();
      await committed;
      expect(onRecoverableError).not.toHaveBeenCalled();
      expect(container.querySelector("main")).toBe(main);
      expect(container.querySelector("nav")).toBe(navigation);
      expect(container.querySelector("footer")).toBe(footer);
      expect(container.querySelector("main h1")).toHaveTextContent("Bottoms");
      expect(container.querySelectorAll("main")).toHaveLength(1);
    } finally {
      root?.unmount();
      container.remove();
    }
  });
});
