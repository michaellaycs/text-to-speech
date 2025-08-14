// Session types
export interface SessionData {
  sessionId: string;
  textContents: string[]; // References to content IDs
  audioContents: string[]; // References to audio IDs
  lastActivity: Date;
  preferences: UserPreferences;
}

export interface UserPreferences {
  defaultVolume: number;
  defaultPlaybackSpeed: number;
  preferredTtsService?: string;
  autoPlay: boolean;
}

export interface SessionResponse {
  sessionId: string;
  expiresAt: string;
}