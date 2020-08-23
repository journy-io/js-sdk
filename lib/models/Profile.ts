export interface Device {
  id: string;
  browser?: string;
  browserVersion?: string;
  platform?: string;
  platformVersion?: string;
  deviceType?: string;
}

export interface Location {
  countryCode: string;
  country: string;
  city?: string;
}

export interface Source {
  id: string;
}

export interface Campaign {
  id: string;
}

export interface Event {
  id: string;
  name: string;
}

export interface Activity {
  id: string;
  activityType: string;
  url?: string;
  urlClickable?: string;
  urlWithDetails?: string;
  events: Event[];
  recordedAt: string;
}

export interface Touchpoint {
  id: string;
  isDirectSource: boolean;
  isUndefinedSource: boolean;
  source?: Source;
  isDirectCampaign: boolean;
  isUndefinedCampaign: boolean;
  campaign?: Campaign;
  startedAt: string;
  device: Device;
  lastActivityAt: string;
  activity: Activity[];
}

export interface Profile {
  id: string;
  engagementScore: number;
  emailAddress: string;
  devices: Device[];
  lastLocation?: Location;
  touchpoints: Touchpoint[];
}
