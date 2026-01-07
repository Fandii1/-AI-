
import { GoogleGenAI, Modality } from "@google/genai";
import { NewsItem, DurationOption, AppSettings, TravelRequest, PodcastSegment } from "../types";

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

// Helper: Get Tongyi Key specifically for TTS (can fallback to env)
const getTongyiKey = (settings: AppSettings): string => {
    // 1. If provider is Tongyi, prioritize user input key (settings.apiKey), then fallback to env
    if (settings.provider === 'tongyi') {
        return settings.apiKey || process.env.TONGYI_API_KEY || '';
    }
    // 2. If provider is NOT Tongyi (e.g. Gemini/DeepSeek), ignore settings.apiKey (it's for LLM) 
    // and strictly use the dedicated environment variable for Tongyi TTS.
    return process.env.TONGYI_API_KEY || '';
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
  
  return `${url}/chat/completions`;
};

// Helper: Normalize date to YYYY-MM-DD
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

// Fetch with timeout to prevent hanging requests
const fetchWithTimeout = async (resource: string, options: RequestInit & { timeout?: number } = {}) => {
  const { timeout = 60000, ...rest } = options; // 60s default timeout
  
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
      const response = await fetch(resource, {
        ...rest,
        signal: controller.signal  
      });
      clearTimeout(id);
      return response;
  } catch (error) {
      clearTimeout(id);
      throw error;
  }
};

async function callOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: Array<{ role: string, content: string }>,
  temperature: number = 0.7
): Promise<string> {
  
  const url = constructChatUrl(baseUrl);
  console.log(`[LLM] Calling OpenAI Compatible API: ${url} | Model: ${model}`);
  
  try {
      const response = await fetchWithTimeout(url, {
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
        }),
        timeout: 90000 // 90s timeout for LLM generation
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[LLM] API Request Failed: ${response.status}`, errText);
        throw new Error(`API Request Failed: [${response.status}] ${errText.substring(0, 200)}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      console.log(`[LLM] Response received. Length: ${content.length}`);
      return content;

  } catch (error: any) {
      console.error(`[LLM] Network/Parsing Error:`, error);
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
          throw new Error("网络请求失败 (CORS)。您的浏览器可能无法直接访问该 API 地址。请尝试使用支持 CORS 的代理地址，或检查网络连接。");
      }
      if (error.name === 'AbortError') {
          throw new Error("请求超时，AI 响应时间过长，请稍后重试。");
      }
      throw error;
  }
}

