import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { rankTrainingEntries } from './training-search';

test('rankTrainingEntries returns most relevant entries first', () => {
  const entries = [
    { id: '1', title: 'Pricing FAQ', content: 'Monthly plans and yearly discounts.' },
    { id: '2', title: 'Deployment', content: 'Use Docker compose and run migrations.' },
    { id: '3', title: 'Support', content: 'Contact support for billing and refunds.' },
  ];

  const ranked = rankTrainingEntries('billing plans', entries, 2);

  assert.equal(ranked.length, 2);
  assert.equal(ranked[0]?.id, '1');
});

test('rankTrainingEntries returns empty array for empty query', () => {
  const ranked = rankTrainingEntries('   ', [
    { id: '1', title: 'Any', content: 'Any content' },
  ]);

  assert.deepEqual(ranked, []);
});
