import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, StatusBar, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const WORDMARK_RATIO = 2172 / 724;
// The landing asset is a square, two-wing butterfly with transparent padding.
const BUTTERFLY_RATIO = 1;
const FLIGHT_DURATION_MS = 2700;
const SPLASH_DURATION_MS = 3000;

type SplashScreenViewProps = { onAnimationComplete: () => void };
type Frame = { width: number; height: number };
type WordmarkFrame = Frame & { x: number; y: number };

function cubicBezier(t: number, start: number, controlOne: number, controlTwo: number, end: number) {
  'worklet';
  const inverseT = 1 - t;
  return (
    inverseT * inverseT * inverseT * start +
    3 * inverseT * inverseT * t * controlOne +
    3 * inverseT * t * t * controlTwo +
    t * t * t * end
  );
}

/** A native-driven, one-time brand transition shown after Expo's native splash. */
export function SplashScreenView({ onAnimationComplete }: SplashScreenViewProps) {
  const [screen, setScreen] = useState<Frame | null>(null);
  const [wordmark, setWordmark] = useState<WordmarkFrame | null>(null);
  const started = useRef(false);
  const flight = useSharedValue(0);
  const fade = useSharedValue(1);

  const onScreenLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setScreen({ width, height });
  }, []);

  const onWordmarkLayout = useCallback((event: LayoutChangeEvent) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    setWordmark({ x, y, width, height });
  }, []);

  useEffect(() => {
    if (!screen || !wordmark || started.current) return;
    started.current = true;
    flight.value = withTiming(1, { duration: FLIGHT_DURATION_MS, easing: Easing.linear }, (finished) => {
      if (!finished) return;
      fade.value = withTiming(0, { duration: SPLASH_DURATION_MS - FLIGHT_DURATION_MS }, (didFade) => {
        if (didFade) runOnJS(onAnimationComplete)();
      });
    });
  }, [fade, flight, onAnimationComplete, screen, wordmark]);

  const splashStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const butterflyStyle = useAnimatedStyle(() => {
    if (!screen || !wordmark) return { opacity: 0 };
    const t = flight.value;
    const butterflyHeight = Math.min(76, Math.max(54, screen.width * 0.17));
    const butterflyWidth = butterflyHeight * BUTTERFLY_RATIO;
    const landingX = wordmark.x + wordmark.width * 0.955 - butterflyWidth * 0.42;
    const landingY = wordmark.y - butterflyHeight * 0.19;
    let x: number;
    let y: number;
    let rotation: number;

    if (t < 0.5) {
      const phase = t / 0.5;
      x = cubicBezier(phase, -butterflyWidth, screen.width * 0.08, screen.width * 0.24, screen.width * 0.52);
      y = cubicBezier(phase, screen.height * 0.57, screen.height * 0.36, wordmark.y - screen.height * 0.18, wordmark.y - butterflyHeight * 1.25);
      rotation = interpolate(phase, [0, 1], [-18, 12]);
    } else if (t < 0.74) {
      const phase = (t - 0.5) / 0.24;
      x = cubicBezier(phase, screen.width * 0.52, screen.width * 0.67, screen.width * 0.82, landingX);
      y = cubicBezier(phase, wordmark.y - butterflyHeight * 1.25, wordmark.y - butterflyHeight * 0.84, wordmark.y - butterflyHeight * 0.75, landingY - butterflyHeight * 0.2);
      rotation = interpolate(phase, [0, 1], [12, 28]);
    } else {
      const phase = (t - 0.74) / 0.26;
      x = cubicBezier(phase, landingX, landingX + 12, landingX - 4, landingX);
      y = cubicBezier(phase, landingY - butterflyHeight * 0.2, landingY - butterflyHeight * 0.42, landingY + 3, landingY);
      rotation = interpolate(phase, [0, 0.65, 1], [28, 6, 0]);
    }

    const flyingFlap = Math.sin(t * Math.PI * 18) * 0.11;
    const landingFlap = t > 0.84 ? Math.sin((t - 0.84) * Math.PI * 13) * (1 - t) * 1.6 : 0;
    return {
      opacity: 1,
      transform: [
        { translateX: x }, { translateY: y }, { rotate: `${rotation}deg` },
        { scaleX: 1 - flyingFlap * 0.28 - landingFlap * 0.24 },
        { scaleY: 1 + flyingFlap + landingFlap },
      ],
    };
  });
  const wordmarkWidth = screen ? Math.min(screen.width * 0.76, 410) : 280;
  const butterflyHeight = screen ? Math.min(76, Math.max(54, screen.width * 0.17)) : 64;

  return (
    <Animated.View style={[styles.container, splashStyle]} onLayout={onScreenLayout}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.logoStage} pointerEvents="none">
        <Image source={require('../../assets/splash/citians_wordmark.png')} style={{ width: wordmarkWidth, height: wordmarkWidth / WORDMARK_RATIO }} resizeMode="contain" accessibilityLabel="Citians" onLayout={onWordmarkLayout} />
      </View>
      <Animated.Image source={require('../../assets/splash/butterfly-transparent.png')} style={[styles.butterfly, { width: butterflyHeight * BUTTERFLY_RATIO, height: butterflyHeight }, butterflyStyle]} resizeMode="contain" accessibilityLabel="Golden butterfly" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', overflow: 'hidden' },
  logoStage: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  butterfly: { position: 'absolute', left: 0, top: 0 },
});
