import React, { useState } from 'react';
import {
  View, Text, StyleSheet,
  TouchableOpacity, Image,
  PermissionsAndroid, Platform,
  StatusBar, SafeAreaView
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

function HomeScreen({ navigation }) {
  const [selectedImage, setSelectedImage] = useState(null);

  const requestPermission = async () => {
    if (Platform.OS !== 'android') return true;

    if (Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }

    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  };

  const pickImage = async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    launchImageLibrary({ mediaType: 'photo', quality: 1 }, response => {
      if (response.assets && response.assets.length > 0) {
        const imageUri = response.assets[0].uri;
        setSelectedImage(imageUri);
        // Navigate to your Edit screen
        navigation.navigate('Edit', { imageUri });
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.content}>
        {/* Brand Header */}
        <Text style={styles.brandText}>LUMINA</Text>
        
        <View style={styles.mainCard}>
          {selectedImage ? (
            <Image source={{ uri: selectedImage }} style={styles.previewImage} />
          ) : (
            <View style={styles.placeholder}>
              <MaterialIcons name="auto-awesome" size={40} color="#7F77DD" />
              <Text style={styles.placeholderText}>No photo selected</Text>
            </View>
          )}
        </View>

        <View style={styles.bottomSection}>
          <Text style={styles.subtitle}>Transform your photos with AI-powered tools</Text>
          
          <TouchableOpacity style={styles.button} onPress={pickImage} activeOpacity={0.8}>
            <MaterialIcons name="add-photo-alternate" size={24} color="#fff" />
            <Text style={styles.buttonText}>
              {selectedImage ? 'Change Photo' : 'Select Image'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F', // Deeper black for premium look
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 60,
  },
  brandText: {
    fontSize: 32,
    fontFamily: 'PlayfairDisplay', // Using your custom font
    color: '#fff',
    letterSpacing: 8,
    fontWeight: '700',
  },
  mainCard: {
    width: '85%',
    aspectRatio: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#7F77DD',
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholder: {
    alignItems: 'center',
  },
  placeholderText: {
    color: '#555',
    marginTop: 15,
    fontSize: 14,
    letterSpacing: 1,
  },
  bottomSection: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  subtitle: {
    color: '#888',
    textAlign: 'center',
    fontSize: 15,
    marginBottom: 30,
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#7F77DD',
    flexDirection: 'row',
    width: '100%',
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    gap: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default HomeScreen;