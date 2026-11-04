import {
  pgTable,
  serial,
  integer,
  text,
  varchar,
  boolean,
  timestamp,
  jsonb,
  real,
  primaryKey,
  index,
  uniqueIndex,
  customType,
} from 'drizzle-orm/pg-core';
import type { PaymentPlan } from '@/lib/shopping-rules';

/** Postgres bytea column (Buffer on node-postgres, Uint8Array on PGlite). */
const bytea = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType() {
    return 'bytea';
  },
});

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });

/* ------------------------------------------------------------------ */
/* Users & addresses                                                   */
/* ------------------------------------------------------------------ */

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    firstName: varchar('first_name', { length: 100 }).notNull().default(''),
    lastName: varchar('last_name', { length: 100 }).notNull().default(''),
    phone: varchar('phone', { length: 40 }),
    role: varchar('role', { length: 20 }).notNull().default('customer'), // customer | staff | admin
    status: varchar('status', { length: 20 }).notNull().default('active'), // active | disabled
    tokenVersion: integer('token_version').notNull().default(0),
    failedLogins: integer('failed_logins').notNull().default(0),
    lockedUntil: ts('locked_until'),
    acceptsMarketing: boolean('accepts_marketing').notNull().default(false),
    notes: text('notes'),
    themePreference: varchar('theme_preference', { length: 60 }),
    avatar: text('avatar'),
    lastLoginAt: ts('last_login_at'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('users_email_idx').on(t.email), index('users_role_idx').on(t.role)],
);

export const addresses = pgTable(
  'addresses',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    label: varchar('label', { length: 60 }),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    phone: varchar('phone', { length: 40 }).notNull(),
    line1: varchar('line1', { length: 255 }).notNull(),
    line2: varchar('line2', { length: 255 }),
    city: varchar('city', { length: 100 }).notNull(),
    province: varchar('province', { length: 100 }).notNull(),
    postalCode: varchar('postal_code', { length: 20 }),
    country: varchar('country', { length: 60 }).notNull().default('Pakistan'),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('addresses_user_idx').on(t.userId)],
);

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 128 }).notNull(),
  expiresAt: ts('expires_at').notNull(),
  usedAt: ts('used_at'),
  createdAt: ts('created_at').notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Catalog                                                             */
/* ------------------------------------------------------------------ */

export const categories = pgTable(
  'categories',
  {
    id: serial('id').primaryKey(),
    slug: varchar('slug', { length: 120 }).notNull(),
    name: varchar('name', { length: 120 }).notNull(),
    description: text('description'),
    image: text('image'),
    position: integer('position').notNull().default(0),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('categories_slug_idx').on(t.slug)],
);

export const products = pgTable(
  'products',
  {
    id: serial('id').primaryKey(),
    slug: varchar('slug', { length: 160 }).notNull(),
    name: varchar('name', { length: 200 }).notNull(),
    subtitle: varchar('subtitle', { length: 255 }),
    description: text('description').notNull().default(''),
    details: jsonb('details').$type<string[]>().notNull().default([]),
    materials: jsonb('materials').$type<string[]>().notNull().default([]),
    care: text('care'),
    categoryId: integer('category_id').references(() => categories.id, { onDelete: 'set null' }),
    status: varchar('status', { length: 20 }).notNull().default('active'), // active | draft | archived
    price: integer('price').notNull(), // minor units (paisa)
    compareAtPrice: integer('compare_at_price'),
    costPrice: integer('cost_price'),
    sku: varchar('sku', { length: 80 }),
    barcode: varchar('barcode', { length: 80 }),
    tags: jsonb('tags').$type<string[]>().notNull().default([]),
    badges: jsonb('badges').$type<string[]>().notNull().default([]),
    featured: boolean('featured').notNull().default(false),
    videoUrl: text('video_url'),
    ratingAvg: real('rating_avg').notNull().default(0),
    ratingCount: integer('rating_count').notNull().default(0),
    salesCount: integer('sales_count').notNull().default(0),
    seoTitle: varchar('seo_title', { length: 200 }),
    seoDescription: varchar('seo_description', { length: 400 }),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('products_slug_idx').on(t.slug),
    index('products_status_idx').on(t.status),
    index('products_category_idx').on(t.categoryId),
  ],
);

