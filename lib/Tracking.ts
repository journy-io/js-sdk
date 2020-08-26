import {
  Client,
  TrackEventArguments,
  TrackPropertiesArguments,
} from "./Client";
import { Config } from "./Config";
import PQueue from "p-queue";

export interface Tracking {
  /**
   * Track a user event.
   * @param args The input to track the event
   * @returns nothing.
   * @throws nothing.
   */
  trackEvent(args: TrackEventArguments): void;

  /**
   * Track user properties.
   * @param args The input to track the event
   * @returns nothing.
   * @throws nothing.
   */
  trackProperties(args: TrackPropertiesArguments): void;
}

export class JournyTracking implements Tracking {
  private readonly queue: PQueue;

  constructor(
    private readonly client: Client,
    private readonly config: Config
  ) {
    this.queue = config.getPQueue();
  }

  trackEvent(args: TrackEventArguments): void {
    this.queue
      .add(async () => await this.client.trackEvent(args))
      .then((_) => {
        /* ignore result */
      });
  }

  trackProperties(args: TrackPropertiesArguments): void {
    this.queue
      .add(async () => await this.client.trackProperties(args))
      .then((_) => {
        /* ignore result */
      });
  }
}
