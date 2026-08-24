export type ExerciseGroup = 'Peito' | 'Costas' | 'Pernas' | 'Ombros' | 'Bracos' | 'Core' | 'Geral';

export type ExerciseBankItem = {
  name: string;
  detail: string;
  group: ExerciseGroup;
};

export const exerciseGroups: ExerciseGroup[] = ['Peito', 'Costas', 'Pernas', 'Ombros', 'Bracos', 'Core', 'Geral'];

export const exerciseBank: ExerciseBankItem[] = [
  { name: 'Crucifixo Maquina', detail: 'Peitoral - Isolado', group: 'Peito' },
  { name: 'Supino Reto', detail: 'Peitoral - Composto', group: 'Peito' },
  { name: 'Remada Curvada', detail: 'Costas - Composto', group: 'Costas' },
  { name: 'Puxada na Barra', detail: 'Costas - Composto', group: 'Costas' },
  { name: 'Elevacao Lateral', detail: 'Ombros - Isolado', group: 'Ombros' },
  { name: 'Desenvolvimento Militar', detail: 'Ombros - Composto', group: 'Ombros' },
  { name: 'Triceps Corda', detail: 'Bracos - Cabo', group: 'Bracos' },
  { name: 'Rosca Direta', detail: 'Bracos - Livre', group: 'Bracos' },
  { name: 'Agachamento Livre', detail: 'Pernas - Composto', group: 'Pernas' },
  { name: 'Leg Press', detail: 'Pernas - Composto', group: 'Pernas' },
  { name: 'Prancha', detail: 'Core - Isometrico', group: 'Core' }
];