export const productImages = pgTable(
  'product_images',
  {
    id: serial('id').primaryKey(),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    alt: varchar('alt', { length: 255 }),
    position: integer('position').notNull().default(0),
  },
  (t) => [index('product_images_product_idx').on(t.productId)],
);

export const productVariants = pgTable(
  'product_variants',
  {
    id: serial('id').primaryKey(),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 160 }).notNull().default('Default'),
    sku: varchar('sku', { length: 80 }),
    barcode: varchar('barcode', { length: 80 }),
    size: varchar('size', { length: 60 }),
    color: varchar('color', { length: 60 }),
    price: integer('price'), // override, minor units
    compareAtPrice: integer('compare_at_price'),
    stock: integer('stock').notNull().default(0),
    lowStockThreshold: integer('low_stock_threshold').notNull().default(3),
    position: integer('position').notNull().default(0),
  },
  (t) => [index('product_variants_product_idx').on(t.productId)],
);

export const collections = pgTable(
  'collections',
  {
    id: serial('id').primaryKey(),
    slug: varchar('slug', { length: 120 }).notNull(),
    name: varchar('name', { length: 120 }).notNull(),
    description: text('description'),
    image: text('image'),
    rule: varchar('rule', { length: 30 }).notNull().default('manual'), // manual | new | bestsellers | sale | category
    ruleValue: varchar('rule_value', { length: 120 }),
    featured: boolean('featured').notNull().default(false),
    status: varchar('status', { length: 20 }).notNull().default('active'), // active | hidden
    position: integer('position').notNull().default(0),
    seoTitle: varchar('seo_title', { length: 200 }),
    seoDescription: varchar('seo_description', { length: 400 }),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('collections_slug_idx').on(t.slug)],
);

export const collectionProducts = pgTable(
  'collection_products',
  {
    collectionId: integer('collection_id')
      .notNull()
      .references(() => collections.id, { onDelete: 'cascade' }),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    position: integer('position').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.collectionId, t.productId] }), index('collection_products_product_idx').on(t.productId)],
);

export const reviews = pgTable(
  'reviews',
  {
    id: serial('id').primaryKey(),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    name: varchar('name', { length: 120 }).notNull(),
    email: varchar('email', { length: 255 }),
    rating: integer('rating').notNull(),
    title: varchar('title', { length: 200 }),
    body: text('body').notNull(),
    avatar: text('avatar'),
    photo: text('photo'),
    orderId: integer('order_id'),
    orderItemId: integer('order_item_id'),
    status: varchar('status', { length: 20 }).notNull().default('published'), // published | pending | hidden
    verified: boolean('verified').notNull().default(false),
    approvedAt: ts('approved_at'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('reviews_product_idx').on(t.productId)],
);

export const wishlistItems = pgTable(
  'wishlist_items',
  {
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.productId] })],
);

