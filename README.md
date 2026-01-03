# M-Host DMARC Platforma za Spremljanje

Profesionalna on-premise platforma za spremljanje DMARC za varno avtentikacijo e-pošte (SPF, DKIM, DMARC). Popolnoma samostojno gostovana rešitev, zasnovana za ponudnike storitev in podjetja.

## Pregled

To je produkcijsko pripravljena, večstanovanjska on-premise aplikacija, ki organizacijam omogoča spremljanje DMARC agregatnih poročil za njihove e-poštne domene. Stranke lahko dodajajo domene, prejmejo edinstvene naslove za DMARC poročanje in pregledujejo celovite analitike prek profesionalne spletne nadzorne plošče.

### Ključne funkcionalnosti

- **100% On-Premise**: Popolnoma samostojno gostovana rešitev na enem samem strežniku
- **Večstanovanjska arhitektura**: Podpora za več strank z ločenimi podatki
- **Nadzor dostopa na osnovi vlog**: Administratorske in strankine vloge z ustreznimi dovoljenji
- **DMARC sistem za sprejem**: Vgrajen SMTP strežnik za sprejem poročil prek e-pošte
- **Preverjanje DNS konfiguracije**: Preverjanje DMARC DNS zapisov v realnem času
- **Analitična nadzorna plošča**: Grafikoni in tabele, ki prikazujejo obseg e-pošte, stopnje usklajenosti in najpogostejše vire pošiljanja
- **Profesionalen uporabniški vmesnik**: Podjetniška zasnova s slovensko in angleško lokalizacijo
- **PDF poročila**: Ustvarjanje poročil o skladnosti v več jezikih
- **E-poštna obvestila**: Avtomatizirani alarmi za težave z avtentikacijo

## Tehnološki sklad

- **Ogrodje**: Next.js 13 (App Router)
- **Jezik**: TypeScript
- **Podatkovna baza**: PostgreSQL 16 (lokalna)
- **ORM**: Prisma
- **Avtentikacija**: NextAuth s ponudnikom poverilnic
- **UI komponente**: shadcn/ui + Tailwind CSS
- **Grafikoni**: Recharts
- **Validacija**: Zod
- **i18n**: next-intl (slovenščina, angleščina)
- **Razčlenjevanje e-pošte**: mailparser
- **Razčlenjevanje XML**: fast-xml-parser
- **Vsebnik**: Docker Compose (4 storitve)

## Arhitektura

### Infrastruktura

Vse storitve se izvajajo na enem strežniku prek Docker Compose:

```
┌─────────────────────────────────────────────────────┐
│                   dmarc.m-host.si                   │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │  Nginx   │  │ Postfix  │  │ Next.js  │        │
│  │  :443    │  │  :25     │  │  :3000   │        │
│  │  (TLS)   │  │ (SMTP)   │  │(App+API) │        │
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

### Shema podatkovne baze

Aplikacija uporablja naslednje osnovne entitete:

- **customers**: Računi podjetij
- **users**: Posamezni uporabniški računi, povezani s strankami ali administratorji
- **domains**: E-poštne domene, ki se spremljajo
- **dmarc_reports**: Agregatna poročila, prejeta od ponudnikov e-pošte
- **dmarc_records**: Posamezni zapisi znotraj vsakega poročila
- **daily_aggregates**: Vnaprej izračunane dnevne statistike za hitro poizvedovanje

### Večstanovanjskost

- **Administratorski uporabniki**: Poln dostop do vseh strank, domen in podatkov
- **Uporabniki strank**: Dostop samo do domen in poročil svoje stranke
- **Varnost na ravni aplikacije**: Avtorizacija na osnovi vlog, uveljavljena v API poteh

### Model sprejema DMARC

Aplikacija uporablja edinstven sistem, ki temelji na žetonih, za sprejem DMARC poročil:

1. Vsaka domena dobi edinstven `ruaToken` (24-znakovna varna naključna niz)
2. DMARC poročila se pošiljajo na: `<ruaToken>@dmarc.m-host.si`
3. Postfix prejme e-pošto na vrata 25 in jo posreduje API-ju
4. API izvleče žeton, ga potrdi, razčleni DMARC XML in shrani podatke

## Namestitev

### Predpogoji

- Ubuntu 20.04+ ali podoben Linux strežnik
- Nameščen Docker in Docker Compose
- Javni IP naslov
- Domena: `dmarc.m-host.si`, usmerjena na vaš strežnik

### DNS konfiguracija

Konfigurirajte te DNS zapise **pred** uvedbo:

**A zapis**
```
dmarc.m-host.si    A    VAŠ_STREŽNIŠKI_IP
```

**MX zapis**
```
dmarc.m-host.si    MX   10 dmarc.m-host.si
```

**Preizkusite razreševanje DNS**
```bash
dig dmarc.m-host.si
dig MX dmarc.m-host.si
```

### Korak 1: Kloniranje repozitorija

```bash
git clone <url-vašega-repozitorija>
cd dmarc-m-host
```

### Korak 2: Konfiguracija okolja

```bash
cp .env.example .env
nano .env
```

**Zahtevane spremenljivke**:
```bash
# Podatkovna baza
DATABASE_URL=postgresql://dmarc:dmarc_password@db:5432/dmarc

