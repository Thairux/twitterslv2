import { defineConfig } from 'vitest/config';

// Unit + integration tests. Targets (agents/skills/testing-strategy):
// domain >= 90%, api/store >= 80%.
export default defineConfig({
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
  },
});
