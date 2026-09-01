import { sql } from 'drizzle-orm';
import {
  boolean, customType, date, index, integer, jsonb, pgEnum, pgTable,
  primaryKey, text, timestamp, unique, uniqueIndex, uuid,
} from 'drizzle-orm/pg-core';

const geography = customType<{
  data: string;
  config: { type: 'point' | 'polygon'; srid?: number };
}>({
  dataType(config) {
    const geometryType = config?.type === 'polygon' ? 'Polygon' : 'Point';
    return `geography(${geometryType},${config?.srid ?? 4326})`;
  },
});

export const subscriptionEnum = pgEnum('subscription', ['free', 'plus']);
export const locationPermissionEnum = pgEnum('location_permission', ['granted', 'denied']);
export const sessionModeEnum = pgEnum('session_mode', ['solo', 'date', 'friends']);
export const sessionMoodEnum = pgEnum('session_mood', ['chill', 'adventurous']);
export const transportEnum = pgEnum('transport', ['walk', 'transit', 'car']);
export const sessionStatusEnum = pgEnum('session_status', [
  'draft', 'checking', 'active', 'completed', 'abandoned', 'archived',
]);
export const sceneTypeEnum = pgEnum('scene_type', ['move', 'choose', 'photo', 'observe', 'split']);
export const generatedByEnum = pgEnum('generated_by', ['template', 'llm']);
export const sceneOutcomeEnum = pgEnum('scene_outcome', [
  'arrived', 'skipped', 'timeout', 'vetoed',
]);
export const verificationMethodEnum = pgEnum('verification_method', ['gps', 'manual']);
export const participantRoleEnum = pgEnum('participant_role', ['host', 'member']);
export const participantTeamEnum = pgEnum('participant_team', ['a', 'b']);
export const participantStateEnum = pgEnum('participant_state', ['pending', 'joined', 'left']);
export const visibilityEnum = pgEnum('visibility', ['private', 'link']);
export const priceBandEnum = pgEnum('price_band', ['1', '2', '3', '4']);
export const partnerStatusEnum = pgEnum('partner_status', ['none', 'partner']);

export const areas = pgTable('area', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  bounds: geography('bounds', { type: 'polygon' }).notNull(),
  isLive: boolean('is_live').notNull().default(false),
}, (table) => [index('area_bounds_gist_idx').using('gist', table.bounds)]);

export const users = pgTable('user', {
  id: uuid('id').defaultRandom().primaryKey(),
  deviceId: text('device_id').notNull().unique(),
  handle: text('handle'),
  provider: text('provider'),
  providerUserId: text('provider_user_id'),
  email: text('email'),
  homeAreaId: uuid('home_area_id').references(() => areas.id),
  subscription: subscriptionEnum('subscription').notNull().default('free'),
  locationPermission: locationPermissionEnum('location_permission').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('user_provider_uq')
    .on(table.provider, table.providerUserId)
    .where(sql`${table.providerUserId} is not null`),
]);

export const refreshTokens = pgTable('refresh_token', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index('refresh_token_user_id_idx').on(table.userId)]);

export const scenarioPacks = pgTable('scenario_pack', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  partner: text('partner'),
  modeScope: sessionModeEnum('mode_scope').array().notNull(),
  requiresSubscription: boolean('requires_subscription').notNull().default(false),
  activeFrom: date('active_from').notNull(),
  activeTo: date('active_to').notNull(),
});

export const places = pgTable('place', {
  id: uuid('id').defaultRandom().primaryKey(),
  areaId: uuid('area_id').notNull().references(() => areas.id),
  name: text('name').notNull(),
  category: text('category').notNull(),
  point: geography('point', { type: 'point' }).notNull(),
  openHours: jsonb('open_hours').notNull(),
  priceBand: priceBandEnum('price_band').notNull(),
  partnerStatus: partnerStatusEnum('partner_status').notNull().default('none'),
  cooldownDays: integer('cooldown_days').notNull().default(0),
  provider: text('provider').notNull().default('seed'),
  providerPlaceId: text('provider_place_id'),
  address: text('address'),
}, (table) => [
  index('place_area_id_idx').on(table.areaId),
  index('place_point_gist_idx').using('gist', table.point),
  uniqueIndex('place_provider_ref_uq')
    .on(table.provider, table.providerPlaceId)
    .where(sql`${table.providerPlaceId} is not null`),
]);

