import { handlerPath } from '@libs/handler-resolver'

export default {
  handler: `${handlerPath(__dirname)}/handler.main`,
  name:    'slack-callback',
  events:  [
    {
      httpApi: {
        path:   '/callback',
        method: 'post',
      }
    }
  ],
  maximumRetryAttempts: 0
}
