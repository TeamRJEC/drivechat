import { Context } from 'hono';
import { getAuthenticatedUser, getAccessToken } from './auth';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  modifiedTime: string;
  size?: string;
  owners?: Array<{ displayName: string; emailAddress: string }>;
}

interface SearchResponse {
  files: DriveFile[];
  nextPageToken?: string;
}

export async function handleSearch(c: Context) {
  // Check authentication
  const userEmail = await getAuthenticatedUser(c);
  if (!userEmail) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Get access token
  const accessToken = await getAccessToken(c, userEmail);
  if (!accessToken) {
    return c.json({ error: 'Failed to get access token. Please login again.' }, 401);
  }

  // Get search parameters
  const query = c.req.query('q');
  const fileType = c.req.query('type');
  const modifiedTime = c.req.query('modified');
  const owner = c.req.query('owner');
  const pageToken = c.req.query('pageToken');

  if (!query) {
    return c.json({ error: 'Search query is required' }, 400);
  }

  try {
    // Build Google Drive API query
    const driveQuery = buildDriveQuery(query, fileType, modifiedTime, owner);

    // Call Google Drive API
    const searchParams = new URLSearchParams({
      q: driveQuery,
      fields: 'files(id,name,mimeType,webViewLink,modifiedTime,size,owners),nextPageToken',
      pageSize: '50',
      orderBy: 'modifiedTime desc',
    });

    if (pageToken) {
      searchParams.set('pageToken', pageToken);
    }

    const driveResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?${searchParams}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!driveResponse.ok) {
      const error = await driveResponse.text();
      console.error('Drive API error:', error);
      return c.json({ error: 'Failed to search Google Drive' }, 500);
    }

    const result: SearchResponse = await driveResponse.json();

    // Store search in history
    await c.env.DB.prepare(
      'INSERT INTO search_history (user_email, query, results_count) VALUES (?, ?, ?)'
    ).bind(userEmail, query, result.files?.length || 0).run();

    return c.json({
      files: result.files || [],
      nextPageToken: result.nextPageToken,
      count: result.files?.length || 0,
    });
  } catch (error) {
    console.error('Search error:', error);
    return c.json({ error: 'Search failed' }, 500);
  }
}

function buildDriveQuery(
  searchQuery: string,
  fileType?: string,
  modifiedTime?: string,
  owner?: string
): string {
  const conditions: string[] = [];

  // Search in name and full text
  conditions.push(`(name contains '${escapeQuery(searchQuery)}' or fullText contains '${escapeQuery(searchQuery)}')`);

  // Exclude trashed files
  conditions.push('trashed = false');

  // Filter by file type
  if (fileType) {
    if (fileType.endsWith('/*')) {
      // Handle wildcards like "image/*"
      const baseType = fileType.replace('/*', '');
      conditions.push(`mimeType contains '${baseType}'`);
    } else {
      conditions.push(`mimeType = '${fileType}'`);
    }
  }

  // Filter by modified time
  if (modifiedTime) {
    const timeCondition = getTimeCondition(modifiedTime);
    if (timeCondition) {
      conditions.push(timeCondition);
    }
  }

  // Filter by owner
  if (owner) {
    conditions.push(`'${escapeQuery(owner)}' in owners`);
  }

  return conditions.join(' and ');
}

function escapeQuery(query: string): string {
  // Escape single quotes for Google Drive API
  return query.replace(/'/g, "\\'");
}

function getTimeCondition(timeRange: string): string | null {
  const now = new Date();
  let date: Date;

  switch (timeRange) {
    case 'today':
      date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      date = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      date = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      date = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      return null;
  }

  return `modifiedTime >= '${date.toISOString()}'`;
}

export async function handleSearchHistory(c: Context) {
  const userEmail = await getAuthenticatedUser(c);
  if (!userEmail) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const limit = parseInt(c.req.query('limit') || '10');

  const results = await c.env.DB.prepare(
    'SELECT query, results_count, searched_at FROM search_history WHERE user_email = ? ORDER BY searched_at DESC LIMIT ?'
  ).bind(userEmail, limit).all();

  return c.json({ history: results.results || [] });
}
