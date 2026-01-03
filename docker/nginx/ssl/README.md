# SSL Certificate Setup

## Option 1: Let's Encrypt (Recommended for Production)

1. Install Certbot on your server:
```bash
sudo apt-get update
sudo apt-get install certbot
```

2. Obtain certificates:
```bash
sudo certbot certonly --standalone -d dmarc.m-host.si
```

3. Copy certificates to this directory:
```bash
sudo cp /etc/letsencrypt/live/dmarc.m-host.si/fullchain.pem ./fullchain.pem
sudo cp /etc/letsencrypt/live/dmarc.m-host.si/privkey.pem ./privkey.pem
sudo chmod 644 *.pem
```

4. Set up auto-renewal:
```bash
sudo crontab -e
# Add this line:
0 0 * * * certbot renew --quiet && cp /etc/letsencrypt/live/dmarc.m-host.si/*.pem /path/to/docker/nginx/ssl/ && docker compose restart nginx
```

## Option 2: Self-Signed Certificates (Development/Testing Only)

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout privkey.pem \
  -out fullchain.pem \
  -subj "/C=SI/ST=Slovenia/L=Ljubljana/O=M-Host/CN=dmarc.m-host.si"
```

⚠️  **Warning**: Self-signed certificates will show browser warnings and should NOT be used in production.

## Required Files

Place these files in this directory:
- `fullchain.pem` - Full certificate chain
- `privkey.pem` - Private key

## File Permissions

```bash
chmod 644 fullchain.pem
chmod 600 privkey.pem
```
