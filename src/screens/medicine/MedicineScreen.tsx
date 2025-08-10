import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const MedicineScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Medicine Tracker</Text>
      <Text style={styles.subtitle}>Coming Soon!</Text>
      <Text style={styles.description}>
        This screen will contain medicine management features including:
        {'\n'}• Add medicines with dosage information
        {'\n'}• Track remaining stock
        {'\n'}• Set medication reminders
        {'\n'}• Monitor expiry dates
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2196F3',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default MedicineScreen;
