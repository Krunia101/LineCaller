export type QueueItem = {
  number: string;
};

let currentQueue: QueueItem | null = null;
let counter = 1;

export function generateQueue() {
  const number = `A-${String(counter).padStart(3, "0")}`;
  counter++;

  currentQueue = { number };
  return currentQueue;
}

export function getCurrentQueue() {
  return currentQueue;
}