export const inventoryMovements = pgTable(
  'inventory_movements',
  {
    id: serial('id').primaryKey(),
    variantId: integer('variant_id')
      .notNull()
      .references(() => productVariants.id, { onDelete: 'cascade' }),
    productId: integer('product_id').notNull(),
    change: integer('change').notNull(),
    stockAfter: integer('stock_after').notNull(),
    reason: varchar('reason', { length: 40 }).notNull(), // initial | restock | adjustment | order | cancel | return | damage
    note: text('note'),
    orderId: integer('order_id'),
    actorId: integer('actor_id'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('inventory_movements_variant_idx').on(t.variantId), index('inventory_movements_created_idx').on(t.createdAt)],
);

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

export type DeliveryPlan = {
  durationMinutes: number;
  confirmMinutes: number | null;
  processingMinutes: number | null;
  shipMinutes: number | null;
  outMinutes: number | null;
  notificationDelayMinutes?: number;
  timezone?: string;
  serviceCode?: string;
  processingAt?: string;
  shipAt?: string;
  outAt?: string;
  expectedAt?: string;
  snapshottedAt?: string;
};

export type OrderAddress = {
  firstName: string;
  lastName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  province: string;
  postalCode?: string | null;
  country: string;
};

export const orders = pgTable(
  'orders',
  {
    id: serial('id').primaryKey(),
    number: varchar('number', { length: 30 }).notNull(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    email: varchar('email', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 40 }),
    customerName: varchar('customer_name', { length: 200 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('pending'), // pending | confirmed | processing | shipped | out_for_delivery | delivered | cancelled
    paymentStatus: varchar('payment_status', { length: 20 }).notNull().default('unpaid'), // unpaid | awaiting | paid | failed | refunded | partially_refunded
    paymentMethod: varchar('payment_method', { length: 30 }).notNull(), // cod | bank | wallet | card
    paymentRef: varchar('payment_ref', { length: 255 }),
    paymentIntentId: varchar('payment_intent_id', { length: 255 }),
    paymentNote: text('payment_note'),
    shippingMethod: varchar('shipping_method', { length: 40 }).notNull(),
    shippingMethodName: varchar('shipping_method_name', { length: 120 }).notNull(),
    shippingAddress: jsonb('shipping_address').$type<OrderAddress>().notNull(),
    subtotal: integer('subtotal').notNull(),
    discountTotal: integer('discount_total').notNull().default(0),
    shippingTotal: integer('shipping_total').notNull().default(0),
    taxTotal: integer('tax_total').notNull().default(0),
    codFee: integer('cod_fee').notNull().default(0),
    total: integer('total').notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('PKR'),
    discountCode: varchar('discount_code', { length: 60 }),
    discountId: integer('discount_id'),
    campaignId: integer('campaign_id'),
    campaignName: varchar('campaign_name', { length: 160 }),
    campaignDiscount: integer('campaign_discount').notNull().default(0),
    customerNote: text('customer_note'),
    adminNote: text('admin_note'),
    trackingCarrier: varchar('tracking_carrier', { length: 80 }),
    trackingNumber: varchar('tracking_number', { length: 120 }),
    refundedAmount: integer('refunded_amount').notNull().default(0),
    stockRestored: boolean('stock_restored').notNull().default(false),
    paidAt: ts('paid_at'),
    shippedAt: ts('shipped_at'),
    deliveredAt: ts('delivered_at'),
    cancelledAt: ts('cancelled_at'),
    deliveryCode: varchar('delivery_code', { length: 40 }),
    deliveryMinutes: integer('delivery_minutes'),
    expectedAt: ts('expected_at'),
    timelineStartAt: ts('timeline_start_at'),
    processingAt: ts('processing_at'),
    outForDeliveryAt: ts('out_for_delivery_at'),
    notificationDueAt: ts('notification_due_at'),
    deliveryConfirmedAt: ts('delivery_confirmed_at'),
    deliveryResponse: varchar('delivery_response', { length: 20 }),
    confirmationSource: varchar('confirmation_source', { length: 20 }),
    confirmedById: integer('confirmed_by_id').references(() => users.id, { onDelete: 'set null' }),
    confirmationNote: text('confirmation_note'),
    automationState: varchar('automation_state', { length: 20 }).notNull().default('idle'),
    nextStatus: varchar('next_status', { length: 20 }),
    nextStatusAt: ts('next_status_at'),
    statusVersion: integer('status_version').notNull().default(0),
    deliveryPlan: jsonb('delivery_plan').$type<DeliveryPlan>(),
    cancelReason: text('cancel_reason'),
    paymentPlan: jsonb('payment_plan').$type<PaymentPlan>(),
    customerVisibleNote: text('customer_visible_note'),
    displayCurrency: varchar('display_currency', { length: 3 }),
    displayRate: real('display_rate'),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('orders_number_idx').on(t.number),
    index('orders_user_idx').on(t.userId),
    index('orders_email_idx').on(t.email),
    index('orders_status_idx').on(t.status),
    index('orders_created_idx').on(t.createdAt),
    index('orders_automation_idx').on(t.automationState, t.nextStatusAt),
    index('orders_notification_due_idx').on(t.notificationDueAt),
  ],
);

export const paymentProofs = pgTable(
  'payment_proofs',
  {
    id: serial('id').primaryKey(),
    token: varchar('token', { length: 64 }).notNull(),
    orderId: integer('order_id'),
    filename: varchar('filename', { length: 255 }).notNull(),
    mime: varchar('mime', { length: 80 }).notNull(),
    size: integer('size').notNull(),
    data: bytea('data'),
    url: text('url'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('payment_proofs_token_idx').on(t.token), index('payment_proofs_order_idx').on(t.orderId)],
);

export const orderItems = pgTable(
  'order_items',
  {
    id: serial('id').primaryKey(),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: integer('product_id').references(() => products.id, { onDelete: 'set null' }),
    variantId: integer('variant_id').references(() => productVariants.id, { onDelete: 'set null' }),
    name: varchar('name', { length: 200 }).notNull(),
    variantTitle: varchar('variant_title', { length: 160 }),
    sku: varchar('sku', { length: 80 }),
    image: text('image'),
    unitPrice: integer('unit_price').notNull(),
    originalUnitPrice: integer('original_unit_price'),
    quantity: integer('quantity').notNull(),
    lineTotal: integer('line_total').notNull(),
  },
  (t) => [index('order_items_order_idx').on(t.orderId), index('order_items_product_idx').on(t.productId)],
);

export const orderEvents = pgTable(
  'order_events',
  {
    id: serial('id').primaryKey(),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 40 }).notNull(),
    message: text('message').notNull(),
    actor: varchar('actor', { length: 120 }),
    fromStatus: varchar('from_status', { length: 20 }),
    toStatus: varchar('to_status', { length: 20 }),
    actorType: varchar('actor_type', { length: 20 }),
    source: varchar('source', { length: 20 }),
    actorId: integer('actor_id'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('order_events_order_idx').on(t.orderId)],
);

export const discounts = pgTable(
  'discounts',
  {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 60 }).notNull(),
    description: varchar('description', { length: 255 }),
    type: varchar('type', { length: 20 }).notNull(), // percentage | fixed | free_shipping
    value: integer('value').notNull().default(0), // percent (0-100) or minor units
    minOrderAmount: integer('min_order_amount').notNull().default(0),
    appliesTo: varchar('applies_to', { length: 20 }).notNull().default('all'), // all | products | collections | categories
    productIds: jsonb('product_ids').$type<number[]>().notNull().default([]),
    collectionIds: jsonb('collection_ids').$type<number[]>().notNull().default([]),
    categoryIds: jsonb('category_ids').$type<number[]>().notNull().default([]),
    audience: varchar('audience', { length: 20 }).notNull().default('public'), // public | subscribers
    startsAt: ts('starts_at'),
    endsAt: ts('ends_at'),
    usageLimit: integer('usage_limit'),
    usageCount: integer('usage_count').notNull().default(0),
    oncePerCustomer: boolean('once_per_customer').notNull().default(false),
    perUserLimit: integer('per_user_limit'),
    maxDiscount: integer('max_discount'),
    stackable: boolean('stackable').notNull().default(false),
    active: boolean('active').notNull().default(true),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('discounts_code_idx').on(t.code)],
);

export const discountUsages = pgTable(
  'discount_usages',
  {
    id: serial('id').primaryKey(),
    discountId: integer('discount_id')
      .notNull()
      .references(() => discounts.id, { onDelete: 'cascade' }),
    orderId: integer('order_id'),
    email: varchar('email', { length: 255 }).notNull(),
    userId: integer('user_id'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('discount_usages_discount_idx').on(t.discountId), index('discount_usages_email_idx').on(t.email)],
);

export const campaigns = pgTable(
  'campaigns',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 160 }).notNull(),
    slug: varchar('slug', { length: 160 }).notNull(),
    description: text('description').notNull().default(''),
    percent: integer('percent').notNull(),
    image: text('image'),
    appliesTo: varchar('applies_to', { length: 20 }).notNull().default('all'), // all | products | categories
    productIds: jsonb('product_ids').$type<number[]>().notNull().default([]),
    categoryIds: jsonb('category_ids').$type<number[]>().notNull().default([]),
    startsAt: ts('starts_at').notNull(),
    endsAt: ts('ends_at').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('draft'), // draft | scheduled | active | paused | expired
    allowStacking: boolean('allow_stacking').notNull().default(false),
    notifySubscribers: boolean('notify_subscribers').notNull().default(false),
    emailSentAt: ts('email_sent_at'),
    emailRecipientCount: integer('email_recipient_count').notNull().default(0),
    ctaLabel: varchar('cta_label', { length: 80 }).notNull().default('Shop the sale'),
    ctaHref: varchar('cta_href', { length: 300 }).notNull().default('/shop'),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('campaigns_slug_idx').on(t.slug), index('campaigns_status_idx').on(t.status), index('campaigns_ends_idx').on(t.endsAt)],
);