// 1. Fetch News by Topic (Single Segment)
export async function fetchNewsByTopic(settings: AppSettings, topic: string): Promise<NewsItem[]> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  
  console.log(`[News] Fetching topic: ${topic}`);

  const effectiveKey = getEffectiveKey(settings);
  if (!effectiveKey) {
      const providerName = settings.provider === 'deepseek' ? 'DeepSeek' : (settings.provider === 'tongyi' ? '通义千问' : 'AI');
      throw new Error(`请配置 ${providerName} API Key`);
  }

  const prompt = `
    Role: Real-time News Engine.
    Current Date: ${dateStr} (China Standard Time)
    Target Micro-Topic: 【${topic}】
    
    Task: Search for the VERY LATEST headlines specifically about "${topic}".
    
    CRITICAL INSTRUCTIONS:
    1. **LANGUAGE**: Output MUST be in **SIMPLIFIED CHINESE (简体中文)**.
    2. **TIMELINESS**: Focus on news from **TODAY (${dateStr})** or yesterday.
    
    Requirements:
    1. Quantity: Find 8-12 distinct, high-impact items.
    2. Format: Strict JSON array.
    
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
          console.log(`[News] Using Gemini GoogleSearch Tool...`);
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
    
    console.log(`[News] Raw response for ${topic} (Length: ${text.length})`);

    let newsItems: NewsItem[] = [];
    try {
        let jsonStr = text.replace(/```json/g, '').replace(/```/g, '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        jsonStr = jsonStr.replace(/<think>[\s\S]*?<\/think>/g, '');
        
        const startIndex = jsonStr.indexOf('[');
        let endIndex = jsonStr.lastIndexOf(']');
        
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
                    date: normalizeDate(item.date, dateStr),
                    sources: validSources 
                }));
            }
        } else {
            console.warn(`[News] No JSON array found in response for ${topic}. Response start: ${jsonStr.substring(0, 100)}...`);
        }
    } catch (e) {
        console.error(`[News] Failed to parse JSON for topic ${topic}`, e);
        console.debug(`[News] Failed Response Text:`, text);
        newsItems = [];
    }
    return newsItems;

  } catch (error) {
    console.error(`[News] Fetch Error (${topic}):`, error);
    return [];
  }
}

// 2. Generate Briefing Summary
export async function generateNewsBriefing(news: NewsItem[], duration: DurationOption, settings: AppSettings, topics: string[]): Promise<string> {
  console.log(`[Summary] Generating briefing from ${news.length} items...`);
  const MAX_ITEMS = 150; 
  const processedNews = news.slice(0, MAX_ITEMS);
  const now = new Date();
  const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
  const newsContext = processedNews.map((n, i) => `${i+1}. [${n.date}] [${n.category}] ${n.headline}: ${n.summary}`).join("\n");
  
  let lengthInstruction = "";
  switch(duration) {
      case 'short': lengthInstruction = "字数 1000 字左右。"; break;
      case 'medium': lengthInstruction = "字数 2000 字左右。"; break;
      case 'long': lengthInstruction = "字数 3500 字以上。"; break;
  }

  const effectiveKey = getEffectiveKey(settings);
  if (!effectiveKey) throw new Error("Missing API Key");

  const systemPrompt = `你是一位世界顶级的中文新闻主编。今天是 ${dateStr}。任务是将碎片化新闻重组为一份逻辑严密、深度极高的《今日情报简报》。`;
  const userPrompt = `
    请根据以下新闻素材，撰写今日深度简报。
    【要求】：
    1. 语言：简体中文。
    2. 深度整合：不要流水账，将相关新闻合并分析。
    3. 板块：🚨今日头条, 🇨🇳国内动态, 🌏国际局势, 💹财经科技, 🔮趋势研判。
    4. 长度：${lengthInstruction}
    
    【素材】：
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
      return text.replace(/<think>[\s\S]*?<\/think>/g, '');
  } else {
      const ai = getGeminiClient(effectiveKey);
      const response = await ai.models.generateContent({
        model: settings.model || 'gemini-2.0-flash',
        contents: userPrompt,
        config: { systemInstruction: systemPrompt }
      });
      return response.text || "生成摘要失败。";
  }
}

// 4. Generate Podcast Script
export async function generatePodcastScript(summary: string, settings: AppSettings): Promise<PodcastSegment[]> {
    console.log(`[Podcast] Generating script...`);
    const effectiveKey = getEffectiveKey(settings);
    if (!effectiveKey) throw new Error("Missing API Key");
  
    const systemPrompt = `你是一位专业的双人播客内容策划。`;
    const userPrompt = `
      请将新闻简报改写为一段生动、幽默的“双人对话”播客脚本。
      
      【角色】：
      1. **Kai** (Male): 充满激情，声音磁性。
      2. **Maia** (Female): 聪明知性，声音温柔。
      
      【要求】：
      1. 选取 3-4 个最重要热点。像朋友聊天一样自然。
      2. **格式严格**：输出 JSON 数组。
         [ { "speaker": "Kai", "text": "..." }, { "speaker": "Maia", "text": "..." } ]
  
      【原文】：
      ${summary.substring(0, 5000)}
    `;
  
    let text = "";
    if (['openai', 'deepseek', 'tongyi'].includes(settings.provider)) {
        text = await callOpenAICompatible(
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
            systemInstruction: systemPrompt,
            responseMimeType: "application/json"
          }
        });
        text = response.text || "[]";
    }

    console.log(`[Podcast] Raw Script Response:`, text.substring(0, 200) + "...");

    try {
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed)) {
            console.log(`[Podcast] Script parsed successfully. ${parsed.length} segments.`);
            return parsed;
        } else {
            console.error(`[Podcast] Parsed result is not an array.`);
            return [{ speaker: "Kai", text: "生成脚本格式有误。" }];
        }
    } catch (e) {
        console.error(`[Podcast] Script parsing error:`, e);
        return [{ speaker: "Kai", text: "抱歉，无法生成对话。" }];
    }
}

