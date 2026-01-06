import { GoogleGenAI } from "@google/genai";
import { NewsItem, DurationOption, AppSettings } from "../types";

// --- Generic Helpers ---

const getGeminiClient = (apiKey: string) => {
  return new GoogleGenAI({ apiKey });
};

// Robust URL constructor for OpenAI compatible endpoints
const constructChatUrl = (baseUrl: string): string => {
  let url = baseUrl.trim().replace(/\/$/, '');
  
  if (url.endsWith('/chat/completions')) {
      return url;
  }
  
  if (url.endsWith('/v1')) {
      return `${url}/chat/completions`;
  }
  
  return `${url}/v1/chat/completions`;
};

// Helper: Normalize date to YYYY-MM-DD
// If invalid, defaults to fallbackDate
function normalizeDate(rawDate: any, fallbackDate: string): string {
    if (!rawDate) return fallbackDate;
    
    try {
        const d = new Date(rawDate);
        if (isNaN(d.getTime())) return fallbackDate;
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) {
        return fallbackDate;
    }
}

async function callOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: Array<{ role: string, content: string }>,
  temperature: number = 0.7
): Promise<string> {
  
  const url = constructChatUrl(baseUrl);
  
  try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature: temperature,
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API Request Failed: [${response.status}] ${errText.substring(0, 200)}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || "";

  } catch (error: any) {
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
          throw new Error("网络请求失败 (CORS)。您的浏览器可能无法直接访问该 API 地址。请尝试使用支持 CORS 的代理地址，或检查网络连接。");
      }
      throw error;
  }
}

// 1. Fetch News by Topic (Single Segment)
export async function fetchNewsByTopic(settings: AppSettings, topic: string): Promise<NewsItem[]> {
  const now = new Date();
  // Ensure YYYY-MM-DD format based on local time
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  
  const effectiveKey = settings.apiKey || process.env.API_KEY;
  if (!effectiveKey) {
      throw new Error("请配置 API Key");
  }

  // Optimized prompt for strict timeliness and sub-topic focus
  const prompt = `
    Role: Real-time News Engine.
    Current Date: ${dateStr} (China Standard Time)
    Target Micro-Topic: 【${topic}】
    
    Task: Search for the VERY LATEST headlines specifically about "${topic}".
    
    CRITICAL INSTRUCTIONS:
    1. **LANGUAGE**: Output MUST be in **SIMPLIFIED CHINESE (简体中文)**. Even if sources are English, translate to Chinese.
    2. **TIMELINESS**: 
       - PRIMARY GOAL: Find news from **TODAY (${dateStr})**.
       - SECONDARY GOAL: News from yesterday.
       - FORBIDDEN: News older than 48 hours.
    
    Requirements:
    1. Quantity: Find 8-12 distinct, high-impact items for this micro-topic.
    2. Content: Focus on facts, numbers, and direct quotes.
    3. Format: Strict JSON array.
    
    JSON Structure:
    [
      { "headline": "...", "summary": "...", "category": "${topic}", "date": "YYYY-MM-DD" },
      ...
    ]
  `;

  let text = "";
  let groundingChunks: any[] = [];

  try {
      if (settings.provider === 'openai') {
          text = await callOpenAICompatible(
              settings.baseUrl,
              effectiveKey,
              settings.model,
              [
                  { role: 'system', content: 'You are a real-time news API. Output strict JSON only. Language: Simplified Chinese.' },
                  { role: 'user', content: prompt }
              ]
          );
      } else {
          const ai = getGeminiClient(effectiveKey);
          const response = await ai.models.generateContent({
            model: settings.model || 'gemini-2.0-flash',
            contents: prompt,
            config: {
              tools: [{ googleSearch: {} }],
            },
          });
          text = response.text || "[]";
          groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      }

    let newsItems: NewsItem[] = [];
    try {
        let jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const startIndex = jsonStr.indexOf('[');
        let endIndex = jsonStr.lastIndexOf(']');
        
        // Auto-Repair Truncated JSON
        if (startIndex !== -1 && endIndex === -1) {
             const lastBrace = jsonStr.lastIndexOf('}');
             if (lastBrace > startIndex) {
                 jsonStr = jsonStr.substring(0, lastBrace + 1) + ']';
                 endIndex = jsonStr.length - 1;
             }
        }

        if (startIndex !== -1 && endIndex !== -1) {
            const cleanJson = jsonStr.substring(startIndex, endIndex + 1);
            const parsed = JSON.parse(cleanJson);

            const validSources = groundingChunks
                .filter((c: any) => c.web?.uri && c.web?.title)
                .map((c: any) => ({ title: c.web.title, uri: c.web.uri }));

            if (Array.isArray(parsed)) {
                newsItems = parsed.map((item: any) => ({
                    headline: item.headline || "无标题",
                    summary: item.summary || "暂无摘要",
                    category: item.category || topic,
                    // Safe normalization to prevent "Invalid Date"
                    date: normalizeDate(item.date, dateStr),
                    sources: validSources 
                }));
            }
        }
    } catch (e) {
        console.error(`Failed to parse news JSON for topic ${topic}`, e);
        newsItems = [];
    }

    return newsItems;

  } catch (error) {
    console.error(`News Fetch Error (${topic}):`, error);
    return [];
  }
}

