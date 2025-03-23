import { handle } from "hono/aws-lambda";
import app from "../src/app";

/**
 * API Lambdaのハンドラー
 * APIリクエスト処理（LINE Webhook）のみを担当
 */
export const handler = handle(app);
