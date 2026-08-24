import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { api } from '../api/client';
import { FormResponse, Notice } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { AppButton } from '../components/AppButton';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import { ChatMessage, loadChatMessages, saveChatMessages } from '../storage/chatStore';
import { theme } from '../theme';

type Athlete = { id: string; name: string; user?: { email?: string | null } };

const formatTimeAgo = (date: string) => {
  const diffMs = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `ha ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `ha ${hours}h`;
  const days = Math.floor(hours / 24);
  return `ha ${days}d`;
};

const formatAnswerValue = (value: unknown) => {
  if (value === undefined || value === null || value === '') return '--';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Nao';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '--';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const buildAnswerItems = (response: FormResponse) => {
  const answers = (response.answers ?? {}) as Record<string, unknown>;
  const fields = response.form?.fields ?? [];

  if (fields.length > 0) {
    return fields.map((field) => ({
      id: field.id,
      label: field.label,
      value: answers[field.id]
    }));
  }

  return Object.entries(answers).map(([id, value]) => ({
    id,
    label: id,
    value
  }));
};

export const PersonalChatScreen = () => {
  const { token } = useAuth();
  const [tab, setTab] = useState<'chat' | 'forms' | 'notices'>('chat');

  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loadingAthletes, setLoadingAthletes] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedAthleteId, setSelectedAthleteId] = useState('');

  const [allMessages, setAllMessages] = useState<ChatMessage[]>([]);
  const [draftMessage, setDraftMessage] = useState('');

  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<FormResponse | null>(null);
  const [responseModalVisible, setResponseModalVisible] = useState(false);

  const [notices, setNotices] = useState<Notice[]>([]);
  const [loadingNotices, setLoadingNotices] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');
  const [sendingNotice, setSendingNotice] = useState(false);

  const loadAthletes = async () => {
    if (!token) return;
    setLoadingAthletes(true);
    try {
      const data = await api.getPersonalAthletes(token);
      const mapped = (data || []).map((a) => ({ id: a.id, name: a.name, user: a.user }));
      setAthletes(mapped);
      if (!selectedAthleteId && mapped.length > 0) setSelectedAthleteId(mapped[0].id);
    } catch {
      Alert.alert('Erro', 'Nao foi possivel carregar os alunos.');
    } finally {
      setLoadingAthletes(false);
    }
  };

  const loadRecentResponses = async () => {
    if (!token) return;
    setLoadingResponses(true);
    try {
      const data = await api.getPersonalFormResponses(token, 50);
      setResponses(data || []);
    } catch {
      Alert.alert('Erro', 'Nao foi possivel carregar os formularios.');
    } finally {
      setLoadingResponses(false);
    }
  };

  const loadNotices = async () => {
    if (!token) return;
    setLoadingNotices(true);
    try {
      const data = await api.getPersonalNotices(token, 20);
      setNotices(data || []);
    } catch {
      Alert.alert('Erro', 'Nao foi possivel carregar os avisos.');
    } finally {
      setLoadingNotices(false);
    }
  };

  useEffect(() => {
    loadAthletes();
    loadRecentResponses();
    loadNotices();
  }, [token]);

  useEffect(() => {
    const run = async () => {
      const stored = await loadChatMessages();
      setAllMessages(stored);
    };
    run();
  }, []);

  useEffect(() => {
    saveChatMessages(allMessages);
  }, [allMessages]);

  const filteredAthletes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return athletes;
    return athletes.filter((a) =>
      (a.name || '').toLowerCase().includes(q) || (a.user?.email || '').toLowerCase().includes(q)
    );
  }, [athletes, search]);

  const messagesForSelectedAthlete = useMemo(() => {
    if (!selectedAthleteId) return [];
    return allMessages
      .filter((m) => m.athleteId === selectedAthleteId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [allMessages, selectedAthleteId]);

  const lastMessageByAthlete = useMemo(() => {
    const map = new Map<string, ChatMessage>();
    for (const message of allMessages) {
      const prev = map.get(message.athleteId);
      if (!prev || new Date(message.createdAt).getTime() > new Date(prev.createdAt).getTime()) {
        map.set(message.athleteId, message);
      }
    }
    return map;
  }, [allMessages]);

  const selectedAthlete = useMemo(
    () => athletes.find((a) => a.id === selectedAthleteId) || null,
    [athletes, selectedAthleteId]
  );

  const sendMessage = () => {
    if (!selectedAthleteId) {
      Alert.alert('Atencao', 'Selecione um aluno para conversar.');
      return;
    }
    const text = draftMessage.trim();
    if (!text) return;
    setAllMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        athleteId: selectedAthleteId,
        from: 'PERSONAL',
        text,
        createdAt: new Date().toISOString()
      }
    ]);
    setDraftMessage('');
  };

  const sendNotice = async () => {
    if (!token) return;
    const message = noticeMessage.trim();
    const title = noticeTitle.trim();
    if (!message) {
      Alert.alert('Atencao', 'Informe a mensagem do aviso.');
      return;
    }

    setSendingNotice(true);
    try {
      await api.createPersonalNotice(token, {
        title: title ? title : undefined,
        message
      });
      setNoticeTitle('');
      setNoticeMessage('');
      await loadNotices();
      Alert.alert('Sucesso', 'Aviso enviado.');
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Nao foi possivel enviar o aviso.');
    } finally {
      setSendingNotice(false);
    }
  };

  const filteredResponses = useMemo(() => {
    if (!selectedAthleteId) return responses;
    return responses.filter((r) => r.athlete?.id === selectedAthleteId);
  }, [responses, selectedAthleteId]);

  const openResponse = async (response: FormResponse) => {
    setSelectedResponse(response);
    setResponseModalVisible(true);

    if (!token || !response.form?.id) return;
    if (response.form?.fields && response.form.fields.length > 0) return;

    try {
      const data = await api.getPersonalForm(token, response.form.id);
      const fields = Array.isArray(data?.fields) ? data.fields : [];
      if (fields.length === 0) return;
      setSelectedResponse((prev) => {
        if (!prev || prev.id !== response.id) return prev;
        return { ...prev, form: { ...prev.form, fields } };
      });
    } catch {
      // ignore
    }
  };

  const answerItems = selectedResponse ? buildAnswerItems(selectedResponse) : [];

  return (
    <Screen contentStyle={styles.content}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Chat do personal</Text>
          <Text style={styles.subtitle}>Converse com alunos e acompanhe formularios.</Text>
        </View>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Alunos</Text>
          <TextInput
            style={styles.input}
            placeholder="Buscar por nome ou email..."
            placeholderTextColor={theme.colors.textDim}
            value={search}
            onChangeText={setSearch}
          />

          {loadingAthletes ? (
            <Text style={styles.muted}>Carregando alunos...</Text>
          ) : filteredAthletes.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.muted}>Nenhum aluno encontrado.</Text>
            </View>
          ) : (
            filteredAthletes.map((athlete) => {
              const last = lastMessageByAthlete.get(athlete.id);
              const isActive = athlete.id === selectedAthleteId;
              return (
                <Pressable
                  key={athlete.id}
                  onPress={() => setSelectedAthleteId(athlete.id)}
                  style={[styles.athleteItem, isActive && styles.athleteItemActive]}
                >
                  <View style={styles.athleteInfo}>
                    <Text style={styles.athleteName}>{athlete.name}</Text>
                    <Text style={styles.muted}>{athlete.user?.email || 'Sem email'}</Text>
                    <Text style={styles.muted}>
                      {last ? (last.from === 'PERSONAL' ? `Voce: ${last.text}` : last.text) : 'Sem mensagens'}
                    </Text>
                  </View>
                  {last ? <Text style={styles.muted}>{formatTimeAgo(last.createdAt)}</Text> : null}
                </Pressable>
              );
            })
          )}
        </Card>

        <View style={styles.tabs}>
          {(['chat', 'forms', 'notices'] as const).map((item) => (
            <Pressable
              key={item}
              style={[styles.tabButton, tab === item && styles.tabButtonActive]}
              onPress={() => setTab(item)}
            >
              <Text style={[styles.tabLabel, tab === item && styles.tabLabelActive]}>
                {item === 'chat' ? 'Chat' : item === 'forms' ? 'Formularios' : 'Avisos'}
              </Text>
            </Pressable>
          ))}
        </View>

        {tab === 'chat' && (
          <Card style={styles.card}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>{selectedAthlete?.name || 'Selecione um aluno'}</Text>
                <Text style={styles.muted}>{selectedAthlete?.user?.email || 'Sem email'}</Text>
              </View>
            </View>

            <View style={styles.chatBox}>
              {messagesForSelectedAthlete.length === 0 ? (
                <Text style={styles.muted}>Nenhuma mensagem ainda. Envie a primeira.</Text>
              ) : (
                messagesForSelectedAthlete.map((message) => (
                  <View
                    key={message.id}
                    style={[
                      styles.chatBubble,
                      message.from === 'PERSONAL' ? styles.chatBubbleMine : styles.chatBubbleOther
                    ]}
                  >
                    <Text style={styles.chatText}>{message.text}</Text>
                    <Text style={styles.chatTime}>{formatTimeAgo(message.createdAt)}</Text>
                  </View>
                ))
              )}
            </View>

            <View style={styles.chatInputRow}>
              <TextInput
                style={styles.chatInput}
                placeholder="Digite uma mensagem..."
                placeholderTextColor={theme.colors.textDim}
                value={draftMessage}
                onChangeText={setDraftMessage}
                multiline
              />
              <AppButton title="Enviar" onPress={sendMessage} tone="yellow" />
            </View>
            <Text style={styles.muted}>* Chat local (mock).</Text>
          </Card>
        )}

        {tab === 'forms' && (
          <Card style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Formularios respondidos</Text>
              <AppButton title="Atualizar" onPress={loadRecentResponses} variant="outline" tone="yellow" />
            </View>

            {loadingResponses ? (
              <Text style={styles.muted}>Carregando...</Text>
            ) : filteredResponses.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.muted}>Nenhum formulario respondido.</Text>
              </View>
            ) : (
              filteredResponses.map((response) => (
                <Pressable
                  key={response.id}
                  style={styles.libraryItem}
                  onPress={() => openResponse(response)}
                >
                  <Text style={styles.libraryTitle}>{response.form?.title || 'Formulario'}</Text>
                  <Text style={styles.muted}>
                    {response.athlete?.name} | {formatTimeAgo(response.createdAt)}
                  </Text>
                </Pressable>
              ))
            )}
          </Card>
        )}

        {tab === 'notices' && (
          <Card style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Avisos para alunos</Text>
              <AppButton title="Atualizar" onPress={loadNotices} variant="outline" tone="yellow" />
            </View>

            <TextInput
              style={styles.input}
              placeholder="Titulo (opcional)"
              placeholderTextColor={theme.colors.textDim}
              value={noticeTitle}
              onChangeText={setNoticeTitle}
            />
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Escreva o aviso..."
              placeholderTextColor={theme.colors.textDim}
              value={noticeMessage}
              onChangeText={setNoticeMessage}
              multiline
            />
            <AppButton title="Enviar aviso" onPress={sendNotice} loading={sendingNotice} tone="yellow" />

            {loadingNotices ? (
              <Text style={styles.muted}>Carregando avisos...</Text>
            ) : notices.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.muted}>Nenhum aviso enviado ainda.</Text>
              </View>
            ) : (
              notices.map((notice) => (
                <View key={notice.id} style={styles.libraryItem}>
                  <Text style={styles.libraryTitle}>{notice.title || 'Aviso do personal'}</Text>
                  <Text style={styles.muted}>{notice.message}</Text>
                  <Text style={styles.muted}>{formatTimeAgo(notice.createdAt)}</Text>
                </View>
              ))
            )}
          </Card>
        )}
      </ScrollView>

      <Modal visible={responseModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Resposta do formulario</Text>
            <ScrollView style={styles.modalBody}>
              {selectedResponse ? (
                <>
                  <Text style={styles.sectionTitle}>{selectedResponse.form?.title}</Text>
                  <Text style={styles.muted}>
                    {selectedResponse.athlete?.name} | {formatTimeAgo(selectedResponse.createdAt)}
                  </Text>
                  {answerItems.length === 0 ? (
                    <Text style={styles.muted}>Sem respostas enviadas.</Text>
                  ) : (
                    answerItems.map((item) => (
                      <View key={item.id} style={styles.answerCard}>
                        <Text style={styles.libraryTitle}>{item.label}</Text>
                        <Text style={styles.muted}>{formatAnswerValue(item.value)}</Text>
                      </View>
                    ))
                  )}
                </>
              ) : null}
            </ScrollView>
            <View style={styles.modalActions}>
              <AppButton title="Fechar" onPress={() => setResponseModalVisible(false)} variant="ghost" tone="yellow" />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingBottom: theme.spacing.xxl
  },
  scroll: {
    paddingBottom: theme.spacing.xxl
  },
  header: {
    marginBottom: theme.spacing.lg
  },
  title: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text,
    fontSize: 22
  },
  subtitle: {
    color: theme.colors.textDim,
    marginTop: 4
  },
  card: {
    marginBottom: theme.spacing.lg
  },
  sectionTitle: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    color: theme.colors.text,
    backgroundColor: theme.colors.bgAlt,
    marginBottom: theme.spacing.sm
  },
  textarea: {
    minHeight: 90,
    textAlignVertical: 'top'
  },
  muted: {
    color: theme.colors.textDim,
    fontSize: 12,
    marginBottom: theme.spacing.sm
  },
  emptyBox: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    alignItems: 'center'
  },
  athleteItem: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.bgAlt,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  athleteItemActive: {
    borderColor: theme.colors.accentAlt
  },
  athleteInfo: {
    flex: 1,
    marginRight: theme.spacing.sm
  },
  athleteName: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text,
    marginBottom: 4
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.xl,
    padding: 4,
    marginBottom: theme.spacing.lg
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: theme.radius.xl,
    alignItems: 'center'
  },
  tabButtonActive: {
    backgroundColor: theme.colors.accentAlt
  },
  tabLabel: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.textDim
  },
  tabLabelActive: {
    color: '#0a0a0a'
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm
  },
  chatBox: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    minHeight: 240,
    marginBottom: theme.spacing.md
  },
  chatBubble: {
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.sm,
    maxWidth: '80%'
  },
  chatBubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.accentAlt
  },
  chatBubbleOther: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surfaceAlt
  },
  chatText: {
    color: '#0a0a0a',
    fontFamily: theme.fonts.regular
  },
  chatTime: {
    color: '#0a0a0a',
    fontSize: 10,
    marginTop: 4
  },
  chatInputRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginBottom: theme.spacing.sm
  },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    color: theme.colors.text,
    backgroundColor: theme.colors.bgAlt
  },
  libraryItem: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.bgAlt
  },
  libraryTitle: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text,
    marginBottom: 4
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    width: '100%',
    maxHeight: '90%'
  },
  modalTitle: {
    fontFamily: theme.fonts.semibold,
    fontSize: 18,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm
  },
  modalBody: {
    marginBottom: theme.spacing.md
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm
  },
  answerCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.bgAlt
  }
});