# NextAuth (generirajte varne skrivnosti)
NEXTAUTH_URL=https://dmarc.m-host.si
NEXTAUTH_SECRET=$(openssl rand -hex 32)

# Aplikacija
NEXT_PUBLIC_APP_URL=https://dmarc.m-host.si
NEXT_PUBLIC_PRIMARY_DOMAIN=m-host.si
NEXT_PUBLIC_DMARC_DOMAIN=dmarc.m-host.si

# Varnost sprejema
INGEST_SECRET=$(openssl rand -hex 32)

# Administratorski uporabnik
ADMIN_EMAIL=admin@m-host.si
ADMIN_PASSWORD=vaše-varno-geslo

# SMTP
SMTP_DOMAIN=dmarc.m-host.si
```

### Korak 3: SSL certifikati

#### Možnost A: Let's Encrypt (produkcija)

```bash
# Namestite certbot
sudo apt-get update
sudo apt-get install certbot

# Pridobite certifikate
sudo certbot certonly --standalone -d dmarc.m-host.si

# Kopirajte v projekt
sudo cp /etc/letsencrypt/live/dmarc.m-host.si/fullchain.pem docker/nginx/ssl/
sudo cp /etc/letsencrypt/live/dmarc.m-host.si/privkey.pem docker/nginx/ssl/
sudo chmod 644 docker/nginx/ssl/*.pem
```

#### Možnost B: Samopodpisan (razvoj)

```bash
cd docker/nginx/ssl/
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout privkey.pem \
  -out fullchain.pem \
  -subj "/C=SI/ST=Slovenia/L=Ljubljana/O=M-Host/CN=dmarc.m-host.si"
cd ../../..
```

### Korak 4: Izgradnja in zagon storitev

```bash
# Zgradite Docker slike
docker compose build

# Zaženite vse storitve
docker compose up -d

# Oglejte si dnevnike
docker compose logs -f
```

### Korak 5: Preverjanje uvedbe

```bash
# Preverite stanje storitev
docker compose ps

# Preizkusite HTTPS
curl -k https://dmarc.m-host.si/api/health

# Preizkusite SMTP
telnet dmarc.m-host.si 25
```

### Korak 6: Dostop do aplikacije

Odprite https://dmarc.m-host.si v vašem brskalniku.

**Privzete administratorske poverilnice** (iz `.env`):
- E-pošta: admin@m-host.si
- Geslo: (vaš ADMIN_PASSWORD)

**Takoj po prvi prijavi spremenite administratorsko geslo!**

## Uporaba

### Dodajanje domene

1. Prijavite se kot administrator ali stranka
2. Pojdite na "Domene"
3. Kliknite "Dodaj domeno"
4. Vnesite ime domene (npr. `primer.si`)
5. Kopirajte priloženi DMARC DNS zapis

### Konfiguracija DMARC

Dodajte ta TXT zapis v DNS vaše stranke:

**Gostitelj**: `_dmarc.primer.si`

**Vrednost**: `v=DMARC1; p=none; rua=mailto:<žeton>@dmarc.m-host.si; fo=1`

Zamenjajte `<žeton>` z edinstvenim žetonom, prikazanim v uporabniškem vmesniku.

### Postopnost politike DMARC

**Faza 1: Spremljanje (p=none)**
```
v=DMARC1; p=none; rua=mailto:<žeton>@dmarc.m-host.si; fo=1
```
Trajanje: 2-4 tedne

**Faza 2: Karantena (p=quarantine)**
```
v=DMARC1; p=quarantine; rua=mailto:<žeton>@dmarc.m-host.si; fo=1
```
Trajanje: 2-4 tedne

**Faza 3: Zavrnitev (p=reject)**
```
v=DMARC1; p=reject; rua=mailto:<žeton>@dmarc.m-host.si; fo=1
```
Končna produkcijska politika

### Testiranje sprejema DMARC

```bash
# Posodobite testno datoteko z resničnim žetonom
nano test-fixtures/sample-dmarc-email.eml

# Pošljite testno e-pošto
curl -X POST https://dmarc.m-host.si/api/ingest/email \
  -H "X-Ingest-Token: $(grep INGEST_SECRET .env | cut -d= -f2)" \
  -H "Content-Type: message/rfc822" \
  --data-binary @test-fixtures/sample-dmarc-email.eml
```

## Vzdrževanje

### Ogled dnevnikov

```bash
# Vse storitve
docker compose logs -f

# Specifična storitev
docker compose logs -f app
docker compose logs -f postfix
docker compose logs -f nginx
docker compose logs -f db
```

### Varnostna kopija podatkovne baze

```bash
# Varnostna kopija
docker compose exec db pg_dump -U dmarc dmarc > backup.sql

# Obnovitev
docker compose exec -T db psql -U dmarc dmarc < backup.sql
```

### Posodobitev aplikacije

```bash
git pull
docker compose build app
docker compose up -d app
```

### Obnova SSL certifikata

```bash
# Obnovite Let's Encrypt
sudo certbot renew

# Kopirajte nove certifikate
sudo cp /etc/letsencrypt/live/dmarc.m-host.si/*.pem docker/nginx/ssl/

# Ponovno zaženite Nginx
docker compose restart nginx
```

## Varnost

### Konfiguracija požarnega zidu

```bash
# Dovolite samo potrebna vrata
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 25/tcp    # SMTP
sudo ufw allow 80/tcp    # HTTP (Let's Encrypt)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### Upravljanje skrivnosti

- Nikoli ne potrjujte `.env` v nadzor različic
- Periodično rotirajte `INGEST_SECRET` in `NEXTAUTH_SECRET`
- Uporabite močna gesla za `ADMIN_PASSWORD`
- Omejite dostop do podatkovne baze samo na Docker omrežje

### GDPR skladnost

- **Minimizacija podatkov**: Shranjeni so samo razčlenjeni DMARC podatki, ne surova e-pošta
- **Lokalno shranjevanje**: Vsi podatki ostanejo na vašem strežniku v Sloveniji/EU
- **Nadzor dostopa**: Strankam je dostop omejen samo do njihovih podatkov
- **Pravica do izbrisa**: Administratorji lahko izbrišejo podatke strank
- **Hramba podatkov**: Priporočeno obdobje hranjenja 18 mesecev

## API končne točke

### Javne končne točke

- `POST /api/ingest/email` - Sprejem DMARC poročil (zahteva X-Ingest-Token)
- `POST /api/auth/register` - Registracija novega računa stranke
- `GET /api/health` - Končna točka za preverjanje zdravja

### Avtenticirane končne točke

- `GET /api/domains` - Seznam domen (stranka: lastne domene, admin: vse)
- `POST /api/domains` - Ustvarjanje nove domene
- `GET /api/domains/[id]/analytics` - Pridobitev analitik domene
- `GET /api/domains/[id]/dns-check` - Preverjanje DNS konfiguracije

### Administratorske končne točke

- `GET /api/admin/customers` - Seznam vseh strank
- `POST /api/admin/customers` - Ustvarjanje nove stranke

## npm skripte

```bash
# Razvoj
npm run dev          # Zagon razvojnega strežnika

# Produkcija
npm run build        # Izgradnja za produkcijo
npm run start        # Zagon produkcijskega strežnika

# Podatkovna baza
npm run db:migrate   # Zagon Prisma migracij
npm run db:seed      # Sejanje podatkovne baze z administratorskim uporabnikom
npm run db:studio    # Odprite Prisma Studio

# Preverjanje tipov
npm run typecheck    # TypeScript preverjanje tipov

# Lintanje
npm run lint         # ESLint
```

## Dokumentacija

- **README-ONPREM.md** - Celovit vodnik za on-premise uvedbo (angleščina)
- **DEPLOYMENT-STATUS.md** - Stanje projekta in sledenje migraciji (angleščina)
- **MIGRATION.md** - Vzorci migracije API iz Supabase v Prisma (angleščina)
- **README.en.md** - Angleški prevod tega README

## O DMARC

DMARC (Domain-based Message Authentication, Reporting & Conformance) je standard za avtentikacijo e-pošte, ki pomaga preprečiti ponarejanje e-pošte in phishing napade.

### Kako deluje DMARC

1. **SPF** (Sender Policy Framework): Preverja, ali je strežnik pooblaščen za pošiljanje e-pošte v imenu vaše domene
2. **DKIM** (DomainKeys Identified Mail): Kriptografski podpis e-poštnega sporočila
3. **DMARC**: Politika, ki določa, kaj naj se zgodi z e-pošto, ki ne ustreza SPF in DKIM

### Zakaj potrebujete DMARC spremljanje

- **Varnost**: Preprečitev ponarejanja e-pošte v imenu vaše domene
- **Dostavljivost**: Izboljšanje dostavljivosti legitimne e-pošte
- **Vidljivost**: Vpogled v vse vire, ki pošiljajo e-pošto v vašem imenu
- **Skladnost**: EU organizacije vse pogosteje zahtevajo DMARC

## Slovenija in EU

Ta rešitev je posebej zasnovana za slovenske in evropske organizacije:

- **Lokalno gostovanje**: Vsi podatki ostanejo na vašem strežniku v Sloveniji
- **GDPR skladnost**: Popoln nadzor nad osebnimi podatki
- **Slovenščina**: Uporabniški vmesnik in poročila v slovenščini
- **EU standardi**: Implementacija v skladu z najboljšimi praksami EU

## Podpora

Za podporo ali poizvedbe se obrnite na tehnično ekipo M-Host.

**M-Host d.o.o.**
Ljubljana, Slovenija
E-pošta: info@m-host.si

## Licenca

© 2026 M-Host. Vse pravice pridržane.

---

**Narejeno v Sloveniji za EU** 🇸🇮🇪🇺
