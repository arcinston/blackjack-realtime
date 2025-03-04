// biome-ignore lint/style/useNodejsImportProtocol: <explanation>
import { EventEmitter } from 'events';

type Events = Record<string, unknown[]>;

class EnhancedEventEmitter<E extends Events = Events> {
  private emitter: EventEmitter;

  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(Number.POSITIVE_INFINITY);
  }

  public on<K extends keyof E>(
    eventName: K,
    listener: (...args: E[K]) => void,
  ): this {
    this.emitter.on(
      eventName as string,
      // biome-ignore lint/suspicious/noExplicitAny: need to override the type because default it's any[ and we cannot assign E[K] to any[]
      listener as unknown as (...args: any[]) => void,
    );
    return this;
  }

  public off<K extends keyof E>(
    eventName: K,
    listener: (...args: E[K]) => void,
  ): this {
    this.emitter.off(
      eventName as string,
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      listener as unknown as (...args: any[]) => void,
    );
    return this;
  }

  public listenerCount<K extends keyof E>(eventName: K): number {
    return this.emitter.listenerCount(eventName as string);
  }

  public listeners<K extends keyof E>(
    eventName: K,
  ): ((...args: E[K]) => void)[] {
    return this.emitter.listeners(eventName as string) as ((
      ...args: E[K]
    ) => void)[];
  }

  public emit<K extends keyof E>(eventName: K, ...args: E[K]): boolean {
    return this.emitter.emit(eventName as string, ...args);
  }

  public safeEmit<K extends keyof E>(eventName: K, ...args: E[K]): boolean {
    return this.emitter.emit(eventName as string, ...args);
  }

  public once<K extends keyof E>(
    eventName: K,
    listener: (...args: E[K]) => void,
  ): this {
    this.emitter.once(
      eventName as string,
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      listener as unknown as (...args: any[]) => void,
    );
    return this;
  }

  protected removeAllListeners<K extends keyof E>(eventName?: K): this {
    if (eventName) {
      this.emitter.removeAllListeners(eventName as string);
    } else {
      this.emitter.removeAllListeners();
    }
    return this;
  }
}

export { EnhancedEventEmitter };
