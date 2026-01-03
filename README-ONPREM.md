# M-Host DMARC Monitoring - On-Premise Deployment

Professional DMARC aggregate (RUA) monitoring system - fully self-hosted on a single server.

## Architecture Overview

This is a complete on-premise solution running on **ONE server** via Docker Compose:

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

## Services

1. **PostgreSQL** - Local database (no cloud dependencies)
2. **Next.js App** - Web UI + REST API
3. **Postfix** - SMTP server for receiving DMARC emails
4. **Nginx** - Reverse proxy with TLS termination

## Prerequisites

- Ubuntu 20.04+ or similar Linux server
- Docker and Docker Compose installed
- Public IP address
- Domain: `dmarc.m-host.si` pointing to your server

## DNS Configuration

Configure these DNS records **before** deployment:

### A Record
```
dmarc.m-host.si    A    YOUR_SERVER_IP
```

### MX Record
```
dmarc.m-host.si    MX   10 dmarc.m-host.si
```

### Test DNS Resolution
```bash
dig dmarc.m-host.si
dig MX dmarc.m-host.si
```

## Installation

### 1. Clone Repository

```bash
git clone <your-repo-url>
cd dmarc-m-host
```

### 2. Configure Environment

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

### 3. SSL Certificates

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

### 4. Build and Start Services

```bash
# Build Docker images
docker compose build

# Start all services
docker compose up -d

# View logs
docker compose logs -f
```

### 5. Verify Deployment

```bash
# Check service status
docker compose ps

# Test HTTPS
curl -k https://dmarc.m-host.si

# Test SMTP
telnet dmarc.m-host.si 25
```

### 6. Access Application

Open https://dmarc.m-host.si in your browser.

**Default admin credentials** (from `.env`):
- Email: admin@m-host.si
- Password: (your ADMIN_PASSWORD)

⚠️ **Change the admin password immediately after first login!**

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

### Auto-Renewal Cron Job

```bash
sudo crontab -e

# Add this line:
0 0 * * * certbot renew --quiet && cp /etc/letsencrypt/live/dmarc.m-host.si/*.pem /path/to/docker/nginx/ssl/ && cd /path/to/dmarc-m-host && docker compose restart nginx
```

## Monitoring

### Health Checks

```bash
# Application
curl https://dmarc.m-host.si/api/health

# Database
docker compose exec db pg_isready -U dmarc

# SMTP
echo "QUIT" | nc dmarc.m-host.si 25
```

### Resource Usage

```bash
docker stats
```

## Troubleshooting

### Application Won't Start

```bash
# Check logs
docker compose logs app

# Common issues:
# 1. Database not ready - wait 30 seconds
# 2. Migration failed - check DATABASE_URL
# 3. Port conflict - check if port 3000 is available
```

### SMTP Not Receiving

```bash
# Check Postfix logs
docker compose logs postfix

# Test SMTP connection
telnet dmarc.m-host.si 25

# Verify MX record
dig MX dmarc.m-host.si

# Check firewall
sudo ufw status
sudo ufw allow 25/tcp
```

### Database Connection Issues

```bash
# Check database is running
docker compose ps db

# Check connection
docker compose exec db psql -U dmarc -d dmarc -c "SELECT 1;"

# Reset database (⚠️ destroys all data)
docker compose down -v
docker compose up -d
```

### SSL Certificate Issues

```bash
# Verify certificate files exist
ls -la docker/nginx/ssl/

# Check Nginx configuration
docker compose exec nginx nginx -t

# View Nginx logs
docker compose logs nginx
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

### Rate Limiting

Configure fail2ban for additional protection:

```bash
sudo apt-get install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

## Performance Tuning

### PostgreSQL

Edit `docker-compose.yml` to add:

```yaml
db:
  environment:
    - POSTGRES_SHARED_BUFFERS=256MB
    - POSTGRES_EFFECTIVE_CACHE_SIZE=1GB
```

### Nginx

Increase worker connections in `docker/nginx/nginx.conf`:

```nginx
events {
    worker_connections 2048;
}
```

## Migration from Supabase

If migrating from the Supabase version:

1. Export data from Supabase
2. Transform schema to match Prisma models
3. Import into local PostgreSQL
4. Update DNS records
5. Switch traffic to on-prem server

See `MIGRATION.md` for detailed API migration patterns.

## Support

For issues:
1. Check logs: `docker compose logs -f`
2. Review troubleshooting section
3. Verify DNS configuration
4. Check SSL certificates

## Backup Strategy

**Daily backups recommended**:

```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
docker compose exec db pg_dump -U dmarc dmarc | gzip > backups/dmarc_${DATE}.sql.gz

# Keep last 30 days
find backups/ -name "dmarc_*.sql.gz" -mtime +30 -delete
```

Add to cron:
```bash
0 2 * * * /path/to/backup.sh
```

## License

© 2026 M-Host. All rights reserved.
