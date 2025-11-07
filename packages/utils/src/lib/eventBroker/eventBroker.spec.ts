import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventBroker } from './eventBroker';

// Define a sample event type for testing
type TestEvents = {
  hello: (name: string) => void;
  goodbye: (message: string) => void;
  count: (num: number) => void;
};

// Create a test subclass that exposes the protected emit method
class TestEventBroker<E extends Record<string, (...args: any[]) => void>> extends EventBroker<E> {
  public testEmit<K extends keyof E>(event: K, ...args: Parameters<E[K]>): void {
    this.emit(event, ...args);
  }
}

describe('EventBroker', () => {
  let broker: TestEventBroker<TestEvents>;

  beforeEach(() => {
    broker = new TestEventBroker<TestEvents>();
  });

  it('should emit events to listeners', () => {
    const helloListener = vi.fn();
    broker.on('hello', helloListener);

    broker.testEmit('hello', 'Alice');
    broker.testEmit('hello', 'Bob');

    expect(helloListener).toHaveBeenCalledTimes(2);
    expect(helloListener).toHaveBeenCalledWith('Alice');
    expect(helloListener).toHaveBeenCalledWith('Bob');
  });

  it('should not emit event if no listeners are registered', () => {
    const goodbyeListener = vi.fn();
    broker.testEmit('goodbye', 'Goodbye, world!');
    expect(goodbyeListener).not.toHaveBeenCalled();
  });

  it('should add a listener for an event using `on`', () => {
    const countListener = vi.fn();
    broker.on('count', countListener);

    broker.testEmit('count', 42);
    expect(countListener).toHaveBeenCalledWith(42);
  });

  it('should remove a listener using `off`', () => {
    const countListener = vi.fn();
    broker.on('count', countListener);

    broker.testEmit('count', 42);
    expect(countListener).toHaveBeenCalledWith(42);

    broker.off('count', countListener);

    broker.testEmit('count', 100);
    expect(countListener).not.toHaveBeenCalledWith(100);
  });

  it('should handle multiple listeners for the same event', () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    broker.on('hello', listener1);
    broker.on('hello', listener2);

    broker.testEmit('hello', 'Alice');
    expect(listener1).toHaveBeenCalledWith('Alice');
    expect(listener2).toHaveBeenCalledWith('Alice');
  });

  it('should not emit event to listener that was removed using `off`', () => {
    const helloListener = vi.fn();
    broker.on('hello', helloListener);

    broker.testEmit('hello', 'Alice');
    expect(helloListener).toHaveBeenCalledWith('Alice');

    broker.off('hello', helloListener);
    broker.testEmit('hello', 'Bob');
    expect(helloListener).not.toHaveBeenCalledWith('Bob');
  });

  it('should handle multiple events with different argument types', () => {
    const helloListener = vi.fn();
    const goodbyeListener = vi.fn();

    broker.on('hello', helloListener);
    broker.on('goodbye', goodbyeListener);

    broker.testEmit('hello', 'Alice');
    broker.testEmit('goodbye', 'Goodbye, world!');

    expect(helloListener).toHaveBeenCalledWith('Alice');
    expect(goodbyeListener).toHaveBeenCalledWith('Goodbye, world!');
  });
});
