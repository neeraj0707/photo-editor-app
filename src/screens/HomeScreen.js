import React, { useState } from 'react';
import {
  View, Text, StyleSheet,
  TouchableOpacity, Image,
  PermissionsAndroid, Platform,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';

function HomeScreen({ navigation }) {
  const [selectedImage, setSelectedImage] = useState(null);

  const requestPermission = async () => {
    if (Platform.OS !== 'android') return true;

    // Android 13+
    if (Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
        {
          title: 'Photo Permission',
          message: 'App needs access to your photos.',
          buttonPositive: 'Allow',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }

    // Android 12 and below
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      {
        title: 'Photo Permission',
        message: 'App needs access to your photos.',
        buttonPositive: 'Allow',
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  };

  const pickImage = async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) {
      console.log('Permission denied');
      return;
    }

    launchImageLibrary({ mediaType: 'photo' }, response => {
      if (response.didCancel) {
        console.log('User cancelled');
      } else if (response.assets && response.assets.length > 0) {
        const imageUri = response.assets[0].uri;
        setSelectedImage(imageUri);
        navigation.navigate('Edit', { imageUri });
      }
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Editor</Text>
      {selectedImage && (
        <Image source={{ uri: selectedImage }} style={styles.image} />
      )}
      <TouchableOpacity style={styles.button} onPress={pickImage}>
        <Text style={styles.buttonText}>
          {selectedImage ? 'Change Photo' : 'Pick a Photo'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 40,
  },
  image: {
    width: 300,
    height: 300,
    borderRadius: 12,
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#7F77DD',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HomeScreen;