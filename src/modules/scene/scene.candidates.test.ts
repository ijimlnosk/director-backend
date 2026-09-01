import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PgDialect } from 'drizzle-orm/pg-core';

import { excludePlaceIdsSql } from './scene.candidates.js';

const render = (chunk: ReturnType<typeof excludePlaceIdsSql>) =>
  new PgDialect().sqlToQuery(chunk);

test('excludePlaceIdsSql is empty for no ids', () => {
  assert.equal(render(excludePlaceIdsSql([])).sql, '');
});

test('excludePlaceIdsSql emits a castable array, not any(($1, $2))', () => {
  const { sql, params } = render(
    excludePlaceIdsSql([
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
    ]),
  );
  assert.match(sql, /<> all \(array\[\$1, \$2\]::uuid\[\]\)/);
  assert.doesNotMatch(sql, /any\(\(/);
  assert.equal(params.length, 2);
});
