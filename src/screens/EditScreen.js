import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  PanResponder,
  Animated,
  PermissionsAndroid,
  Platform,
  ToastAndroid,
  ActivityIndicator,
} from 'react-native';
import ImageCropPicker from 'react-native-image-crop-picker';
import ViewShot from 'react-native-view-shot';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Slider from '@react-native-community/slider';
import Share from 'react-native-share';

// ─── DraggableText (fixed: stable key via item.id, spawn offset) ──────────────

function DraggableText({ item, onDelete }) {
  const pan = useRef(new Animated.ValueXY({ x: item.spawnX, y: item.spawnY })).current;
  const scaleValue = useRef(new Animated.Value(1)).current;
  const lastScale = useRef(1);
  const initialDistance = useRef(null);
  const [selected, setSelected] = useState(false);

  const getDistance = touches => {
    const dx = touches[0].pageX - touches[1].pageX;
    const dy = touches[0].pageY - touches[1].pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      pan.setOffset({ x: pan.x._value, y: pan.y._value });
      pan.setValue({ x: 0, y: 0 });
      initialDistance.current = null;
    },
    onPanResponderMove: (e, gesture) => {
      const touches = e.nativeEvent.touches;
      if (touches.length === 2) {
        const dist = getDistance(touches);
        if (initialDistance.current === null) {
          initialDistance.current = dist;
        } else {
          const newScale = lastScale.current * (dist / initialDistance.current);
          scaleValue.setValue(Math.max(0.5, Math.min(newScale, 5)));
        }
      } else {
        pan.x.setValue(gesture.dx);
        pan.y.setValue(gesture.dy);
      }
    },
    onPanResponderRelease: () => {
      pan.flattenOffset();
      lastScale.current = scaleValue._value;
      initialDistance.current = null;
    },
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        transform: pan.getTranslateTransform(),
      }}>
      {selected && (
        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
          <Text style={styles.deleteBtnText}>✕</Text>
        </TouchableOpacity>
      )}
      <Animated.Text
        {...panResponder.panHandlers}
        onLongPress={() => setSelected(s => !s)}
        style={[
          styles.overlayText,
          {
            transform: [{ scale: scaleValue }],
            color: item.color,
            fontSize: item.fontSize,
            fontFamily: item.fontFamily,
            borderWidth: selected ? 1 : 0,
            borderColor: selected ? '#7F77DD' : 'transparent',
            borderStyle: 'dashed',
            padding: selected ? 4 : 0,
          },
        ]}>
        {item.value}
      </Animated.Text>
    </Animated.View>
  );
}

// ─── EditScreen ───────────────────────────────────────────────────────────────

