const { orderReplies } = require('./src/lib/domain/post.ts');

const FRIEND_ID = 'persona-friend';

const result = orderReplies([], 'user', FRIEND_ID);
console.log('result:', JSON.stringify(result));
console.log('length:', result.length);
