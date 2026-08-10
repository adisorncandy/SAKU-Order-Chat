import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createApp } from "../../server.js";

const appPromise = createApp(false);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.url && !req.url.startsWith("/api/orders")) {
    req.url = `/api/orders${req.url.startsWith("/") ? "" : "/"}${req.url}`;
  }

  const app = await appPromise;
  return app(req, res);
}
