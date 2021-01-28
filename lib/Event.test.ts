import { Event } from "./Event";

describe("Event", () => {
  test("forUserInAccount", () => {
    const event = Event.forUserInAccount("name", "userId", "accountId");
    expect(event.getName()).toEqual("name");
    expect(event.getAccountId()).toEqual("accountId");
    expect(event.getUserId()).toEqual("userId");
    expect(event.getDate()).toBeUndefined();
    expect(
      event.happenedAt(new Date("2019-01-01T00:00:00.000Z")).getDate()
    ).toEqual(new Date("2019-01-01T00:00:00.000Z"));
  });

  test("forAccount", () => {
    const event = Event.forAccount("name", "accountId");
    expect(event.getName()).toEqual("name");
    expect(event.getAccountId()).toEqual("accountId");
    expect(event.getUserId()).toBeUndefined();
    expect(event.getDate()).toBeUndefined();
    expect(
      event.happenedAt(new Date("2019-01-01T00:00:00.000Z")).getDate()
    ).toEqual(new Date("2019-01-01T00:00:00.000Z"));
  });

  test("forUser", () => {
    const event = Event.forUser("name", "userId");
    expect(event.getName()).toEqual("name");
    expect(event.getAccountId()).toBeUndefined();
    expect(event.getUserId()).toEqual("userId");
    expect(event.getDate()).toBeUndefined();
    expect(
      event.happenedAt(new Date("2019-01-01T00:00:00.000Z")).getDate()
    ).toEqual(new Date("2019-01-01T00:00:00.000Z"));
  });

  test("throws", () => {
    expect(() => Event.forUser("", "userId")).toThrowError(
      "Event name cannot be empty!"
    );
    expect(() => Event.forUser("name", "")).toThrowError(
      "User ID cannot be empty!"
    );
    expect(() => Event.forAccount("name", "")).toThrowError(
      "Account ID cannot be empty!"
    );
    expect(() => Event.forUserInAccount("name", "", "")).toThrowError(
      "User ID cannot be empty!"
    );
    expect(() => Event.forUserInAccount("name", "userId", "")).toThrowError(
      "Account ID cannot be empty!"
    );
  });
});
