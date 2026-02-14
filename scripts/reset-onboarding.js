// Run this in your app to reset onboarding
// Add this code temporarily to any component and run it:

import AsyncStorage from '@react-native-async-storage/async-storage';

const resetOnboarding = async () => {
  try {
    await AsyncStorage.removeItem('hasSeenOnboarding');
    console.log('Onboarding reset! Reload the app to see it again.');
  } catch (error) {
    console.error('Error resetting onboarding:', error);
  }
};

resetOnboarding();
