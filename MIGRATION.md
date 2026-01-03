# Supabase to Prisma Migration Guide

This document provides patterns and examples for completing the API route migration from Supabase to Prisma.

## Completed Migrations

- ✅ Authentication system (NextAuth)
- ✅ Database schema (Prisma)
- ✅ Middleware (NextAuth JWT)
- ✅ Docker infrastructure

## API Routes Requiring Migration

### 1. Registration Route (`app/api/auth/register/route.ts`)

**Status**: Update needed

**Pattern**:
```typescript
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

// Check existing user
const existingUser = await prisma.user.findUnique({
  where: { email },
});

// Create customer and user
const customer = await prisma.customer.create({
  data: { name },
});

const user = await prisma.user.create({
  data: {
    email,
    passwordHash: await hashPassword(password),
    role: 'customer',
    customerId: customer.id,
  },
});
```

### 2. Domains Route (`app/api/domains/route.ts`)

**Status**: Update needed

**GET Pattern**:
```typescript
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

const user = await getCurrentUser();

let domains;
if (user.role === 'customer') {
  domains = await prisma.domain.findMany({
    where: { customerId: user.customerId! },
    include: { customer: true },
    orderBy: { createdAt: 'desc' },
  });
} else {
  domains = await prisma.domain.findMany({
    include: { customer: true },
    orderBy: { createdAt: 'desc' },
  });
}
```

**POST Pattern**:
```typescript
import { generateSecureToken } from '@/lib/tokens';

const ruaToken = generateSecureToken(24);

const domain = await prisma.domain.create({
  data: {
    domainName,
    customerId: targetCustomerId,
    ruaToken,
  },
  include: { customer: true },
});
```

### 3. Domain Analytics (`app/api/domains/[id]/analytics/route.ts`)

**Status**: Update needed

**Pattern**:
```typescript
const domain = await prisma.domain.findUnique({
  where: { id: domainId },
});

// Check authorization
if (user.role === 'customer' && user.customerId !== domain.customerId) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

const dailyStats = await prisma.dailyAggregate.findMany({
  where: {
    domainId,
    date: { gte: startDate },
  },
  orderBy: { date: 'asc' },
});

const reports = await prisma.dmarcReport.findMany({
  where: {
    domainId,
    beginDate: { gte: startDate },
  },
  include: { records: true },
  orderBy: { beginDate: 'desc' },
});
```

### 4. DNS Check Route (`app/api/domains/[id]/dns-check/route.ts`)

**Status**: Minor update needed (just domain lookup)

**Pattern**:
```typescript
const domain = await prisma.domain.findUnique({
  where: { id: domainId },
});

// Rest of DNS logic remains the same
```

### 5. DMARC Ingest (`app/api/ingest/email/route.ts`)

**Status**: Major update needed

**Pattern**:
```typescript
// Find domain by token
const domain = await prisma.domain.findUnique({
  where: { ruaToken: token },
  select: { id: true, customerId: true },
});

// Check for existing report
const existingReport = await prisma.dmarcReport.findFirst({
  where: {
    domainId: domain.id,
    orgName: dmarcReport.orgName,
    reportId: dmarcReport.reportId,
    beginDate: dmarcReport.beginDate,
    endDate: dmarcReport.endDate,
  },
});

if (existingReport) {
  return NextResponse.json({ message: 'Report already processed' });
}

// Create report and records in a transaction
const result = await prisma.$transaction(async (tx) => {
  const newReport = await tx.dmarcReport.create({
    data: {
      domainId: domain.id,
      orgName: dmarcReport.orgName,
      reportId: dmarcReport.reportId,
      beginDate: dmarcReport.beginDate,
      endDate: dmarcReport.endDate,
    },
  });

  if (dmarcReport.records.length > 0) {
    await tx.dmarcRecord.createMany({
      data: dmarcReport.records.map((record) => ({
        reportId: newReport.id,
        sourceIp: record.sourceIp,
        count: record.count,
        disposition: record.disposition,
        dkimResult: record.dkimResult,
        spfResult: record.spfResult,
        dkimAligned: record.dkimAligned,
        spfAligned: record.spfAligned,
        headerFrom: record.headerFrom,
        envelopeFrom: record.envelopeFrom,
      })),
    });
  }

  return newReport;
});

// Update daily aggregates
await updateDailyAggregates(domain.id, dmarcReport.beginDate, dmarcReport.records);
```

