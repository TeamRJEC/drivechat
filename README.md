# DriveChat - Unified Communication Hub API

A comprehensive personal assistant API for serial entrepreneurs that provides:
- **Unified Inbox**: Aggregate emails from multiple Google and Microsoft accounts
- **Contact Management**: Centralized contact repository with bi-directional sync
- **Calendar Synchronization**: Cross-platform calendar integration with smart scheduling

Built with Cloudflare Workers, Hono, and OpenAPI 3.1 for automatic documentation generation.

## Features

### 📧 Unified Inbox
- Aggregate emails from multiple Google (Gmail) and Microsoft (Outlook) accounts
- View, search, and filter all correspondence in one place
- Mark emails as read, flagged, or archived
- Full-text search across all emails
- Support for multiple account linking

### 👥 Contact Management
- Pull contacts from all linked Google and Microsoft accounts
- Single repository for searching, adding, and editing contacts
- Full-text search with FTS5 (SQLite Full-Text Search)
- Bi-directional sync: updates made through the assistant are reflected in source accounts
- Supports email addresses, phone numbers, addresses, birthdays, and more

### 📅 Calendar Synchronization
- Access and display events from all linked Google and Microsoft calendars
- Automatic conflict detection when creating new events
- Smart scheduling algorithm that proposes alternative time slots
- Find available meeting times across all calendars
- Support for recurring events, attendees, and reminders
- Respects working hours and excludes weekends (configurable)

> [!IMPORTANT]
> When using C3 to create this project, select "no" when it asks if you want to deploy. You need to follow this project's [setup steps](https://github.com/cloudflare/templates/tree/main/openapi-template#setup-steps) before deploying.

## Getting Started

