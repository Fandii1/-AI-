import { GoogleGenAI } from "@google/genai";
import { NewsItem, NovelItem, NovelDetail, NovelChapter, DurationOption, AppSettings } from "../types";

// --- Generic Helpers ---

const getGeminiClient = (apiKey: string) => {
  return new GoogleGenAI({ apiKey });
};

// --- OpenAI Compatible Fetch Helper ---
async function callOpenAICompatible(
  settings: AppSettings, 
  messages: any[], 
  responseFormat: 'json_object' | 'text' = 'text'
): Promise<string> {
  const url = `${settings.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${settings.apiKey}`
  };

  const body = {
    model: settings.model,
    messages: messages,
    stream: false,
    ...(responseFormat === 'json_object' ? { response_format: { type: "json_object" } } : {})
  };

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API Error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// 1. Fetch News with Date and Focus Topics
export async function fetchDailyNews(settings: AppSettings, topics: string[]): Promise<NewsItem[]> {
  const today = new Date().toLocaleDateString('zh-CN');
  
  // Clean topics
  const validTopics = topics.filter(t => t.trim() !== '' && t !== '自定义');
  
  // Construct focus instruction
  let focusInstruction = "";
  if (validTopics.length === 0 || (validTopics.length === 1 && (validTopics[0] === '综合' || validTopics[0] === 'General'))) {
      focusInstruction = "重点关注全球及国内的综合性重大热点新闻（涵盖政治、社会、民生等）。";
  } else {
      const topicStr = validTopics.join("、");
      focusInstruction = `重点仅关注以下领域/主题的最新热点新闻：【${topicStr}】。请确保每一条新闻都与这些主题高度相关。`;
  }

  // Construct Sources instruction
  let sourceInstruction = "";
  if (settings.searchSources && settings.searchSources.length > 0) {
      sourceInstruction = `请优先参考以下平台或来源类型的信息：${settings.searchSources.join(", ")}。`;
  }

  const prompt = `
    请查找最近24-48小时内（截至 ${today}）的 8-12 条最重要的热点新闻。
    ${focusInstruction}
    ${sourceInstruction}
    
    任务：
    1. 充分利用搜索工具查找最新、最相关的新闻。
    2. 整理每一条新闻，包含以下字段：
       - headline: 吸引人的标题。
       - summary: 简明扼要的摘要。
       - category: 准确的分类（如科技、政治、经济、体育，或具体子分类）。
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
    if (settings.provider === 'gemini') {
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

    } else {
      const messages = [
        { role: "system", content: "You are a helpful news assistant. Output only raw JSON." },
        { role: "user", content: prompt }
      ];
      text = await callOpenAICompatible(settings, messages, 'text');
    }

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
      case 'short': lengthInstruction = "生成约 300 字的简报（阅读时间约1分钟）。"; break;
      case 'medium': lengthInstruction = "生成约 600 字的详细简报（阅读时间约3分钟）。"; break;
      case 'long': lengthInstruction = "生成约 1000 字的深度分析简报（阅读时间约5分钟）。"; break;
  }

  // Topic description
  const validTopics = topics.filter(t => t.trim() !== '' && t !== '自定义');
  const topicDesc = validTopics.length > 0 && !validTopics.includes('综合') 
    ? `关于“${validTopics.join('、')}”领域` 
    : "综合";

  const prompt = `
    你是一位专业的资深新闻编辑。
    请根据以下${topicDesc}的新闻列表，撰写一份连贯、专业且富有洞察力的${lengthInstruction}
    
    要求：
    1. 风格：专业、客观、流畅。类似于专业的早间新闻简报。
    2. 结构：
       - 开场：简短问候，提及今天是针对${topicDesc}的专题简报（如果是综合新闻则不需强调专题）。
       - 正文：将新闻按逻辑分类串联，不要只是机械地列举。在不同新闻之间使用自然的过渡语。
       - 结尾：简短的结束语。
    3. 内容：直接生成正文文本，适合阅读。

    新闻素材：
    ${newsContext}
  `;

  try {
    if (settings.provider === 'gemini') {
        const ai = getGeminiClient(settings.apiKey);
        const response = await ai.models.generateContent({
          model: settings.model || 'gemini-2.0-flash',
          contents: prompt,
        });
        return response.text || "生成摘要失败。";
    } else {
        const messages = [
            { role: "system", content: "You are a professional news editor." },
            { role: "user", content: prompt }
        ];
        return await callOpenAICompatible(settings, messages);
    }

  } catch (error) {
    console.error("Briefing Gen Error:", error);
    throw error;
  }
}

// 3. Fetch Popular Novels
export async function fetchPopularNovels(settings: AppSettings, genre: string): Promise<NovelItem[]> {
    let genreInstruction = "";
    if (genre === '免费') {
        genreInstruction = "当前全网最热门的免费网络小说（重点关注番茄、七猫等免费阅读平台的高分榜单）";
    } else if (genre === '全部' || genre === '综合') {
        genreInstruction = "各类热门网络小说";
    } else if (genre === '收藏') {
        return []; // Managed by local state, not fetched
    } else {
        genreInstruction = `"${genre}" 类型的热门网络小说`;
    }

    const prompt = `
      请利用搜索引擎查找${genreInstruction}。
      
      请列出 6-10 本推荐小说。
      
      对于每本小说，请提供以下信息：
      - title: 书名
      - author: 作者
      - description: 简短的剧情介绍（50字以内）
      - genre: 具体流派（如玄幻、言情、科幻、悬疑等）
      - status: 连载 或 完结
      - platform: 首发平台（如起点中文网、晋江文学城、番茄小说等，如果不知道填未知）
      - rating: 评分（如 9.2，如果不知道填 -）

      【重要】输出格式要求：
      请直接返回一个纯 JSON 数组字符串，不要包含任何 Markdown 标记（如 \`\`\`json），也不要包含其他解释性文字。
      格式示例：
      [
        { "title": "...", "author": "...", "description": "...", "genre": "...", "status": "连载", "platform": "...", "rating": "..." },
        ...
      ]
    `;

    let text = "";
    try {
        if (settings.provider === 'gemini') {
            const ai = getGeminiClient(settings.apiKey);
            const response = await ai.models.generateContent({
                model: settings.model || 'gemini-2.0-flash',
                contents: prompt,
                config: {
                    tools: [{ googleSearch: {} }],
                },
            });
            text = response.text || "[]";
        } else {
            const messages = [
                { role: "system", content: "You are a helpful book recommendation assistant. Output only raw JSON." },
                { role: "user", content: prompt }
            ];
            text = await callOpenAICompatible(settings, messages, 'text');
        }

        // Parse JSON
        let novelItems: NovelItem[] = [];
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const startIndex = jsonStr.indexOf('[');
        const endIndex = jsonStr.lastIndexOf(']');

        if (startIndex !== -1 && endIndex !== -1) {
            const cleanJson = jsonStr.substring(startIndex, endIndex + 1);
            const parsed = JSON.parse(cleanJson);
            novelItems = parsed.map((item: any) => ({
                title: item.title || "未知书名",
                author: item.author || "佚名",
                description: item.description || "暂无介绍",
                genre: item.genre || genre,
                status: item.status || "Unknown",
                platform: item.platform || "Unknown",
                rating: item.rating || "-"
            }));
        }
        return novelItems;

    } catch (error) {
        console.error("Novel Fetch Error:", error);
        throw error;
    }
}