// --- AUDIO GENERATION STRATEGIES ---

// HELPER: Add WAV Header to Raw PCM
function createWavHeader(dataLength: number, sampleRate: number, numChannels: number, bitsPerSample: number): Uint8Array {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  writeString(view, 0, 'RIFF'); // ChunkID
  view.setUint32(4, 36 + dataLength, true); // ChunkSize
  writeString(view, 8, 'WAVE'); // Format
  writeString(view, 12, 'fmt '); // Subchunk1ID
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true); // ByteRate
  view.setUint16(32, numChannels * (bitsPerSample / 8), true); // BlockAlign
  view.setUint16(34, bitsPerSample, true); // BitsPerSample
  writeString(view, 36, 'data'); // Subchunk2ID
  view.setUint32(40, dataLength, true); // Subchunk2Size

  return new Uint8Array(header);
}

// Strategy A: Gemini Native TTS (Backup)
async function generateGeminiAudio(script: PodcastSegment[], apiKey: string, modelName: string): Promise<{ buffer: ArrayBuffer, mimeType: string }> {
    console.log(`[TTS] Using Gemini Native TTS. Model: ${modelName}`);
    const ai = getGeminiClient(apiKey);
    const transcript = script.map(s => `${s.speaker}: ${s.text}`).join('\n');
    const prompt = `Generate a podcast audio for the following dialogue between Kai and Maia. Speak naturally and enthusiastically.\n\n${transcript}`;

    // Fix: Structure the request to match strict API requirements for Gemini TTS
    const response = await ai.models.generateContent({
        model: modelName || 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                multiSpeakerVoiceConfig: {
                    speakerVoiceConfigs: [
                        { speaker: 'Kai', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } } },
                        { speaker: 'Maia', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } } }
                    ]
                }
            }
        }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
        throw new Error("Gemini returned no audio data. Please check if the model is currently available.");
    }

    const binaryString = atob(base64Audio);
    const len = binaryString.length;
    const pcmBytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        pcmBytes[i] = binaryString.charCodeAt(i);
    }

    const header = createWavHeader(pcmBytes.length, 24000, 1, 16);
    const wavBuffer = new Uint8Array(header.length + pcmBytes.length);
    wavBuffer.set(header);
    wavBuffer.set(pcmBytes, header.length);

    console.log(`[TTS] Gemini Audio generated successfully. Size: ${wavBuffer.byteLength}`);
    return { buffer: wavBuffer.buffer, mimeType: 'audio/wav' };
}

