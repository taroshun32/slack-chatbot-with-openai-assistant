import * as fs    from 'fs'
import { OpenAI } from 'openai'

export const uploadFileToOpenAI = async (openai: OpenAI, filePath: string) => {
  const file = await openai.files.create({
    file:    fs.createReadStream(filePath),
    purpose: "assistants",
  })

  return file.id
}
