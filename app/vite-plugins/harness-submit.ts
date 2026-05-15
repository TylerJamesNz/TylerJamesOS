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

type ReferenceFile = {
  annotationId: string
  filename: string
  base64: string
  mime: string
}

type SubmitPayload = {
  timestamp: string
  data: unknown
  screenshots: Array<{ filename: string; base64: string }>
  referenceFiles?: ReferenceFile[]
}

function isSubmitPayload(value: unknown): value is SubmitPayload {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  if (typeof v.timestamp !== 'string') return false
  if (typeof v.data !== 'object') return false
  if (!Array.isArray(v.screenshots)) return false
  if (v.referenceFiles !== undefined && !Array.isArray(v.referenceFiles)) return false
  return true
}

const SAFE_TIMESTAMP = /^[0-9TZ:.-]+$/
const SAFE_FILENAME = /^[A-Za-z0-9._-]+$/
const SAFE_ANNOTATION_ID = /^[A-Za-z0-9-]{8,}$/
const ALLOWED_REF_MIMES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
}

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
          if (body.referenceFiles && body.referenceFiles.length > 0) {
            const refsDir = path.join(bundleDir, 'refs')
            await fs.mkdir(refsDir, { recursive: true })
            for (const ref of body.referenceFiles) {
              if (!SAFE_ANNOTATION_ID.test(ref.annotationId)) {
                sendJson(res, 400, { ok: false, error: `unsafe annotationId: ${ref.annotationId}` })
                return
              }
              if (!SAFE_FILENAME.test(ref.filename)) {
                sendJson(res, 400, { ok: false, error: `unsafe ref filename: ${ref.filename}` })
                return
              }
              const ext = ALLOWED_REF_MIMES[ref.mime]
              if (!ext) {
                sendJson(res, 400, { ok: false, error: `unsupported ref mime: ${ref.mime}` })
                return
              }
              const bytes = Buffer.from(ref.base64, 'base64')
              await fs.writeFile(path.join(refsDir, `${ref.annotationId}.${ext}`), bytes)
            }
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
