export type Metadata = { [key: string]: string | number | boolean | Date };

export class Event {
  private constructor(
    private readonly name: string,
    private readonly userId: string | undefined,
    private readonly accountId: string | undefined,
    private readonly date: Date | undefined,
    private readonly metadata: Metadata
  ) {
    if (!this.name) {
      throw new Error("Event name cannot be empty!");
    }
  }

  getName() {
    return this.name;
  }

  getUserId() {
    return this.userId;
  }

  getAccountId() {
    return this.accountId;
  }

  getDate() {
    return this.date;
  }

  getMetadata() {
    return this.metadata;
  }

  happenedAt(date: Date) {
    return new Event(
      this.name,
      this.userId,
      this.accountId,
      date,
      this.metadata
    );
  }

  withMetadata(metadata: Metadata) {
    return new Event(this.name, this.userId, this.accountId, this.date, {
      ...this.metadata,
      ...metadata,
    });
  }

  static forUser(name: string, userId: string) {
    if (!userId) {
      throw new Error("User ID cannot be empty!");
    }

    return new Event(name, userId, undefined, undefined, {});
  }

  static forAccount(name: string, accountId: string) {
    if (!accountId) {
      throw new Error("Account ID cannot be empty!");
    }

    return new Event(name, undefined, accountId, undefined, {});
  }

  static forUserInAccount(name: string, userId: string, accountId: string) {
    if (!userId) {
      throw new Error("User ID cannot be empty!");
    }

    if (!accountId) {
      throw new Error("Account ID cannot be empty!");
    }

    return new Event(name, userId, accountId, undefined, {});
  }
}
