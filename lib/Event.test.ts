import { AccountIdentified } from "./AccountIdentified";
import { Event } from "./Event";
import { UserIdentified } from "./UserIdentified";

describe("Event", () => {
  test("forUserInAccount", () => {
    const event = Event.forUserInAccount(
      "name",
      UserIdentified.byUserId("userId"),
      AccountIdentified.byAccountId("accountId")
    );
    expect(event.getName()).toEqual("name");
    expect(event.getAccount()).toEqual(
      new AccountIdentified("accountId", undefined)
    );
    expect(event.getUser()).toEqual(new UserIdentified("userId", undefined));
    expect(event.getDate()).toBeUndefined();
    expect(
      event.happenedAt(new Date("2019-01-01T00:00:00.000Z")).getDate()
    ).toEqual(new Date("2019-01-01T00:00:00.000Z"));
  });

  test("forAccount", () => {
    const event = Event.forAccount(
      "name",
      AccountIdentified.byAccountId("accountId")
    );
    expect(event.getName()).toEqual("name");
    expect(event.getAccount()).toEqual(
      new AccountIdentified("accountId", undefined)
    );
    expect(event.getUser()).toBeUndefined();
    expect(event.getDate()).toBeUndefined();
    expect(
      event.happenedAt(new Date("2019-01-01T00:00:00.000Z")).getDate()
    ).toEqual(new Date("2019-01-01T00:00:00.000Z"));
  });

  test("forUser", () => {
    const event = Event.forUser("name", UserIdentified.byUserId("userId"));
    expect(event.getName()).toEqual("name");
    expect(event.getAccount()).toBeUndefined();
    expect(event.getUser()).toEqual(new UserIdentified("userId", undefined));
    expect(event.getDate()).toBeUndefined();
    expect(
      event.happenedAt(new Date("2019-01-01T00:00:00.000Z")).getDate()
    ).toEqual(new Date("2019-01-01T00:00:00.000Z"));
  });

  test("throws", () => {
    expect(() =>
      Event.forUser("", UserIdentified.byUserId("userId"))
    ).toThrowError("Event name cannot be empty!");
  });
});
