// @vitest-environment node
import { createServer, type Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServerlessApp } from "./entry";

describe("Vercel serverless entry", () => {
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    server = createServer(createServerlessApp());
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Test server did not bind.");
    }
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it.each([
    ["/api/persistence/stories", "persistence"],
    ["/api/foundation/media-assets/1dc21be2-63c0-47bd-a086-980e44d67029", "permanent media"],
  ])("mounts the %s route and rejects unauthenticated requests before service access", async (path) => {
    const response = await fetch(`${baseUrl}${path}`);

    expect(response.status).toBe(401);
    expect(response.status).not.toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "unauthenticated" },
    });
  });
});
