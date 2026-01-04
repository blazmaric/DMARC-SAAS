# M-Host DMARC Monitoring Platform

Professional on-premise DMARC monitoring platform for secure email authentication (SPF, DKIM, DMARC). Fully self-hosted solution designed for service providers and enterprises.

## Overview

This is a production-ready, multi-tenant on-premise application that enables organizations to monitor DMARC aggregate reports for their email domains. Customers can add domains, receive unique DMARC reporting addresses, and view comprehensive analytics through a professional web dashboard.

## 🎯 Project Status

**✅ PRODUCTION READY**

The application is fully implemented, tested, and ready for production deployment:

- ✅ **Fully Implemented** - All features are complete and working
- ✅ **End-to-end Tested** - Complete flow verified: SMTP → API → Database → UI
- ✅ **Successfully Built** - Project builds without errors
- ✅ **Complete Documentation** - Slovenian (primary) and English
- ✅ **Docker Compose Ready** - All services configured for single-server deployment
- ✅ **No Cloud Dependencies** - 100% on-premise, no external services
- ✅ **Designed for Slovenia/EU** - GDPR compliant, local data storage

### Key Features

- **100% On-Premise**: Complete self-hosted solution on a single server
- **Multi-tenant Architecture**: Support for multiple customers with isolated data
- **Role-based Access Control**: Admin and customer roles with proper permissions
- **DMARC Ingest System**: Built-in SMTP server for receiving reports via email
- **DNS Configuration Checker**: Real-time validation of DMARC DNS records
- **Analytics Dashboard**: Charts and tables showing email volume, alignment rates, and top sending sources
- **Professional UI**: Enterprise-grade design with Slovenian and English localization
- **PDF Reports**: Generate compliance reports in multiple languages
- **Email Notifications**: Automated alerts for authentication issues

## Tech Stack

- **Framework**: Next.js 13 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL 16 (local)
- **ORM**: Prisma
- **Authentication**: NextAuth with credentials provider
- **UI Components**: shadcn/ui + Tailwind CSS
- **Charts**: Recharts
- **Validation**: Zod
- **i18n**: next-intl (Slovenian, English)
- **Email Parsing**: mailparser
- **XML Parsing**: fast-xml-parser
- **Container**: Docker Compose (4 services)

## Architecture

### Infrastructure

All services run on a single server via Docker Compose:

```
┌─────────────────────────────────────────────────────┐
│                   dmarc.m-host.si                   │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │  Nginx   │  │ Postfix  │  │ Next.js  │        │
│  │  :443    │  │  :25     │  │  :3000   │        │
│  │  (TLS)   │  │ (SMTP)   │  │ (App+API)│        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
│       │             │              │               │
│       └─────────────┴──────────────┘               │
│                     │                              │
│               ┌─────▼──────┐                       │
│               │ PostgreSQL │                       │
│               │   :5432    │                       │
│               └────────────┘                       │
└─────────────────────────────────────────────────────┘
```

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
- **Application-level Security**: Role-based authorization enforced in API routes

### DMARC Ingest Model

The application uses a unique token-based system for receiving DMARC reports:

1. Each domain gets a unique `ruaToken` (24-character secure random string)
2. DMARC reports are sent to: `<ruaToken>@dmarc.m-host.si`
3. Postfix receives emails on port 25 and forwards to API
4. The API extracts the token, validates it, parses the DMARC XML, and stores the data

## Installation

### Prerequisites

- Ubuntu 20.04+ or similar Linux server
- Docker and Docker Compose installed
- Public IP address
- Domain: `dmarc.m-host.si` pointing to your server

### DNS Configuration

Configure these DNS records **before** deployment:

**A Record**
```
dmarc.m-host.si    A    YOUR_SERVER_IP
```

**MX Record**
```
dmarc.m-host.si    MX   10 dmarc.m-host.si
```

**Test DNS Resolution**
```bash
dig dmarc.m-host.si
dig MX dmarc.m-host.si
```

### Step 1: Clone Repository

```bash
git clone <your-repo-url>
cd dmarc-m-host
```

### Step 2: Configure Environment

```bash
cp .env.example .env
nano .env
```

**Required variables**:
```bash
# Database
DATABASE_URL=postgresql://dmarc:dmarc_password@db:5432/dmarc

# NextAuth (generate secure secrets)
NEXTAUTH_URL=https://dmarc.m-host.si
NEXTAUTH_SECRET=$(openssl rand -hex 32)

# Application
NEXT_PUBLIC_APP_URL=https://dmarc.m-host.si
NEXT_PUBLIC_PRIMARY_DOMAIN=m-host.si
NEXT_PUBLIC_DMARC_DOMAIN=dmarc.m-host.si

# Ingest Security
INGEST_SECRET=$(openssl rand -hex 32)

# Admin User
ADMIN_EMAIL=admin@m-host.si
ADMIN_PASSWORD=your-secure-password

# SMTP
SMTP_DOMAIN=dmarc.m-host.si
```

### Step 3: SSL Certificates

#### Option A: Let's Encrypt (Production)

```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot

# Obtain certificates
sudo certbot certonly --standalone -d dmarc.m-host.si

# Copy to project
sudo cp /etc/letsencrypt/live/dmarc.m-host.si/fullchain.pem docker/nginx/ssl/
sudo cp /etc/letsencrypt/live/dmarc.m-host.si/privkey.pem docker/nginx/ssl/
sudo chmod 644 docker/nginx/ssl/*.pem
```

#### Option B: Self-Signed (Development)

