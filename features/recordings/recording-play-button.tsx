import { SymbolView } from 'expo-symbols';
import { useAudioPlayer } from 'expo-audio';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

export function RecordingPlayButton({
  activeBackgroundColor = '#2FDD6C',
  activeTintColor = '#111111',
  backgroundColor = '#FFFFFF',
  borderColor = '#111111',
  endSec,
  iconSize = 15,
  size = 32,
  startSec,
  style,
  tintColor = '#111111',
  uri,
}: {
  activeBackgroundColor?: string;
  activeTintColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  endSec?: number | null;
  iconSize?: number;
  size?: number;
  startSec?: number | null;
  style?: StyleProp<ViewStyle>;
  tintColor?: string;
  uri: string | null;
}) {
  const source = useMemo(() => (uri ? { uri } : null), [uri]);
  const player = useAudioPlayer(source);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    return () => {
      player.pause();
    };
  }, [player]);

  if (!uri) {
    return null;
  }

  async function toggle() {
    if (playing) {
      player.pause();
      setPlaying(false);
      return;
    }

    if (typeof startSec === 'number') {
      player.seekTo(startSec);
    } else {
      player.seekTo(0);
    }

    player.play();
    setPlaying(true);

    if (typeof endSec === 'number' && typeof startSec === 'number' && endSec > startSec) {
      setTimeout(() => {
        player.pause();
        setPlaying(false);
      }, Math.max(250, (endSec - startSec) * 1000));
    }
  }

  return (
    <Pressable
      accessibilityLabel={playing ? '録音再生を停止' : '録音を再生'}
      accessibilityRole="button"
      onPress={toggle}
      style={({ pressed }) => [
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor,
          backgroundColor: playing ? activeBackgroundColor : backgroundColor,
          opacity: pressed ? 0.72 : 1,
        },
        style,
      ]}
    >
      <SymbolView
        name={playing ? 'pause.fill' : 'play.fill'}
        size={iconSize}
        tintColor={playing ? activeTintColor : tintColor}
        fallback={null}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
