import { describe, it, expect } from 'vitest';
import { isTap, startTap } from '@/lib/viewport.js';

function pointer(overrides: Partial<PointerEvent> = {}): PointerEvent {
  return {
    pointerId: 1,
    clientX: 10,
    clientY: 20,
    timeStamp: 1000,
    ...overrides,
  } as PointerEvent;
}

describe('isTap', () => {
  it('accepts a short stationary pointer', () => {
    const start = startTap(pointer());
    expect(isTap(start, pointer({ timeStamp: 1200, clientX: 12, clientY: 21 }))).toBe(true);
  });

  it('rejects a drag', () => {
    const start = startTap(pointer());
    expect(isTap(start, pointer({ timeStamp: 1100, clientX: 40, clientY: 20 }))).toBe(false);
  });

  it('rejects a long press', () => {
    const start = startTap(pointer());
    expect(isTap(start, pointer({ timeStamp: 1600 }))).toBe(false);
  });

  it('rejects a different pointer id', () => {
    const start = startTap(pointer());
    expect(isTap(start, pointer({ pointerId: 2, timeStamp: 1100 }))).toBe(false);
  });

  it('rejects a missing start', () => {
    expect(isTap(null, pointer())).toBe(false);
  });
});
