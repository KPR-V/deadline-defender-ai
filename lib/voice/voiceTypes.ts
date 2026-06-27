export interface VoiceRecognitionResult {
  transcript: string;
  isFinal: boolean;
}

export interface VoiceService {
  startListening(onResult: (result: VoiceRecognitionResult) => void, onError: (error: string) => void, onEnd: () => void): void;
  stopListening(): void;
  isSupported(): boolean;
}
