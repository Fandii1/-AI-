
import { GoogleGenAI } from "@google/genai";
import { NewsItem, DurationOption, AppSettings, TravelRequest } from "../types";

// --- Generic Helpers ---

const getGeminiClient = (apiKey: string) => {
  return new GoogleGenAI({ apiKey });
};

// Helper: Get effective API Key based on provider
const getEffectiveKey = (settings: AppSettings): string => {
    if (settings.apiKey) return settings.apiKey;
    
    if (settings.provider === 'gemini') {
        return process.env.API_KEY || '';
    }
    
    if (settings.provider === 'deepseek') {
        return process.env.DEEPSEEK_API_KEY || '';
    }

    if (settings.provider === 'tongyi') {
        return process.env.TONGYI_API_KEY || '';
    }
    
    return '';
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
  
  // Handle bare domain like 'https://api.deepseek.com' or 'https://dashscope.aliyuncs.com/compatible-mode/v1'
  return `${url}/chat/completions`;
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
          stream: false
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
  
  const effectiveKey = getEffectiveKey(settings);
  if (!effectiveKey) {
      const providerName = settings.provider === 'deepseek' ? 'DeepSeek' : (settings.provider === 'tongyi' ? '通义千问' : 'AI');
      throw new Error(`请配置 ${providerName} API Key`);
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
      if (['openai', 'deepseek', 'tongyi'].includes(settings.provider)) {
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
        
        // Remove DeepSeek <think> tags if present
        jsonStr = jsonStr.replace(/<think>[\s\S]*?<\/think>/g, '');
        
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

  const effectiveKey = getEffectiveKey(settings);
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

  if (['openai', 'deepseek', 'tongyi'].includes(settings.provider)) {
      let text = await callOpenAICompatible(
          settings.baseUrl,
          effectiveKey,
          settings.model,
          [
             { role: 'system', content: systemPrompt },
             { role: 'user', content: userPrompt }
          ]
      );
      // Clean <think> tags for DeepSeek R1
      return text.replace(/<think>[\s\S]*?<\/think>/g, '');
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

// 3. Generate Lifestyle (Travel/Food) Guide
export async function generateLifestyleGuide(req: TravelRequest, settings: AppSettings): Promise<string> {
  const effectiveKey = getEffectiveKey(settings);
  if (!effectiveKey) throw new Error("Missing API Key");

  const isPlan = req.type === 'PLAN';
  const budgetMap = { budget: '经济穷游', standard: '舒适标准', luxury: '豪华享受' };
  const budgetStr = budgetMap[req.budget];
  const interestsStr = req.interests.length > 0 ? req.interests.join("、") : "大众经典";

  const imageInstruction = `
    【配图指令】：
    为了增加吸引力，请在每个主要推荐点（如推荐的景点、餐厅或特色菜）之后，**单独起一行**，插入一张 Markdown 图片。
    
    使用以下格式插入真实的搜索图片（不要使用 AI 生成的）：
    \`![{名称}](https://tse1.mm.bing.net/th?q={关键词}&w=800&h=450&c=7&rs=1&p=0)\`

    重要：
    1. **{关键词}**：请替换为该地点或美食的**具体中文名称+城市名**（例如"成都大熊猫基地"、"重庆老火锅"）。
    2. **{名称}**：图片的描述。
    3. 务必将图片链接单独放在一行。
    4. 每个主要段落（如每天的行程、每个推荐餐厅）至少配一张图。
  `;

  let systemPrompt = "";
  let userPrompt = "";

  if (isPlan) {
    systemPrompt = `你是一位深谙"小红书"和"大众点评"风格的资深旅行规划师。你的任务是为用户生成一份极具实操性、图文并茂的旅行攻略。语言风格要年轻、热情、干货满满。`;
    userPrompt = `
      请为我规划一次去【${req.destination}】的旅行。
      
      【基本信息】：
      - 时长：${req.duration} 天
      - 预算偏好：${budgetStr}
      - 兴趣偏好：${interestsStr}
      
      【要求输出的内容】：
      1. **🚩 路线概览**：一句话总结这次旅行的亮点。
      2. **🗺️ 每日详细行程**：按第1天、第2天...的格式。每天必须包含：
         - 景点顺序（考虑地理位置合理性）
         - 建议游玩时长
         - 交通连接建议
         - (按指令插入真实景点图片)
      3. **🏨 住宿避雷与推荐**：
         - 推荐住在哪个区域最方便
         - 针对${budgetStr}预算，推荐2-3家具体酒店或民宿类型（引用真实网络评价中的优缺点）。
         - (插入酒店区域或氛围图片)
      4. **🍜 沿途美食**：
         - 结合行程，推荐每天顺路的必吃餐厅或小吃。
         - 必须包含：餐厅名称、推荐菜、人均参考。
         - (插入真实美食图片)
      5. **💡 避坑与贴士**：
         - 当地交通、穿衣、防骗、预约门票等实用信息。
      
      ${imageInstruction}
      
      请利用搜索工具获取最新的景点开放情况、门票价格和真实的用户评价。
    `;
  } else {
    // Food Guide
    systemPrompt = `你是一位拥有百万粉丝的美食探店博主，专注于发现地道美食。你的风格是客观毒舌但又充满热情，擅长挖掘本地人去的小店。请参考大众点评的评价体系。`;
    userPrompt = `
      请帮我整理一份【${req.destination}】的必吃美食指南。
      
      【筛选条件】：
      - 预算水平：${budgetStr}
      - 口味偏好：${interestsStr}
      
      【请输出以下板块】：
      1. **🔥 本地特色科普**：${req.destination}有什么是必吃的？（介绍3-4种特色菜/小吃）。
         - (请为每种特色菜插入一张真实图片)
      2. **🏆 必吃榜单推荐**（请基于真实口碑推荐 5-8 家店）：
         - **分类推荐**：例如【老字号】、【网红打卡】、【本地人食堂】、【性价比之王】。
         - 每家店需包含：
           - 🏠 店名
           - 💰 人均消费
           - 🥘 必点菜
           - ⭐ 推荐理由（结合环境、口味、排队情况）
           - 📍 大致位置
           - (必须插入该店招牌菜或环境的图片)
      3. **⚠️ 排雷指南**：有哪些名气大但不好吃的店，或者需要注意的消费陷阱。
      
      ${imageInstruction}
      
      请利用搜索工具查找最新的食客评价和餐厅营业状态。
    `;
  }

  try {
    if (['openai', 'deepseek', 'tongyi'].includes(settings.provider)) {
        let text = await callOpenAICompatible(
            settings.baseUrl,
            effectiveKey,
            settings.model,
            [
               { role: 'system', content: systemPrompt },
               { role: 'user', content: userPrompt }
            ]
        );
        return text.replace(/<think>[\s\S]*?<\/think>/g, '');
    } else {
        const ai = getGeminiClient(effectiveKey);
        const response = await ai.models.generateContent({
          model: settings.model || 'gemini-2.0-flash',
          contents: userPrompt,
          config: {
             systemInstruction: systemPrompt,
             tools: [{ googleSearch: {} }] // Critical for live travel info
          }
        });
        return response.text || "生成指南失败。";
    }
  } catch (e) {
    console.error("Lifestyle API Error", e);
    throw e;
  }
}
