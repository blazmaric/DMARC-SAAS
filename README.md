# M-Host DMARC Monitoring Platform

Professional DMARC aggregate (RUA) monitoring SaaS for Slovenia, built by M-Host.

## Overview

This is a production-ready, multi-tenant SaaS application that enables organizations to monitor DMARC aggregate reports for their email domains. Customers can add domains, receive unique DMARC reporting addresses, and view comprehensive analytics through a professional web dashboard.

### Key Features

- **Multi-tenant Architecture**: Support for multiple customers with isolated data
- **Role-based Access Control**: Admin and customer roles with proper permissions
- **DMARC Ingest System**: Secure endpoint for receiving DMARC aggregate reports via email
- **DNS Configuration Checker**: Real-time validation of DMARC DNS records
- **Analytics Dashboard**: Charts and tables showing email volume, alignment rates, and top sending sources
- **Professional UI**: Desktop-first design with enterprise-grade aesthetics

## Tech Stack

- **Framework**: Next.js 13 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **UI Components**: shadcn/ui + Tailwind CSS
- **Charts**: Recharts
- **Validation**: Zod
- **Email Parsing**: mailparser
- **XML Parsing**: fast-xml-parser
- **Container**: Docker Compose

## Architecture

### Database Schema

The application uses the following core entities:

- **customers**: Company accounts
- **users**: Individual user accounts linked to customers or admins
- **domains**: Email domains being monitored
- **dmarc_reports**: Aggregate reports received from email providers
- **dmarc_records**: Individual records within each report
- **daily_aggregates**: Pre-computed daily statistics for fast querying

### Multi-Tenancy

- **Admin Users**: Full access to all customers, domains, and data
- **Customer Users**: Access only to their own customer's domains and reports
- **Row Level Security (RLS)**: Enforced at the database level for security

### DMARC Ingest Model

The application uses a unique token-based system for receiving DMARC reports:

1. Each domain gets a unique `ruaToken` (24-character secure random string)
2. DMARC reports are sent to: `<ruaToken>@dmarc.m-host.si`
3. An SMTP forwarder (not included) forwards emails to: `POST /api/ingest/email`
4. The API extracts the token, validates it, parses the DMARC XML, and stores the data

## Local Development Setup

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Supabase account (free tier works)
- Git

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd dmarc-m-host
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Set Up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Note your project URL and API keys from Project Settings > API
3. The database migrations have already been applied (see Supabase setup in the system)

### Step 4: Configure Environment Variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Supabase Configuration (from your Supabase project)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_PRIMARY_DOMAIN=m-host.si
NEXT_PUBLIC_DMARC_DOMAIN=dmarc.m-host.si

# Ingest Security (generate a secure random string)
INGEST_SECRET=your-secure-random-secret-minimum-32-chars
```

To generate a secure `INGEST_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 5: Create Initial Admin User

You need to create an admin user manually in Supabase:

1. Go to your Supabase project > Authentication > Users
2. Click "Add user" and create a user with email/password
3. Note the user ID
4. Go to Table Editor > customers and create a customer:
   - name: "M-Host Admin"
5. Go to Table Editor > users and create a user record:
   - id: (the auth user ID from step 3)
   - email: (your admin email)
   - role: "admin"
   - customer_id: null (leave empty for admin)

### Step 6: Run Development Server

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## Docker Compose Usage

### Start the Application

```bash
docker compose up
```