// 4. Fetch Novel Detail & Chapter List
export async function fetchNovelDetail(settings: AppSettings, novel: NovelItem): Promise<NovelDetail> {
    const prompt = `
      关于小说《${novel.title}》（作者：${novel.author}）：
      
      任务：
      1. longSummary: 提供一个详细的故事大纲（约300字）。
      2. characters: 列出 3-5 个主要角色，包含姓名(name)、角色定位(role)、简短描述(description)。
      3. aiRetelling: 基于你对本书的了解，生成一段精彩的开篇导读（约500字）。
      4. chapters: 【极其重要】请尽可能完整地列出该小说的所有章节目录。如果小说非常长，请至少列出前 100 章的标题。必须严格按照 { "index": number, "title": string } 的格式。
      
      【重要】输出格式要求：
      请直接返回一个纯 JSON 对象，不要包含任何 Markdown 标记（如 \`\`\`json）。
      chapters 字段必须是一个数组，包含大量章节。
      
      格式示例：
      {
        "longSummary": "...",
        "characters": [{ "name": "...", "role": "主角", "description": "..." }],
        "aiRetelling": "...",
        "chapters": [{ "index": 1, "title": "第一章 风起" }, { "index": 2, "title": "第二章 云涌" }, ...更多章节]
      }
    `;

    let text = "";
    let groundingChunks: any[] = [];

    try {
        if (settings.provider === 'gemini') {
            const ai = getGeminiClient(settings.apiKey);
            const response = await ai.models.generateContent({
                model: settings.model || 'gemini-2.0-flash',
                contents: prompt,
                config: {
                    tools: [{ googleSearch: {} }],
                },
            });
            text = response.text || "{}";
            groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        } else {
            const messages = [
                { role: "system", content: "You are a literary expert AI. Output raw JSON." },
                { role: "user", content: prompt }
            ];
            text = await callOpenAICompatible(settings, messages, 'json_object');
        }

        // Parse JSON
        let detail: Partial<NovelDetail> = {};
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const startIndex = jsonStr.indexOf('{');
        const endIndex = jsonStr.lastIndexOf('}');

        if (startIndex !== -1 && endIndex !== -1) {
            const cleanJson = jsonStr.substring(startIndex, endIndex + 1);
            detail = JSON.parse(cleanJson);
        }

        const validSources = groundingChunks
            .filter((c: any) => c.web?.uri && c.web?.title)
            .map((c: any) => ({ title: c.web.title, uri: c.web.uri }));

        return {
            ...novel,
            longSummary: detail.longSummary || novel.description,
            characters: detail.characters || [],
            aiRetelling: detail.aiRetelling || "AI 暂时无法生成试读内容。",
            readingLinks: validSources,
            chapters: detail.chapters || []
        };

    } catch (error) {
        console.error("Novel Detail Error:", error);
        throw error;
    }
}

