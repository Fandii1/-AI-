import { GoogleGenAI } from "@google/genai";
import { NewsItem, DurationOption, AppSettings } from "../types";

// --- Generic Helpers ---

const getGeminiClient = (apiKey: string) => {
  return new GoogleGenAI({ apiKey });
};

// 1. Fetch News with Date and Focus Topics
export async function fetchDailyNews(settings: AppSettings, topics: string[]): Promise<NewsItem[]> {
  const today = new Date().toLocaleDateString('zh-CN');
  
  // Clean topics
  const validTopics = topics.filter(t => t.trim() !== '' && t !== '自定义');
  
  // Construct focus instruction
  let focusInstruction = "";
  if (validTopics.length === 0 || (validTopics.length === 1 && (validTopics[0] === '综合' || validTopics[0] === 'General'))) {
      focusInstruction = "重点涵盖【国内（中国）】及【国际】的重大热点新闻（政治、经济、社会、科技等）。确保视野开阔，国内外新闻比例均衡。";
  } else {
      const topicStr = validTopics.join("、");
      focusInstruction = `重点仅关注以下领域/主题的最新热点新闻：【${topicStr}】。请确保包含国内和国际的相关进展。`;
  }

  // Construct Sources instruction
  let sourceInstruction = "";
  if (settings.searchSources && settings.searchSources.length > 0) {
      sourceInstruction = `请优先参考以下平台或来源类型的信息：${settings.searchSources.join(", ")}。`;
  }

  const prompt = `
    请查找最近24-48小时内（截至 ${today}）的 10-15 条最重要的热点新闻。
    ${focusInstruction}
    ${sourceInstruction}
    
    任务：
    1. 充分利用搜索工具查找最新、最相关的新闻。
    2. 整理每一条新闻，包含以下字段：
       - headline: 吸引人的标题。
       - summary: 简明扼要的摘要。
       - category: 准确的分类（如：国内、国际、科技、财经、体育）。
       - date: 发布日期 (格式 YYYY-MM-DD)。
    
    【重要】输出格式要求：
    请直接返回一个纯 JSON 数组字符串，不要包含任何 Markdown 标记（如 \`\`\`json），也不要包含其他解释性文字。
    格式示例：
    [
      { "headline": "...", "summary": "...", "category": "...", "date": "..." },
      ...
    ]
  `;

  let text = "";
  let groundingChunks: any[] = [];

  try {
      const ai = getGeminiClient(settings.apiKey);
      const response = await ai.models.generateContent({
        model: settings.model || 'gemini-2.0-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
      text = response.text || "[]";
      groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    // Parse JSON
    let newsItems: NewsItem[] = [];
    try {
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
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
    console.error("News Fetch Error:", error);
    throw error;
  }
}

// 2. Generate Briefing Summary
export async function generateNewsBriefing(news: NewsItem[], duration: DurationOption, settings: AppSettings, topics: string[]): Promise<string> {
  const newsContext = news.map(n => `[${n.date}] [${n.category}] ${n.headline}: ${n.summary}`).join("\n");
  
  let lengthInstruction = "";
  switch(duration) {
      case 'short': lengthInstruction = "字数控制在 500 字左右，言简意赅。"; break;
      case 'medium': lengthInstruction = "字数控制在 1000 字左右，内容丰富。"; break;
      case 'long': lengthInstruction = "字数控制在 1500 字以上，深度剖析。"; break;
  }

  // Topic description
  const validTopics = topics.filter(t => t.trim() !== '' && t !== '自定义');
  const topicDesc = validTopics.length > 0 && !validTopics.includes('综合') 
    ? `关于“${validTopics.join('、')}”领域` 
    : "综合";

  const prompt = `
    你是一位资深的国际新闻分析师和主编。
    请根据以下${topicDesc}的新闻列表，撰写一份结构化、深度且专业的“每日AI简报”。
    
    简报要求：
    1. **结构清晰**：请使用 Markdown 格式（使用 ## 标题, **加粗** 等）。
    2. **内容板块**：
       - **🌍 全球&国内速览**：快速概括最重要的3-5条新闻。
       - **🚀 深度分析 (Deep Dive)**：挑选 1-2 条最具影响力的新闻，进行深度剖析（背景、影响、未来走向）。这是重点部分。
       - **💡 关键洞察**：一句话总结今天的核心趋势或给读者的建议。
    3. **风格**：专业、客观、犀利，避免流水账。
    4. **长度**：${lengthInstruction}

    新闻素材：
    ${newsContext}
  `;

  try {
      const ai = getGeminiClient(settings.apiKey);
      const response = await ai.models.generateContent({
        model: settings.model || 'gemini-2.0-flash',
        contents: prompt,
      });
      return response.text || "生成摘要失败。";

  } catch (error) {
    console.error("Briefing Gen Error:", error);
    throw error;
  }
}