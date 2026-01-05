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

export interface NovelItem {
  title: string;
  author: string;
  description: string;
  genre: string;
  status: '连载' | '完结' | 'Unknown';
  platform?: string;
  rating?: string;
  isFavorite?: boolean; // New
  lastReadIndex?: number; // New: For history display
}

export interface NovelCharacter {
  name: string;
  role: string;
  description: string;
}

export interface NovelChapter {
  index: number;
  title: string;
  content?: string; // Content loaded on demand
}

export interface NovelDetail extends NovelItem {
  longSummary: string;
  characters: NovelCharacter[];
  aiRetelling: string; // Kept for intro
  readingLinks: NewsSource[];
  chapters: NovelChapter[]; // List of chapter titles
  lastUpdated?: number; // Timestamp for cache
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
export type AppMode = 'news' | 'novel';

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