// 5. Fetch Chapter Content (Simulate Crawling)
export async function fetchChapterContent(settings: AppSettings, novelTitle: string, author: string, chapterTitle: string): Promise<string> {
    const prompt = `
      请帮我查找小说《${novelTitle}》（作者：${author}）中章节“${chapterTitle}”的具体正文内容。
      
      要求：
      1. 利用搜索工具尽可能找到该章节的原文内容。
      2. 如果是免费公开章节，请直接返回完整的正文内容。
      3. 如果无法找到完整原文或原文受版权保护无法展示，请尽可能详细地复述该章节发生的具体剧情，字数不少于 800 字，风格贴近原著。
      4. 只返回正文内容，不要包含“好的”、“以下是内容”等客套话。
      5. 进行适当的排版，段落之间留空行。
    `;

    let text = "";
    try {
        if (settings.provider === 'gemini') {
            const ai = getGeminiClient(settings.apiKey);
            const response = await ai.models.generateContent({
                model: settings.model || 'gemini-2.0-flash',
                contents: prompt,
                config: {
                    tools: [{ googleSearch: {} }],
                },
            });
            text = response.text || "获取章节内容失败，请稍后重试。";
        } else {
            const messages = [
                { role: "system", content: "You are a reading assistant." },
                { role: "user", content: prompt }
            ];
            text = await callOpenAICompatible(settings, messages, 'text');
        }
        return text;
    } catch (error) {
        console.error("Chapter Content Error:", error);
        throw new Error("章节内容获取失败");
    }
}