function EditScreen({ route, navigation }) {
  // ✅ FIX: local state so crop updates reflect on screen
  const [currentImageUri, setCurrentImageUri] = useState(route.params.imageUri);

  const [activeTool, setActiveTool] = useState(null);
  const [activeFilter, setActiveFilter] = useState('normal');
  const [rotation, setRotation] = useState(0);
  const [texts, setTexts] = useState([]);
  const [textValue, setTextValue] = useState('');
  const [textColor, setTextColor] = useState('#ffffff');
  const [textSize, setTextSize] = useState(22);
  const [textFont, setTextFont] = useState('Poppins-Regular');
  const [isSaving, setIsSaving] = useState(false);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [warmth, setWarmth] = useState(0);
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);


  // ✅ ViewShot ref — wraps the canvas
  const viewShotRef = useRef(null);

  // ─── Data ──────────────────────────────────────────────────────────────────


  const tools = [
    { id: 'filters', label: 'Filters', iconLib: 'material', iconName: 'filter' },
    { id: 'crop', label: 'Crop', iconLib: 'material', iconName: 'crop' },
    { id: 'rotate', label: 'Rotate', iconLib: 'material', iconName: 'rotate-right' },
    { id: 'text', label: 'Text', iconLib: 'community', iconName: 'format-text' },
    { id: 'adjust', label: 'Adjust', iconLib: 'community', iconName: 'tune-variant' },
    { id: 'ai', label: 'AI Tools', iconLib: 'material', iconName: 'auto-fix-high' },
  ];

  const filters = [
    { id: 'normal', label: 'Normal', overlay: null, opacity: 0 },
    { id: 'glamour', label: 'Glamour', overlay: '#ff80ab', opacity: 0.15 },
    { id: 'tonal', label: 'Tonal', overlay: '#000', opacity: 0.2 },
    { id: 'cool', label: 'Cool', overlay: '#0080ff', opacity: 0.15 },
    { id: 'vivid', label: 'Vivid', overlay: '#ff4400', opacity: 0.1 },
    { id: 'fade', label: 'Fade', overlay: '#fff', opacity: 0.25 },
    { id: 'warm', label: 'Warm', overlay: '#ff8800', opacity: 0.15 },
  ];

  const textColors = [
    '#ffffff', '#000000', '#ff4444', '#ffbb00',
    '#44ff44', '#4488ff', '#ff44ff', '#00ffff',
    '#ff8800', '#8800ff', '#00ff88', '#ff0088',
  ];

  const fontOptions = [
    { label: 'Poppins', value: 'Poppins-Regular' },
    { label: 'Poppins Bold', value: 'Poppins-Bold' },
    { label: 'Pacifico', value: 'Pacifico-Regular' },
    { label: 'Oswald', value: 'Oswald-VariableFont_wght' },
    { label: 'Boldonse', value: 'Boldonse-Regular' },
    { label: 'PT Serif', value: 'PTSerif-Regular' },
    { label: 'PT Bold', value: 'PTSerif-Bold' },
    { label: 'PT Italic', value: 'PTSerif-Italic' },
  ];

  const currentFilter = filters.find(f => f.id === activeFilter);

  // ─── Actions ───────────────────────────────────────────────────────────────

  // ✅ FIX: crop now updates local state + route params
  const cropImage = () => {
    ImageCropPicker.openCropper({
      path: currentImageUri,
      cropping: true,
      freeStyleCropEnabled: true,
    })
      .then(image => {
        setCurrentImageUri(image.path);
        navigation.setParams({ imageUri: image.path });
      })
      .catch(err => console.log('Crop cancelled', err));
  };

  // ✅ FIX: rotation capped at 0-359
  const rotateImage = () => setRotation(prev => (prev + 90) % 360);

  // ✅ SAVE — captures ViewShot → saves to gallery
  const requestSavePermission = async () => {
    if (Platform.OS !== 'android') return true;
    if (Platform.Version >= 33) return true; // Android 13+ no WRITE needed
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      {
        title: 'Storage Permission',
        message: 'App needs access to save photos to your gallery.',
        buttonPositive: 'Allow',
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  };

  const saveImage = async () => {
    try {
      setIsSaving(true);
      const hasPermission = await requestSavePermission();
      if (!hasPermission) {
        ToastAndroid.show('Storage permission denied', ToastAndroid.SHORT);
        setIsSaving(false);
        return;
      }

      // Capture the full canvas: image + filter overlay + text overlays
      const uri = await viewShotRef.current.capture();
      await CameraRoll.save(uri, { type: 'photo' });

      ToastAndroid.show('✅ Saved to Gallery', ToastAndroid.SHORT);
    } catch (err) {
      console.log('Save error:', err);
      ToastAndroid.show('❌ Save failed', ToastAndroid.SHORT);
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Undo / Redo & Share Logic ───

  // Call this function whenever you want to save a point in history
  // (e.g., when a slider stops moving or text is added)
  const takeSnapshot = () => {
    const snapshot = {
      texts: [...texts],
      brightness,
      contrast,
      saturation,
      warmth,
      activeFilter,
      rotation,
    };
    setHistory(prev => [...prev, snapshot]);
    setRedoStack([]); // Clear redo whenever a new action is taken
  };

  const handleUndo = () => {
    if (history.length === 0) return;

    // 1. Get the current state to put into the Redo stack
    const currentState = { texts, brightness, contrast, saturation, warmth, activeFilter, rotation };
    setRedoStack(prev => [currentState, ...prev]);

    // 2. Pull the last item from history
    const prev = history[history.length - 1];
    const newHistory = history.slice(0, -1);

    // 3. Update all states
    setHistory(newHistory);
    setTexts(prev.texts);
    setBrightness(prev.brightness);
    setContrast(prev.contrast);
    setSaturation(prev.saturation);
    setWarmth(prev.warmth);
    setActiveFilter(prev.activeFilter);
    setRotation(prev.rotation);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;

    // 1. Get the item from redo
    const next = redoStack[0];
    const newRedo = redoStack.slice(1);

    // 2. Put current state back into history
    const currentState = { texts, brightness, contrast, saturation, warmth, activeFilter, rotation };
    setHistory(prev => [...prev, currentState]);

    // 3. Update all states
    setRedoStack(newRedo);
    setTexts(next.texts);
    setBrightness(next.brightness);
    setContrast(next.contrast);
    setSaturation(next.saturation);
    setWarmth(next.warmth);
    setActiveFilter(next.activeFilter);
    setRotation(next.rotation);
  };

  const handleShare = async () => {
    try {
      const uri = await viewShotRef.current.capture();
      await Share.open({ url: `file://${uri}` });
    } catch (err) {
      if (err?.message !== 'User did not share') {
        console.log('Share error:', err);
      }
    }
  };

  // ─── Tool panel renderer ───────────────────────────────────────────────────

  const renderToolOptions = () => {
    if (activeTool === 'filters') {
      return (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}>
          {filters.map(filter => (
            <TouchableOpacity
              key={filter.id}
              style={styles.filterItem}
              onPress={() => setActiveFilter(filter.id)}>
              <View style={[
                styles.filterPreview,
                activeFilter === filter.id && styles.filterPreviewActive,
              ]}>
                <Image source={{ uri: currentImageUri }} style={styles.filterThumb} />
                {filter.overlay && (
                  <View style={[
                    styles.filterThumbOverlay,
                    { backgroundColor: filter.overlay, opacity: filter.opacity },
                  ]} />
                )}
              </View>
              <Text style={[
                styles.filterLabel,
                activeFilter === filter.id && styles.filterLabelActive,
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      );
    }

    if (activeTool === 'adjust') {
      return (
        <View style={styles.adjustPanel}>

          {/* Brightness */}
          <View style={styles.adjustRow}>
            <MaterialIcons name="brightness-6" size={18} color="#aaa" />
            <Text style={styles.adjustLabel}>Brightness</Text>
            <Slider
              style={styles.adjustSlider}
              minimumValue={-1}
              maximumValue={1}
              step={0.01}
              value={brightness}
              onValueChange={setBrightness}
              minimumTrackTintColor="#7F77DD"
              maximumTrackTintColor="#444"
              thumbTintColor="#7F77DD"
              onSlidingComplete={takeSnapshot}
            />
            <Text style={styles.adjustValue}>
              {Math.round(brightness * 100)}
            </Text>
          </View>

          {/* Contrast */}
          <View style={styles.adjustRow}>
            <MaterialIcons name="contrast" size={18} color="#aaa" />
            <Text style={styles.adjustLabel}>Contrast</Text>
            <Slider
              style={styles.adjustSlider}
              minimumValue={-1}
              maximumValue={1}
              step={0.01}
              value={contrast}
              onValueChange={setContrast}
              minimumTrackTintColor="#7F77DD"
              maximumTrackTintColor="#444"
              thumbTintColor="#7F77DD"
              onSlidingComplete={takeSnapshot}
            />
            <Text style={styles.adjustValue}>
              {Math.round(contrast * 100)}
            </Text>
          </View>

          {/* Saturation */}
          <View style={styles.adjustRow}>
            <MaterialCommunityIcons name="palette-outline" size={18} color="#aaa" />
            <Text style={styles.adjustLabel}>Saturation</Text>
            <Slider
              style={styles.adjustSlider}
              minimumValue={-1}
              maximumValue={1}
              step={0.01}
              value={saturation}
              onValueChange={setSaturation}
              minimumTrackTintColor="#7F77DD"
              maximumTrackTintColor="#444"
              thumbTintColor="#7F77DD"
              onSlidingComplete={takeSnapshot}
            />
            <Text style={styles.adjustValue}>
              {Math.round(saturation * 100)}
            </Text>
          </View>

          {/* Warmth */}
          <View style={styles.adjustRow}>
            <MaterialCommunityIcons name="thermometer" size={18} color="#aaa" />
            <Text style={styles.adjustLabel}>Warmth</Text>
            <Slider
              style={styles.adjustSlider}
              minimumValue={-1}
              maximumValue={1}
              step={0.01}
              value={warmth}
              onValueChange={setWarmth}
              minimumTrackTintColor="#7F77DD"
              maximumTrackTintColor="#444"
              thumbTintColor="#7F77DD"
              onSlidingComplete={takeSnapshot}
            />
            <Text style={styles.adjustValue}>
              {Math.round(warmth * 100)}
            </Text>
          </View>

          {/* Reset button */}
          <TouchableOpacity
            style={styles.adjustResetBtn}
            onPress={() => {
              setBrightness(0);
              setContrast(0);
              setSaturation(0);
              setWarmth(0);
            }}>
            <Text style={styles.adjustResetText}>Reset</Text>
          </TouchableOpacity>

        </View>
      );
    }

    if (activeTool === 'text') {
      return (
        <View style={styles.textPanel}>
          <View style={styles.textInputRow}>
            <TextInput
              style={styles.textInput}
              placeholder="Type something..."
              placeholderTextColor="#aaa"
              value={textValue}
              onChangeText={setTextValue}
            />
            <TouchableOpacity
              style={styles.textAddBtn}
              onPress={() => {
                if (textValue.trim()) {
                  takeSnapshot();
                  setTexts(prev => [
                    ...prev,
                    {
                      // ✅ FIX: stable unique id instead of index
                      id: Date.now().toString(),
                      value: textValue,
                      color: textColor,
                      fontSize: textSize,
                      fontFamily: textFont,
                      // ✅ FIX: stagger spawn position so texts don't stack
                      spawnX: (prev.length % 3) * 30,
                      spawnY: (prev.length % 4) * 20,
                    },
                  ]);
                  setTextValue('');
                  setActiveTool(null);
                }
              }}>
              <Text style={styles.textAddBtnText}>Add</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionRow}>
            {textColors.map(color => (
              <TouchableOpacity
                key={color}
                onPress={() => setTextColor(color)}
                style={[
                  styles.colorDot,
                  { backgroundColor: color },
                  textColor === color && styles.colorDotActive,
                ]}
              />
            ))}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionRow}>
            {fontOptions.map(font => (
              <TouchableOpacity
                key={font.value}
                onPress={() => setTextFont(font.value)}
                style={[styles.fontBtn, textFont === font.value && styles.fontBtnActive]}>
                <Text style={[
                  styles.fontBtnText,
                  { fontFamily: font.value },
                  textFont === font.value && styles.fontBtnTextActive,
                ]}>
                  {font.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.sizeHint}>Use two fingers on text to resize</Text>
        </View>
      );
    }

    if (activeTool) {
      return (
        <View style={styles.toolOptions}>
          <Text style={styles.toolOptionsText}>{activeTool} coming soon...</Text>
        </View>
      );
    }

    return null;
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}

      <View style={styles.header}>
        {/* Left: X + Undo + Redo */}
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="close" size={26} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleUndo}
            disabled={history.length === 0}
            style={{ marginLeft: 14 }}>
            <MaterialIcons
              name="undo"
              size={25}
              color={history.length === 0 ? '#555' : '#fff'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleRedo}
            disabled={redoStack.length === 0}
            style={{ marginLeft: 14 }}>
            <MaterialIcons
              name="redo"
              size={25}
              color={redoStack.length === 0 ? '#555' : '#fff'}
            />
          </TouchableOpacity>
        </View>

        {/* Center: Title */}
        <Text style={styles.headerTitle}>Edit</Text>

        {/* Right: Share + Save */}
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleShare} style={{ marginRight: 16 }}>
            <MaterialIcons name="share" size={24} color="#7F77DD" />
          </TouchableOpacity>
          <TouchableOpacity onPress={saveImage}>
            {isSaving ? (
              <ActivityIndicator size="small" color="#7F77DD" />
            ) : (
              <Text style={styles.saveBtn}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ✅ ViewShot wraps ONLY the canvas — not toolbar/topbar */}
      <ViewShot
        ref={viewShotRef}
        style={styles.imageContainer}
        options={{ format: 'jpg', quality: 1.0 }}>

        <Image
          source={{ uri: currentImageUri }}
          style={[styles.image, { transform: [{ rotate: `${rotation}deg` }] }]}
        />

        {/* ✅ Filter overlay is BELOW texts in z-order */}
        {currentFilter?.overlay && (
          <View style={[
            styles.filterOverlay,
            { backgroundColor: currentFilter.overlay, opacity: currentFilter.opacity },
          ]} />
        )}

        {/* ── Adjust overlays ── */}

        {/* Brightness — positive = white, negative = black */}
        {brightness !== 0 && (
          <View style={[styles.filterOverlay, {
            backgroundColor: brightness > 0 ? '#fff' : '#000',
            opacity: Math.abs(brightness) * 0.6,
          }]} />
        )}

        {/* Contrast — dark overlay to boost contrast */}
        {contrast !== 0 && (
          <View style={[styles.filterOverlay, {
            backgroundColor: contrast > 0 ? '#000' : '#fff',
            opacity: Math.abs(contrast) * 0.15,
          }]} />
        )}

        {/* Saturation — gray overlay to desaturate */}
        {saturation < 0 && (
          <View style={[styles.filterOverlay, {
            backgroundColor: '#808080',
            opacity: Math.abs(saturation) * 0.8,
          }]} />
        )}

        {/* Warmth — orange = warm, blue = cool */}
        {warmth !== 0 && (
          <View style={[styles.filterOverlay, {
            backgroundColor: warmth > 0 ? '#ff8800' : '#0055ff',
            opacity: Math.abs(warmth) * 0.2,
          }]} />
        )}

        {/* ✅ Texts render on TOP of filter */}
        {texts.map(t => (
          <DraggableText
            key={t.id}
            item={t}
            onDelete={() => setTexts(prev => prev.filter(x => x.id !== t.id))}
          />
        ))}
      </ViewShot>

      {renderToolOptions()}

      {/* Bottom Toolbar */}
      <View style={styles.bottomBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {tools.map(tool => {
            const isActive = activeTool === tool.id;
            const color = isActive ? '#7F77DD' : '#aaa';
            return (
              <TouchableOpacity
                key={tool.id}
                style={[styles.toolItem, isActive && styles.toolItemActive]}
                onPress={() => {
                  if (tool.id === 'crop') {
                    cropImage();
                  } else if (tool.id === 'rotate') {
                    rotateImage();
                  } else {
                    setActiveTool(prev => prev === tool.id ? null : tool.id);
                  }
                }}>
                {tool.iconLib === 'material'
                  ? <MaterialIcons name={tool.iconName} size={24} color={color} />
                  : <MaterialCommunityIcons name={tool.iconName} size={24} color={color} />
                }
                <Text style={[styles.toolLabel, isActive && styles.toolLabelActive]}>
                  {tool.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 0.5, borderBottomColor: '#333',
  },
  topBarBtn: { color: '#fff', fontSize: 18 },
  topBarTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  topBarSave: { color: '#7F77DD', fontSize: 16, fontWeight: '600' },
  imageContainer: {
    flex: 1, justifyContent: 'center',
    alignItems: 'center', position: 'relative',
    backgroundColor: '#111', // needed for ViewShot bg
  },
  image: { width: '100%', height: '100%', resizeMode: 'contain' },
  filterOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  filterScroll: {
    maxHeight: 100, paddingVertical: 8,
    borderTopWidth: 0.5, borderTopColor: '#333', backgroundColor: '#1a1a1a',
  },
  filterItem: { alignItems: 'center', paddingHorizontal: 10 },
  filterPreview: {
    width: 60, height: 60, borderRadius: 8,
    overflow: 'hidden', borderWidth: 2, borderColor: 'transparent',
  },
  filterPreviewActive: { borderColor: '#7F77DD' },
  filterThumb: { width: '100%', height: '100%' },
  filterThumbOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  filterLabel: { color: '#aaa', fontSize: 10, marginTop: 4 },
  filterLabelActive: { color: '#7F77DD' },
  toolOptions: {
    height: 80, justifyContent: 'center', alignItems: 'center',
    borderTopWidth: 0.5, borderTopColor: '#333',
  },
  toolOptionsText: { color: '#aaa', fontSize: 14 },
  bottomBar: {
    paddingVertical: 12, borderTopWidth: 0.5,
    borderTopColor: '#333', backgroundColor: '#1a1a1a',
  },
  toolItem: {
    alignItems: 'center', paddingHorizontal: 20,
    paddingVertical: 6, borderRadius: 10,
  },
  toolItemActive: { backgroundColor: '#7F77DD22' },
  toolIcon: { fontSize: 22, marginBottom: 4 },
  toolLabel: { color: '#aaa', fontSize: 11 },
  toolLabelActive: { color: '#7F77DD' },
  overlayText: {
    position: 'absolute',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  textPanel: {
    backgroundColor: '#1a1a1a',
    borderTopWidth: 0.5, borderTopColor: '#333', paddingBottom: 8,
  },
  textInputRow: { flexDirection: 'row', padding: 10, alignItems: 'center' },
  textInput: {
    flex: 1, backgroundColor: '#333', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8, color: '#fff', fontSize: 14,
  },
  textAddBtn: {
    marginLeft: 10, backgroundColor: '#7F77DD',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8,
  },
  textAddBtnText: { color: '#fff', fontWeight: '600' },
  optionRow: { paddingHorizontal: 10, marginBottom: 6 },
  colorDot: {
    width: 28, height: 28, borderRadius: 14,
    marginRight: 8, borderWidth: 2, borderColor: 'transparent',
  },
  colorDotActive: { borderColor: '#7F77DD' },
  fontBtn: {
    paddingHorizontal: 14, paddingVertical: 4,
    borderRadius: 8, marginRight: 8, backgroundColor: '#333',
  },
  fontBtnActive: { backgroundColor: '#7F77DD' },
  fontBtnText: { color: '#aaa', fontSize: 13 },
  fontBtnTextActive: { color: '#fff' },
  sizeHint: { color: '#666', fontSize: 11, textAlign: 'center', paddingBottom: 4 },
  deleteBtn: {
    position: 'absolute', top: -12, right: -12,
    backgroundColor: '#ff4444', width: 22, height: 22,
    borderRadius: 11, justifyContent: 'center', alignItems: 'center', zIndex: 10,
  },
  deleteBtnText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  adjustPanel: {
    backgroundColor: '#1a1a1a',
    borderTopWidth: 0.5,
    borderTopColor: '#333',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  adjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  adjustLabel: {
    color: '#aaa',
    fontSize: 12,
    width: 72,
    marginLeft: 6,
  },
  adjustSlider: {
    flex: 1,
    height: 36,
  },
  adjustValue: {
    color: '#7F77DD',
    fontSize: 11,
    width: 30,
    textAlign: 'right',
  },
  adjustResetBtn: {
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: '#555',
    marginTop: 4,
  },
  adjustResetText: {
    color: '#aaa',
    fontSize: 12,
  },
  // Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#1a1a1a',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 17,
    fontFamily: 'PlayfairDisplay',
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  saveBtn: {
    color: '#7F77DD',
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    paddingHorizontal: 5,
  },
});

export default EditScreen;