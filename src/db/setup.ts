import path from 'node:path';
import { eq } from 'drizzle-orm';
import type { DB, DbKind } from './index';
import { settings } from './schema';

export const SEED_VERSION = '1';

/** Applies pending SQL migrations and seeds demo data when the database is empty. Idempotent. */
export async function migrateAndSeed(db: DB, kind: DbKind, log: (m: string) => void = () => {}) {
  const migrationsFolder = path.join(process.cwd(), 'drizzle');
  if (kind === 'pglite') {
    const { migrate } = await import('drizzle-orm/pglite/migrator');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await migrate(db as any, { migrationsFolder });
  } else {
    const { migrate } = await import('drizzle-orm/node-postgres/migrator');
    await migrate(db, { migrationsFolder });
  }
  log('migrations applied');
  const { applyStorePolicy, purgeDemoIfNeeded } = await import('./purge');
  const marker = await db.select().from(settings).where(eq(settings.key, 'seed_version'));
  if (marker.length) {
    log('database already seeded — skipping seed');
  await applyStorePolicy(db, log);
  await purgeDemoIfNeeded(db, log);
  const { ensureCatalog } = await import('./catalog-sync');
  const { applyCheckoutMethods } = await import('./checkout-policy');
  const { applyBrandHome } = await import('./brand-sync');
  const { applyOperations } = await import('./operations-sync');
  await ensureCatalog(db, log);
  await applyCheckoutMethods(db, log);
  await applyBrandHome(db, log);
  await applyOperations(db, log);
  return { seeded: false };
  }
  const { seedDatabase } = await import('./seed');
  await seedDatabase(db, log);
  await db.insert(settings).values({ key: 'seed_version', value: SEED_VERSION }).onConflictDoNothing();
  log('seed complete');
  await applyStorePolicy(db, log);
  await purgeDemoIfNeeded(db, log);
  const { ensureCatalog } = await import('./catalog-sync');
  const { applyCheckoutMethods } = await import('./checkout-policy');
  const { applyBrandHome } = await import('./brand-sync');
  const { applyOperations } = await import('./operations-sync');
  await ensureCatalog(db, log);
  await applyCheckoutMethods(db, log);
  await applyBrandHome(db, log);
  await applyOperations(db, log);
  return { seeded: true };
}
