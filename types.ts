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
  baseUrl: string;
  apiKey: string;
  model: string;
  searchSources: string[]; // Added: List of preferred search platforms
}

export interface BriefingSession {
  id: string;
  timestamp: number;
  dateStr: string;
  news: NewsItem[];
  summary: string;
  durationOption: DurationOption;
  focus: string[]; // Changed: Supports multiple topics
}

export const DEFAULT_SETTINGS: AppSettings = {
  provider: 'gemini',
  baseUrl: 'https://generativelanguage.googleapis.com',
  apiKey: '', 
  model: 'gemini-2.0-flash',
  searchSources: ['Google News', 'Mainstream Media'] // Default sources
};