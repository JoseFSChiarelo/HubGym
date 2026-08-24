import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { api, ApiError } from '../api/client';
import { Notice, Training } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { AppButton } from '../components/AppButton';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import { theme } from '../theme';

const weekDayKeys = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const;

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

const quickActions = [
  { title: 'Treino', subtitle: 'Plano atual', icon: 'target', route: 'Trainings' },
  { title: 'Evolucao', subtitle: 'Seu progresso', icon: 'trending-up', route: 'Evolution' },
  { title: 'Chat', subtitle: 'Fale com o personal', icon: 'message-square', route: 'Chat' }
] as const;

export const AthleteHomeScreen = () => {
  const { user, token, signOut } = useAuth();
  const navigation = useNavigation<any>();
  const displayName = useMemo(
    () => user?.name?.trim() || user?.email?.split('@')[0] || 'Aluno',
    [user?.name, user?.email]
  );
  const [todayTraining, setTodayTraining] = useState<Training | null>(null);
  const [loadingTraining, setLoadingTraining] = useState(false);
  const [trainingBlocked, setTrainingBlocked] = useState(false);
  const [trainingBlockedMessage, setTrainingBlockedMessage] = useState('');
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loadingNotices, setLoadingNotices] = useState(false);

  useEffect(() => {
    const loadTraining = async () => {
      setLoadingTraining(true);
      setTrainingBlocked(false);
      setTrainingBlockedMessage('');
      try {
        const day = weekDayKeys[new Date().getDay()];
        const data = await api.getAthleteTodayTraining(token || '', day as string);
        setTodayTraining(data?.training || null);
      } catch (err: any) {
        const apiError = err as ApiError;
        if (apiError.code === 'TRAINING_BLOCKED') {
          setTrainingBlocked(true);
          setTrainingBlockedMessage(apiError.message || 'Treino do personal bloqueado. Pagamento pendente.');
          setTodayTraining(null);
          return;
        }
      } finally {
        setLoadingTraining(false);
      }
    };

    if (token) {
      loadTraining();
    }
  }, [token]);

  useEffect(() => {
    const loadNotices = async () => {
      if (!token) return;
      setLoadingNotices(true);
      try {
        const data = await api.getAthleteNotices(token, 5);
        setNotices(data || []);
      } catch {
        setNotices([]);
      } finally {
        setLoadingNotices(false);
      }
    };

    loadNotices();
  }, [token]);

  const exercisesCount = Array.isArray(todayTraining?.exercises) ? todayTraining?.exercises?.length ?? 0 : 0;
  const recentNotices = [...notices]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  return (
    <Screen contentStyle={styles.content}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <View style={styles.brandDot} />
            <Text style={styles.brandText}>HubGym</Text>
          </View>
          <View style={styles.topActions}>
            <Pressable style={styles.iconButton}>
              <Feather name="bell" size={18} color={theme.colors.text} />
            </Pressable>
            <View style={styles.avatar}>
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{displayName[0]?.toUpperCase()}</Text>
              )}
            </View>
            <Pressable style={styles.logout} onPress={signOut}>
              <Text style={styles.logoutText}>Sair</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Ola, <Text style={styles.heroAccent}>{displayName}</Text></Text>
          <Text style={styles.heroSubtitle}>Pronto para o treino de hoje?</Text>
        </View>

        <View style={styles.quickRow}>
          {quickActions.map((action) => (
            <Pressable
              key={action.title}
              onPress={() => navigation.navigate(action.route)}
              style={styles.quickCard}
            >
              <View style={styles.quickIcon}>
                <Feather name={action.icon} size={18} color={theme.colors.accent} />
              </View>
              <Text style={styles.quickTitle}>{action.title}</Text>
              <Text style={styles.quickSubtitle}>{action.subtitle}</Text>
            </Pressable>
          ))}
        </View>

        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Treino do dia</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {trainingBlocked ? 'Bloqueado' : todayTraining ? 'Programado' : 'Sem treino'}
              </Text>
            </View>
          </View>

          <Text style={styles.trainingTitle}>
            {trainingBlocked ? 'Treino bloqueado' : todayTraining?.title || 'Nenhum treino programado'}
          </Text>
          <Text style={styles.trainingNotes}>
            {loadingTraining
              ? 'Carregando treino do dia...'
              : trainingBlocked
                ? trainingBlockedMessage || 'Treino do personal bloqueado. Pagamento pendente.'
                : todayTraining?.notes || 'Aguarde o personal programar o treino para hoje.'}
          </Text>

          <View style={styles.trainingMeta}>
            <View style={styles.metaItem}>
              <Feather name="target" size={14} color={theme.colors.textDim} />
              <Text style={styles.metaText}>{exercisesCount} Exercicios</Text>
            </View>
            <View style={styles.metaItem}>
              <Feather name="trending-up" size={14} color={theme.colors.textDim} />
              <Text style={styles.metaText}>{trainingBlocked ? 'Bloqueado' : todayTraining ? 'Preparado' : 'Sem treino'}</Text>
            </View>
          </View>

          <AppButton
            title="Comecar"
            onPress={() =>
              todayTraining &&
              !trainingBlocked &&
              navigation.navigate('Trainings', {
                screen: 'TrainingSession',
                params: { id: todayTraining.id, autoStart: true }
              })
            }
            disabled={!todayTraining || trainingBlocked}
          />
        </Card>

        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Avisos recentes</Text>
            <Pressable>
              <Text style={styles.linkText}>Ver todos</Text>
            </Pressable>
          </View>

          {loadingNotices ? (
            <Text style={styles.muted}>Carregando avisos...</Text>
          ) : recentNotices.length === 0 ? (
            <View style={styles.noticeEmpty}>
              <Text style={styles.noticeTitle}>Nenhum aviso recente</Text>
              <Text style={styles.muted}>Os avisos do seu personal aparecem aqui.</Text>
            </View>
          ) : (
            recentNotices.map((notice, index) => (
              <View key={notice.id} style={[styles.noticeItem, index === 0 && styles.noticeItemHighlight]}>
                <Text style={[styles.noticeTitle, index === 0 && styles.noticeTitleHighlight]}>
                  {notice.title || 'Aviso do personal'}
                </Text>
                <Text style={styles.muted}>{notice.message}</Text>
                <Text style={styles.noticeTime}>{formatTimeAgo(notice.createdAt)}</Text>
              </View>
            ))
          )}
        </Card>
      </ScrollView>
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  brandDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.accent
  },
  brandText: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text,
    fontSize: 18
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  avatarImage: {
    width: '100%',
    height: '100%'
  },
  avatarText: {
    color: theme.colors.text,
    fontFamily: theme.fonts.semibold
  },
  logout: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.accent
  },
  logoutText: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.accent
  },
  hero: {
    marginTop: theme.spacing.lg
  },
  heroTitle: {
    fontFamily: theme.fonts.semibold,
    fontSize: 26,
    color: theme.colors.text
  },
  heroAccent: {
    color: theme.colors.accent
  },
  heroSubtitle: {
    fontFamily: theme.fonts.regular,
    color: theme.colors.textDim,
    marginTop: theme.spacing.xs
  },
  quickRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: theme.spacing.lg
  },
  quickCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.bgAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm
  },
  quickTitle: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text
  },
  quickSubtitle: {
    fontFamily: theme.fonts.regular,
    color: theme.colors.textDim,
    fontSize: 12,
    marginTop: 4
  },
  card: {
    marginTop: theme.spacing.lg
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm
  },
  cardTitle: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text,
    fontSize: 16
  },
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  badgeText: {
    fontFamily: theme.fonts.semibold,
    fontSize: 11,
    color: theme.colors.textDim
  },
  trainingTitle: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text,
    fontSize: 18
  },
  trainingNotes: {
    fontFamily: theme.fonts.regular,
    color: theme.colors.textDim,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md
  },
  trainingMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: theme.spacing.md
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  metaText: {
    fontFamily: theme.fonts.regular,
    color: theme.colors.textDim,
    fontSize: 12
  },
  linkText: {
    color: theme.colors.accent,
    fontFamily: theme.fonts.semibold
  },
  muted: {
    fontFamily: theme.fonts.regular,
    color: theme.colors.textDim
  },
  noticeEmpty: {
    backgroundColor: theme.colors.bgAlt,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  noticeItem: {
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm
  },
  noticeItemHighlight: {
    backgroundColor: theme.colors.bgAlt
  },
  noticeTitle: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text
  },
  noticeTitleHighlight: {
    color: theme.colors.accent
  },
  noticeTime: {
    fontFamily: theme.fonts.regular,
    color: theme.colors.textDim,
    fontSize: 11,
    marginTop: 6
  }
});