/* ------------------------------------------------------------------ */
/* Content, settings, themes, media                                    */
/* ------------------------------------------------------------------ */

export const pages = pgTable(
  'pages',
  {
    id: serial('id').primaryKey(),
    slug: varchar('slug', { length: 120 }).notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    content: text('content').notNull().default(''),
    template: varchar('template', { length: 30 }).notNull().default('default'), // default | about | faq | contact | policy
    status: varchar('status', { length: 20 }).notNull().default('published'), // published | draft
    system: boolean('system').notNull().default(false),
    seoTitle: varchar('seo_title', { length: 200 }),
    seoDescription: varchar('seo_description', { length: 400 }),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('pages_slug_idx').on(t.slug)],
);

export const settings = pgTable('settings', {
  key: varchar('key', { length: 80 }).primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
});

export const themeConfigs = pgTable('theme_configs', {
  themeId: varchar('theme_id', { length: 60 }).primaryKey(),
  draft: jsonb('draft'),
  published: jsonb('published'),
  updatedAt: ts('updated_at').notNull().defaultNow(),
  publishedAt: ts('published_at'),
});

export const media = pgTable('media', {
  id: serial('id').primaryKey(),
  filename: varchar('filename', { length: 255 }).notNull(),
  mime: varchar('mime', { length: 100 }).notNull(),
  size: integer('size').notNull(),
  width: integer('width'),
  height: integer('height'),
  data: bytea('data').notNull(),
  createdAt: ts('created_at').notNull().defaultNow(),
});

