import { describe, expect, it } from 'vitest';
import { createConsoleCollector } from './collectConsoleEvents.js';

describe('createConsoleCollector', () => {
  it('caps captured console events and tracks dropped count', () => {
    const collector = createConsoleCollector(2);

    collector.onConsole('log', 'message 1');
    collector.onConsole('warn', 'message 2');
    collector.onConsole('error', 'message 3');

    expect(collector.getEvents()).toEqual([
      { type: 'log', text: 'message 1' },
      { type: 'warn', text: 'message 2' },
    ]);
    expect(collector.getDroppedCount()).toBe(1);
  });
});
