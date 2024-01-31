// -- Lambda Event Types --
export interface RunAssistantEvent {
  text:            string
  fileIds:         string[]
  threadBroadcast: boolean
  channel:         string
  ts:              string
  threadTs?:       string
}

// -- Slack Event Types --
export interface SlackUrlVerificationEvent {
  type:      'url_verification'
  token:     string
  challenge: string
}

export interface SlackCallBackEvent {
  type: 'event_callback'
  token: string
  event: {
    type:     'app_mention'
    subtype?:  string
    user:      string
    channel:   string
    text:      string
    files?:    { id: string }[]
    ts:        string
    thread_ts: string
  }
}