export const newsletterSubscribers = pgTable(
  'newsletter_subscribers',
  {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    source: varchar('source', { length: 80 }).notNull().default('footer'),
    status: varchar('status', { length: 20 }).notNull().default('subscribed'), // subscribed | unsubscribed
    unsubscribedAt: ts('unsubscribed_at'),
    token: varchar('token', { length: 64 }),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('newsletter_email_idx').on(t.email), uniqueIndex('newsletter_token_idx').on(t.token)],
);

export const emailLogs = pgTable(
  'email_logs',
  {
    id: serial('id').primaryKey(),
    kind: varchar('kind', { length: 40 }).notNull(),
    toEmail: varchar('to_email', { length: 255 }).notNull(),
    subject: varchar('subject', { length: 255 }).notNull(),
    campaignId: integer('campaign_id'),
    orderId: integer('order_id'),
    status: varchar('status', { length: 20 }).notNull(), // sent | failed | skipped | queued
    error: text('error'),
    attempts: integer('attempts').notNull().default(1),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('email_logs_created_idx').on(t.createdAt), index('email_logs_kind_idx').on(t.kind)],
);

export const contactMessages = pgTable('contact_messages', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 120 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 40 }),
  subject: varchar('subject', { length: 200 }),
  message: text('message').notNull(),
  read: boolean('read').notNull().default(false),
  createdAt: ts('created_at').notNull().defaultNow(),
});