**Daily Aggregates Helper**:
```typescript
async function updateDailyAggregates(domainId: string, date: Date, records: any[]) {
  const dateOnly = new Date(date);
  dateOnly.setUTCHours(0, 0, 0, 0);

  const total = records.reduce((sum, r) => sum + r.count, 0);
  const passAligned = records
    .filter((r) => r.dkimAligned && r.spfAligned)
    .reduce((sum, r) => sum + r.count, 0);
  const failAligned = total - passAligned;

  await prisma.dailyAggregate.upsert({
    where: {
      domainId_date: {
        domainId,
        date: dateOnly,
      },
    },
    update: {
      total: { increment: total },
      passAligned: { increment: passAligned },
      failAligned: { increment: failAligned },
    },
    create: {
      domainId,
      date: dateOnly,
      total,
      passAligned,
      failAligned,
    },
  });
}
```

### 6. Admin Customers (`app/api/admin/customers/route.ts`)

**Status**: Update needed

**GET Pattern**:
```typescript
await requireAdmin();

const customers = await prisma.customer.findMany({
  orderBy: { createdAt: 'desc' },
});
```

**POST Pattern**:
```typescript
await requireAdmin();

const customer = await prisma.customer.create({
  data: { name },
});
```

## Frontend Updates Needed

### Authentication Pages

1. **Login Page** (`app/login/page.tsx`):
   - Replace Supabase `signInWithPassword` with NextAuth `signIn`
   ```typescript
   import { signIn } from 'next-auth/react';

   await signIn('credentials', {
     email,
     password,
     redirect: false,
   });
   ```

2. **App Layout** (`app/app/layout.tsx`):
   - Replace Supabase auth check with NextAuth session
   ```typescript
   import { useSession } from 'next-auth/react';

   const { data: session, status } = useSession();
   ```

3. **Domain Pages**:
   - No authentication code changes needed
   - API calls remain the same

## Migration Checklist

- [ ] Update `/api/auth/register/route.ts`
- [ ] Update `/api/domains/route.ts` (GET + POST)
- [ ] Update `/api/domains/[id]/analytics/route.ts`
- [ ] Update `/api/domains/[id]/dns-check/route.ts`
- [ ] Update `/api/ingest/email/route.ts`
- [ ] Update `/api/admin/customers/route.ts`
- [ ] Update `/app/login/page.tsx`
- [ ] Update `/app/register/page.tsx`
- [ ] Update `/app/app/layout.tsx`
- [ ] Delete `/lib/supabase/` directory
- [ ] Remove `@supabase/*` from package.json
- [ ] Run `npm install`
- [ ] Run `npm run build` to verify

## Testing After Migration

1. Register new user
2. Login
3. Create domain
4. Check DNS
5. Send test DMARC email via curl
6. View analytics
7. Admin: Create customer

## Common Prisma Patterns

### Find One
```typescript
await prisma.model.findUnique({ where: { id } });
```

### Find Many with Filter
```typescript
await prisma.model.findMany({
  where: { fieldName: value },
  include: { relation: true },
  orderBy: { createdAt: 'desc' },
});
```

### Create
```typescript
await prisma.model.create({
  data: { field1, field2 },
  include: { relation: true },
});
```

### Update
```typescript
await prisma.model.update({
  where: { id },
  data: { field: newValue },
});
```

### Upsert
```typescript
await prisma.model.upsert({
  where: { uniqueField: value },
  update: { field: newValue },
  create: { field: value },
});
```

### Delete
```typescript
await prisma.model.delete({
  where: { id },
});
```

### Transaction
```typescript
await prisma.$transaction(async (tx) => {
  // Multiple operations
});
```
