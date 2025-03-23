import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { env } from "hono/adapter";
import { validateSignature } from "@line/bot-sdk";

export const lineWebhookMiddleware = createMiddleware(async (c, next) => {
  const signature = c.req.header("x-line-signature");
  const body = await c.req.text();
  const { CHANNEL_SECRET } = env<{ CHANNEL_SECRET: string }>(c);

  if (!signature || !CHANNEL_SECRET)
    throw new HTTPException(400, {
      message: "署名またはCHANNEL_SECRETが見つかりません",
    });
  if (!validateSignature(body, CHANNEL_SECRET, signature))
    throw new HTTPException(403, { message: "無効な署名です" });

  await next();
});
