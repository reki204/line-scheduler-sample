import { Hono } from "hono";
import { logger } from "hono/logger";
import { env } from "hono/adapter";
import { lineWebhookMiddleware } from "./lineWebhookMiddleware";
import { messagingApi, type WebhookEvent } from "@line/bot-sdk";
import { setScheduleReminders } from "./reminderService";

const app = new Hono();

app.use("*", logger());
app.use("/webhook", lineWebhookMiddleware);

app.get("/", (c) => c.text("Hello Hono!"));

app.post("/webhook", async (c) => {
  const { CHANNEL_ACCESS_TOKEN } = env<{ CHANNEL_ACCESS_TOKEN: string }>(c);
  const lineClient = new messagingApi.MessagingApiClient({
    channelAccessToken: CHANNEL_ACCESS_TOKEN,
  });

  const events: WebhookEvent[] = (await c.req.json()).events;
  for (const event of events) {
    if (event.type === "message" && event.message.type === "text") {
      const replyToken = event.replyToken;
      const userInputMessage = event.message.text;

      // スケジュール設定
      await setScheduleReminders(userInputMessage);

      await lineClient.replyMessage({
        replyToken,
        messages: [{ type: "text", text: `${userInputMessage}に設定しました。` }],
      });
    }
  }

  return c.json({ message: "Webhook received" });
});

export default app;