Outside of this repo, you can start a new project with this template using [C3](https://developers.cloudflare.com/pages/get-started/c3/) (the `create-cloudflare` CLI):

```bash
npm create cloudflare@latest -- --template=cloudflare/templates/openapi-template
```

A live public deployment of this template is available at [https://openapi-template.templates.workers.dev](https://openapi-template.templates.workers.dev)

## Setup Steps

### 1. Install Dependencies

```bash
npm install
# or
pnpm install
```

### 2. Configure OAuth Credentials

You'll need to create OAuth applications for both Google and Microsoft:

#### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Gmail API
   - Google Calendar API
   - People API (Google Contacts)
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs

#### Microsoft OAuth Setup
1. Go to [Azure Portal](https://portal.azure.com/)
2. Register a new application in Azure AD
3. Add API permissions:
   - Mail.ReadWrite
   - Contacts.ReadWrite
   - Calendars.ReadWrite
   - User.Read
4. Create a client secret
5. Add redirect URIs

### 3. Set Environment Variables

Add the following secrets to your Cloudflare Worker:

```bash
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put GOOGLE_REDIRECT_URI

npx wrangler secret put MICROSOFT_CLIENT_ID
npx wrangler secret put MICROSOFT_CLIENT_SECRET
npx wrangler secret put MICROSOFT_REDIRECT_URI
```

### 4. Create and Configure D1 Database

```bash
# Create the database
npx wrangler d1 create drivechat

# Update the database_id in wrangler.jsonc with the new database ID

# Run migrations
npx wrangler d1 migrations apply DB --remote
```

### 5. Deploy

```bash
npx wrangler deploy
```

### 6. Monitor

```bash
npx wrangler tail
```

## Testing

This template includes integration tests using [Vitest](https://vitest.dev/). To run the tests locally:

```bash
npm run test
```

Test files are located in the `tests/` directory, with examples demonstrating how to test your endpoints and database interactions.

## API Endpoints

### Account Management

- `GET /accounts/oauth/{provider}/callback` - OAuth callback for linking accounts
- `GET /accounts` - List all linked accounts
- `DELETE /accounts/{id}` - Unlink an account
- `POST /accounts/{id}/sync` - Manually trigger account sync

### Unified Inbox

- `GET /emails` - List all emails with filtering (read, flagged, archived)
- `GET /emails/{id}` - Get email details
- `PATCH /emails/{id}` - Update email (mark as read, flagged, archived)
- `GET /emails/search?q={query}` - Search emails

### Contact Management

- `GET /contacts` - List all contacts
- `GET /contacts/{id}` - Get contact details
- `POST /contacts` - Create a new contact
- `PATCH /contacts/{id}` - Update contact
- `DELETE /contacts/{id}` - Delete contact
- `GET /contacts/search?q={query}` - Full-text search contacts

### Calendar

- `GET /calendar/events` - List calendar events with filtering
- `GET /calendar/events/{id}` - Get event details
- `POST /calendar/events` - Create new event (with conflict detection)
- `PATCH /calendar/events/{id}` - Update event
- `DELETE /calendar/events/{id}` - Delete event
- `POST /calendar/check-conflicts` - Check for scheduling conflicts
- `POST /calendar/find-available-slots` - Find available time slots for meetings

## Smart Scheduling Features

The calendar API includes advanced scheduling capabilities:

### Conflict Detection

When creating or updating events, the system automatically detects conflicts with existing events across all calendars.

```json
POST /calendar/events
{
  "account_id": 1,
  "calendar_id": "primary",
  "title": "Team Meeting",
  "start_time": "2024-01-15T14:00:00Z",
  "end_time": "2024-01-15T15:00:00Z",
  "check_conflicts": true
}
```

### Alternative Time Slots

If conflicts are detected, the system proposes alternative available time slots:

```json
{
  "success": true,
  "result": {
    "id": 123,
    "message": "Event created with conflicts detected",
    "conflicts": [
      {
        "id": 45,
        "title": "Client Call",
        "start_time": "2024-01-15T14:30:00Z",
        "end_time": "2024-01-15T15:30:00Z"
      }
    ],
    "alternative_slots": [
      {
        "start": "2024-01-15T15:30:00Z",
        "end": "2024-01-15T16:30:00Z",
        "duration_minutes": 60
      }
    ]
  }
}
```

### Find Available Slots

Find available time slots for scheduling meetings:

```json
POST /calendar/find-available-slots
{
  "start_date": "2024-01-15T00:00:00Z",
  "end_date": "2024-01-22T00:00:00Z",
  "duration_minutes": 60,
  "working_hours_start": 9,
  "working_hours_end": 17,
  "exclude_weekends": true,
  "max_results": 10
}
```

## Project Structure

```
src/
├── index.ts                          # Main router
├── types.ts                          # TypeScript type definitions
├── services/                         # Service layer
│   ├── oauth.ts                     # OAuth2 authentication
│   ├── gmail.ts                     # Gmail API integration
│   ├── microsoft-graph.ts           # Microsoft Graph API
│   ├── google-contacts.ts           # Google Contacts API
│   ├── google-calendar.ts           # Google Calendar API
│   └── calendar-scheduler.ts        # Smart scheduling logic
├── endpoints/
│   ├── accounts/                    # Account management endpoints
│   ├── emails/                      # Email endpoints
│   ├── contacts/                    # Contact endpoints
│   ├── calendar/                    # Calendar endpoints
│   └── tasks/                       # Task management endpoints
migrations/
├── 0001_add_tasks_table.sql
├── 0002_add_accounts_table.sql
├── 0003_add_emails_table.sql
├── 0004_add_contacts_table.sql
└── 0005_add_calendar_events_table.sql
```

## Development

```bash
# Run locally
npm run dev

# Run tests
npm test

# Extract OpenAPI schema
npm run schema

# Deploy to Cloudflare
npm run deploy
```

## Technologies

- **Cloudflare Workers**: Serverless execution environment
- **Hono**: Fast, lightweight web framework
- **Chanfana**: OpenAPI schema generation and validation
- **D1**: Cloudflare's SQLite database
- **Zod**: Schema validation
- **Vitest**: Testing framework

## Resources

- [Chanfana Documentation](https://chanfana.com/)
- [Hono Documentation](https://hono.dev/docs)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [D1 Database](https://developers.cloudflare.com/d1/)
- [Google APIs](https://developers.google.com/)
- [Microsoft Graph API](https://learn.microsoft.com/en-us/graph/)
