import { beforeEach } from 'vitest';
import { createChromeMock } from './chromeMock';

beforeEach(() => {
  globalThis.chrome = createChromeMock();
});