export const sessions = pgTable('session', {
  id: uuid('id').defaultRandom().primaryKey(),
  hostUserId: uuid('host_user_id').notNull().references(() => users.id),
  mode: sessionModeEnum('mode').notNull(),
  mood: sessionMoodEnum('mood'),
  durationMin: integer('duration_min').notNull(),
  budgetKrw: integer('budget_krw'),
  transport: transportEnum('transport').notNull(),
  originPoint: geography('origin_point', { type: 'point' }).notNull(),
  areaId: uuid('area_id').notNull().references(() => areas.id),
  weatherSnapshot: jsonb('weather_snapshot'),
  status: sessionStatusEnum('status').notNull().default('draft'),
  inviteCode: text('invite_code'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  endedAt: timestamp('ended_at', { withTimezone: true }),
}, (table) => [
  index('session_host_user_id_idx').on(table.hostUserId),
  index('session_area_id_idx').on(table.areaId),
  index('session_origin_point_gist_idx').using('gist', table.originPoint),
]);

export const scenes = pgTable('scene', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').notNull().references(() => sessions.id),
  seq: integer('seq').notNull(),
  type: sceneTypeEnum('type').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  hint: text('hint').notNull(),
  placeId: uuid('place_id').references(() => places.id),
  distanceM: integer('distance_m').notNull(),
  timeLimitMin: integer('time_limit_min').notNull(),
  revealNameAfterArrival: boolean('reveal_name_after_arrival').notNull().default(true),
  generatedBy: generatedByEnum('generated_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique('scene_session_seq_unique').on(table.sessionId, table.seq),
  index('scene_place_id_idx').on(table.placeId),
]);

export const sceneResults = pgTable('scene_result', {
  id: uuid('id').defaultRandom().primaryKey(),
  sceneId: uuid('scene_id').notNull().references(() => scenes.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  outcome: sceneOutcomeEnum('outcome').notNull(),
  verifiedBy: verificationMethodEnum('verified_by').notNull(),
  arrivedPoint: geography('arrived_point', { type: 'point' }),
  skipReason: text('skip_reason'),
  elapsedSec: integer('elapsed_sec').notNull(),
  walkedM: integer('walked_m').notNull(),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [unique('scene_result_scene_user_unique').on(table.sceneId, table.userId)]);

export const participants = pgTable('participant', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').notNull().references(() => sessions.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  role: participantRoleEnum('role').notNull(),
  team: participantTeamEnum('team'),
  state: participantStateEnum('state').notNull().default('pending'),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull(),
}, (table) => [unique('participant_session_user_unique').on(table.sessionId, table.userId)]);

export const photoStatusEnum = pgEnum('photo_status', ['pending', 'ready']);

export const photos = pgTable('photo', {
  id: uuid('id').defaultRandom().primaryKey(),
  sceneResultId: uuid('scene_result_id').notNull().references(() => sceneResults.id).unique(),
  storageKey: text('storage_key').notNull(),
  status: photoStatusEnum('status').notNull().default('pending'),
  contentType: text('content_type'),
  bytes: integer('bytes'),
  width: integer('width'),
  height: integer('height'),
  takenAt: timestamp('taken_at', { withTimezone: true }).defaultNow().notNull(),
  includeInCredits: boolean('include_in_credits').notNull().default(true),
});

export const cuts = pgTable('cut', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').notNull().references(() => sessions.id).unique(),
  title: text('title').notNull(),
  summaryLine: text('summary_line').notNull(),
  totalDistanceM: integer('total_distance_m').notNull(),
  runtimeSec: integer('runtime_sec').notNull(),
  coverPhotoId: uuid('cover_photo_id').references(() => photos.id),
  shareSlug: text('share_slug').unique(),
  visibility: visibilityEnum('visibility').notNull().default('private'),
});

export const sessionPacks = pgTable('session_pack', {
  sessionId: uuid('session_id').notNull().references(() => sessions.id),
  packId: uuid('pack_id').notNull().references(() => scenarioPacks.id),
}, (table) => [primaryKey({ columns: [table.sessionId, table.packId] })]);

export const visitHistory = pgTable('visit_history', {
  userId: uuid('user_id').notNull().references(() => users.id),
  placeId: uuid('place_id').notNull().references(() => places.id),
  lastVisitedAt: timestamp('last_visited_at', { withTimezone: true }).notNull(),
  visitCount: integer('visit_count').notNull().default(1),
}, (table) => [primaryKey({ columns: [table.userId, table.placeId] })]);

export const sessionFeedback = pgTable('session_feedback', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').notNull().references(() => sessions.id).unique(),
  rating: integer('rating').notNull(),
  funLevel: integer('fun_level'),
  distanceFeel: text('distance_feel'),
  difficultyFeel: text('difficulty_feel'),
  freeText: text('free_text'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const userPreferences = pgTable('user_preference', {
  userId: uuid('user_id').notNull().references(() => users.id),
  category: text('category').notNull(),
  weight: integer('weight').notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.category] })]);

export const vetoes = pgTable('veto', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  placeId: uuid('place_id').references(() => places.id),
  category: text('category'),
  sceneId: uuid('scene_id').references(() => scenes.id),
  reason: text('reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('veto_user_id_idx').on(table.userId),
  uniqueIndex('veto_user_place_uq')
    .on(table.userId, table.placeId)
    .where(sql`${table.placeId} is not null`),
  uniqueIndex('veto_user_category_uq')
    .on(table.userId, table.category)
    .where(sql`${table.category} is not null`),
]);
