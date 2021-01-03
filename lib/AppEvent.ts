export class AppEvent {
  private constructor(
    private readonly name: string,
    private readonly userId: string | undefined,
    private readonly accountId: string | undefined,
    private readonly date: Date | undefined
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

  happenedAt(date: Date) {
    return new AppEvent(this.name, this.userId, this.accountId, date);
  }

  static forUser(name: string, userId: string) {
    if (!userId) {
      throw new Error("User ID cannot be empty!");
    }

    return new AppEvent(name, userId, undefined, undefined);
  }

  static forAccount(name: string, accountId: string) {
    if (!accountId) {
      throw new Error("Account ID cannot be empty!");
    }

    return new AppEvent(name, undefined, accountId, undefined);
  }

  static forUserInAccount(name: string, userId: string, accountId: string) {
    if (!userId) {
      throw new Error("User ID cannot be empty!");
    }

    if (!accountId) {
      throw new Error("Account ID cannot be empty!");
    }

    return new AppEvent(name, userId, accountId, undefined);
  }
}
