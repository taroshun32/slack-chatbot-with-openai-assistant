import { inspect }   from 'util'
import { Handler }   from 'aws-lambda'
import { OpenAI }    from 'openai'
import { WebClient } from '@slack/web-api'

import { DynamoDBClient }                                 from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'

import { middyfy }           from '@libs/middleware/middy'
import { SSMContext }        from '@libs/types/context'
import { RunAssistantEvent } from '@libs/types/event'
import { AlreadyRunning }    from '@libs/types/error/already-running'

import { downloadFileFromSlack }  from '@libs/download-file-from-slack'
import { uploadFileToOpenAI }     from '@libs/upload-file-to-openai'


const dynamodbClient = new DynamoDBClient()
const documentClient = DynamoDBDocumentClient.from(dynamodbClient)

const handler: Handler = async (
  event:   RunAssistantEvent,
  context: SSMContext
) => {
  console.debug({ event })
  const openai      = new OpenAI({ apiKey: context.OPENAI_API_KEY })
  const slackClient = new WebClient(context.SLACK_BOT_TOKEN)

  try {
    const replies = await chat(event, slackClient, openai, context.OPENAI_ASSISTANT_ID)
    await postMessage(slackClient, event, replies)
  } catch (error) {
    if (error instanceof AlreadyRunning) {
      await postMessage(slackClient, event, ['同時に複数の質問はできません。'])
      console.warn({
        body: 'Thread is already running.',
        run:  error.run
      })
      return
    }

    await postMessage(slackClient, event, ['エラーが発生しました。'])
    throw error
  }
}

/**
 * Slack にメッセージを送信する。
 */
async function postMessage(slackClient: WebClient, event: RunAssistantEvent, texts: string[]) {
  await slackClient.chat.postMessage({
    channel:         event.channel,
    thread_ts:       event.threadTs ?? event.ts,
    text:            texts.join('\n'),
    reply_broadcast: event.threadBroadcast || undefined,
    blocks:          texts.map((text) => ({ type: 'section', text: { type: 'mrkdwn', text } }))
  })
}

/**
 * AssistantAPI を使用して Chat を構築する。
 */
export async function chat(
  event:       RunAssistantEvent,
  slackClient: WebClient,
  openai:      OpenAI,
  assistantId: string
): Promise<string[]> {
  const assistant = await openai.beta.assistants.retrieve(assistantId)
  const thread    = await createOrGetThread(event, openai)

  const runs    = await openai.beta.threads.runs.list(thread.id)
  const running = runs.data.find(run => run.status === 'in_progress')
  if (running) throw new AlreadyRunning(running)

  const fileIds = await Promise.all(
    event.fileIds.map(async fileId => {
      const filePath = await downloadFileFromSlack(slackClient, fileId)
      return uploadFileToOpenAI(openai, filePath)
    })
  )

  await openai.beta.threads.messages.create(thread.id, {
    role:     'user',
    content:  event.text,
    file_ids: fileIds
  })

  const run = await openai.beta.threads.runs.create(thread.id, {
    assistant_id: assistant.id
  })
  await checkRunStatus(openai, thread.id, run.id)

  const messages = await openai.beta.threads.messages.list(thread.id)
  console.debug(inspect({ messages: messages.data }, false, null, true))

  const result = []
  for (const message of messages.data) {
    if (message.role === 'user') break
    for (const c of message.content) {
      switch (c.type) {
        case 'text':
          result.push(c.text.value)
          break
        case 'image_file':
          result.push(
            '画像の生成は未対応です。'
          )
      }
    }
  }
  return result.reverse()
}

/**
 * 既存のスレッドを取得し、存在しない場合は新しいスレッドを作成する。
 */
async function createOrGetThread(
  event:  RunAssistantEvent,
  openai: OpenAI
): Promise<OpenAI.Beta.Threads.Thread> {
  const threadTs = event.threadTs ?? event.ts

  const record = await documentClient.send(
    new GetCommand({
      TableName: process.env.OPENAI_THREAD_TABLE,
      Key:       { threadTs }
    })
  )

  if (record.Item) return openai.beta.threads.retrieve(record.Item.threadId)

  const thread = await openai.beta.threads.create()

  await documentClient.send(
    new PutCommand({
      TableName: process.env.OPENAI_THREAD_TABLE,
      Item: {
        threadTs:   threadTs,
        threadId:   thread.id,
        expiration: (Math.floor(Date.now() / 1000) + 3 * 24 * 60 * 60).toString() // 3日で失効
      }
    })
  )
  return thread
}

/**
 * 実行ステータスが「completed」になるまで、5秒毎にポーリングを実施する。
 */
async function checkRunStatus(openai: OpenAI, threadId: string, runId: string) {
  const runStatus = await openai.beta.threads.runs.retrieve(threadId, runId)
  if (runStatus.status === 'completed') {
    return
  } else if (
    runStatus.status === 'failed'    ||
    runStatus.status === 'cancelled' ||
    runStatus.status === 'expired'
  ) {
    throw new Error(runStatus.status)
  } else {
    await new Promise(resolve => setTimeout(resolve, 5000))
    return checkRunStatus(openai, threadId, runId)
  }
}

export const main = middyfy(handler)
