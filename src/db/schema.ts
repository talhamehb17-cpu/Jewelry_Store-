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
    status: varchar('status', { length: 20 }).notNull().default('published'), // published | pending | hidden
    verified: boolean('verified').notNull().default(false),
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
    status: varchar('status', { length: 20 }).notNull().default('pending'), // pending | confirmed | processing | shipped | delivered | cancelled
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
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('orders_number_idx').on(t.number),
    index('orders_user_idx').on(t.userId),
    index('orders_email_idx').on(t.email),
    index('orders_status_idx').on(t.status),
    index('orders_created_idx').on(t.createdAt),
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
    data: bytea('data').notNull(),
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
    appliesTo: varchar('applies_to', { length: 20 }).notNull().default('all'), // all | products | collections
    productIds: jsonb('product_ids').$type<number[]>().notNull().default([]),
    collectionIds: jsonb('collection_ids').$type<number[]>().notNull().default([]),
    startsAt: ts('starts_at'),
    endsAt: ts('ends_at'),
    usageLimit: integer('usage_limit'),
    usageCount: integer('usage_count').notNull().default(0),
    oncePerCustomer: boolean('once_per_customer').notNull().default(false),
    active: boolean('active').notNull().default(true),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('discounts_code_idx').on(t.code)],
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
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('newsletter_email_idx').on(t.email)],
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

export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ProductVariant = typeof productVariants.$inferSelect;
export type ProductImage = typeof productImages.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Collection = typeof collections.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Discount = typeof discounts.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Page = typeof pages.$inferSelect;
export type Address = typeof addresses.$inferSelect;
