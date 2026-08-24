import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { AppButton } from '../components/AppButton';
import { theme } from '../theme';

export const LoginScreen = () => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'PERSONAL' | 'ATHLETE'>('PERSONAL');

  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(translate, { toValue: 0, duration: 500, useNativeDriver: true })
    ]).start();
  }, [opacity, translate]);

  useEffect(() => {
    if (mode === 'PERSONAL') {
      setEmail('marioP@email.com');
      setPassword('123456');
    } else {
      setEmail('');
      setPassword('');
    }
  }, [mode]);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      setError('Informe email e senha.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await signIn(email.trim(), password, mode);
    } catch (err: any) {
      setError(err?.message || 'Falha ao entrar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={{
          uri: 'https://images.unsplash.com/photo-1517960413843-0aee8e2b3285?auto=format&fit=crop&w=1200&q=80'
        }}
        style={styles.hero}
        resizeMode="cover"
      >
        <View style={styles.heroOverlay} />
        <View style={styles.heroContent}>
          <Text style={styles.heroTitle}>HUBGYM</Text>
          <Text style={styles.heroSubtitle}>Prepare-se para a intensidade.</Text>
        </View>
      </ImageBackground>

      <LinearGradient colors={[theme.colors.accentAlt, theme.colors.accentAltStrong, theme.colors.accentAlt]} style={styles.formWrap}>
        <Animated.View style={[styles.card, { opacity, transform: [{ translateY: translate }] }]}>
          <Text style={styles.title}>Bem-vindo</Text>
          <Text style={styles.subtitle}>Entre para continuar seu treino.</Text>

          <View style={styles.segmented}>
            {(['PERSONAL', 'ATHLETE'] as const).map((item) => {
              const active = mode === item;
              return (
                <Pressable
                  key={item}
                  onPress={() => setMode(item)}
                  style={[styles.segmentedButton, active && styles.segmentedButtonActive]}
                >
                  <Text style={[styles.segmentedLabel, active && styles.segmentedLabelActive]}>
                    {item === 'PERSONAL' ? 'Personal Trainer' : 'Aluno/Atleta'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Email {mode === 'ATHLETE' ? 'do aluno' : 'ou Telefone'}
            </Text>
            <View style={styles.inputRow}>
              <Feather name="mail" size={18} color={theme.colors.textDim} />
              <TextInput
                style={styles.input}
                placeholder="seu@email.com"
                placeholderTextColor={theme.colors.textDim}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Senha</Text>
            <View style={styles.inputRow}>
              <Feather name="lock" size={18} color={theme.colors.textDim} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={theme.colors.textDim}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.forgot}>Esqueci minha senha</Text>

          <AppButton title="ENTRAR" onPress={handleSubmit} loading={loading} tone="yellow" />

          <View style={styles.divider} />
          <Text style={styles.helper}>
            Nao tem conta? <Text style={styles.helperStrong}>Registre-se agora</Text>
          </Text>
        </Animated.View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg
  },
  hero: {
    flex: 0.46,
    justifyContent: 'flex-end'
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)'
  },
  heroContent: {
    padding: theme.spacing.lg
  },
  heroTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 26,
    color: theme.colors.text
  },
  heroSubtitle: {
    fontFamily: theme.fonts.semibold,
    fontSize: 14,
    color: theme.colors.accentAlt,
    marginTop: theme.spacing.xs
  },
  formWrap: {
    flex: 0.54,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6
  },
  title: {
    fontFamily: theme.fonts.semibold,
    fontSize: 22,
    color: theme.colors.text
  },
  subtitle: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: theme.colors.textDim,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.xl,
    padding: 4,
    marginBottom: theme.spacing.md
  },
  segmentedButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: theme.radius.xl,
    alignItems: 'center',
    justifyContent: 'center'
  },
  segmentedButtonActive: {
    backgroundColor: theme.colors.accentAlt
  },
  segmentedLabel: {
    fontFamily: theme.fonts.semibold,
    fontSize: 12,
    color: theme.colors.textDim
  },
  segmentedLabelActive: {
    color: '#0a0a0a'
  },
  fieldGroup: {
    marginBottom: theme.spacing.md
  },
  label: {
    fontFamily: theme.fonts.semibold,
    fontSize: 13,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    backgroundColor: theme.colors.bgAlt,
    gap: 8
  },
  input: {
    flex: 1,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text
  },
  error: {
    color: theme.colors.danger,
    fontFamily: theme.fonts.regular,
    marginBottom: theme.spacing.md
  },
  forgot: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: theme.colors.textDim,
    marginBottom: theme.spacing.md
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md
  },
  helper: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: theme.colors.textDim,
    textAlign: 'center'
  },
  helperStrong: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text
  }
});
