# Quick Build Fix - API Routes

The build is failing because 5 API routes still import from deleted Supabase files.

## Files to Update

1. `app/api/auth/register/route.ts`
2. `app/api/domains/route.ts`
3. `app/api/domains/[id]/analytics/route.ts`
4. `app/api/domains/[id]/dns-check/route.ts`
5. `app/api/admin/customers/route.ts`
6. `app/api/ingest/email/route.ts` (also needs update)

## Quick Fix Pattern

Replace this:
```typescript
import { createClient } from '@/lib/supabase/server';
const supabase = await createClient();
const { data } = await supabase.from('table').select('*');
```

With this:
```typescript
import { prisma } from '@/lib/prisma';
const data = await prisma.table.findMany();
```

## Complete Examples in MIGRATION.md

See MIGRATION.md for full copy-paste examples for each route.

## Run After Fixing

```bash
npm run build
docker compose build
docker compose up -d
```
