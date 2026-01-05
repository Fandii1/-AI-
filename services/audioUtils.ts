// Decodes a base64 string into a Uint8Array
export function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Decodes raw PCM data into an AudioBuffer
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Convert Int16 to Float32 [-1.0, 1.0]
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export class AudioController {
  private context: AudioContext | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying: boolean = false;
  private onEndedCallback: (() => void) | null = null;

  constructor() {
    // We don't initialize Context here to avoid autoplay policy issues
  }

  private initContext() {
    if (!this.context) {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000
      });
      this.gainNode = this.context.createGain();
      this.gainNode.connect(this.context.destination);
    }
  }

  async playPCM(base64Audio: string, onEnded?: () => void) {
    this.initContext();
    if (!this.context || !this.gainNode) return;

    // Stop current if playing
    this.stop();

    this.onEndedCallback = onEnded || null;

    try {
      const bytes = decodeBase64(base64Audio);
      const buffer = await decodeAudioData(bytes, this.context, 24000, 1);

      this.source = this.context.createBufferSource();
      this.source.buffer = buffer;
      this.source.connect(this.gainNode);
      
      this.source.onended = () => {
        this.isPlaying = false;
        if (this.onEndedCallback) this.onEndedCallback();
      };

      this.source.start();
      this.isPlaying = true;
    } catch (e) {
      console.error("Audio playback error:", e);
      if (onEnded) onEnded();
    }
  }

  stop() {
    if (this.source) {
      try {
        this.source.stop();
        this.source.disconnect();
      } catch (e) {
        // Ignore errors if already stopped
      }
      this.source = null;
    }
    this.isPlaying = false;
  }

  resume() {
    if (this.context && this.context.state === 'suspended') {
      this.context.resume();
    }
  }
}

export const audioController = new AudioController();