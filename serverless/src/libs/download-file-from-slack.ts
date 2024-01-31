import axios     from 'axios'
import * as path from 'path'
import * as fs   from 'fs'

import { WebClient } from '@slack/web-api'

export const downloadFileFromSlack = async (slackClient: WebClient, fileId: string): Promise<string> => {
  const file  = await slackClient.files.info({ file: fileId })
  const url   = file.file.url_private
  const token = slackClient.token

  const response = await axios.get(url, {
    headers:      { Authorization: `Bearer ${token}` },
    responseType: 'arraybuffer',
  })

  const filePath = path.join('/tmp', fileId)
  fs.writeFileSync(filePath, response.data)

  return filePath
}
