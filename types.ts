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