import { Context } from 'hono';

interface OAuthToken {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

export async function handleGoogleAuth(c: Context) {
  const GOOGLE_CLIENT_ID = c.env.GOOGLE_CLIENT_ID;
  const REDIRECT_URI = `${new URL(c.req.url).origin}/api/auth/callback`;

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.email');
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');

  // Add state parameter for CSRF protection
  const state = crypto.randomUUID();
  authUrl.searchParams.set('state', state);

  // Store state in a cookie for validation
  c.header('Set-Cookie', `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Max-Age=600; Path=/`);

  return c.redirect(authUrl.toString());
}

export async function handleGoogleCallback(c: Context) {
  const code = c.req.query('code');
  const state = c.req.query('state');
  const cookies = parseCookies(c.req.header('Cookie') || '');
  const storedState = cookies.oauth_state;

  // Validate state parameter
  if (!state || state !== storedState) {
    return c.json({ error: 'Invalid state parameter' }, 400);
  }

  if (!code) {
    return c.json({ error: 'No authorization code received' }, 400);
  }

  try {
    const GOOGLE_CLIENT_ID = c.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = c.env.GOOGLE_CLIENT_SECRET;
    const REDIRECT_URI = `${new URL(c.req.url).origin}/api/auth/callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token exchange failed:', error);
      return c.json({ error: 'Failed to exchange authorization code' }, 500);
    }

    const tokens: OAuthToken = await tokenResponse.json();

    // Get user info
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoResponse.ok) {
      return c.json({ error: 'Failed to get user info' }, 500);
    }

    const userInfo = await userInfoResponse.json();
    const userEmail = userInfo.email;

    // Check if user's domain is authorized
    const domain = userEmail.split('@')[1];
    const allowedDomain = c.env.ALLOWED_DOMAIN;

    if (domain !== allowedDomain) {
      return c.json({ error: `Access denied. Only ${allowedDomain} users are allowed.` }, 403);
    }

    // Store tokens in database
    const expiryDate = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    await c.env.DB.prepare(`
      INSERT INTO oauth_tokens (user_email, access_token, refresh_token, token_expiry)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_email) DO UPDATE SET
        access_token = excluded.access_token,
        refresh_token = COALESCE(excluded.refresh_token, refresh_token),
        token_expiry = excluded.token_expiry,
        updated_at = CURRENT_TIMESTAMP
    `).bind(userEmail, tokens.access_token, tokens.refresh_token || null, expiryDate).run();

    // Create session cookie
    const sessionToken = await createSession(userEmail, c.env.SESSION_SECRET);
    c.header('Set-Cookie', `session=${sessionToken}; HttpOnly; Secure; SameSite=Lax; Max-Age=604800; Path=/`);

    // Clear state cookie
    c.header('Set-Cookie', 'oauth_state=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/');

    return c.redirect('/');
  } catch (error) {
    console.error('OAuth callback error:', error);
    return c.json({ error: 'Authentication failed' }, 500);
  }
}

export async function handleAuthStatus(c: Context) {
  const user = await getAuthenticatedUser(c);

  if (user) {
    return c.json({ authenticated: true, user: { email: user } });
  }

  return c.json({ authenticated: false });
}

export async function handleLogout(c: Context) {
  c.header('Set-Cookie', 'session=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/');
  return c.json({ success: true });
}

// Helper functions
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
  });
  return cookies;
}

async function createSession(email: string, secret: string): Promise<string> {
  const data = JSON.stringify({ email, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const secretBuffer = encoder.encode(secret);

  const key = await crypto.subtle.importKey(
    'raw',
    secretBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, dataBuffer);
  const signatureHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return `${btoa(data)}.${signatureHex}`;
}

async function verifySession(sessionToken: string, secret: string): Promise<string | null> {
  try {
    const [dataB64, signatureHex] = sessionToken.split('.');
    if (!dataB64 || !signatureHex) return null;

    const data = atob(dataB64);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const secretBuffer = encoder.encode(secret);

    const key = await crypto.subtle.importKey(
      'raw',
      secretBuffer,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signature = new Uint8Array(
      signatureHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );

    const isValid = await crypto.subtle.verify('HMAC', key, signature, dataBuffer);
    if (!isValid) return null;

    const session = JSON.parse(data);
    if (session.exp < Date.now()) return null;

    return session.email;
  } catch {
    return null;
  }
}

export async function getAuthenticatedUser(c: Context): Promise<string | null> {
  const cookies = parseCookies(c.req.header('Cookie') || '');
  const sessionToken = cookies.session;

  if (!sessionToken) return null;

  return await verifySession(sessionToken, c.env.SESSION_SECRET);
}

export async function getAccessToken(c: Context, userEmail: string): Promise<string | null> {
  const result = await c.env.DB.prepare(
    'SELECT access_token, refresh_token, token_expiry FROM oauth_tokens WHERE user_email = ?'
  ).bind(userEmail).first();

  if (!result) return null;

  const expiry = new Date(result.token_expiry as string);

  // If token is still valid, return it
  if (expiry > new Date()) {
    return result.access_token as string;
  }

  // Otherwise, refresh the token
  if (result.refresh_token) {
    try {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          refresh_token: result.refresh_token as string,
          client_id: c.env.GOOGLE_CLIENT_ID,
          client_secret: c.env.GOOGLE_CLIENT_SECRET,
          grant_type: 'refresh_token',
        }),
      });

      if (tokenResponse.ok) {
        const tokens: OAuthToken = await tokenResponse.json();
        const newExpiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

        await c.env.DB.prepare(
          'UPDATE oauth_tokens SET access_token = ?, token_expiry = ?, updated_at = CURRENT_TIMESTAMP WHERE user_email = ?'
        ).bind(tokens.access_token, newExpiry, userEmail).run();

        return tokens.access_token;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }
  }

  return null;
}
