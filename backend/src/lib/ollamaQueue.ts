type Task<T> = () => Promise<T>;

class SimpleQueue {
  private queue: Array<() => Promise<void>> = [];
  private running = false;

  async run<T>(task: Task<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
      this.processNext();
    });
  }

  private async processNext(): Promise<void> {
    if (this.running || this.queue.length === 0) return;
    this.running = true;
    const next = this.queue.shift()!;
    await next();
    this.running = false;
    this.processNext();
  }
}

export const ollamaQueue = new SimpleQueue();