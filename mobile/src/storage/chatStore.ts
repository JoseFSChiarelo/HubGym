import AsyncStorage from '@react-native-async-storage/async-storage';

export type ChatMessage = {
  id: string;
  athleteId: string;
  from: 'PERSONAL' | 'ATHLETE';
  text: string;
  createdAt: string;
};

const CHAT_STORAGE_KEY = 'hubgym_personal_chat_v1';

export const loadChatMessages = async (): Promise<ChatMessage[]> => {
  try {
    const raw = await AsyncStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ChatMessage[]) : [];
  } catch {
    return [];
  }
};

export const saveChatMessages = async (messages: ChatMessage[]) => {
  await AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
};
