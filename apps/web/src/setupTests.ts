import { expect } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

if (typeof window !== 'undefined') {
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = (callback: FrameRequestCallback) => window.setTimeout(callback, 16);
  }

  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = (id: number) => window.clearTimeout(id);
  }
}