// Strategy B: Tongyi/DashScope Sambert TTS (Primary)
async function generateTongyiAudio(script: PodcastSegment[], apiKey: string, modelName: string, onProgress?: (percent: number) => void): Promise<{ buffer: ArrayBuffer, mimeType: string }> {
    console.log(`[TTS] Starting Tongyi/DashScope TTS. Model: ${modelName}`);
    
    // Determine Environment:
    const isLocalhost = typeof window !== 'undefined' && 
                        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    
    const TARGET_API = "https://dashscope.aliyuncs.com/api/v1/services/audio/tts/generation";
    
    // 1. Try local proxy first if on localhost
    let url = isLocalhost ? "/api/dashscope/api/v1/services/audio/tts/generation" : TARGET_API;
    
    const MODEL_NAME = modelName || "qwen3-tts-flash"; 

    // Determine voice type based on model name
    const isQwen = MODEL_NAME.includes('qwen');
    const isCosy = MODEL_NAME.includes('cosyvoice');

    // Default Voices
    let maleVoice = "zhitian_emo";
    let femaleVoice = "zhiyan_emo";

    if (isQwen) {
        // Qwen models support specific voices like 'cherry', 'dylan', 'sunny', 'jada'
        maleVoice = "dylan";  
        femaleVoice = "cherry"; 
    } else if (isCosy) {
        maleVoice = "longxiaocheng";
        femaleVoice = "longxiaochun";
    }

    console.log(`[TTS] Using voices - Male: ${maleVoice}, Female: ${femaleVoice}`);

    const results: ArrayBuffer[] = [];
    const validSegments = script.filter(s => s.text && s.text.trim().length > 0);
    const total = validSegments.length;

    // Use SERIAL execution to prevent rate limiting
    for (let i = 0; i < total; i++) {
        const segment = validSegments[i];
        const isMale = /Kai|凯|Male|Boy/i.test(segment.speaker);
        const voice = isMale ? maleVoice : femaleVoice;
        
        console.log(`[TTS] Generating segment ${i+1}/${total}: [${segment.speaker}] ${segment.text.substring(0, 10)}...`);

        if (onProgress) {
             const percent = Math.round(((i) / total) * 100);
             onProgress(percent);
        }

        try {
            const payload = {
                model: MODEL_NAME,
                input: { 
                    text: segment.text
                },
                parameters: {
                    text_type: "PlainText",
                    format: "mp3",
                    voice: voice,
                    sample_rate: 24000,
                    // Add language_type explicitly as per best practice for qwen3-tts-flash
                    language_type: "Auto" 
                }
            };

            // Helper to try fetch
            const doFetch = async (fetchUrl: string) => {
                return await fetchWithTimeout(fetchUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload),
                    timeout: 15000 // 15s timeout
                });
            };

            console.log(`[TTS] Sending fetch request to ${url}...`);

            let response;
            try {
                response = await doFetch(url);
            } catch (netError) {
                console.warn(`[TTS] Primary fetch to ${url} failed. Trying CORS proxy fallback...`, netError);
                // Fallback to CORS proxy
                const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(TARGET_API)}`;
                try {
                    response = await doFetch(proxyUrl);
                } catch (proxyError) {
                    // If proxy also fails, throw original error
                    throw netError;
                }
            }

            if (!response.ok) {
                 const errText = await response.text();
                 console.error(`[TTS] Segment ${i} failed. Status: ${response.status}. Response: ${errText}`);
                 
                 let errMsg = errText;
                 try {
                     const errJson = JSON.parse(errText);
                     if (errJson.message) errMsg = errJson.message;
                     if (errJson.code) errMsg = `[${errJson.code}] ${errMsg}`;
                 } catch (e) {}
                 
                 if (i === 0) {
                     if (response.status === 404) {
                         throw new Error(`语音API路径未找到 (404)。可能是本地代理未生效。`);
                     }
                     if (response.status === 401 || response.status === 403) {
                         throw new Error(`语音API鉴权失败。请检查通义千问 API Key。`);
                     }
                     throw new Error(`语音API请求失败: ${errMsg.substring(0, 150)}`);
                 }
                 continue; 
            }

            const data = await response.json();
            
            // Success response: { output: { audio_url: "..." }, request_id: "..." }
            if (data.output && data.output.audio_url) {
                const audioUrl = data.output.audio_url;
                
                // Fetch the actual audio file
                // Try direct first, then proxy if CORS issue
                const doAudioFetch = async (aUrl: string) => {
                    return await fetchWithTimeout(aUrl, { timeout: 15000 });
                }

                let audioResp;
                try {
                    audioResp = await doAudioFetch(audioUrl);
                } catch (e) {
                     // Try via proxy if audio fetch fails (often CORS on audio CDN)
                     const proxyAudioUrl = `https://corsproxy.io/?${encodeURIComponent(audioUrl)}`;
                     audioResp = await doAudioFetch(proxyAudioUrl);
                }

                if (!audioResp.ok) throw new Error(`Failed to download audio content: ${audioResp.status}`);
                
                const buffer = await audioResp.arrayBuffer();
                results.push(buffer);
            } else if (data.code) {
                 console.error("[TTS] API Logical Error:", data.code, data.message);
                 if (i === 0) throw new Error(`语音API错误: [${data.code}] ${data.message}`);
            }

        } catch (e: any) {
            console.error(`[TTS] Exception in segment ${i}`, e);
            if (i === 0) {
                 // Enhance error message for user
                 let msg = e.message;
                 if (msg === 'Failed to fetch') {
                     msg = '网络连接失败 (Failed to fetch)。可能是跨域(CORS)限制或代理服务未启动。';
                 }
                 throw new Error(`语音合成连接失败: ${msg}。建议切换到 Gemini TTS。`);
            }
        }
    }
    
    if (onProgress) onProgress(100);

    if (results.length === 0) {
        throw new Error("语音生成失败：API 未返回任何音频数据。请检查 API Key 和网络。");
    }

    // Combine MP3 frames (Direct concatenation works for MP3 usually)
    const totalLen = results.reduce((acc, b) => acc + b.byteLength, 0);
    const combined = new Uint8Array(totalLen);
    let offset = 0;
    for (const b of results) {
        combined.set(new Uint8Array(b), offset);
        offset += b.byteLength;
    }
    
    console.log(`[TTS] Generation complete. Total bytes: ${totalLen}`);
    return { buffer: combined.buffer, mimeType: 'audio/mp3' };
}

