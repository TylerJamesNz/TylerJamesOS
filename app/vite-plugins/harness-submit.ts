import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'

const MAX_BODY_BYTES = 20 * 1024 * 1024

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let total = 0
    req.on('data', (chunk: Buffer) => {
      total += chunk.length
      if (total > MAX_BODY_BYTES) {
        reject(new Error(`body exceeds ${MAX_BODY_BYTES} bytes`))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch (err) {
        reject(err)
      }
    })
    req.on('error', reject)
  })
}

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

type SubmitPayload = {
  timestamp: string
  data: unknown
  screenshots: Array<{ filename: string; base64: string }>
}

function isSubmitPayload(value: unknown): value is SubmitPayload {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.timestamp === 'string' &&
    typeof v.data === 'object' &&
    Array.isArray(v.screenshots)
  )
}

const SAFE_TIMESTAMP = /^[0-9TZ:.-]+$/
const SAFE_FILENAME = /^[A-Za-z0-9._-]+$/

export default function harnessSubmit(): Plugin {
  return {
    name: 'harness-submit',
    configureServer(server) {
      const projectRoot = path.resolve(server.config.root)
      const feedbackRoot = path.join(projectRoot, 'prototype', 'feedback')
      const winnerPath = path.join(projectRoot, 'prototype', 'winner.json')
      const logPath = path.join(feedbackRoot, '.submit.log')

      server.middlewares.use('/__harness/submit', async (req, res, next) => {
        if (req.method !== 'POST') {
          next()
          return
        }
        try {
          const body = await readJsonBody(req)
          if (!isSubmitPayload(body)) {
            sendJson(res, 400, { ok: false, error: 'invalid payload shape' })
            return
          }
          if (!SAFE_TIMESTAMP.test(body.timestamp)) {
            sendJson(res, 400, { ok: false, error: 'invalid timestamp' })
            return
          }
          const bundleDir = path.join(feedbackRoot, body.timestamp)
          await fs.mkdir(bundleDir, { recursive: true })
          await fs.writeFile(
            path.join(bundleDir, 'data.json'),
            JSON.stringify(body.data, null, 2),
            'utf8',
          )
          for (const shot of body.screenshots) {
            if (!SAFE_FILENAME.test(shot.filename)) {
              sendJson(res, 400, { ok: false, error: `unsafe screenshot filename: ${shot.filename}` })
              return
            }
            const png = Buffer.from(shot.base64, 'base64')
            await fs.writeFile(path.join(bundleDir, shot.filename), png)
          }
          await fs.appendFile(logPath, `${body.timestamp}\t${bundleDir}\n`, 'utf8')
          const relPath = path.relative(path.dirname(projectRoot), bundleDir)
          server.config.logger.info(`[harness] submit → ${relPath}`)
          sendJson(res, 200, { ok: true, path: relPath })
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          sendJson(res, 500, { ok: false, error: message })
        }
      })

      server.middlewares.use('/__harness/pick-winner', async (req, res, next) => {
        if (req.method !== 'POST') {
          next()
          return
        }
        try {
          const body = await readJsonBody(req)
          if (!body || typeof body !== 'object') {
            sendJson(res, 400, { ok: false, error: 'invalid payload' })
            return
          }
          await fs.mkdir(path.dirname(winnerPath), { recursive: true })
          await fs.writeFile(winnerPath, JSON.stringify(body, null, 2), 'utf8')
          const relPath = path.relative(path.dirname(projectRoot), winnerPath)
          server.config.logger.info(`[harness] winner → ${relPath}`)
          sendJson(res, 200, { ok: true, path: relPath })
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          sendJson(res, 500, { ok: false, error: message })
        }
      })
    },
  }
}
