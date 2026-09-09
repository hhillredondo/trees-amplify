import { defineBackend } from "@aws-amplify/backend";
import { RemovalPolicy, Tags } from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { storage } from "./storage/resource";

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  storage,
});

// --- Custom resources (DynamoDB + SSM params); one stack per Amplify env (dev/prod) ---
const customStack = backend.createStack("custom-resources");

// Cost-allocation tag — Amplify Gen 2 creates one stack per feature, so tag each.
for (const stack of [
  backend.auth.stack,
  backend.data.stack,
  backend.storage.stack,
  customStack,
]) {
  Tags.of(stack).add("Project", "trees-amplify");
}

// Literal path for SSM params (required: token-based names break pipeline assembly).
// Amplify sets AWS_APP_ID and AWS_BRANCH in the build; sandbox uses branch or 'sandbox'.
const appId = process.env.AWS_APP_ID ?? "sandbox";
const branch = process.env.AWS_BRANCH ?? "sandbox";
const ssmParamPrefix = `/amplify/${appId}/${branch}`;

const mediaBucket = backend.storage.resources.bucket;
const userPool = backend.auth.resources.userPool;
const treeTable = backend.data.resources.tables["Tree"];

// Allow ECS task role to generate valid presigned GetObject URLs (browser uses them to load pics/photos).
// If 403 persists: (1) In S3 → bucket → Permissions, confirm a statement with Sid "AllowEcsTaskRoleGetObject" exists.
// (2) In ECS → task definition, confirm the task role ARN matches the principal below (or set ECS_TASK_ROLE_ARN_FOR_S3_READ).
const ecsTaskRoleArn = process.env.ECS_TASK_ROLE_ARN_FOR_S3_READ;
if (!ecsTaskRoleArn) {
  throw new Error(
    "ECS_TASK_ROLE_ARN_FOR_S3_READ must be set (the ECS task role that reads media " +
      "from the S3 bucket). It used to default to a hardcoded account-specific ARN, " +
      "which does not belong in a public repo and silently breaks in other accounts."
  );
}
mediaBucket.addToResourcePolicy(
  new iam.PolicyStatement({
    sid: "AllowEcsTaskRoleGetObject",
    effect: iam.Effect.ALLOW,
    principals: [new iam.ArnPrincipal(ecsTaskRoleArn)],
    actions: ["s3:GetObject"],
    resources: [`${mediaBucket.bucketArn}/*`],
  })
);

new ssm.StringParameter(customStack, "MediaBucketNameParam", {
  parameterName: `${ssmParamPrefix}/MediaBucketName`,
  stringValue: mediaBucket.bucketName,
});

new ssm.StringParameter(customStack, "UserPoolIdParam", {
  parameterName: `${ssmParamPrefix}/UserPoolId`,
  stringValue: userPool.userPoolId,
});

// Consumed by flask-tree-endpoints to verify the `aud` claim on incoming id
// tokens. Without it the API accepts a token from any app client in the pool.
new ssm.StringParameter(customStack, "UserPoolClientIdParam", {
  parameterName: `${ssmParamPrefix}/UserPoolClientId`,
  stringValue: backend.auth.resources.userPoolClient.userPoolClientId,
});

new ssm.StringParameter(customStack, "TreeTableNameParam", {
  parameterName: `${ssmParamPrefix}/TreeTableName`,
  stringValue: treeTable.tableName,
});

// TreeAcl: treeId (PK) + userId (SK) — who can do what on each tree
const treeAclTable = new dynamodb.Table(customStack, "TreeAcl", {
  partitionKey: { name: "treeId", type: dynamodb.AttributeType.STRING },
  sortKey: { name: "userId", type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  pointInTimeRecovery: true,
  removalPolicy: RemovalPolicy.RETAIN,
});

// TreeEditorLocks: one lock per treeId; TTL on expiresAt so locks auto-expire
const treeEditorLocksTable = new dynamodb.Table(
  customStack,
  "TreeEditorLocks",
  {
    partitionKey: { name: "treeId", type: dynamodb.AttributeType.STRING },
    billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    timeToLiveAttribute: "expiresAt",
    removalPolicy: RemovalPolicy.RETAIN,
  },
);

new ssm.StringParameter(customStack, "TreeAclTableNameParam", {
  parameterName: `${ssmParamPrefix}/TreeAclTableName`,
  stringValue: treeAclTable.tableName,
});

new ssm.StringParameter(customStack, "TreeEditorLocksTableNameParam", {
  parameterName: `${ssmParamPrefix}/TreeEditorLocksTableName`,
  stringValue: treeEditorLocksTable.tableName,
});
