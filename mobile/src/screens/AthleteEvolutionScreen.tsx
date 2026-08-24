import { Feather } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import Svg, { Line, Polygon, Text as SvgText } from 'react-native-svg';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import { CompletedTraining, loadCompletedTrainings } from '../storage/athleteTrainingSession';
import { theme } from '../theme';

const muscleGroups = ['Peito', 'Costas', 'Pernas', 'Ombros', 'Bracos', 'Core', 'Geral'] as const;

const toDayKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeGroup = (value?: string) => {
  const raw = (value || '').toLowerCase();
  if (raw.includes('peit')) return 'Peito';
  if (raw.includes('cost')) return 'Costas';
  if (raw.includes('pern')) return 'Pernas';
  if (raw.includes('ombr')) return 'Ombros';
  if (raw.includes('brac') || raw.includes('bra')) return 'Bracos';
  if (raw.includes('core')) return 'Core';
  return 'Geral';
};

const buildRadarPoints = (center: number, radius: number, values: number[]) => {
  const count = values.length;
  if (count === 0) return '';
  const points = values.map((value, idx) => {
    const angle = (Math.PI * 2 * idx) / count - Math.PI / 2;
    const pointRadius = radius * value;
    const x = center + pointRadius * Math.cos(angle);
    const y = center + pointRadius * Math.sin(angle);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return points.join(' ');
};

export const AthleteEvolutionScreen = () => {
  const [completedTrainings, setCompletedTrainings] = useState<CompletedTraining[]>([]);

  useEffect(() => {
    const run = async () => {
      const data = await loadCompletedTrainings();
      setCompletedTrainings(data);
    };
    run();
  }, []);

  const muscleFocus = useMemo(() => {
    const totals = new Map<string, number>();
    let totalSets = 0;

    completedTrainings.forEach((session) => {
      session.exercises?.forEach((exercise) => {
        const muscle = normalizeGroup(exercise.muscle);
        const sets = exercise.sets || [];
        const doneSets = sets.filter((set) => set.done !== false);
        const count = doneSets.length > 0 ? doneSets.length : sets.length;
        if (count === 0) return;
        totalSets += count;
        totals.set(muscle, (totals.get(muscle) || 0) + count);
      });
    });

    return muscleGroups.map((group) => {
      const value = totals.get(group) || 0;
      const percent = totalSets > 0 ? Math.round((value / totalSets) * 100) : 0;
      return { group, value, percent };
    });
  }, [completedTrainings]);

  const rankedMuscleFocus = useMemo(() => {
    return [...muscleFocus].sort((a, b) => {
      if (b.percent !== a.percent) return b.percent - a.percent;
      return a.group.localeCompare(b.group);
    });
  }, [muscleFocus]);

  const maxLoadStats = useMemo(() => {
    const stats = new Map<string, { maxLoad: number; sets: number }>();

    completedTrainings.forEach((session) => {
      session.exercises?.forEach((exercise) => {
        const name = exercise.name || 'Exercicio';
        const sets = exercise.sets || [];
        const doneSets = sets.filter((set) => set.done !== false);
        const setsToUse = doneSets.length > 0 ? doneSets : sets;
        setsToUse.forEach((set) => {
          const loadValue = Number(String(set.load ?? '').replace(',', '.').replace(/[^\d.]/g, ''));
          const entry = stats.get(name) || { maxLoad: 0, sets: 0 };
          entry.sets += 1;
          if (Number.isFinite(loadValue) && loadValue > entry.maxLoad) {
            entry.maxLoad = loadValue;
          }
          stats.set(name, entry);
        });
      });
    });

    return Array.from(stats.entries())
      .map(([name, info]) => ({ name, maxLoad: info.maxLoad, sets: info.sets }))
      .sort((a, b) => b.maxLoad - a.maxLoad);
  }, [completedTrainings]);

  const attendanceSummary = useMemo(() => {
    const now = new Date();
    const startWeek = new Date(now);
    startWeek.setDate(now.getDate() - 6);
    const month = now.getMonth();
    const year = now.getFullYear();

    const weekDays = new Set<string>();
    const monthDays = new Set<string>();
    const yearDays = new Set<string>();

    completedTrainings.forEach((session) => {
      const date = new Date(session.completedAt);
      if (Number.isNaN(date.getTime())) return;
      const key = toDayKey(date);
      if (date >= startWeek) weekDays.add(key);
      if (date.getFullYear() === year && date.getMonth() === month) monthDays.add(key);
      if (date.getFullYear() === year) yearDays.add(key);
    });

    return {
      weekCount: weekDays.size,
      monthCount: monthDays.size,
      yearCount: yearDays.size,
      recent: completedTrainings.slice(0, 6)
    };
  }, [completedTrainings]);

  const radarData = useMemo(() => {
    const values = muscleFocus.map((item) => Math.min(1, Math.max(0, item.percent / 100)));
    const size = 220;
    const center = size / 2;
    const radius = 78;
    const rings = [0.25, 0.5, 0.75, 1].map((level) => ({
      level,
      points: buildRadarPoints(center, radius, values.map(() => level))
    }));
    const axes = muscleFocus.map((_, idx) => {
      const angle = (Math.PI * 2 * idx) / muscleFocus.length - Math.PI / 2;
      return {
        x: center + radius * Math.cos(angle),
        y: center + radius * Math.sin(angle),
        angle
      };
    });
    const polygon = buildRadarPoints(center, radius, values);
    return { size, center, radius, rings, axes, polygon };
  }, [muscleFocus]);

  const topLoad = maxLoadStats[0]?.maxLoad || 1;

  return (
    <Screen contentStyle={styles.content}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Evolucao</Text>
          <Text style={styles.subtitle}>Acompanhe seu progresso em treinos e habitos.</Text>
        </View>

        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <Feather name="trending-up" size={16} color={theme.colors.accent} />
            </View>
            <View>
              <Text style={styles.cardTitle}>Mapa de foco muscular</Text>
              <Text style={styles.muted}>Distribuicao de series por grupo muscular.</Text>
            </View>
          </View>

          <View style={styles.radarWrap}>
            <Svg width={220} height={220} viewBox={`0 0 ${radarData.size} ${radarData.size}`}>
              {radarData.rings.map((ring) => (
                <Polygon
                  key={`ring-${ring.level}`}
                  points={ring.points}
                  fill="none"
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth={1}
                />
              ))}
              {radarData.axes.map((axis, idx) => (
                <Line
                  key={`axis-${idx}`}
                  x1={radarData.center}
                  y1={radarData.center}
                  x2={axis.x}
                  y2={axis.y}
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth={1}
                />
              ))}
              <Polygon points={radarData.polygon} fill="rgba(251, 202, 21, 0.22)" stroke="#facc15" strokeWidth={2} />
              {radarData.axes.map((axis, idx) => {
                const labelRadius = radarData.radius + 14;
                const labelX = radarData.center + labelRadius * Math.cos(axis.angle);
                const labelY = radarData.center + labelRadius * Math.sin(axis.angle);
                const anchor = Math.cos(axis.angle) > 0.2 ? 'start' : Math.cos(axis.angle) < -0.2 ? 'end' : 'middle';
                return (
                  <SvgText
                    key={`label-${idx}`}
                    x={labelX}
                    y={labelY}
                    fill="rgba(255,255,255,0.7)"
                    fontSize="10"
                    textAnchor={anchor}
                    alignmentBaseline="middle"
                  >
                    {muscleFocus[idx]?.group}
                  </SvgText>
                );
              })}
            </Svg>
          </View>

          <View style={styles.groupGrid}>
            {rankedMuscleFocus.map((item) => (
              <View key={item.group} style={styles.groupCard}>
                <Text style={styles.groupTitle}>{item.group}</Text>
                <Text style={styles.groupMeta}>{item.percent}%</Text>
              </View>
            ))}
          </View>

          {completedTrainings.length === 0 && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Nenhum treino concluido ainda.</Text>
            </View>
          )}
        </Card>

        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <Feather name="activity" size={16} color={theme.colors.accent} />
            </View>
            <View>
              <Text style={styles.cardTitle}>Evolucao de cargas</Text>
              <Text style={styles.muted}>Maior carga registrada por exercicio.</Text>
            </View>
          </View>

          {maxLoadStats.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Nenhuma carga registrada ainda.</Text>
            </View>
          ) : (
            maxLoadStats.map((item) => (
              <View key={item.name} style={styles.loadItem}>
                <View style={styles.loadHeader}>
                  <Text style={styles.loadTitle}>{item.name}</Text>
                  <Text style={styles.badge}>{item.maxLoad} kg</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${(item.maxLoad / topLoad) * 100}%` }]} />
                </View>
                <Text style={styles.muted}>{item.sets} series registradas</Text>
              </View>
            ))
          )}
        </Card>

        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <Feather name="calendar" size={16} color={theme.colors.accent} />
            </View>
            <View>
              <Text style={styles.cardTitle}>Anotacoes de treino</Text>
              <Text style={styles.muted}>Dias com treino concluido.</Text>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Semana</Text>
              <Text style={styles.summaryValue}>{attendanceSummary.weekCount}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Mes</Text>
              <Text style={styles.summaryValue}>{attendanceSummary.monthCount}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Ano</Text>
              <Text style={styles.summaryValue}>{attendanceSummary.yearCount}</Text>
            </View>
          </View>

          {attendanceSummary.recent.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Nenhum treino concluido ainda.</Text>
            </View>
          ) : (
            attendanceSummary.recent.map((session) => {
              const date = new Date(session.completedAt);
              return (
                <View key={`${session.trainingId}-${session.completedAt}`} style={styles.recentItem}>
                  <Text style={styles.recentTitle}>
                    {Number.isNaN(date.getTime()) ? 'Treino concluido' : date.toLocaleDateString('pt-BR')}
                  </Text>
                  <Text style={styles.muted}>
                    {Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              );
            })
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
  radarWrap: {
    alignItems: 'center',
    marginBottom: theme.spacing.md
  },
  groupGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  groupCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    minWidth: '30%'
  },
  groupTitle: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text
  },
  groupMeta: {
    color: theme.colors.textDim
  },
  emptyBox: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    marginTop: theme.spacing.md
  },
  emptyText: {
    color: theme.colors.textDim
  },
  loadItem: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm
  },
  loadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm
  },
  loadTitle: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text
  },
  badge: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    color: theme.colors.textDim,
    fontSize: 12
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.bgAlt,
    overflow: 'hidden',
    marginBottom: 6
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.accent
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: theme.spacing.md
  },
  summaryCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md
  },
  summaryLabel: {
    color: theme.colors.textDim,
    fontSize: 12
  },
  summaryValue: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text,
    fontSize: 20
  },
  recentItem: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  recentTitle: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text
  }
});
