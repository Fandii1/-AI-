import { GoogleGenAI, Modality } from "@google/genai";
import { NewsItem, DurationOption } from "../types";

// Helper to get a fresh instance
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// 1. Fetch News with Date
export async function fetchDailyNews(): Promise<NewsItem[]> {
  const today = new Date().toLocaleDateString('zh-CN');
  
  const prompt = `
    请查找最近24-48小时内（截至 ${today}）的8条最重要的热点新闻。
    重点关注国内（中国）和国际新闻的混合。
    
    对于每条新闻，请提供：
    1. headline: 吸引人的标题。
    2. summary: 简明扼要的摘要。
    3. category: 分类（如科技、政治、经济）。
    4. date: 发布日期 (格式 YYYY-MM-DD)。

    请以JSON数组格式返回。
  `;

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    headline: { type: "STRING" },
                    summary: { type: "STRING" },
                    category: { type: "STRING" },
                    date: { type: "STRING" }
                }
            }
        }
      },
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const text = response.text || "[]";
    let newsItems: NewsItem[] = [];

    try {
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(jsonStr);
        
        const validSources = groundingChunks
            .filter((c: any) => c.web?.uri && c.web?.title)
            .map((c: any) => ({ title: c.web.title, uri: c.web.uri }));

        newsItems = parsed.map((item: any) => ({
            ...item,
            // If model fails to return date, default to today
            date: item.date || new Date().toISOString().split('T')[0],
            sources: validSources
        }));

    } catch (e) {
        console.error("Failed to parse news JSON", e);
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
      case 'short': lengthInstruction = "生成约 300 字的简报（约1分钟朗读）。"; break;
      case 'medium': lengthInstruction = "生成约 600 字的详细简报（约3分钟朗读）。"; break;
      case 'long': lengthInstruction = "生成约 1000 字的深度分析简报（约5分钟朗读）。"; break;
  }

  const prompt = `
    你是一位专业的资深新闻主播。
    请根据以下新闻列表，撰写一份连贯、专业且富有洞察力的${lengthInstruction}
    
    要求：
    1. 风格：专业、客观、流畅。类似于《新闻联播》或专业的早间新闻简报。
    2. 结构：
       - 开场：简短问候（"大家早上好，今天是..."）。
       - 正文：将新闻按逻辑分类串联，不要只是机械地列举。在不同新闻之间使用自然的过渡语。
       - 结尾：简短的结束语和天气/心情寄语。
    3. 内容：不需要角色扮演，只有一位讲述者。直接生成正文文本。

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

// 3. Generate Audio (Single Speaker)
export async function generateSpeech(text: string): Promise<string> {
  const prompt = `Read the following text clearly and professionally:\n${text}`;

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Fenrir' } // Deep, professional male voice
          }
        }
      }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data returned");
    
    return base64Audio;

  } catch (error) {
    console.error("TTS Error:", error);
    throw error;
  }
}
