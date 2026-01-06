import { GoogleGenAI } from "@google/genai";
import { NewsItem, DurationOption, AppSettings } from "../types";

// --- Helpers ---

const getGeminiClient = (apiKey: string) => {
  return new GoogleGenAI({ apiKey });
};

async function callOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: Array<{ role: string, content: string }>,
  temperature: number = 0.7
): Promise<string> {
  // Normalize URL
  let url = baseUrl.replace(/\/$/, '');
  if (!url.includes('/chat/completions')) {
      if (url.endsWith('/v1')) {
          url = `${url}/chat/completions`;
      } else {
          url = `${url}/v1/chat/completions`; 
      }
  }

  // Handle cases where user might put full path in baseUrl
  if (baseUrl.includes('/chat/completions')) {
      url = baseUrl;
  }

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
      // Increase max tokens for long analysis
      max_tokens: 4000 
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Custom API Error (${response.status}): ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// 1. Fetch News
// Now strictly follows settings.provider. 
// Note: If using OpenAI/Custom, the model MUST have online capabilities (like Perplexity) to return real news.
export async function fetchDailyNews(settings: AppSettings, topics: string[]): Promise<NewsItem[]> {
  const today = new Date().toLocaleDateString('zh-CN');
  
  // Determine effective Key
  const effectiveKey = settings.apiKey || process.env.API_KEY;
  if (!effectiveKey) {
      throw new Error("请配置 API Key");
  }

  const validTopics = topics.filter(t => t.trim() !== '' && t !== '自定义');
  
  let focusInstruction = "";
  if (validTopics.length === 0 || (validTopics.length === 1 && (validTopics[0] === '综合' || validTopics[0] === 'General'))) {
      focusInstruction = `
      【全方位覆盖指令】：
      请务必均衡覆盖以下所有板块，不要局限于单一领域：
      1. **国内时政与社会** (China Domestic) - 占比约 40%
      2. **国际地缘政治与外交** (International) - 占比约 40%
      3. **全球财经与科技前沿** (Finance & Tech) - 占比约 20%
      `;
  } else {
      focusInstruction = `重点仅关注以下主题：【${validTopics.join("、")}】。在此主题下，请同时挖掘国内和国际的深度动态。`;
  }

  const prompt = `
    请作为一名全网新闻聚合引擎，搜索截至 ${today} 的过去 24-48 小时内的全球热点新闻。

    【核心目标：海量 & 全面】
    本次任务的目标是生成一份**极度详尽的新闻列表**。
    1. **数量要求**：请尽全力搜集 **50 条以上** 的不同新闻事件。不要担心数量过多，越多越好。
    2. **拒绝过滤**：只要是正规媒体报道的热点，都请列入。不要只挑选“头条”，次级热点同样重要。
    3. **详细程度**：每条摘要需包含具体的时间、地点、人物或数据，字数在 50-80 字之间。

    ${focusInstruction}

    【输出格式】：
    请直接返回一个纯 JSON 数组字符串，严禁包含 Markdown 标记（如 \`\`\`json）。
    JSON 格式：
    [
      { 
        "headline": "新闻标题", 
        "summary": "包含细节的详细摘要...", 
        "category": "分类(如:国内、国际、财经、科技、社会)", 
        "date": "YYYY-MM-DD" 
      },
      ...
    ]
  `;

  let text = "";
  let groundingChunks: any[] = [];

  try {
      if (settings.provider === 'openai') {
          // Custom / OpenAI Mode
          // We send the prompt directly. The user should use an "Online" model (e.g., Perplexity sonar, or a GPT wrapper with tools)
          text = await callOpenAICompatible(
              settings.baseUrl,
              effectiveKey,
              settings.model,
              [
                  { role: 'system', content: 'You are a real-time news aggregation engine. You have access to the latest internet information.' },
                  { role: 'user', content: prompt }
              ]
          );
      } else {
          // Gemini Mode
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

    // Parse JSON
    let newsItems: NewsItem[] = [];
    try {
        // Clean markdown code blocks if present
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const startIndex = jsonStr.indexOf('[');
        const endIndex = jsonStr.lastIndexOf(']');
        
        if (startIndex !== -1 && endIndex !== -1) {
            const cleanJson = jsonStr.substring(startIndex, endIndex + 1);
            const parsed = JSON.parse(cleanJson);

            // Create sources pool (Gemini specific, or generic for OpenAI)
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
             // Fallback: If text is not JSON, maybe the model just wrote a list. 
             // For now, return empty to trigger error in UI.
             newsItems = [];
        }

    } catch (e) {
        console.error("Failed to parse news JSON", e);
        console.log("Raw text:", text);
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
  
  // Format inputs
  const newsContext = news.map((n, i) => `${i+1}. [${n.date}] [${n.category}] ${n.headline}: ${n.summary}`).join("\n");
  
  let lengthInstruction = "";
  switch(duration) {
      case 'short': lengthInstruction = "总字数约 800-1000 字。"; break;
      case 'medium': lengthInstruction = "总字数约 1500-2000 字，内容需详实。"; break;
      case 'long': lengthInstruction = "总字数 3000 字以上，极度深度和全面。"; break;
  }

  const validTopics = topics.filter(t => t.trim() !== '' && t !== '自定义');
  const topicDesc = validTopics.length > 0 && !validTopics.includes('综合') 
    ? `关于“${validTopics.join('、')}”领域` 
    : "综合";

  // Determine effective Key
  const effectiveKey = settings.apiKey || process.env.API_KEY;
  if (!effectiveKey) throw new Error("Missing API Key");

  const systemPrompt = `你是一位世界顶级的国际新闻主编和情报分析师。你的任务是根据提供的大量碎片化新闻线索，编写一份逻辑严密、深度极高的《每日全球情报简报》。`;

  const userPrompt = `
    请根据以下 ${news.length} 条${topicDesc}新闻素材，撰写今日简报。

    【撰写要求】：
    1. **覆盖率优先**：素材中有 ${news.length} 条新闻，请务必**涵盖其中 80% 以上的内容**。不要只挑几条写，而要进行高密度的信息整合。
    2. **分类整合**：请将新闻按逻辑板块（如：🇨🇳 中国焦点、🌏 全球局势、💹 经济与科技、🛡️ 冲突与安全）进行归类，而不是流水账。
    3. **深度分析**：在每个板块后，增加一段“分析师点评”，解读背后的趋势。
    4. **格式美观**：使用 Markdown，包括各级标题、粗体强调和列表。
    5. **长度要求**：${lengthInstruction}

    【新闻素材列表】：
    ${newsContext}
  `;

  // Dispatch based on provider
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
      // Default to Gemini
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