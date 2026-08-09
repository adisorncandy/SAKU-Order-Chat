import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createApp } from "../../server.js";

const appPromise = createApp(false);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  req.url = `/api/facebook/webhook${req.url?.includes("?") ? req.url.slice(req.url.indexOf("?")) : ""}`;

  const app = await appPromise;
  return app(req, res);
}
