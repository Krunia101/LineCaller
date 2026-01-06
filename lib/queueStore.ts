export type QueueItem = {
  name: string;
  number: string;
};

let currentQueue: QueueItem | null = null;
let counter = 1;

export function generateQueue(name: string) {
  const number = `A-${String(counter).padStart(3, "0")}`;
  counter++;

  currentQueue = { name, number };
  return currentQueue;
}

export function getCurrentQueue() {
  return currentQueue;
}
