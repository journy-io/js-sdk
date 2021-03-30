import { AccountIdentified } from "./AccountIdentified";
import { UserIdentified } from "./UserIdentified";

export type Metadata = { [key: string]: string | number | boolean | Date };

export class Event {
  private constructor(
    private readonly name: string,
    private readonly user: UserIdentified | undefined,
    private readonly account: AccountIdentified | undefined,
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

  getUser() {
    return this.user;
  }

  getAccount() {
    return this.account;
  }

  getDate() {
    return this.date;
  }

  getMetadata() {
    return this.metadata;
  }

  happenedAt(date: Date) {
    return new Event(this.name, this.user, this.account, date, this.metadata);
  }

  withMetadata(metadata: Metadata) {
    return new Event(this.name, this.user, this.account, this.date, {
      ...this.metadata,
      ...metadata,
    });
  }

  static forUser(name: string, user: UserIdentified) {
    return new Event(name, user, undefined, undefined, {});
  }

  static forAccount(name: string, account: AccountIdentified) {
    return new Event(name, undefined, account, undefined, {});
  }

  static forUserInAccount(
    name: string,
    user: UserIdentified,
    account: AccountIdentified
  ) {
    return new Event(name, user, account, undefined, {});
  }
}
