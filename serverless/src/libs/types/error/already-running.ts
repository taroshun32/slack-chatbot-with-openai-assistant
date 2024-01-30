import { OpenAI } from 'openai'

export class AlreadyRunning extends Error {
  constructor(readonly run: OpenAI.Beta.Threads.Run) {
    super(`already running with ${run.id}`)
  }
}