The application will be available at [http://localhost:3000](http://localhost:3000)

### Stop the Application

```bash
docker compose down
```

### Rebuild After Code Changes

```bash
docker compose up --build
```

## Testing the DMARC Ingest

### Using curl with Sample Email

A sample DMARC email is provided in `test-fixtures/sample-dmarc-email.eml`.

Before testing:

1. Create a domain in the application and note its `rua_token`
2. Edit the sample email and replace `test-token-12345` with your actual token
3. Run the curl command:

```bash
curl -X POST http://localhost:3000/api/ingest/email \
  -H "X-Ingest-Token: your-secure-random-secret-minimum-32-chars" \
  -H "Content-Type: message/rfc822" \
  --data-binary @test-fixtures/sample-dmarc-email.eml
```

Expected response:

```json
{
  "message": "Report processed successfully",
  "reportId": "...",
  "recordCount": 2
}
```

### Testing with Sample XML

You can also test the XML parsing directly by creating a proper email with the XML attachment:

1. Check `test-fixtures/sample-dmarc-report.xml` for the XML structure
2. Use an email client to send it as an attachment to your test endpoint

## Adding a Domain

### Step 1: Create the Domain

1. Log in to the application
2. Navigate to "Domains"
3. Click "Add Domain"
4. Enter your domain name (e.g., `example.si`)
5. The system will generate a unique RUA token

### Step 2: Configure DNS

The application will show you the exact DNS record to add:

**Type**: TXT

**Host**: `_dmarc.example.si`

**Value**: `v=DMARC1; p=none; rua=mailto:<token>@dmarc.m-host.si; fo=1`

### Step 3: Verify DNS

1. Add the DNS record to your domain
2. Wait for DNS propagation (can take up to 48 hours, usually much faster)
3. Click "Check DNS" in the application to verify

### Step 4: Start Receiving Reports

- Email providers (Gmail, Outlook, etc.) will start sending daily DMARC reports
- Reports typically arrive within 24-48 hours after DNS configuration
- View analytics in the domain detail page

## DMARC Policy Progression

Start with monitoring mode and gradually increase enforcement:

### Phase 1: Monitoring (p=none)

```
v=DMARC1; p=none; rua=mailto:<token>@dmarc.m-host.si; fo=1
```

- Receive reports without affecting email delivery
- Identify all legitimate email sources
- Recommended duration: 2-4 weeks

### Phase 2: Quarantine (p=quarantine)

```
v=DMARC1; p=quarantine; rua=mailto:<token>@dmarc.m-host.si; fo=1
```

- Failed emails go to spam/junk
- Monitor for any issues
- Recommended duration: 2-4 weeks

### Phase 3: Reject (p=reject)

```
v=DMARC1; p=reject; rua=mailto:<token>@dmarc.m-host.si; fo=1
```

- Failed emails are rejected
- Maximum protection against spoofing
- Maintain this policy long-term

## Email Forwarding Setup

The application expects DMARC reports to be forwarded via HTTP POST. You'll need an SMTP → HTTP forwarder:

### Recommended Approach

1. Set up a mailbox for `*@dmarc.m-host.si`
2. Configure a mail processing script that:
   - Reads incoming emails
   - Extracts the recipient address
   - POSTs the raw email to `/api/ingest/email`
   - Includes the `X-Ingest-Token` header

### Example Forwarder Script (Node.js)

```javascript
const fetch = require('node-fetch');

async function forwardEmail(emailBuffer, recipient) {
  const response = await fetch('https://your-domain.com/api/ingest/email', {
    method: 'POST',
    headers: {
      'X-Ingest-Token': process.env.INGEST_SECRET,
      'Content-Type': 'message/rfc822',
    },
    body: emailBuffer,
  });

  const result = await response.json();
  console.log('Ingest result:', result);
}
```

## API Endpoints

### Public Endpoints

- `POST /api/ingest/email` - Receive DMARC reports (requires X-Ingest-Token)
- `POST /api/auth/register` - Register new customer account

### Authenticated Endpoints

- `GET /api/domains` - List domains (customer: own domains, admin: all)
- `POST /api/domains` - Create new domain
- `GET /api/domains/[id]/analytics` - Get domain analytics
- `GET /api/domains/[id]/dns-check` - Check DNS configuration

### Admin Endpoints

- `GET /api/admin/customers` - List all customers
- `POST /api/admin/customers` - Create new customer

## Security Considerations

### Authentication

- Uses Supabase Auth with secure password hashing
- Session management via HTTP-only cookies
- Row Level Security (RLS) enforced at database level

### Ingest Security

- Requires `X-Ingest-Token` header matching `INGEST_SECRET`
- Rate limiting recommended (implement at reverse proxy level)
- Max body size: 10 MB
- Token validation before processing

### Data Privacy

- GDPR-friendly: raw emails are not stored
- Only parsed DMARC data is retained
- 18-month retention recommended (implement cleanup job)

### Secrets Management

- Never commit `.env` files
- Use environment variables for all secrets
- Rotate `INGEST_SECRET` periodically

## Production Deployment

### Recommended Stack

- **Hosting**: Vercel, Netlify, or AWS
- **Database**: Supabase (managed PostgreSQL)
- **Email Forwarding**: Custom SMTP → HTTP forwarder
- **Domain**: m-host.si (primary), dmarc.m-host.si (ingest)

### Environment Variables

Ensure all environment variables are set in your production environment:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL` (https://your-domain.com)
- `NEXT_PUBLIC_PRIMARY_DOMAIN`
- `NEXT_PUBLIC_DMARC_DOMAIN`
- `INGEST_SECRET`

### Build Command

```bash
npm run build
```

### Start Command

```bash
npm run start
```

## npm Scripts

```bash
# Development
npm run dev          # Start development server

# Production
npm run build        # Build for production
npm run start        # Start production server

# Testing
npm run test         # Run tests (placeholder)

# Type Checking
npm run typecheck    # TypeScript type checking

# Linting
npm run lint         # ESLint
```

## Project Structure

```
dmarc-m-host/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── domains/      # Domain management
│   │   ├── admin/        # Admin endpoints
│   │   └── ingest/       # DMARC ingest
│   ├── app/              # Main application pages
│   │   └── domains/      # Domain dashboard
│   ├── admin/            # Admin pages
│   ├── login/            # Authentication pages
│   └── register/
├── components/            # React components
│   └── ui/               # shadcn/ui components
├── lib/                  # Utility functions
│   ├── supabase/        # Supabase clients
│   ├── auth.ts          # Authentication utilities
│   ├── dmarc-parser.ts  # DMARC parsing logic
│   └── tokens.ts        # Token generation
├── test-fixtures/        # Sample files for testing
├── .env.example         # Environment variables template
├── docker-compose.yml   # Docker Compose configuration
├── Dockerfile          # Docker image definition
└── README.md           # This file
```

## Support & Maintenance

### Monitoring

- Monitor the `/api/ingest/email` endpoint for errors
- Track domain addition rate
- Watch for failed DNS checks

### Maintenance Tasks

- Regular database backups (handled by Supabase)
- Log rotation
- Periodic cleanup of old reports (18 months)
- Security updates for dependencies

## License

© 2026 M-Host. All rights reserved.

## Contact

For support or inquiries, contact M-Host technical team.
