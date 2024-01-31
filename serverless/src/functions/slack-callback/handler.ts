import { APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda'
import { InvokeCommand, LambdaClient }                                         from '@aws-sdk/client-lambda'

import { WebClient }  from '@slack/web-api'
import { middyfy }    from '@libs/middleware/middy'
import { SSMContext } from '@libs/types/context'

import { RunAssistantEvent, SlackUrlVerificationEvent, SlackCallBackEvent } from '@libs/types/event'


const lambdaClient = new LambdaClient()

const handler: APIGatewayProxyHandler = async (
  event:   APIGatewayProxyEvent,
  context: SSMContext
): Promise<APIGatewayProxyResult> => {
  const request: SlackUrlVerificationEvent | SlackCallBackEvent = JSON.parse(event.body || '{}')
  console.debug({ request })

  switch (request.type) {
    case 'event_callback': {
      if (request.token !== context.SLACK_VERIFICATION_TOKEN)
        return { statusCode: 400, body: 'トークンが無効です。' }

      const slackClient = new WebClient(context.SLACK_BOT_TOKEN)

      await slackClient.reactions.add({
        channel:   request.event.channel,
        name:      'wait2',
        timestamp: request.event.ts
      })

      const event: RunAssistantEvent = {
        channel:         request.event.channel,
        text:            request.event.text.replaceAll(/<@U[0-9A-Z]+>/g, ''), // メンションを削除
        fileIds:         request.event.files?.map((file) => file.id) ?? [],
        ts:              request.event.ts,
        threadTs:        request.event.thread_ts,
        threadBroadcast: request.event.subtype === 'thread_broadcast'
      }
      await lambdaClient.send(
        new InvokeCommand({
          InvocationType: 'Event', // 非同期実行
          FunctionName:   'run-assistant',
          Payload:        JSON.stringify(event)
        })
      )

      return {
        statusCode: 200,
        body:       '',
        headers:    {
          'Content-Type': 'text/plain'
        }
      }
    }
    case 'url_verification':
      return {
        statusCode: 200,
        body:       request.challenge,
        headers:    {
          'Content-Type': 'application/json'
        }
      }
  }
}

export const main = middyfy(handler)
