export interface NewsSource {
  title: string;
  uri: string;
}

export interface NewsItem {
  headline: string;
  summary: string;
  category: string;
  date: string; // YYYY-MM-DD
  sources: NewsSource[];
}

export type DurationOption = 'short' | 'medium' | 'long';

export enum AppStatus {
  IDLE = 'IDLE',
  FETCHING_NEWS = 'FETCHING_NEWS',
  ANALYZING = 'ANALYZING',
  READY = 'READY',
  ERROR = 'ERROR'
}

export type AIProvider = 'gemini' | 'openai';

export interface AppSettings {
  provider: AIProvider;
  
  // Unified credentials
  apiKey: string;
  baseUrl: string; // Used for OpenAI compatible
  model: string;   // Used for both

  searchSources: string[];
}

export interface BriefingSession {
  id: string;
  timestamp: number;
  dateStr: string;
  news: NewsItem[];
  summary: string;
  durationOption: DurationOption;
  focus: string[];
}

export const DEFAULT_SETTINGS: AppSettings = {
  provider: 'gemini',
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gemini-2.0-flash',
  searchSources: ['Google News', 'Mainstream Media', 'Official Outlets']
};