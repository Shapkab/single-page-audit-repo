import type { ConsoleEvent } from '../../types/audit.types.js';

export function createConsoleCollector(maxEvents = 200) {
  const events: ConsoleEvent[] = [];
  let droppedCount = 0;

  return {
    onConsole(type: string, text: string) {
      if (events.length < maxEvents) {
        events.push({ type, text });
      } else {
        droppedCount += 1;
      }
    },
    getEvents(): ConsoleEvent[] {
      return [...events];
    },
    getDroppedCount(): number {
      return droppedCount;
    },
  };
}