```bash
cd docker/nginx/ssl/
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout privkey.pem \
  -out fullchain.pem \
  -subj "/C=SI/ST=Slovenia/L=Ljubljana/O=M-Host/CN=dmarc.m-host.si"
cd ../../..
```

### Step 4: Build and Start Services

```bash
# Build Docker images
docker compose build

# Start all services
docker compose up -d

# View logs
docker compose logs -f
```

**Note**: The Dockerfile has been updated to properly handle the Prisma schema during build:
- Prisma schema is now copied before `npm ci`, allowing the `postinstall` script to run successfully
- OpenSSL and libc6-compat libraries have been added to all stages (deps, builder, runner) for Prisma support on Alpine Linux
- Docker Compose v2 no longer requires the `version:` line in `docker-compose.yml`

### Step 5: Verify Deployment

```bash
# Check service status
docker compose ps

# Test HTTPS
curl -k https://dmarc.m-host.si/api/health

# Test SMTP
telnet dmarc.m-host.si 25
```

### Step 6: Access Application

Open https://dmarc.m-host.si in your browser.

**Default admin credentials** (from `.env`):
- Email: admin@m-host.si
- Password: (your ADMIN_PASSWORD)

**Change the admin password immediately after first login!**

## Usage

### Adding a Domain

1. Login as admin or customer
2. Navigate to "Domains"
3. Click "Add Domain"
4. Enter domain name (e.g., `example.si`)
5. Copy the provided DMARC DNS record

### Configuring DMARC

Add this TXT record to your customer's DNS:

**Host**: `_dmarc.example.si`

**Value**: `v=DMARC1; p=none; rua=mailto:<token>@dmarc.m-host.si; fo=1`

Replace `<token>` with the unique token shown in the UI.

### DMARC Policy Progression

**Phase 1: Monitor (p=none)**
```
v=DMARC1; p=none; rua=mailto:<token>@dmarc.m-host.si; fo=1
```
Duration: 2-4 weeks

**Phase 2: Quarantine (p=quarantine)**
```
v=DMARC1; p=quarantine; rua=mailto:<token>@dmarc.m-host.si; fo=1
```
Duration: 2-4 weeks

**Phase 3: Reject (p=reject)**
```
v=DMARC1; p=reject; rua=mailto:<token>@dmarc.m-host.si; fo=1
```
Final production policy

### Testing DMARC Ingest

The repository includes test fixtures in the `test-fixtures/` directory:
- **sample-dmarc-email.eml** - Sample DMARC email message for testing ingestion
- **sample-dmarc-report.xml** - Sample DMARC XML report
- **sample-dmarc-report.pdf** - Sample generated PDF report (preview of output)

```bash
# Update test fixture with real token
nano test-fixtures/sample-dmarc-email.eml

# Send test email
curl -X POST https://dmarc.m-host.si/api/ingest/email \
  -H "X-Ingest-Token: $(grep INGEST_SECRET .env | cut -d= -f2)" \
  -H "Content-Type: message/rfc822" \
  --data-binary @test-fixtures/sample-dmarc-email.eml
```

## Maintenance

### Viewing Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f app
docker compose logs -f postfix
docker compose logs -f nginx
docker compose logs -f db
```

### Database Backup

```bash
# Backup
docker compose exec db pg_dump -U dmarc dmarc > backup.sql

# Restore
docker compose exec -T db psql -U dmarc dmarc < backup.sql
```

### Updating Application

```bash
git pull
docker compose build app
docker compose up -d app
```

### SSL Certificate Renewal

```bash
# Renew Let's Encrypt
sudo certbot renew

# Copy new certificates
sudo cp /etc/letsencrypt/live/dmarc.m-host.si/*.pem docker/nginx/ssl/

# Restart Nginx
docker compose restart nginx
```

## Security

### Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 25/tcp    # SMTP
sudo ufw allow 80/tcp    # HTTP (Let's Encrypt)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### Secrets Management

- Never commit `.env` to version control
- Rotate `INGEST_SECRET` and `NEXTAUTH_SECRET` periodically
- Use strong passwords for `ADMIN_PASSWORD`
- Restrict database access to Docker network only

## API Endpoints

### Public Endpoints

- `POST /api/ingest/email` - Receive DMARC reports (requires X-Ingest-Token)
- `POST /api/auth/register` - Register new customer account
- `GET /api/health` - Health check endpoint

### Authenticated Endpoints

- `GET /api/domains` - List domains (customer: own domains, admin: all)
- `POST /api/domains` - Create new domain
- `GET /api/domains/[id]/analytics` - Get domain analytics
- `GET /api/domains/[id]/dns-check` - Check DNS configuration

### Admin Endpoints

- `GET /api/admin/customers` - List all customers
- `POST /api/admin/customers` - Create new customer

## npm Scripts

```bash
# Development
npm run dev          # Start development server

# Production
npm run build        # Build for production
npm run start        # Start production server

# Database
npm run db:migrate   # Run Prisma migrations
npm run db:seed      # Seed database with admin user
npm run db:studio    # Open Prisma Studio

# Type Checking
npm run typecheck    # TypeScript type checking

# Linting
npm run lint         # ESLint
```

## Documentation

- **README-ONPREM.md** - Comprehensive on-premise deployment guide
- **DEPLOYMENT-STATUS.md** - Project status and migration tracking
- **MIGRATION.md** - API migration patterns from Supabase to Prisma

## License

© 2026 M-Host. All rights reserved.

## Contact

For support or inquiries, contact M-Host technical team.
