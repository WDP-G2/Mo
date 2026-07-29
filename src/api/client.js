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
  return parseResponseText(text, response.ok, response.status);
}

function parseResponseText(text, ok, status) {
  let body = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { error: text };
    }
  }

  if (!ok) {
    const message = body?.message || body?.error || `Request failed (${status})`;
    throw new Error(message);
  }

  if (body && typeof body === 'object' && 'success' in body) {
    if (!body.success) throw new Error(body.message || 'Request failed');
    return body.data;
  }

  return body;
}

function requestFormData(requestUrl, options) {
  const { headers, body, ...requestOptions } = options;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(requestOptions.method || 'GET', requestUrl);

    xhr.setRequestHeader('Accept', 'application/json');
    if (authToken) xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
    Object.entries(headers || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null) xhr.setRequestHeader(key, String(value));
    });

    xhr.onload = () => {
      try {
        resolve(parseResponseText(xhr.responseText, xhr.status >= 200 && xhr.status < 300, xhr.status));
      } catch (error) {
        reject(error);
      }
    };
    xhr.onerror = () => reject(new Error('Network request failed'));
    xhr.ontimeout = () => reject(new Error('Network request timed out'));
    xhr.timeout = requestOptions.timeout || 30000;
    xhr.send(body);
  });
}

export async function apiRequest(path, options = {}) {
  const { params, headers, body, ...requestOptions } = options;
  const requestUrl = buildUrl(path, params);
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  if (process.env.NODE_ENV !== 'production') {
    console.log('[api]', requestOptions.method || 'GET', requestUrl);
  }

  if (isFormData && typeof XMLHttpRequest !== 'undefined') {
    return requestFormData(requestUrl, { ...requestOptions, headers, body });
  }

  const response = await fetch(requestUrl, {
    ...requestOptions,
    headers: {
      Accept: 'application/json',
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  });

  return parseResponse(response);
}
