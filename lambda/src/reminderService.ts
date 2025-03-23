import {
  SchedulerClient,
  CreateScheduleCommand,
  CreateScheduleCommandInput,
} from "@aws-sdk/client-scheduler";

const schedulerClient = new SchedulerClient({
  region: "ap-northeast-1",
});

const LAMBDA_ARN = process.env.REMINDER_HANDLER_ARN || "";
const SCHEDULER_ROLE_ARN = process.env.SCHEDULER_ROLE_ARN || "";

/**
 * EventBridge Schedulerを登録する
 *
 * @param scheduleTime スケジュール時間
 */
export const setScheduleReminders = async (scheduleTime: string) => {
  const [hour, minute] = scheduleTime.split(":");
  const cronExpression = `cron(${minute} ${hour} * * ? *)`;

  const scheduleName = `sample-reminder-${hour}${minute}`;

  const inputPayload = JSON.stringify({
    type: "SAMPLE_REMINDER",
    scheduledTime: scheduleTime,
  });

  const createScheduleParams: CreateScheduleCommandInput = {
    Name: scheduleName,
    ScheduleExpression: cronExpression,
    ScheduleExpressionTimezone: "Asia/Tokyo",
    FlexibleTimeWindow: { Mode: "OFF" },
    Target: {
      Arn: LAMBDA_ARN,
      RoleArn: SCHEDULER_ROLE_ARN,
      Input: inputPayload,
    },
  };

  try {
    await schedulerClient.send(new CreateScheduleCommand(createScheduleParams));
    console.log("Created schedule:", scheduleName);
  } catch (error) {
    console.error("Error creating schedule:", error);
  }
};
