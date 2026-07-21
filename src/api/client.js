import { API_BASE_URL } from './config';

let authToken = null;

export function setAuthToken(token) {
  authToken = token || null;
}

export function getAuthToken() {
  return authToken;
}

function buildUrl(path, params) {
  const baseUrl = API_BASE_URL.replace(/\/+$/, '');
  const normalizedPath = String(path || '').replace(/^\/+/, '');
  const url = new URL(`${baseUrl}/${normalizedPath}`);

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    url.searchParams.set(key, String(value));
  });

  return url.toString();
}

async function parseResponse(response) {
  const text = await response.text();
  let body = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { error: text };
    }
  }

  if (!response.ok) {
    const message = body?.message || body?.error || `Request failed (${response.status})`;
    throw new Error(message);
  }

  if (body && typeof body === 'object' && 'success' in body) {
    if (!body.success) throw new Error(body.message || 'Request failed');
    return body.data;
  }

  return body;
}

export async function apiRequest(path, options = {}) {
  const { params, headers, body, ...requestOptions } = options;
  const requestUrl = buildUrl(path, params);
  if (process.env.NODE_ENV !== 'production') {
    console.log('[api]', requestOptions.method || 'GET', requestUrl);
  }

  const response = await fetch(requestUrl, {
    ...requestOptions,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  return parseResponse(response);
}