export const deliveryServices = pgTable(
  'delivery_services',
  {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 40 }).notNull(),
    name: varchar('name', { length: 120 }).notNull(),
    description: text('description').notNull().default(''),
    price: integer('price').notNull().default(0),
    durationMinutes: integer('duration_minutes').notNull(),
    active: boolean('active').notNull().default(true),
    confirmMinutes: integer('confirm_minutes'),
    processingMinutes: integer('processing_minutes'),
    shipMinutes: integer('ship_minutes'),
    outMinutes: integer('out_minutes'),
    cutoffNote: text('cutoff_note'),
    position: integer('position').notNull().default(0),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('delivery_services_code_idx').on(t.code)],
);

export const storeLocations = pgTable('store_locations', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 160 }).notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  country: varchar('country', { length: 80 }).notNull().default('Pakistan'),
  address: text('address').notNull(),
  phone: varchar('phone', { length: 40 }),
  hours: text('hours'),
  timezone: varchar('timezone', { length: 64 }).notNull().default('Asia/Karachi'),
  schedule: jsonb('schedule').$type<import('@/lib/store-hours').HoursSchedule>(),
  image: text('image'),
  mapUrl: text('map_url'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  active: boolean('active').notNull().default(true),
  showOnHome: boolean('show_on_home').notNull().default(true),
  position: integer('position').notNull().default(0),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
});

export const deliveryIssues = pgTable(
  'delivery_issues',
  {
    id: serial('id').primaryKey(),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    status: varchar('status', { length: 20 }).notNull().default('open'),
    note: text('note'),
    customerResponse: text('customer_response'),
    expectedAt: ts('expected_at'),
    createdAt: ts('created_at').notNull().defaultNow(),
    resolvedAt: ts('resolved_at'),
    resolvedBy: varchar('resolved_by', { length: 120 }),
    resolvedById: integer('resolved_by_id'),
    resolutionNote: text('resolution_note'),
  },
  (t) => [index('delivery_issues_status_idx').on(t.status)],
);

export const customerNotifications = pgTable(
  'customer_notifications',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 40 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('scheduled'),
    title: varchar('title', { length: 200 }),
    body: text('body'),
    scheduledAt: ts('scheduled_at').notNull(),
    createdAt: ts('created_at').notNull().defaultNow(),
    seenAt: ts('seen_at'),
    resolvedAt: ts('resolved_at'),
    response: varchar('response', { length: 20 }),
  },
  (t) => [
    index('customer_notifications_order_idx').on(t.orderId),
    index('customer_notifications_user_idx').on(t.userId),
    index('customer_notifications_due_idx').on(t.status, t.scheduledAt),
  ],
);

export const exchangeRates = pgTable('exchange_rates', {
  code: varchar('code', { length: 3 }).primaryKey(),
  perPkr: real('per_pkr').notNull(),
  source: varchar('source', { length: 40 }).notNull(),
  fetchedAt: ts('fetched_at').notNull(),
});

export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ProductVariant = typeof productVariants.$inferSelect;
export type ProductImage = typeof productImages.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Collection = typeof collections.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Discount = typeof discounts.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Page = typeof pages.$inferSelect;
export type Address = typeof addresses.$inferSelect;
export type DeliveryService = typeof deliveryServices.$inferSelect;
export type StoreLocation = typeof storeLocations.$inferSelect;
export type ExchangeRate = typeof exchangeRates.$inferSelect;
