import { Feather } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from 'react-native';
import { api } from '../api/client';
import { FormRequest } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { AppButton } from '../components/AppButton';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import { ChatMessage, loadChatMessages, saveChatMessages } from '../storage/chatStore';
import { theme } from '../theme';

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

export const AthleteChatScreen = () => {
  const { user, token } = useAuth();
  const athleteId = user?.athleteId || '';
  const [tab, setTab] = useState<'chat' | 'forms'>('chat');
  const [requests, setRequests] = useState<FormRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<FormRequest | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [sendingResponse, setSendingResponse] = useState(false);

  const [allMessages, setAllMessages] = useState<ChatMessage[]>([]);
  const [draftMessage, setDraftMessage] = useState('');
  const [formModalVisible, setFormModalVisible] = useState(false);

  const loadRequests = async () => {
    if (!token) return;
    setLoadingRequests(true);
    try {
      const data = await api.getAthleteForms(token);
      setRequests(data || []);
    } catch {
      setRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    loadRequests();
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

  const sortedRequests = useMemo(() => {
    return [...requests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [requests]);

  const personalName = useMemo(() => {
    return requests.find((request) => request.form?.personal?.name)?.form?.personal?.name || 'seu personal';
  }, [requests]);

  const messagesForAthlete = useMemo(() => {
    if (!athleteId) return [];
    return allMessages
      .filter((message) => message.athleteId === athleteId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [allMessages, athleteId]);

  const openForm = (request: FormRequest) => {
    if (request.status !== 'PENDING') return;
    setSelectedRequest(request);
    const initialAnswers = request.form.fields.reduce<Record<string, unknown>>((acc, field) => {
      acc[field.id] = field.type === 'BOOLEAN' ? false : '';
      return acc;
    }, {});
    setAnswers(initialAnswers);
    setFormModalVisible(true);
  };

  const closeForm = () => {
    setFormModalVisible(false);
    setSelectedRequest(null);
    setAnswers({});
  };

  const updateAnswer = (fieldId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  };

  const sendMessage = () => {
    if (!athleteId) return;
    const text = draftMessage.trim();
    if (!text) return;
    setAllMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        athleteId,
        from: 'ATHLETE',
        text,
        createdAt: new Date().toISOString()
      }
    ]);
    setDraftMessage('');
  };

  const submitResponse = async () => {
    if (!selectedRequest || !token) return;
    const missingRequired = selectedRequest.form.fields.filter((field) => {
      if (!field.required) return false;
      const value = answers[field.id];
      return value === undefined || value === null || value === '';
    });

    if (missingRequired.length > 0) return;

    const payload = selectedRequest.form.fields.reduce<Record<string, unknown>>((acc, field) => {
      const value = answers[field.id];
      if (field.type === 'BOOLEAN') {
        acc[field.id] = Boolean(value);
        return acc;
      }
      if (value === undefined || value === null || value === '') return acc;
      if (field.type === 'NUMBER') {
        const asNumber = typeof value === 'number' ? value : Number(value);
        if (!Number.isNaN(asNumber)) acc[field.id] = asNumber;
        return acc;
      }
      acc[field.id] = value;
      return acc;
    }, {});

    setSendingResponse(true);
    try {
      await api.submitAthleteFormResponse(token, selectedRequest.id, payload);
      closeForm();
      await loadRequests();
    } finally {
      setSendingResponse(false);
    }
  };

  return (
    <Screen contentStyle={styles.content}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Chat</Text>
          <Text style={styles.subtitle}>Converse com o seu personal e responda formularios.</Text>
        </View>

        <View style={styles.tabs}>
          <Pressable
            style={[styles.tabButton, tab === 'chat' && styles.tabButtonActive]}
            onPress={() => setTab('chat')}
          >
            <Text style={[styles.tabLabel, tab === 'chat' && styles.tabLabelActive]}>Chat</Text>
          </Pressable>
          <Pressable
            style={[styles.tabButton, tab === 'forms' && styles.tabButtonActive]}
            onPress={() => setTab('forms')}
          >
            <Text style={[styles.tabLabel, tab === 'forms' && styles.tabLabelActive]}>Formulario</Text>
          </Pressable>
        </View>

        {tab === 'chat' ? (
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconCircle}>
                <Feather name="message-square" size={16} color={theme.colors.accent} />
              </View>
              <View>
                <Text style={styles.cardTitle}>Conversa com {personalName}</Text>
                <Text style={styles.muted}>Envie mensagens e tire suas duvidas do treino.</Text>
              </View>
            </View>

            <View style={styles.chatBox}>
              {messagesForAthlete.length === 0 ? (
                <Text style={styles.muted}>Nenhuma mensagem ainda. Envie a primeira.</Text>
              ) : (
                messagesForAthlete.map((message) => (
                  <View
                    key={message.id}
                    style={[
                      styles.chatBubble,
                      message.from === 'ATHLETE' ? styles.chatBubbleMine : styles.chatBubbleOther
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
                value={draftMessage}
                onChangeText={setDraftMessage}
                placeholder="Digite uma mensagem..."
                placeholderTextColor={theme.colors.textDim}
                multiline
              />
              <AppButton title="Enviar" onPress={sendMessage} />
            </View>
            <Text style={styles.muted}>* Chat ainda e local (mock).</Text>
          </Card>
        ) : (
          <Card style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.headerRow}>
                <Feather name="file-text" size={16} color={theme.colors.accent} />
                <Text style={styles.cardTitle}>Formularios enviados</Text>
              </View>
              <AppButton title="Atualizar" onPress={loadRequests} variant="outline" />
            </View>

            {loadingRequests ? (
              <Text style={styles.muted}>Carregando...</Text>
            ) : sortedRequests.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>Nenhum formulario enviado ainda.</Text>
              </View>
            ) : (
              sortedRequests.map((request) => {
                const isPending = request.status === 'PENDING';
                return (
                  <Pressable key={request.id} style={styles.formItem} onPress={() => openForm(request)}>
                    <View style={styles.formInfo}>
                      <Text style={styles.formTitle}>{request.form?.title || 'Formulario'}</Text>
                      <Text style={styles.muted}>{request.form?.description || 'Sem descricao.'}</Text>
                      <Text style={styles.muted}>Personal: {request.form?.personal?.name || 'Seu personal'}</Text>
                    </View>
                    <View style={styles.formStatus}>
                      <Text style={[styles.badge, isPending && styles.badgeActive]}>
                        {isPending ? 'Pendente' : 'Respondido'}
                      </Text>
                      <Text style={styles.muted}>{formatTimeAgo(request.createdAt)}</Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </Card>
        )}
      </ScrollView>

      <Modal visible={formModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedRequest?.form?.title || 'Formulario'}</Text>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.muted}>{selectedRequest?.form?.description || 'Responda as perguntas abaixo.'}</Text>
              {selectedRequest?.form.fields.map((field) => (
                <View key={field.id} style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                  {field.type === 'TEXT' && (
                    <TextInput
                      style={styles.input}
                      value={(answers[field.id] as string) ?? ''}
                      onChangeText={(value) => updateAnswer(field.id, value)}
                      placeholderTextColor={theme.colors.textDim}
                      multiline
                    />
                  )}
                  {field.type === 'NUMBER' && (
                    <TextInput
                      style={styles.input}
                      value={String(answers[field.id] ?? '')}
                      onChangeText={(value) => updateAnswer(field.id, value)}
                      placeholderTextColor={theme.colors.textDim}
                      keyboardType="numeric"
                    />
                  )}
                  {field.type === 'MULTIPLE_CHOICE' && (
                    <TextInput
                      style={styles.input}
                      value={(answers[field.id] as string) ?? ''}
                      onChangeText={(value) => updateAnswer(field.id, value)}
                      placeholderTextColor={theme.colors.textDim}
                      placeholder="Digite a opcao"
                    />
                  )}
                  {field.type === 'BOOLEAN' && (
                    <View style={styles.switchRow}>
                      <Switch
                        value={Boolean(answers[field.id])}
                        onValueChange={(value) => updateAnswer(field.id, value)}
                      />
                      <Text style={styles.muted}>{Boolean(answers[field.id]) ? 'Sim' : 'Nao'}</Text>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <AppButton title="Cancelar" onPress={closeForm} variant="ghost" />
              <AppButton title="Enviar formulario" onPress={submitResponse} loading={sendingResponse} />
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
    fontFamily: theme.fonts.regular,
    color: theme.colors.textDim,
    marginTop: 4
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
    backgroundColor: theme.colors.accent
  },
  tabLabel: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.textDim
  },
  tabLabelActive: {
    color: '#0a0a0a'
  },
  card: {
    marginBottom: theme.spacing.lg
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: theme.spacing.md
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cardTitle: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text
  },
  muted: {
    color: theme.colors.textDim,
    fontSize: 12
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
    marginBottom: theme.spacing.sm
  },
  chatBubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.accentAlt,
    maxWidth: '80%'
  },
  chatBubbleOther: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surfaceAlt,
    maxWidth: '80%'
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
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  emptyBox: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    alignItems: 'center'
  },
  emptyText: {
    color: theme.colors.textDim
  },
  formItem: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  formInfo: {
    flex: 1,
    marginRight: 12
  },
  formTitle: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text
  },
  formStatus: {
    alignItems: 'flex-end'
  },
  badge: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    color: theme.colors.textDim,
    fontSize: 11
  },
  badgeActive: {
    backgroundColor: theme.colors.accentAlt,
    color: '#0a0a0a'
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
  modalBody: {
    marginTop: theme.spacing.sm
  },
  modalTitle: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text,
    fontSize: 18
  },
  fieldBlock: {
    marginTop: theme.spacing.md
  },
  fieldLabel: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text,
    marginBottom: 6
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    color: theme.colors.text,
    backgroundColor: theme.colors.bgAlt
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.md
  }
});
