'use server';

import { assertAdmin } from '@/lib/auth';
import {
  activateDatabaseConnection,
  createDatabaseAdmin,
  deactivateDatabaseConnection,
  forgetDatabaseConnection,
  initializeDatabaseSchema,
  testDatabaseConnection,
} from '@/lib/db-connection';

function safe(err: unknown) {
  const msg = err instanceof Error ? err.message : 'Something went wrong.';
  return msg.replace(/postgres(?:ql)?:\/\/\S+/gi, 'postgres://…').replace(/password[=:][^\s]+/gi, 'password=…').slice(0, 280);
}

async function guard() {
  await assertAdmin({ adminOnly: true });
}

export async function testDatabaseAction(connectionString: string) {
  await guard();
  try {
    const result = await testDatabaseConnection(connectionString);
    return { ok: true, message: result.message, missing: result.missing, admins: result.admins };
  } catch (err) {
    return { ok: false, message: safe(err), missing: [] as string[], admins: 0 };
  }
}

export async function initializeDatabaseAction(connectionString: string) {
  await guard();
  try {
    return await initializeDatabaseSchema(connectionString);
  } catch (err) {
    return { ok: false, message: safe(err) };
  }
}

export async function createDatabaseAdminAction(connectionString: string, email: string, password: string) {
  await guard();
  try {
    return await createDatabaseAdmin(connectionString, email, password);
  } catch (err) {
    return { ok: false, message: safe(err) };
  }
}

export async function activateDatabaseAction(connectionString: string) {
  await guard();
  try {
    return await activateDatabaseConnection(connectionString);
  } catch (err) {
    return { ok: false, message: safe(err) };
  }
}

export async function deactivateDatabaseAction() {
  await guard();
  try {
    return await deactivateDatabaseConnection();
  } catch (err) {
    return { ok: false, message: safe(err) };
  }
}

export async function forgetDatabaseAction() {
  await guard();
  try {
    return await forgetDatabaseConnection();
  } catch (err) {
    return { ok: false, message: safe(err) };
  }
}