// 2. Generate Briefing Summary
export async function generateNewsBriefing(news: NewsItem[], duration: DurationOption, settings: AppSettings, topics: string[]): Promise<string> {
  
  const MAX_ITEMS = 150; 
  const processedNews = news.slice(0, MAX_ITEMS);
  const now = new Date();
  const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
  
  const newsContext = processedNews.map((n, i) => `${i+1}. [${n.date}] [${n.category}] ${n.headline}: ${n.summary}`).join("\n");
  
  let lengthInstruction = "";
  switch(duration) {
      case 'short': lengthInstruction = "字数 1000 字左右，快节奏。"; break;
      case 'medium': lengthInstruction = "字数 2000 字左右，兼顾深度。"; break;
      case 'long': lengthInstruction = "字数 3500 字以上，极度详尽，如同智库报告。"; break;
  }

  const effectiveKey = settings.apiKey || process.env.API_KEY;
  if (!effectiveKey) throw new Error("Missing API Key");

  const systemPrompt = `你是一位世界顶级的中文新闻主编。今天是 ${dateStr}。任务是将碎片化新闻重组为一份逻辑严密、深度极高的《今日情报简报》。请全程使用简体中文。`;
  
  const userPrompt = `
    请根据以下 ${processedNews.length} 条新闻素材，撰写今日深度简报。

    【核心指令】：
    1. **语言**：必须使用**简体中文**。
    2. **时效性优先**：重点突出“今天”发生的重大进展。
    3. **深度整合**：将相关联的新闻（例如同一事件的不同侧面）合并分析，不要做流水账。
    4. **板块划分**：请清晰划分为：
       - 🚨 今日头条 (Breaking News)
       - 🇨🇳 国内动态 (China Focus)
       - 🌏 国际局势 (Global Affairs)
       - 💹 财经与科技 (Business & Tech)
       - 🔮 趋势研判 (Analyst's Take)
    5. **分析师点评**：在每个板块末尾，必须加上“分析师点评”，揭示新闻背后的逻辑或未来几天的走势。
    6. **长度**：${lengthInstruction}

    【新闻素材】：
    ${newsContext}
  `;

  if (settings.provider === 'openai') {
      return await callOpenAICompatible(
          settings.baseUrl,
          effectiveKey,
          settings.model,
          [
             { role: 'system', content: systemPrompt },
             { role: 'user', content: userPrompt }
          ]
      );
  } else {
      const ai = getGeminiClient(effectiveKey);
      const response = await ai.models.generateContent({
        model: settings.model || 'gemini-2.0-flash',
        contents: userPrompt,
        config: {
           systemInstruction: systemPrompt
        }
      });
      return response.text || "生成摘要失败。";
  }
}