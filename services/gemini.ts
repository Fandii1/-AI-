import { GoogleGenAI } from "@google/genai";
import { NewsItem, DurationOption } from "../types";

// Helper to get a fresh instance
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// 1. Fetch News with Date
export async function fetchDailyNews(): Promise<NewsItem[]> {
  const today = new Date().toLocaleDateString('zh-CN');
  
  const prompt = `
    请查找最近24-48小时内（截至 ${today}）的8条最重要的热点新闻。
    重点关注国内（中国）和国际新闻的混合。
    
    任务：
    1. 使用 Google Search 查找最新新闻。
    2. 整理每一条新闻，包含以下字段：
       - headline: 吸引人的标题。
       - summary: 简明扼要的摘要。
       - category: 分类（如科技、政治、经济）。
       - date: 发布日期 (格式 YYYY-MM-DD)。
    
    【重要】输出格式要求：
    请直接返回一个纯 JSON 数组字符串，不要包含任何 Markdown 标记（如 \`\`\`json），也不要包含其他解释性文字。
    格式示例：
    [
      { "headline": "...", "summary": "...", "category": "...", "date": "..." },
      ...
    ]
  `;

  try {
    const ai = getAI();
    // Using gemini-2.5-flash-latest for potentially better stability with tools+json in some regions,
    // or sticking to gemini-3-flash-preview but without schema.
    // Let's use gemini-3-flash-preview as recommended, but without strict schema config.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        // responseSchema & responseMimeType removed to avoid 500 errors with Search tool
      },
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const text = response.text || "[]";
    let newsItems: NewsItem[] = [];

    try {
        // Clean up markdown code blocks if the model adds them despite instructions
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        // Find the start and end of the JSON array to avoid parsing intro text
        const startIndex = jsonStr.indexOf('[');
        const endIndex = jsonStr.lastIndexOf(']');
        
        if (startIndex !== -1 && endIndex !== -1) {
            const cleanJson = jsonStr.substring(startIndex, endIndex + 1);
            const parsed = JSON.parse(cleanJson);

            const validSources = groundingChunks
                .filter((c: any) => c.web?.uri && c.web?.title)
                .map((c: any) => ({ title: c.web.title, uri: c.web.uri }));

            newsItems = parsed.map((item: any) => ({
                headline: item.headline || "无标题",
                summary: item.summary || "暂无摘要",
                category: item.category || "热点",
                // If model fails to return date, default to today
                date: item.date || new Date().toISOString().split('T')[0],
                sources: validSources
            }));
        } else {
             console.warn("No JSON array found in response");
             newsItems = [];
        }

    } catch (e) {
        console.error("Failed to parse news JSON", e);
        console.log("Raw text received:", text);
        newsItems = [];
    }

    return newsItems;

  } catch (error) {
    console.error("Gemini Search Error:", error);
    throw error;
  }
}

// 2. Generate Briefing Summary (Monologue)
export async function generateNewsBriefing(news: NewsItem[], duration: DurationOption): Promise<string> {
  const newsContext = news.map(n => `[${n.date}] [${n.category}] ${n.headline}: ${n.summary}`).join("\n");
  
  let lengthInstruction = "";
  switch(duration) {
      case 'short': lengthInstruction = "生成约 300 字的简报（阅读时间约1分钟）。"; break;
      case 'medium': lengthInstruction = "生成约 600 字的详细简报（阅读时间约3分钟）。"; break;
      case 'long': lengthInstruction = "生成约 1000 字的深度分析简报（阅读时间约5分钟）。"; break;
  }

  const prompt = `
    你是一位专业的资深新闻编辑。
    请根据以下新闻列表，撰写一份连贯、专业且富有洞察力的${lengthInstruction}
    
    要求：
    1. 风格：专业、客观、流畅。类似于专业的早间新闻简报。
    2. 结构：
       - 开场：简短问候（"大家早上好，今天是..."）。
       - 正文：将新闻按逻辑分类串联，不要只是机械地列举。在不同新闻之间使用自然的过渡语。
       - 结尾：简短的结束语和天气/心情寄语。
    3. 内容：直接生成正文文本，适合阅读。

    新闻素材：
    ${newsContext}
  `;

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "生成摘要失败。";

  } catch (error) {
    console.error("Briefing Gen Error:", error);
    throw error;
  }
}