import { AppEvent } from "./AppEvent";

describe("AppEvent", () => {
  test("forUserInAccount", () => {
    const appEvent = AppEvent.forUserInAccount("name", "userId", "accountId");
    expect(appEvent.getName()).toEqual("name");
    expect(appEvent.getAccountId()).toEqual("accountId");
    expect(appEvent.getUserId()).toEqual("userId");
    expect(appEvent.getDate()).toBeUndefined();
    expect(
      appEvent.happenedAt(new Date("2019-01-01T00:00:00.000Z")).getDate()
    ).toEqual(new Date("2019-01-01T00:00:00.000Z"));
  });
  test("forAccount", () => {
    const appEvent = AppEvent.forAccount("name", "accountId");
    expect(appEvent.getName()).toEqual("name");
    expect(appEvent.getAccountId()).toEqual("accountId");
    expect(appEvent.getUserId()).toBeUndefined();
    expect(appEvent.getDate()).toBeUndefined();
    expect(
      appEvent.happenedAt(new Date("2019-01-01T00:00:00.000Z")).getDate()
    ).toEqual(new Date("2019-01-01T00:00:00.000Z"));
  });
  test("forUser", () => {
    const appEvent = AppEvent.forUser("name", "userId");
    expect(appEvent.getName()).toEqual("name");
    expect(appEvent.getAccountId()).toBeUndefined();
    expect(appEvent.getUserId()).toEqual("userId");
    expect(appEvent.getDate()).toBeUndefined();
    expect(
      appEvent.happenedAt(new Date("2019-01-01T00:00:00.000Z")).getDate()
    ).toEqual(new Date("2019-01-01T00:00:00.000Z"));
  });
  test("throws", () => {
    expect(() => AppEvent.forUser("", "userId")).toThrowError(
      "Event name cannot be empty!"
    );
    expect(() => AppEvent.forUser("name", "")).toThrowError(
      "User ID cannot be empty!"
    );
    expect(() => AppEvent.forAccount("name", "")).toThrowError(
      "Account ID cannot be empty!"
    );
    expect(() => AppEvent.forUserInAccount("name", "", "")).toThrowError(
      "User ID cannot be empty!"
    );
    expect(() => AppEvent.forUserInAccount("name", "userId", "")).toThrowError(
      "Account ID cannot be empty!"
    );
  });
});
