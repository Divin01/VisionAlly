// src/screens/main/components/AudioPlayer.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../constants/colors';

const AudioPlayer = ({ uri, duration, isUser }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState(null);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  const playSound = async () => {
    if (sound && isPlaying) {
      await sound.pauseAsync();
      setIsPlaying(false);
    } else if (sound && !isPlaying) {
      await sound.playAsync();
      setIsPlaying(true);
    } else {
      const { sound: newSound } = await Audio.Sound.createAsync({ uri });
      setSound(newSound);
      
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setPlaybackPosition(status.positionMillis);
          setPlaybackDuration(status.durationMillis);
          
          const progress = status.positionMillis / status.durationMillis;
          Animated.timing(progressAnim, {
            toValue: progress,
            duration: 100,
            useNativeDriver: false,
          }).start();

          if (status.didJustFinish) {
            setIsPlaying(false);
            setPlaybackPosition(0);
            progressAnim.setValue(0);
          }
        }
      });

      await newSound.playAsync();
      setIsPlaying(true);
    }
  };

  const formatTime = (millis) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.audioPlayerContainer}>
      <TouchableOpacity
        style={[styles.playButton, isUser && styles.userPlayButton]}
        onPress={playSound}
      >
        <Ionicons
          name={isPlaying ? 'pause' : 'play'}
          size={20}
          color={isUser ? COLORS.white : COLORS.primary}
        />
      </TouchableOpacity>

      <View style={styles.audioInfo}>
        <View style={styles.waveformContainer}>
          {[...Array(15)].map((_, index) => (
            <View
              key={index}
              style={[
                styles.waveformBar,
                {
                  height: 4 + Math.random() * 12,
                  backgroundColor: isUser ? 'rgba(255, 255, 255, 0.5)' : '#D0D0D0',
                },
              ]}
            />
          ))}
        </View>
        
        <Animated.View
          style={[
            styles.progressBar,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
        
        <Text style={[styles.audioDuration, isUser && styles.userAudioDuration]}>
          {playbackDuration > 0 ? formatTime(playbackPosition) : '0:00'} / {duration}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  audioPlayerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    minWidth: 200,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userPlayButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  audioInfo: {
    flex: 1,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 20,
    marginBottom: 4,
  },
  waveformBar: {
    width: 2,
    borderRadius: 1,
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 2,
    backgroundColor: COLORS.primary,
    borderRadius: 1,
  },
  audioDuration: {
    fontSize: 11,
    color: '#6B6B6B',
    marginTop: 4,
  },
  userAudioDuration: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
});

export default AudioPlayer;