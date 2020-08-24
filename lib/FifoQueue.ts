import { Queue } from "p-queue";

export class FifoQueue<Element, Options> implements Queue<Element, Options> {
  private readonly queue: Element[];

  constructor() {
    this.queue = [];
  }

  dequeue(): Element | undefined {
    return this.queue.pop();
  }

  enqueue(run: Element, _: Partial<Options> | undefined): void {
    this.queue.push(run);
  }

  filter(_: Partial<Options>): Element[] {
    return this.queue;
  }

  get size(): number {
    return this.queue.length;
  }
}
