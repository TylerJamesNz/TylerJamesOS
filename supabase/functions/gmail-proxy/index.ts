// gmail-proxy — Supabase Edge Function
//
// Thin bridge between Claude (mobile or desktop) and the Gmail API
// for operations the official Anthropic Gmail connector doesn't support
// (label modify, archive). The connector is read + drafts only; this
// function fills the gap.
//
// Runtime: Deno, on Supabase Edge.
//
// Auth to Google: OAuth 2.0 refresh-token flow. Secrets in Supabase:
//   GOOGLE_CLIENT_ID
//   GOOGLE_CLIENT_SECRET
//   GOOGLE_REFRESH_TOKEN
// The OAuth client is in "Testing" publishing status, so the refresh
// token expires every 7 days. On expiry, re-run the gcloud ADC flow
// on Tyler's Mac and update GOOGLE_REFRESH_TOKEN.
//
// API surface
// -----------
// POST /gmail-proxy
// Body:
//   {
//     "thread_id": "19d74ac20330d9c0",
//     "add_labels":    ["Receipt"],    // optional, label names
//     "remove_labels": ["INBOX"]       // optional, label names — include
//                                      //   "INBOX" to archive a thread
//   }
// System labels (INBOX, UNREAD, STARRED, IMPORTANT, SPAM, TRASH, SENT,
// DRAFT) are passed through as-is. User labels are looked up by name;
// missing user labels in add_labels are auto-created.
//
// Returns: { ok: true, thread_id, applied_add, applied_remove, thread_labels }

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

const SYSTEM_LABELS = new Set([
  "INBOX",
  "UNREAD",
  "STARRED",
  "IMPORTANT",
  "SPAM",
  "TRASH",
  "SENT",
  "DRAFT",
  "CHAT",
  "CATEGORY_PERSONAL",
  "CATEGORY_SOCIAL",
  "CATEGORY_PROMOTIONS",
  "CATEGORY_UPDATES",
  "CATEGORY_FORUMS",
]);

interface ModifyRequest {
  thread_id: string;
  add_labels?: string[];
  remove_labels?: string[];
}

interface GmailLabel {
  id: string;
  name: string;
  type: string;
}

// ---------------------------------------------------------------------------
// Google token exchange
// ---------------------------------------------------------------------------

async function getAccessToken(): Promise<string> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  const refreshToken = Deno.env.get("GOOGLE_REFRESH_TOKEN");
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Missing one or more Google secrets (GOOGLE_CLIENT_ID, " +
        "GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN). Set via " +
        "`supabase secrets set` from the repo root.",
    );
  }
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Token exchange failed: ${res.status} ${text}. ` +
        `If error is 'invalid_grant', the refresh token has expired — ` +
        `re-run the gcloud ADC flow and reset GOOGLE_REFRESH_TOKEN.`,
    );
  }
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

// ---------------------------------------------------------------------------
// Gmail API helpers
// ---------------------------------------------------------------------------

async function gmail(
  path: string,
  method: string,
  accessToken: string,
  body?: unknown,
): Promise<unknown> {
  const res = await fetch(`${GMAIL_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gmail ${method} ${path} failed: ${res.status} ${text}`);
  }
  return await res.json();
}

async function resolveLabelIds(
  accessToken: string,
  names: string[],
  createMissing: boolean,
): Promise<Record<string, string>> {
  if (names.length === 0) return {};

  // Fast-path system labels with no API call
  const result: Record<string, string> = {};
  const toLookup: string[] = [];
  for (const name of names) {
    const upper = name.toUpperCase();
    if (SYSTEM_LABELS.has(upper)) {
      result[name] = upper;
    } else {
      toLookup.push(name);
    }
  }
  if (toLookup.length === 0) return result;

  // List user labels once; resolve all names from the same result
  const listResp = (await gmail("/labels", "GET", accessToken)) as {
    labels: GmailLabel[];
  };
  const byName = new Map(listResp.labels.map((l) => [l.name, l.id]));

  for (const name of toLookup) {
    const existing = byName.get(name);
    if (existing) {
      result[name] = existing;
      continue;
    }
    if (!createMissing) {
      throw new Error(`Label not found (and create not allowed here): ${name}`);
    }
    const created = (await gmail("/labels", "POST", accessToken, {
      name,
      labelListVisibility: "labelShow",
      messageListVisibility: "show",
    })) as GmailLabel;
    result[name] = created.id;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed. Use POST." }, 405);
  }

  let body: ModifyRequest;
  try {
    body = (await req.json()) as ModifyRequest;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (!body.thread_id) {
    return json({ error: "thread_id is required" }, 400);
  }
  const addNames = body.add_labels ?? [];
  const removeNames = body.remove_labels ?? [];
  if (addNames.length === 0 && removeNames.length === 0) {
    return json(
      { error: "At least one of add_labels / remove_labels is required" },
      400,
    );
  }

  try {
    const accessToken = await getAccessToken();

    // Resolve label names → Gmail IDs. add_labels can create; remove_labels
    // never creates (removing a non-existent label is an error we want to surface).
    const addMap = await resolveLabelIds(accessToken, addNames, true);
    const removeMap = await resolveLabelIds(accessToken, removeNames, false);

    const modifyBody = {
      addLabelIds: Object.values(addMap),
      removeLabelIds: Object.values(removeMap),
    };

    const thread = (await gmail(
      `/threads/${body.thread_id}/modify`,
      "POST",
      accessToken,
      modifyBody,
    )) as { messages?: Array<{ labelIds?: string[] }> };

    // Collect the union of labelIds across all messages in the thread for
    // a human-readable confirmation.
    const allLabels = new Set<string>();
    for (const m of thread.messages ?? []) {
      for (const id of m.labelIds ?? []) allLabels.add(id);
    }

    return json({
      ok: true,
      thread_id: body.thread_id,
      applied_add: addMap,
      applied_remove: removeMap,
      thread_labels: [...allLabels],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return json({ error: msg }, 500);
  }
});

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
