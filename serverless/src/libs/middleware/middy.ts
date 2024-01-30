import middy from '@middy/core'
import ssm   from '@middy/ssm'
import { errorHandler } from '@libs/middleware/errorHandler'

export const middyfy = (handler) => {
  return middy(handler)
    .use(ssm({
      fetchData: {
        SLACK_BOT_TOKEN:          'SLACK_BOT_TOKEN',
        SLACK_VERIFICATION_TOKEN: 'SLACK_VERIFICATION_TOKEN',
        OPENAI_API_KEY:           'OPENAI_API_KEY',
        OPENAI_ASSISTANT_ID:      'OPENAI_ASSISTANT_ID'
      },
      setToContext: true
    }))
    .use(errorHandler())
}