// 5. Main Audio Generation Facade
export async function generatePodcastAudio(script: PodcastSegment[], settings: AppSettings, onProgress?: (percent: number) => void): Promise<{ buffer: ArrayBuffer, mimeType: string }> {
    const tongyiKey = getTongyiKey(settings);
    const geminiKey = settings.provider === 'gemini' ? (settings.apiKey || process.env.API_KEY) : process.env.API_KEY;

    // Priority 1: Use Tongyi (Sambert/Qwen TTS) if Key is available.
    if (tongyiKey) {
        const model = settings.ttsModel && !settings.ttsModel.includes('gemini') ? settings.ttsModel : 'qwen3-tts-flash';
        return await generateTongyiAudio(script, tongyiKey, model, onProgress);
    }

    // Priority 2: Use Gemini Native TTS as fallback.
    if (geminiKey) {
        const model = settings.ttsModel && settings.ttsModel.includes('gemini') ? settings.ttsModel : 'gemini-2.5-flash-preview-tts';
        return await generateGeminiAudio(script, geminiKey, model);
    }
    
    throw new Error("未检测到语音服务 API Key。请配置通义千问 (DashScope) 或 Gemini API Key。");
}

// 3. Generate Lifestyle Guide (No changes logic-wise, just keeping export)
export async function generateLifestyleGuide(req: TravelRequest, settings: AppSettings): Promise<string> {
  const effectiveKey = getEffectiveKey(settings);
  if (!effectiveKey) throw new Error("Missing API Key");
  
  const isPlan = req.type === 'PLAN';
  const budgetStr = { budget: '经济穷游', standard: '舒适标准', luxury: '豪华享受' }[req.budget];
  const interestsStr = req.interests.join("、") || "大众经典";

  const imageInstruction = `
    请在每个主要推荐点后单独起一行，插入真实图片：
    \`![{名称}](https://tse1.mm.bing.net/th?q={关键词}&w=800&h=450&c=7&rs=1&p=0)\`
    其中{关键词}需替换为“中文具体名称+城市”。
  `;

  let prompt = "";
  if (isPlan) {
    prompt = `为去【${req.destination}】${req.duration}天${budgetStr}旅行制定攻略。兴趣：${interestsStr}。需包含每日行程、住宿、美食、避坑。${imageInstruction}`;
  } else {
    prompt = `整理【${req.destination}】的${budgetStr}美食指南。偏好：${interestsStr}。需包含必吃榜单、特色科普、排雷。${imageInstruction}`;
  }

  try {
    if (['openai', 'deepseek', 'tongyi'].includes(settings.provider)) {
        let text = await callOpenAICompatible(settings.baseUrl, effectiveKey, settings.model, [{role: 'user', content: prompt}]);
        return text.replace(/<think>[\s\S]*?<\/think>/g, '');
    } else {
        const ai = getGeminiClient(effectiveKey);
        const response = await ai.models.generateContent({
          model: settings.model || 'gemini-2.0-flash',
          contents: prompt,
          config: { tools: [{ googleSearch: {} }] }
        });
        return response.text || "Failed";
    }
  } catch (e) {
    throw e;
  }
}
