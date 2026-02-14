import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef, useState } from 'react';
import {
    Dimensions,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewToken
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface OnboardingItem {
  id: string;
  title: string;
  titleHindi?: string;
  description: string;
  icon: string;
  backgroundColor: string;
}

const onboardingData: OnboardingItem[] = [
  {
    id: '1',
    title: 'Welcome',
    titleHindi: 'नमस्ते',
    description: 'Report civic issues and make a difference in your community',
    icon: '👋',
    backgroundColor: 'linear-gradient(180deg, #FFA726 0%, #66BB6A 100%)',
  },
  {
    id: '2',
    title: 'Upload Problem',
    description: 'Submit your issue easily through the app',
    icon: '⬆️',
    backgroundColor: '#1B5E40',
  },
  {
    id: '3',
    title: 'Verify Your Problem',
    description: 'Our team will quickly verify the details',
    icon: '✓',
    backgroundColor: '#1B5E40',
  },
  {
    id: '4',
    title: 'Working On Problem',
    description: 'Track the progress as we work on a solution',
    icon: '⏳',
    backgroundColor: '#1B5E40',
  },
  {
    id: '5',
    title: 'Problem Solved',
    description: 'Get notified once your issue has been resolved',
    icon: '✓',
    backgroundColor: '#1B5E40',
  },
];

interface OnboardingScreenProps {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const handleNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    }
  };

  const handleStart = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      onComplete();
    } catch (error) {
      console.error('Error saving onboarding status:', error);
      onComplete();
    }
  };

  const renderItem = ({ item, index }: { item: OnboardingItem; index: number }) => {
    const isFirstScreen = index === 0;
    const isLastScreen = index === onboardingData.length - 1;

    if (isFirstScreen) {
      return (
        <LinearGradient
          colors={['#FF9933', '#FFFFFF', '#138808']}
          style={styles.slide}
          locations={[0, 0.5, 1]}
        >
          <View style={styles.content}>
            {/* Icon */}
            <View style={styles.iconContainer}>
              <Text style={styles.welcomeIcon}>{item.icon}</Text>
            </View>

            {/* Title */}
            <Text style={styles.welcomeTitle}>{item.title}</Text>
            {item.titleHindi && (
              <Text style={styles.titleHindi}>{item.titleHindi}</Text>
            )}

            {/* Description */}
            <Text style={styles.welcomeDescription}>{item.description}</Text>
          </View>

          {/* Button */}
          <TouchableOpacity style={styles.startButton} onPress={handleNext}>
            <Text style={styles.startButtonText}>Start</Text>
          </TouchableOpacity>
        </LinearGradient>
      );
    }

    return (
      <View style={[styles.slide, { backgroundColor: item.backgroundColor }]}>
        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            {index === 0 ? (
              <Text style={styles.welcomeIcon}>{item.icon}</Text>
            ) : index === 1 ? (
              <View style={styles.uploadIcon}>
                <Text style={styles.iconText}>↑</Text>
              </View>
            ) : index === 2 ? (
              <View style={styles.verifyIcon}>
                <Text style={styles.iconText}>✓</Text>
              </View>
            ) : index === 3 ? (
              <View style={styles.workingIcon}>
                <Text style={styles.iconText}>⏳</Text>
              </View>
            ) : (
              <View style={styles.solvedIcon}>
                <Text style={styles.iconText}>✓</Text>
              </View>
            )}
          </View>

          {/* Title */}
          <Text style={styles.title}>{item.title}</Text>
          {item.titleHindi && (
            <Text style={styles.titleHindi}>{item.titleHindi}</Text>
          )}

          {/* Description */}
          <Text style={styles.description}>{item.description}</Text>
        </View>

        {/* Pagination Dots */}
        {!isFirstScreen && (
          <View style={styles.pagination}>
            {onboardingData.slice(1).map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.dot,
                  idx === index - 1 && styles.activeDot,
                ]}
              />
            ))}
          </View>
        )}

        {/* Button */}
        {isFirstScreen && (
          <TouchableOpacity style={styles.startButton} onPress={handleNext}>
            <Text style={styles.startButtonText}>Start</Text>
          </TouchableOpacity>
        )}

        {isLastScreen && (
          <TouchableOpacity style={styles.startButton} onPress={handleStart}>
            <Text style={styles.startButtonText}>Get Started</Text>
          </TouchableOpacity>
        )}

        {!isFirstScreen && !isLastScreen && (
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        )}

        {/* Skip Button */}
        {!isFirstScreen && !isLastScreen && (
          <TouchableOpacity style={styles.skipButton} onPress={handleStart}>
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={onboardingData}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        scrollEnabled={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  slide: {
    width,
    height,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  iconContainer: {
    marginBottom: 60,
  },
  welcomeIcon: {
    fontSize: 80,
  },
  uploadIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderTopWidth: 8,
  },
  verifyIcon: {
    width: 120,
    height: 120,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '45deg' }],
  },
  workingIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  solvedIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(166, 255, 203, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 60,
    color: '#A6FFCB',
    transform: [{ rotate: '-45deg' }],
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
  },
  titleHindi: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#1A237E',
    textAlign: 'center',
    marginBottom: 30,
  },
  description: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
    opacity: 0.9,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 5,
  },
  activeDot: {
    backgroundColor: '#A6FFCB',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  startButton: {
    backgroundColor: '#1A237E',
    paddingHorizontal: 60,
    paddingVertical: 16,
    borderRadius: 28,
    marginBottom: 60,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 50,
    paddingVertical: 14,
    borderRadius: 25,
    marginBottom: 40,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    marginBottom: 40,
    paddingVertical: 10,
  },
  skipButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
  },
  welcomeTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1A237E',
    textAlign: 'center',
    marginBottom: 10,
  },
  welcomeDescription: {
    fontSize: 16,
    color: '#333333',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
    marginTop: 20,
  },
});
