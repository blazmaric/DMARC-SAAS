# On-Premise Deployment Status

## ✅ Completed Infrastructure

### 1. Database Layer
- **Prisma ORM** configured with PostgreSQL
- **Schema** created with all tables (customers, users, domains, dmarc_reports, dmarc_records, daily_aggregates)
- **Migrations** ready in `prisma/migrations/`
- **Seed script** for creating initial admin user

### 2. Authentication System
- **NextAuth** configured with credentials provider
- **JWT sessions** with role-based access
- **Middleware** for route protection
- **Type definitions** for user sessions

### 3. Docker Infrastructure
- **docker-compose.yml** with 4 services:
  - PostgreSQL 16
  - Next.js app
  - Postfix SMTP server
  - Nginx reverse proxy
- **Health checks** configured
- **Persistent volumes** for database
- **Network isolation**

### 4. SMTP Ingest Server
- **Postfix container** configured
- **Custom transport** to forward emails to API
- **Ingest script** (`ingest-curl.sh`) to POST emails
- **Configuration files** (main.cf, master.cf)

### 5. Reverse Proxy
- **Nginx** configured with TLS
- **HTTPS redirect** from HTTP
- **SSL certificate** placeholder (Let's Encrypt ready)
- **Proxy headers** for Next.js

### 6. Documentation
- **MIGRATION.md** - Complete API migration patterns
- **README-ONPREM.md** - Full deployment guide
- **Docker SSL README** - Certificate setup instructions

## ⚠️ Remaining Work

### API Routes (6 files need Prisma migration)

All patterns are documented in `MIGRATION.md`. Apply these changes:

1. **`app/api/auth/register/route.ts`**
   - Replace Supabase client with Prisma
   - Use `prisma.user.create()` and `prisma.customer.create()`

2. **`app/api/domains/route.ts`**
   - Replace Supabase queries with Prisma
   - GET: `prisma.domain.findMany()`
   - POST: `prisma.domain.create()`

3. **`app/api/domains/[id]/analytics/route.ts`**
   - Replace Supabase with Prisma queries
   - Use `prisma.dailyAggregate.findMany()`
   - Use `prisma.dmarcReport.findMany({ include: { records: true }})`

4. **`app/api/domains/[id]/dns-check/route.ts`**
   - Replace domain lookup with `prisma.domain.findUnique()`
   - DNS logic remains unchanged

5. **`app/api/ingest/email/route.ts`** ⚠️ CRITICAL
   - Replace all Supabase calls with Prisma
   - Use `prisma.$transaction()` for atomic operations
   - Use `prisma.dailyAggregate.upsert()` for aggregates

6. **`app/api/admin/customers/route.ts`**
   - Replace Supabase with `prisma.customer.findMany()`
   - POST: `prisma.customer.create()`

### Frontend Updates (3 files)

1. **`app/login/page.tsx`**
   ```typescript
   // Replace:
   const supabase = createClient();
   await supabase.auth.signInWithPassword({ email, password });

   // With:
   import { signIn } from 'next-auth/react';
   await signIn('credentials', { email, password, redirect: false });
   ```

2. **`app/register/page.tsx`**
   - API call remains the same (just POST to `/api/auth/register`)
   - No auth changes needed

3. **`app/app/layout.tsx`**
   ```typescript
   // Replace:
   const supabase = createClient();
   const { data: { user }} = await supabase.auth.getUser();

   // With:
   import { useSession } from 'next-auth/react';
   const { data: session, status } = useSession();
   ```

### Cleanup

1. **Delete Supabase files**:
   ```bash
   rm -rf lib/supabase/
   rm supabase/migrations/20260103185412_create_dmarc_schema.sql
   ```

2. **Remove Supabase dependencies**:
   - Remove from package.json (already done in new version)
   - Run `npm install` to clean up

3. **Update `.gitignore`** if needed:
   ```
   .env
   /docker/nginx/ssl/*.pem
   ```

## 🚀 Quick Start (After Completing Migration)

### 1. Set Up Environment

```bash
cp .env.example .env
# Edit .env with your values
nano .env
```

### 2. Generate Secrets

```bash
# NextAuth secret
echo "NEXTAUTH_SECRET=$(openssl rand -hex 32)" >> .env

# Ingest secret
echo "INGEST_SECRET=$(openssl rand -hex 32)" >> .env
```

### 3. SSL Certificates

```bash
# Development (self-signed)
cd docker/nginx/ssl/
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout privkey.pem -out fullchain.pem \
  -subj "/CN=dmarc.m-host.si"
cd ../../..

# Production (Let's Encrypt)
sudo certbot certonly --standalone -d dmarc.m-host.si
sudo cp /etc/letsencrypt/live/dmarc.m-host.si/*.pem docker/nginx/ssl/
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Build and Deploy

```bash
# Build containers
docker compose build

# Start services
docker compose up -d

# View logs
docker compose logs -f
```

### 6. Verify

```bash
# Check services
docker compose ps

# Test health
curl https://dmarc.m-host.si/api/health

# Test SMTP
telnet dmarc.m-host.si 25
```

### 7. Login

- URL: https://dmarc.m-host.si
- Email: admin@m-host.si (from .env ADMIN_EMAIL)
- Password: (from .env ADMIN_PASSWORD)

## 📁 File Structure

```
dmarc-m-host/
├── app/                          # Next.js app
│   ├── api/                     # API routes (⚠️ need Prisma updates)
│   ├── app/                     # Main app pages (⚠️ need NextAuth updates)
│   ├── login/                   # Login page (⚠️ needs NextAuth)
│   └── register/                # Register page
├── docker/                       # Docker configuration
│   ├── nginx/                   # ✅ Nginx reverse proxy
│   │   ├── nginx.conf
│   │   └── ssl/                 # SSL certificates go here
│   └── postfix/                 # ✅ Postfix SMTP server
│       ├── Dockerfile
│       ├── main.cf
│       ├── master.cf
│       ├── ingest-curl.sh
│       └── entrypoint.sh
├── lib/                          # Utilities
│   ├── auth.ts                  # ✅ Updated for NextAuth
│   ├── prisma.ts                # ✅ Prisma client
│   ├── next-auth.ts             # ✅ NextAuth config
│   ├── dmarc-parser.ts          # No changes needed
│   └── tokens.ts                # No changes needed
├── prisma/                       # ✅ Database
│   ├── schema.prisma            # ✅ Complete schema
│   ├── migrations/              # ✅ Initial migration
│   └── seed.ts                  # ✅ Admin user seed
├── docker-compose.yml            # ✅ Production setup
├── Dockerfile                    # ✅ Multi-stage build
├── .env.example                  # ✅ Template
├── MIGRATION.md                  # ✅ API migration guide
├── README-ONPREM.md              # ✅ Deployment docs
└── DEPLOYMENT-STATUS.md          # This file
```

## 🔧 Migration Commands

```bash
# 1. Update API routes (use patterns from MIGRATION.md)
# Edit each file in app/api/

# 2. Update frontend
# Edit app/login/page.tsx
# Edit app/app/layout.tsx

# 3. Clean up
rm -rf lib/supabase/
rm -rf supabase/

# 4. Install dependencies
npm install

# 5. Test build
npm run build

# 6. Deploy
docker compose up -d
```

## ✅ Testing Checklist

After deployment:

- [ ] Application loads at https://dmarc.m-host.si
- [ ] Can register new user
- [ ] Can login
- [ ] Can create domain
- [ ] DNS checker works
- [ ] Can send test DMARC email via curl
- [ ] Analytics display correctly
- [ ] Admin can create customers
- [ ] SMTP receives mail on port 25

## 📝 Notes

### Why API Routes Aren't Updated

The API routes require manual updates because:
1. Each route has specific business logic
2. Supabase and Prisma have different query patterns
3. Some routes need transaction handling
4. Authorization logic varies per endpoint

**All patterns are documented in `MIGRATION.md`** with copy-paste examples.

### Production Considerations

1. **Backups**: Set up automated PostgreSQL backups
2. **Monitoring**: Configure alerts for service health
3. **SSL**: Use Let's Encrypt with auto-renewal
4. **Firewall**: Restrict ports (22, 25, 80, 443)
5. **Rate Limiting**: Add fail2ban or similar
6. **Secrets**: Rotate INGEST_SECRET periodically
7. **Logs**: Set up log rotation

### Performance

- Database is local (no network latency)
- All services on same Docker network
- Nginx caching can be enabled
- PostgreSQL tuning in docker-compose.yml

## 🆘 Support

See documentation:
- **MIGRATION.md** - API update patterns
- **README-ONPREM.md** - Full deployment guide
- **docker/nginx/ssl/README.md** - SSL setup
- Test fixtures in `test-fixtures/`

For issues:
1. Check `docker compose logs -f`
2. Verify DNS records
3. Test with curl
4. Review health endpoint
