export class AccountIdentified {
  constructor(
    private readonly accountId: string | undefined,
    private readonly domain: string | undefined
  ) {
    if (!this.accountId && !this.domain) {
      throw new Error("Account ID or domain needs to set!");
    }
  }

  getAccountId() {
    return this.accountId;
  }

  getDomain() {
    return this.domain;
  }

  static byAccountId(accountId: string) {
    return new AccountIdentified(accountId, undefined);
  }

  static byDomain(domain: string) {
    return new AccountIdentified(undefined, domain);
  }
}
