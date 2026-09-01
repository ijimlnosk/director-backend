import assert from 'node:assert/strict';
import { test } from 'node:test';

import { mapKakaoDoc } from './kakao.js';

test('mapKakaoDoc normalises a full document', () => {
  const mapped = mapKakaoDoc({
    id: '26338954',
    place_name: '스타벅스 광화문점',
    category_group_code: 'CE7',
    category_group_name: '카페',
    category_name: '음식점 > 카페 > 커피전문점 > 스타벅스',
    x: '126.976872',
    y: '37.570028',
    road_address_name: '서울 종로구 세종대로 149',
    address_name: '서울 종로구 세종로 1-68',
  });
  assert.deepEqual(mapped, {
    providerPlaceId: '26338954',
    name: '스타벅스 광화문점',
    category: '카페',
    lat: 37.570028,
    lng: 126.976872,
    address: '서울 종로구 세종대로 149',
  });
});

test('mapKakaoDoc falls back to address_name and category_name tail', () => {
  const mapped = mapKakaoDoc({
    id: '1',
    place_name: '어딘가',
    category_name: 'A > B > 서점',
    x: '127',
    y: '37',
  });
  assert.equal(mapped?.category, '서점');
  assert.equal(mapped?.address, null);
});

test('mapKakaoDoc rejects a document without coordinates', () => {
  assert.equal(mapKakaoDoc({ id: '1', place_name: 'x' }), null);
});

test('mapKakaoDoc rejects a document without an id', () => {
  assert.equal(mapKakaoDoc({ place_name: 'x', x: '127', y: '37' }), null);
});
