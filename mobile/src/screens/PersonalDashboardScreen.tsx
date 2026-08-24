import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../api/client';
import { AthleteListItem, FormResponse, PersonalPaymentSummary } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { AppButton } from '../components/AppButton';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import { theme } from '../theme';

const formatCurrencyBRL = (value: number) => {
  const rounded = Math.round((value || 0) * 100) / 100;
  const [integer, decimal = '00'] = rounded.toFixed(2).split('.');
  const formatted = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${formatted},${decimal}`;
};

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

const emptySummary: PersonalPaymentSummary = {
  paidCount: 0,
  pendingCount: 0,
  overdueCount: 0,
  paidAmount: 0,
  pendingAmount: 0,
  overdueAmount: 0
};

export const PersonalDashboardScreen = () => {
  const navigation = useNavigation();
  const { token } = useAuth();
  const [athletes, setAthletes] = useState<AthleteListItem[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<PersonalPaymentSummary>(emptySummary);
  const [recentResponses, setRecentResponses] = useState<FormResponse[]>([]);
  const [loading, setLoading] = useState(false);

  const loadDashboard = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [athletesData, paymentsData, responsesData] = await Promise.all([
        api.getPersonalAthletes(token),
        api.getPersonalPaymentsSummary(token),
        api.getPersonalFormResponses(token, 6)
      ]);
      setAthletes(athletesData || []);
      setPaymentSummary({
        paidCount: paymentsData?.paidCount ?? 0,
        pendingCount: paymentsData?.pendingCount ?? 0,
        overdueCount: paymentsData?.overdueCount ?? 0,
        paidAmount: paymentsData?.paidAmount ?? 0,
        pendingAmount: paymentsData?.pendingAmount ?? 0,
        overdueAmount: paymentsData?.overdueAmount ?? 0
      });
      setRecentResponses(responsesData || []);
    } catch {
      Alert.alert('Erro', 'Nao foi possivel carregar o painel.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [token]);

  const lastAthlete = athletes[0];

  const stats = useMemo(
    () => [
      {
        label: 'Total de alunos',
        value: String(athletes.length),
        helper: lastAthlete ? `Ultimo: ${lastAthlete.name}` : 'Sem alunos'
      },
      { label: 'Treinos do dia', value: '0', helper: 'Concluidos hoje' },
      { label: 'Chats', value: '0', helper: 'Pendentes' },
      {
        label: 'Pagamentos atrasados',
        value: String(paymentSummary.overdueCount),
        helper: `${paymentSummary.paidCount} pagos | ${paymentSummary.pendingCount} pendentes`
      }
    ],
    [athletes.length, lastAthlete, paymentSummary.overdueCount, paymentSummary.paidCount, paymentSummary.pendingCount]
  );

  return (
    <Screen contentStyle={styles.content}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Visao geral</Text>
            <Text style={styles.subtitle}>Bem-vindo de volta! Aqui esta o resumo do dia.</Text>
          </View>
          <AppButton
            title="Novo aluno"
            onPress={() => navigation.navigate('Clients' as never)}
            tone="yellow"
            style={styles.headerButton}
          />
        </View>

        <View style={styles.statsGrid}>
          {stats.map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <Text style={styles.statLabel}>{stat.label}</Text>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statHelper}>{stat.helper}</Text>
            </View>
          ))}
        </View>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Treinos do dia</Text>
          <View style={styles.emptyBox}>
            <Text style={styles.muted}>
              {loading ? 'Carregando treinos...' : 'Ainda nao ha registro de treinos concluidos.'}
            </Text>
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Pagamentos</Text>
          <View style={styles.rowItem}>
            <View>
              <Text style={styles.rowTitle}>Pagos</Text>
              <Text style={styles.muted}>Total recebido</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>{paymentSummary.paidCount}</Text>
              <Text style={styles.muted}>{formatCurrencyBRL(paymentSummary.paidAmount)}</Text>
            </View>
          </View>
          <View style={styles.rowItem}>
            <View>
              <Text style={styles.rowTitle}>Pendentes</Text>
              <Text style={styles.muted}>Aguardando pagamento</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>{paymentSummary.pendingCount}</Text>
              <Text style={styles.muted}>{formatCurrencyBRL(paymentSummary.pendingAmount)}</Text>
            </View>
          </View>
          <View style={styles.rowItem}>
            <View>
              <Text style={styles.rowTitle}>Atrasados</Text>
              <Text style={styles.muted}>Requer atencao</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={[styles.rowValue, styles.warn]}>{paymentSummary.overdueCount}</Text>
              <Text style={styles.muted}>{formatCurrencyBRL(paymentSummary.overdueAmount)}</Text>
            </View>
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Formularios</Text>
          {recentResponses.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.muted}>Nenhum formulario respondido ainda.</Text>
            </View>
          ) : (
            recentResponses.map((response) => (
              <View key={response.id} style={styles.responseItem}>
                <View style={styles.responseInfo}>
                  <Text style={styles.responseTitle}>
                    {response.athlete?.name} respondeu: {response.form?.title}
                  </Text>
                  <Text style={styles.muted}>{formatTimeAgo(response.createdAt)}</Text>
                </View>
              </View>
            ))
          )}
        </Card>

        <Card style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.cardTitle}>Gestao de alunos</Text>
              <Text style={styles.muted}>Ultimo aluno cadastrado</Text>
            </View>
          <AppButton
            title="Ver todos"
            onPress={() => navigation.navigate('Clients' as never)}
            variant="outline"
            tone="yellow"
          />
          </View>

          {lastAthlete ? (
            <View style={styles.rowItem}>
              <View>
                <Text style={styles.rowTitle}>{lastAthlete.name}</Text>
                <Text style={styles.muted}>{lastAthlete.user?.email || 'Sem email'}</Text>
              </View>
              <Text style={styles.badge}>{formatTimeAgo(lastAthlete.createdAt)}</Text>
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.muted}>Nenhum aluno cadastrado ainda.</Text>
            </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg
  },
  headerButton: {
    minWidth: 140
  },
  title: {
    fontFamily: theme.fonts.semibold,
    fontSize: 22,
    color: theme.colors.text
  },
  subtitle: {
    color: theme.colors.textDim,
    marginTop: 4
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg
  },
  statCard: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md
  },
  statLabel: {
    color: theme.colors.textDim,
    fontSize: 12
  },
  statValue: {
    fontFamily: theme.fonts.bold,
    color: theme.colors.text,
    fontSize: 20,
    marginTop: 6
  },
  statHelper: {
    color: theme.colors.textDim,
    marginTop: 6,
    fontSize: 12
  },
  card: {
    marginBottom: theme.spacing.lg
  },
  cardTitle: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm
  },
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border
  },
  rowTitle: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text
  },
  rowRight: {
    alignItems: 'flex-end'
  },
  rowValue: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text
  },
  warn: {
    color: theme.colors.warning
  },
  emptyBox: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    alignItems: 'center'
  },
  muted: {
    color: theme.colors.textDim,
    fontSize: 12
  },
  responseItem: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.bgAlt
  },
  responseInfo: {
    gap: 4
  },
  responseTitle: {
    color: theme.colors.text,
    fontFamily: theme.fonts.semibold,
    fontSize: 13
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm
  },
  badge: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    color: theme.colors.textDim,
    fontSize: 11
  }
});
