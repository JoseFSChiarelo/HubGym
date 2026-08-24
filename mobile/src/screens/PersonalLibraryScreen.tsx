import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppButton } from '../components/AppButton';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import { theme } from '../theme';

type LibraryItem = {
  name: string;
  video?: string;
  description?: string;
};

export const PersonalLibraryScreen = () => {
  const [items, setItems] = useState<LibraryItem[]>([{ name: '', video: '', description: '' }]);

  const handleChange = (idx: number, field: keyof LibraryItem, value: string) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  };

  const addItem = () => setItems((prev) => [...prev, { name: '', video: '', description: '' }]);

  return (
    <Screen contentStyle={styles.content}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Card style={styles.card}>
          <Text style={styles.title}>Biblioteca de exercicios</Text>
          <Text style={styles.subtitle}>Cadastre videos/descricoes para reutilizar nos treinos.</Text>

          {items.map((item, idx) => (
            <View key={idx} style={styles.itemCard}>
              <TextInput
                style={styles.input}
                placeholder="Nome"
                placeholderTextColor={theme.colors.textDim}
                value={item.name}
                onChangeText={(value) => handleChange(idx, 'name', value)}
              />
              <TextInput
                style={styles.input}
                placeholder="Video / Link"
                placeholderTextColor={theme.colors.textDim}
                value={item.video || ''}
                onChangeText={(value) => handleChange(idx, 'video', value)}
              />
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Descricao"
                placeholderTextColor={theme.colors.textDim}
                value={item.description || ''}
                onChangeText={(value) => handleChange(idx, 'description', value)}
                multiline
              />
            </View>
          ))}

          <View style={styles.actions}>
            <AppButton title="Adicionar exercicio" onPress={addItem} variant="outline" tone="yellow" />
            <AppButton title="Salvar biblioteca (mock)" onPress={() => undefined} tone="yellow" />
          </View>
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
  card: {
    marginBottom: theme.spacing.lg
  },
  title: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text,
    fontSize: 20
  },
  subtitle: {
    color: theme.colors.textDim,
    marginTop: 4,
    marginBottom: theme.spacing.md
  },
  itemCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.bgAlt
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.sm
  },
  textarea: {
    minHeight: 90,
    textAlignVertical: 'top'
  },
  actions: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm
  }
});
