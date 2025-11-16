# Google Drive Search Portal

A private domain portal for searching Google Drive files, built on Cloudflare Workers.

## Features

- 🔐 **Secure OAuth Authentication** - Google OAuth 2.0 with domain restrictions
- 🔍 **Advanced Search** - Search across all your Google Drive files with filters
- 🎨 **Modern UI** - Clean, responsive web interface
- ⚡ **Fast & Serverless** - Powered by Cloudflare Workers edge network
- 📊 **Search History** - Track your search queries
- 🔒 **Domain Restricted** - Only allow users from your organization's domain

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [pnpm](https://pnpm.io/) or npm
- [Cloudflare Account](https://dash.cloudflare.com/sign-up)
- [Google Cloud Console Account](https://console.cloud.google.com/)

## Setup Instructions

### 1. Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Drive API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Drive API"
   - Click "Enable"
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - For local development: `http://localhost:8787/api/auth/callback`
     - For production: `https://your-worker-domain.workers.dev/api/auth/callback`
   - Save the **Client ID** and **Client Secret**

### 2. Cloudflare Workers Setup

1. Install Wrangler CLI:
   ```bash
   npm install -g wrangler
   ```

2. Login to Cloudflare:
   ```bash
   wrangler login
   ```

3. Clone and setup the repository:
   ```bash
   git clone <your-repo-url>
   cd drivechat
   pnpm install
   ```

4. Create the D1 database (if not exists):
   ```bash
   wrangler d1 create drivechat
   ```

   Update the `database_id` in `wrangler.jsonc` with the ID from the output.

5. Apply database migrations:
   ```bash
   # For local development
   pnpm run seedLocalDb

   # For production
   wrangler d1 migrations apply DB --remote
   ```

### 3. Configure Environment Variables

1. Update `wrangler.jsonc`:
   ```jsonc
   "vars": {
     "ALLOWED_DOMAIN": "yourdomain.com"  // Replace with your organization's domain
   }
   ```

2. Set secrets (production):
   ```bash
   wrangler secret put GOOGLE_CLIENT_ID
   # Paste your Google Client ID when prompted

   wrangler secret put GOOGLE_CLIENT_SECRET
   # Paste your Google Client Secret when prompted

   wrangler secret put SESSION_SECRET
   # Enter a random secure string (e.g., generate with: openssl rand -base64 32)
   ```

3. For local development, create a `.dev.vars` file:
   ```env
   GOOGLE_CLIENT_ID=your-client-id-here
   GOOGLE_CLIENT_SECRET=your-client-secret-here
   SESSION_SECRET=your-session-secret-here
   ```

### 4. Development

Run the development server:
```bash
pnpm run dev
```

The portal will be available at `http://localhost:8787`

### 5. Deployment

Deploy to Cloudflare Workers:
```bash
pnpm run deploy
```

## Usage

1. **Login**: Navigate to your portal URL and click "Sign in with Google"
2. **Authorize**: Grant the necessary Google Drive permissions
3. **Search**: Use the search box to find files across your Drive
4. **Filters**: Apply filters for file type, modification date, and owner
5. **Open Files**: Click on any search result to open it in Google Drive

## Search Features

### Basic Search
Simply enter keywords to search across file names and content.

### Advanced Filters

- **File Type**: Filter by document type (Docs, Sheets, Slides, PDFs, Images, Videos)
- **Modified Time**: Find files modified today, this week, month, or year
- **Owner**: Search for files owned by a specific user

### Supported File Types

- Google Docs
- Google Sheets
- Google Slides
- PDFs
- Images (JPEG, PNG, GIF, etc.)
- Videos
- And more...

## Security

- **Domain Restriction**: Only users with email addresses from your specified domain can access the portal
- **OAuth 2.0**: Secure authentication using Google's OAuth 2.0 flow
- **Session Management**: HttpOnly, Secure cookies with HMAC signatures
- **Token Refresh**: Automatic OAuth token refresh for seamless access
- **CSRF Protection**: State parameter validation during OAuth flow

## Database Schema

### Tables

#### `oauth_tokens`
Stores user OAuth tokens for Google Drive API access.

#### `search_history`
Tracks user search queries and results.

#### `authorized_domains`
Manages allowed email domains (future feature).

## API Endpoints

### Authentication
- `GET /api/auth/google` - Initiate Google OAuth flow
- `GET /api/auth/callback` - OAuth callback handler
- `GET /api/auth/status` - Check authentication status
- `POST /api/auth/logout` - Logout user

### Search
- `GET /api/search` - Search Google Drive files
  - Query params: `q`, `type`, `modified`, `owner`, `pageToken`
- `GET /api/search/history` - Get user's search history

### Health
- `GET /health` - Service health check

## Project Structure

```
drivechat/
├── src/
│   ├── index.ts              # Main application entry point
│   ├── types.ts              # TypeScript type definitions
│   ├── endpoints/
│   │   ├── auth.ts           # Authentication handlers
│   │   └── search.ts         # Search handlers
│   └── views/
│       └── portal.html       # Web portal frontend
├── migrations/
│   ├── 0001_add_tasks_table.sql          # Initial migration (legacy)
│   └── 0002_google_drive_schema.sql      # Google Drive schema
├── wrangler.jsonc            # Cloudflare Workers configuration
├── package.json              # Dependencies and scripts
└── README.md                 # This file
```

## Troubleshooting

### "Access denied. Only yourdomain.com users are allowed"
- Ensure you're logging in with an email from your configured domain
- Check the `ALLOWED_DOMAIN` variable in `wrangler.jsonc`

### "Failed to get access token"
- Your OAuth token may have expired
- Try logging out and logging back in
- Verify your Google OAuth credentials are correct

### "Search failed"
- Check that the Google Drive API is enabled in Google Cloud Console
- Verify your OAuth token has the correct scopes
- Check Cloudflare Workers logs: `wrangler tail`

### Database migrations not applied
```bash
# Local
wrangler d1 migrations apply DB --local

# Production
wrangler d1 migrations apply DB --remote
```

## Scripts

- `pnpm run dev` - Start local development server
- `pnpm run deploy` - Deploy to Cloudflare Workers
- `pnpm run seedLocalDb` - Apply database migrations locally
- `pnpm run cf-typegen` - Generate TypeScript types
- `pnpm run test` - Run tests

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
- Open an issue on GitHub
- Check the troubleshooting section above
- Review Cloudflare Workers documentation

## Credits

Built with:
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Hono](https://hono.dev/)
- [Google Drive API](https://developers.google.com/drive)
- [D1 Database](https://developers.cloudflare.com/d1/)
