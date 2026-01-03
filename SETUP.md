# Quick Setup Guide

## Prerequisites

- Node.js 18+
- Supabase account (already configured)
- npm or yarn

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment is already configured**
   - `.env` file is already set up with Supabase credentials
   - All required environment variables are in place

3. **Database migrations are already applied**
   - Schema is deployed to Supabase
   - Tables: customers, users, domains, dmarc_reports, dmarc_records, daily_aggregates
   - Row Level Security (RLS) is enabled

4. **Create an admin user**

   Go to your Supabase project dashboard:

   a. Authentication > Users > Add user
      - Email: admin@m-host.si
      - Password: (set a secure password)
      - Note the User ID

   b. Table Editor > customers > Insert row
      - name: "M-Host Admin"
      - Note the customer ID (optional for admin)

   c. Table Editor > users > Insert row
      - id: (paste the User ID from step a)
      - email: admin@m-host.si
      - role: admin
      - customer_id: (leave null for admin)

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Open http://localhost:3000
   - Login with your admin credentials
   - Create customers and add domains

## Testing DMARC Ingest

1. **Create a test domain**
   - Login as admin
   - Add a domain (e.g., test.si)
   - Copy the RUA token shown

2. **Update test fixture**
   - Edit `test-fixtures/sample-dmarc-email.eml`
   - Replace `test-token-12345` with your actual token

3. **Send test email**
   ```bash
   curl -X POST http://localhost:3000/api/ingest/email \
     -H "X-Ingest-Token: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6" \
     -H "Content-Type: message/rfc822" \
     --data-binary @test-fixtures/sample-dmarc-email.eml
   ```

4. **View the results**
   - Navigate to the domain detail page
   - You should see the parsed DMARC data in the dashboard

## Docker Setup

```bash
# Start with Docker Compose
docker compose up

# Access at http://localhost:3000
```

## Project Structure

```
dmarc-m-host/
├── app/                    # Next.js pages and API routes
│   ├── api/               # API endpoints
│   ├── app/               # Main application
│   ├── admin/             # Admin interface
│   ├── login/             # Authentication
│   └── register/
├── lib/                   # Utilities
│   ├── supabase/         # Database clients
│   ├── auth.ts           # Auth helpers
│   ├── dmarc-parser.ts   # DMARC XML parsing
│   └── tokens.ts         # Token generation
├── components/ui/         # UI components
└── test-fixtures/        # Sample data

```

## Key Features

- Multi-tenant SaaS architecture
- Secure DMARC report ingestion
- Real-time DNS verification
- Analytics dashboard with charts
- Admin panel for managing customers
- Production-ready security with RLS

## Next Steps

1. Create your first customer account
2. Add a domain to monitor
3. Configure the DMARC DNS record
4. Set up SMTP → HTTP email forwarder
5. Start receiving reports

For detailed documentation, see README.md
