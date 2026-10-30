import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import PixelPet from './components/PixelPet';
import { PETS } from './components/pets';

// design tokens from plan.md — cream / mint / warm brown
const CREAM = '#FAF3E6';
const MINT = '#C8EBDD';
const BROWN = '#5B4634';

const GOAL = 8000;

export default function App() {
  const [steps, setSteps] = useState(0);
  const [petId, setPetId] = useState(PETS[0].id);
  const pet = PETS.find((p) => p.id === petId) ?? PETS[0];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dayli</Text>
      <Text style={styles.subtitle}>your tiny walking buddy</Text>

      <View style={styles.switcher}>
        {PETS.map((p) => (
          <Pressable
            key={p.id}
            style={[styles.chip, p.id === petId && styles.chipActive]}
            onPress={() => setPetId(p.id)}
          >
            <Text style={[styles.chipLabel, p.id === petId && styles.chipLabelActive]}>
              {p.emoji} {p.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <PixelPet frames={pet.frames} particles={pet.particles} progress={Math.min(steps / GOAL, 1)} size={200} />

      <View style={styles.counterCard}>
        <Text style={styles.steps}>{steps.toLocaleString()}</Text>
        <Text style={styles.goal}>
          of {GOAL.toLocaleString()} steps{' '}
          {steps >= GOAL ? '· goal reached! 🎉' : `· ${Math.round((steps / GOAL) * 100)}%`}
        </Text>
      </View>

      <View style={styles.demoRow}>
        <DemoButton label="+120" onPress={() => setSteps((s) => s + 120)} />
        <DemoButton label="+2,000" onPress={() => setSteps((s) => s + 2000)} />
        <DemoButton label="reset" onPress={() => setSteps(0)} />
      </View>
      <Text style={styles.note}>demo controls — HealthKit arrives in phase 5. poke the pet!</Text>

      <StatusBar style="dark" />
    </View>
  );
}

function DemoButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.demoButton} onPress={onPress}>
      <Text style={styles.demoButtonLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CREAM,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: BROWN,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: BROWN,
    opacity: 0.6,
    marginTop: -6,
  },
  switcher: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: MINT,
    backgroundColor: 'transparent',
  },
  chipActive: {
    backgroundColor: MINT,
  },
  chipLabel: {
    color: BROWN,
    fontWeight: '700',
    fontSize: 13,
    opacity: 0.7,
  },
  chipLabelActive: {
    opacity: 1,
  },
  counterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: MINT,
  },
  steps: {
    fontSize: 32,
    fontWeight: '800',
    color: BROWN,
    fontVariant: ['tabular-nums'],
  },
  goal: {
    fontSize: 13,
    color: BROWN,
    opacity: 0.6,
  },
  demoRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  demoButton: {
    backgroundColor: MINT,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  demoButtonLabel: {
    color: BROWN,
    fontWeight: '700',
    fontSize: 14,
  },
  note: {
    fontSize: 12,
    color: BROWN,
    opacity: 0.45,
    textAlign: 'center',
  },
});
