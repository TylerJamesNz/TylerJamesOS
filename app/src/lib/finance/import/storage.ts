import { supabase } from '../../supabase'

const BUCKET = 'bank-statements'

export function statementStoragePath(
  userId: string,
  accountId: string,
  periodEnd: string
): string {
  const month = periodEnd.slice(0, 7) // YYYY-MM
  return `${userId}/${accountId}/${month}.pdf`
}

export async function uploadStatementPdf(
  userId: string,
  accountId: string,
  periodEnd: string,
  file: File
): Promise<{ path: string }> {
  const path = statementStoragePath(userId, accountId, periodEnd)
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: 'application/pdf' })
  if (error) throw error
  return { path }
}

export async function signedUrlForStatement(path: string, ttlSeconds = 600): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, ttlSeconds)
  if (error) throw error
  return data.signedUrl
}
