import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createApp } from "../../server.js";

const appPromise = createApp(false);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  req.url = `/api/products${req.url?.startsWith("/") ? "" : "/"}${req.url || ""}`;

  const app = await appPromise;
  return app(req, res);
}
