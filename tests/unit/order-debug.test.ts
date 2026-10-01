import { test, expect } from 'vitest';
import { orderReplies } from '@/lib/domain/post';

const FRIEND_ID = 'persona-friend';

test('debug empty', () => {
  const result = orderReplies('user', [], FRIEND_ID);
  console.log('result:', JSON.stringify(result));
  expect(result.length).toBe(0);
});
