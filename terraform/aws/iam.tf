resource "aws_iam_role" "serverless_role" {
  name               = "serverless_role"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
}

data "aws_iam_policy_document" "assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_policy" "serverless_policy" {
  name   = "serverless_policy"
  policy = data.aws_iam_policy_document.serverless_policy.json
}

data "aws_iam_policy_document" "serverless_policy" {
  statement {
    sid = "1"
    actions = [
      "ssm:GetParameters",
      "ssm:GetParametersByPath",
    ]
    resources = [
      "arn:aws:ssm:ap-northeast-1:${var.aws_account_id}:parameter/SLACK_BOT_TOKEN",
      "arn:aws:ssm:ap-northeast-1:${var.aws_account_id}:parameter/SLACK_VERIFICATION_TOKEN",
      "arn:aws:ssm:ap-northeast-1:${var.aws_account_id}:parameter/OPENAI_API_KEY",
      "arn:aws:ssm:ap-northeast-1:${var.aws_account_id}:parameter/OPENAI_ASSISTANT_ID"
    ]
  }

  statement {
    sid = "2"
    actions = [
      "kms:Decrypt"
    ]
    resources = [
      "*",
    ]
  }

  statement {
    sid = "3"
    actions = [
      "logs:CreateLogStream",
      "logs:CreateLogGroup",
      "logs:TagResource"
    ]
    resources = [
      "arn:aws:logs:ap-northeast-1:${var.aws_account_id}:log-group:/aws/lambda/slack-callback:*",
      "arn:aws:logs:ap-northeast-1:${var.aws_account_id}:log-group:/aws/lambda/run-assistant:*"
    ]
  }

  statement {
    sid = "4"
    actions = [
      "logs:PutLogEvents"
    ]
    resources = [
      "arn:aws:logs:ap-northeast-1:${var.aws_account_id}:log-group:/aws/lambda/slack-callback:*:*",
      "arn:aws:logs:ap-northeast-1:${var.aws_account_id}:log-group:/aws/lambda/run-assistant:*:*"
    ]
  }

  statement {
    sid = "5"
    actions = [
      "lambda:InvokeFunction"
    ]
    resources = [
      "arn:aws:lambda:ap-northeast-1:${var.aws_account_id}:function:run-assistant"
    ]
  }

  statement {
    sid = "6"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem"
    ]
    resources = [
      "arn:aws:dynamodb:ap-northeast-1:${var.aws_account_id}:table/${aws_dynamodb_table.openai_thread.name}"
    ]
  }
}

resource "aws_iam_role_policy_attachment" "serverless_policy" {
  role       = aws_iam_role.serverless_role.name
  policy_arn = aws_iam_policy.serverless_policy.arn
}
