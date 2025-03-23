import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as iam from "aws-cdk-lib/aws-iam";

export class LineSchedulerSampleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const channelAccessToken = ssm.StringParameter.valueForStringParameter(
      this,
      "sample-channel-access-token"
    );
    const channelSecret = ssm.StringParameter.valueForStringParameter(
      this,
      "sample-channel-secret"
    );
    const userId = ssm.StringParameter.valueForStringParameter(this, "user-id");

    // EventBridge SchedulerからReminder Lambdaを呼び出すためのIAMロール
    const schedulerRole = new iam.Role(this, "SchedulerRole", {
      assumedBy: new iam.ServicePrincipal("scheduler.amazonaws.com"),
      description: "Role for EventBridge Scheduler to invoke Lambda",
    });
    // Reminder LambdaのARNに対してのみInvoke権限を付与
    schedulerRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ["lambda:InvokeFunction"],
        resources: [],
      })
    );

    // API Handler Lambda用のIAMロール
    const apiHandlerLambdaRole = new iam.Role(this, "ApiHandlerLambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      description: "API Handler Lambda execution role",
    });
    // API Handler LambdaがEventBridge Schedulerに対してスケジュールを作成できる権限
    apiHandlerLambdaRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ["scheduler:CreateSchedule"],
        resources: [
          `arn:aws:scheduler:${this.region}:${this.account}:schedule/default/sample-reminder-*`,
        ],
      })
    );
    // API Handler LambdaがschedulerRoleをPassRoleできるようにする
    apiHandlerLambdaRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["iam:PassRole"],
        resources: [schedulerRole.roleArn],
      })
    );

    // Reminder Handler Lambda (EventBridge Schedulerからの呼び出し専用)
    const reminderHandlerLambda = new NodejsFunction(
      this,
      "sampleReminderHandler",
      {
        entry: "lambda/reminder-handler/index.ts",
        handler: "handler",
        runtime: lambda.Runtime.NODEJS_20_X,
        environment: {
          CHANNEL_ACCESS_TOKEN: channelAccessToken,
          USER_ID: userId,
          ENV: "production",
        },
        timeout: cdk.Duration.seconds(30),
      }
    );
    // SchedulerからのInvoke許可を付与
    reminderHandlerLambda.addPermission("AllowSchedulerInvoke", {
      principal: new iam.ServicePrincipal("scheduler.amazonaws.com"),
      action: "lambda:InvokeFunction",
      sourceArn: `arn:aws:scheduler:${this.region}:${this.account}:schedule/*`,
    });
    // schedulerRoleにReminder LambdaのInvoke対象のARNを設定
    schedulerRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ["lambda:InvokeFunction"],
        resources: [reminderHandlerLambda.functionArn],
      })
    );

    // API Handler Lambda (APIリクエスト処理用)
    const apiHandlerLambda = new NodejsFunction(this, "sampleApiHandler", {
      entry: "lambda/api-handler/index.ts",
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_20_X,
      role: apiHandlerLambdaRole,
      environment: {
        CHANNEL_ACCESS_TOKEN: channelAccessToken,
        CHANNEL_SECRET: channelSecret,
        ENV: "production",
        REMINDER_HANDLER_ARN: reminderHandlerLambda.functionArn,
        SCHEDULER_ROLE_ARN: schedulerRole.roleArn,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // API Gatewayの作成（Webhook用エンドポイント）
    new apigw.LambdaRestApi(this, "LineSchedulerSample", {
      handler: apiHandlerLambda,
    });
  }
}
