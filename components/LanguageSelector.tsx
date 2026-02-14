import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { languages } from '@/constants/translations';
import { useLanguage } from '@/context/LanguageContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { useState } from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function LanguageSelector() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { language, setLanguage } = useLanguage();
  const [showModal, setShowModal] = useState(false);

  const currentLanguage = languages.find(lang => lang.code === language);

  const handleLanguageSelect = async (langCode: string) => {
    await setLanguage(langCode as any);
    setShowModal(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.cardBackground }]}
        onPress={() => setShowModal(true)}
      >
        <IconSymbol name="globe" size={20} color={colors.text} />
        <Text style={[styles.buttonText, { color: colors.text }]}>
          {currentLanguage?.code.toUpperCase()}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          <View
            style={[styles.modalContent, { backgroundColor: colors.background }]}
            onStartShouldSetResponder={() => true}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Select Language
            </Text>

            <ScrollView
              style={styles.scrollView}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={styles.scrollContent}
            >
              {languages.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageOption,
                    language === lang.code && {
                      backgroundColor: colors.primary + '20',
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => handleLanguageSelect(lang.code)}
                >
                  <View>
                    <Text style={[styles.languageName, { color: colors.text }]}>
                      {lang.nativeName}
                    </Text>
                    <Text style={[styles.languageSubtext, { color: colors.icon }]}>
                      {lang.name}
                    </Text>
                  </View>
                  {language === lang.code && (
                    <IconSymbol name="checkmark.circle.fill" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: colors.cardBackground }]}
              onPress={() => setShowModal(false)}
            >
              <Text style={[styles.closeButtonText, { color: colors.text }]}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  scrollView: {
    maxHeight: 400,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  languageName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  languageSubtext: {
    fontSize: 14,
  },
  closeButton: {
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
