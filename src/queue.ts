import log from './log.js';
import env from './env.js';

// Map to track user's processing items
const userQueues = new Map<string, Set<string>>();

// Maximum number of items a user can have in queue
const maxQueueSize = parseInt(env.MAX_USER_QUEUE_SIZE, 10);

/**
 * Add an item to a user's processing queue
 * @returns true if item was added, false if user is at queue limit
 */
export function addToUserQueue(userId: string, itemId: string): boolean {
  let userQueue = userQueues.get(userId);
  
  if (!userQueue) {
    userQueue = new Set();
    userQueues.set(userId, userQueue);
  }

  if (userQueue.size >= maxQueueSize) {
    log.warn(`User ${userId} has reached queue limit of ${maxQueueSize} items`);
    return false;
  }

  userQueue.add(itemId);
  log.info(`Added item ${itemId} to user ${userId}'s queue (${userQueue.size}/${maxQueueSize})`);
  return true;
}

/**
 * Remove an item from a user's processing queue
 */
export function removeFromUserQueue(userId: string, itemId: string): void {
  const userQueue = userQueues.get(userId);
  if (userQueue) {
    userQueue.delete(itemId);
    if (userQueue.size === 0) {
      userQueues.delete(userId);
    }
    log.info(`Removed item ${itemId} from user ${userId}'s queue (${userQueue.size}/${maxQueueSize})`);
  }
}

/**
 * Get the number of items in a user's queue
 */
export function getUserQueueSize(userId: string): number {
  return userQueues.get(userId)?.size ?? 0;
}