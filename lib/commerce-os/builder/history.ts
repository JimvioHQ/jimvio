/**
 * In-memory undo/redo stack for builder draft snapshots.
 * Does not write to the database on every keystroke.
 */

export type HistorySnapshot<T> = T;

export class DraftHistory<T> {
  private past: T[] = [];
  private future: T[] = [];
  private present: T;
  private readonly limit: number;

  constructor(initial: T, limit = 40) {
    this.present = initial;
    this.limit = limit;
  }

  get current(): T {
    return this.present;
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  push(next: T) {
    this.past.push(this.present);
    if (this.past.length > this.limit) this.past.shift();
    this.present = next;
    this.future = [];
  }

  replacePresent(next: T) {
    this.present = next;
  }

  undo(): T | null {
    const prev = this.past.pop();
    if (!prev) return null;
    this.future.push(this.present);
    this.present = prev;
    return this.present;
  }

  redo(): T | null {
    const next = this.future.pop();
    if (!next) return null;
    this.past.push(this.present);
    this.present = next;
    return this.present;
  }
}
