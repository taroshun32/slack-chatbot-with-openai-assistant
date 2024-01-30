import { handlerPath } from '@libs/handler-resolver'

export default {
  handler: `${handlerPath(__dirname)}/handler.main`,
  name:    'run-assistant',
  timeout: 150,
  maximumRetryAttempts: 0
}
