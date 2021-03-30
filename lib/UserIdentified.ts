export class UserIdentified {
  constructor(
    private readonly userId: string | undefined,
    private readonly email: string | undefined
  ) {
    if (!this.userId && !this.email) {
      throw new Error("User ID or email needs to set!");
    }
  }

  getUserId() {
    return this.userId;
  }

  getEmail() {
    return this.email;
  }

  static byUserId(userId: string) {
    return new UserIdentified(userId, undefined);
  }

  static byEmail(email: string) {
    return new UserIdentified(undefined, email);
  }
}
