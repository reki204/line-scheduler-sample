import { messagingApi } from "@line/bot-sdk";

/**
 * Reminder Handler Lambdaのハンドラー
 * EventBridge Schedulerからのイベント処理のみを担当
 */
export const handler = async (event: any) => {
  if (event.type === "SAMPLE_REMINDER") {
    await sendMedicationReminder(event.scheduledTime);
    return { statusCode: 200, body: "リマインダー通知が成功しました。" };
  }

  return { statusCode: 400, body: "リマインダー通知に失敗しました。" };
};

/**
 * リマインダー通知をLINEに送信する
 *
 * @param scheduledTime スケジュール時間
 */
const sendMedicationReminder = async (scheduledTime: string) => {
  // LINEクライアント作成 (環境変数からトークンを取得)
  const lineClient = new messagingApi.MessagingApiClient({
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN!,
  });

  const userId = process.env.USERID!;
  // リマインダーメッセージ
  const message = `予定時間: ${scheduledTime}にお知らせしています。`;

  // クイックリプライボタン付きでメッセージを送信
  await lineClient.pushMessage({
    to: userId,
    messages: [
      {
        type: "text",
        text: message,
      },
    ],
  });
};
