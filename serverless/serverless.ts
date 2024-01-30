import type { AWS }  from '@serverless/typescript'

import slackCallback from '@functions/slack-callback'
import runAssistant  from 'src/functions/run-assistant'

const serverlessConfiguration: AWS = {
  service:          'slack-chatbot-with-openai-assistant',
  frameworkVersion: '3',
  plugins:          ['serverless-esbuild'],
  provider: {
    name:    'aws',
    runtime: 'nodejs18.x',
    region:  'ap-northeast-1',
    stage:   'prod',
    iam:     { role: `arn:aws:iam::${process.env.AWS_ACCOUNT_ID}:role/serverless_role`},
    environment: {
      OPENAI_THREAD_TABLE: 'openai_thread'
    }
  },
  functions: {
    slackCallback,
    runAssistant
  },
  package: { individually: true },
  custom: {
    esbuild: {
      bundle:      true,
      minify:      false,
      sourcemap:   true,
      exclude:     ['aws-sdk'],
      target:      'node18',
      define:      { 'require.resolve': undefined },
      platform:    'node',
      concurrency: 10,
    },
  },
}

module.exports = serverlessConfiguration
