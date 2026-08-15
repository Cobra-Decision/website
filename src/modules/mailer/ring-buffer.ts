/**
 * Memory-efficient zero-allocation circular buffer.
 * Keeps latest N records in a fixed-size slot array.
 */
export class RingBuffer<T> {
  private readonly buffer: (T | undefined)[];
  private head = 0;
  private tail = 0;
  private count = 0;

  constructor(public readonly capacity: number = 100) {
    if (capacity <= 0) throw new Error("Capacity must be > 0");
    this.buffer = new Array(capacity);
  }

  push(item: T): void {
    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.capacity;
    if (this.count < this.capacity) {
      this.count++;
    } else {
      this.head = (this.head + 1) % this.capacity;
    }
  }

  toArray(): T[] {
    const result = new Array<T>(this.count);
    for (let i = 0; i < this.count; i++) {
      result[i] = this.buffer[(this.head + i) % this.capacity] as T;
    }
    return result;
  }

  get length(): number {
    return this.count;
  }

  clear(): void {
    this.buffer.fill(undefined);
    this.head = 0;
    this.tail = 0;
    this.count = 0;
  }
}
