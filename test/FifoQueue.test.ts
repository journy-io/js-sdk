import { FifoQueue } from "../lib/FifoQueue";

describe("FifoQueue", () => {
  it("works", () => {
    const queue = new FifoQueue<any, undefined>();
    queue.enqueue(1, undefined);
    queue.enqueue(2, undefined);
    queue.enqueue(3, undefined);
    expect(queue.filter(undefined)).toEqual([1, 2, 3]);
    expect(queue.size).toEqual(3);
    expect(queue.dequeue()).toEqual(3);
    expect(queue.dequeue()).toEqual(2);
    queue.enqueue(4, undefined);
    expect(queue.dequeue()).toEqual(4);
    expect(queue.dequeue()).toEqual(1);
    expect(queue.dequeue()).toBeUndefined();
  });
});
