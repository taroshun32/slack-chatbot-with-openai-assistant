import { Context } from 'aws-lambda'

export interface SSMContext extends Context {
  SLACK_BOT_TOKEN:          string,
  SLACK_VERIFICATION_TOKEN: string,
  OPENAI_API_KEY:           string,
  OPENAI_ASSISTANT_ID:      string
}
