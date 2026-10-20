import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Keyboard, KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';

import { useAuthStore } from '@/src/lib/authStore';
import { useResponsiveLayout } from '@/src/hooks/useResponsiveLayout';
import { createCanvasDrop, enterCanvasRoom, leaveCanvasRoom, moveCanvasDrop, subscribeToCanvasDrops, subscribeToCanvasPeople, toggleCanvasReaction, type CanvasDrop, type CanvasDropTemplate, type CanvasPerson } from '@/src/lib/campusCanvas';
import { fontFamilies, spacing } from '@/src/theme';

const CANVAS_ROOM_ID = 'campfire';
const CANVAS_ROOM = { emoji: '✦', tint: '#FFF3E7' };
const NOTE_COLORS = ['#FFE89A', '#CFF0DF', '#DCD1FF', '#FFCFC4', '#CDE8FF'];
const CARD_WIDTH = 166;
const BOARD_HEIGHT = 820;
const MIN_ZOOM = .42;
const MAX_ZOOM = 1.8;
const GRID_SIZE = 76;
const TEMPLATES: { id: CanvasDropTemplate; emoji: string; label: string; prompt: string }[] = [
  { id: 'FREEFORM', emoji: '✦', label: 'Freeform', prompt: 'What’s on your mind?' },
  { id: 'QUESTION', emoji: '❓', label: 'Ask a doubt', prompt: 'What are you stuck on?' },
  { id: 'BRAINSTORM', emoji: '💡', label: 'Brainstorm', prompt: 'Drop an idea for the room…' },
  { id: 'PROJECT', emoji: '🛠️', label: 'Project plan', prompt: 'What are we building?' },
  { id: 'STUDY', emoji: '📚', label: 'Study note', prompt: 'Share a useful explanation or resource…' },
];
const DEMO_DROPS: CanvasDrop[] = [
  { id: 'demo-1', kind: 'text', authorId: 'meera', authorName: 'Meera', text: 'Could the fest app have a “find your people” mode?', x: -58, y: -112, color: '#FFE89A', reactedBy: ['a', 'b', 'c'] },
  { id: 'demo-2', kind: 'text', authorId: 'arun', authorName: 'Arun', text: 'Match by the thing you want to build, not department 👀', x: 104, y: 94, color: '#CFF0DF', reactedBy: ['a', 'b'] },
];

const initials = (name: string) => name.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || '?';
const colorFor = (value: string) => ['#6750A4', '#D36555', '#157A6E', '#3266A8', '#9A5B13'][value.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % 5];
const AnimatedPath = Animated.createAnimatedComponent(Path);

type CardEffectMode = 'reaction' | 'reply' | 'first-spark';
type CardEffect = { dropId: string; token: number; mode: CardEffectMode };

const SURPRISES = [
  { id: 'trophy', name: 'tiny trophy', emoji: '🏆', color: '#FFF0A8' },
  { id: 'bug', name: 'coding bug', emoji: '🐞', color: '#FFD0D0' },
  { id: 'sleepy', name: 'sleeping mascot', emoji: '😴', color: '#D8E8FF' },
  { id: 'secret', name: 'secret spark', emoji: '✨', color: '#EAD9FF' },
] as const;

function getTodayKey() {
  const today = new Date();
  return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
}

function dailyNumber(value: string) {
  return `${getTodayKey()}-${value}`.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function getDailySurprise(roomId: string) {
  const item = SURPRISES[dailyNumber(roomId) % SURPRISES.length];
  const x = -150 + (dailyNumber(`${roomId}-x`) % 300);
  const y = -205 + (dailyNumber(`${roomId}-y`) % 390);
  return { ...item, x, y };
}

const MASCOTS = [
  { id: 'panda', emoji: '🐼', color: '#DDF3FF', x: 18, y: 76, message: 'Panda found a new idea!' },
  { id: 'bunny', emoji: '🐰', color: '#FFE1EF', x: 72, y: 390, message: 'Bunny says keep going!' },
  { id: 'fox', emoji: '🦊', color: '#FFE4B8', x: 242, y: 126, message: 'Fox is exploring this branch!' },
] as const;

function CanvasMascot({ mascot, onPress }: { mascot: (typeof MASCOTS)[number]; onPress: (message: string) => void }) {
  const bob = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const bobLoop = Animated.loop(Animated.sequence([
      Animated.timing(bob, { toValue: -5, duration: 900, useNativeDriver: true }),
      Animated.timing(bob, { toValue: 0, duration: 900, useNativeDriver: true }),
    ]));
    const driftLoop = Animated.loop(Animated.sequence([
      Animated.timing(drift, { toValue: 1, duration: 3600, useNativeDriver: true }),
      Animated.timing(drift, { toValue: 0, duration: 3600, useNativeDriver: true }),
    ]));
    bobLoop.start();
    const timer = setTimeout(() => driftLoop.start(), mascot.x * 7);
    return () => { clearTimeout(timer); bobLoop.stop(); driftLoop.stop(); };
  }, [bob, drift, mascot.x]);
  return <Animated.View style={[styles.mascotWrap, { left: mascot.x, top: mascot.y, transform: [{ translateY: bob }, { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [0, mascot.id === 'bunny' ? 14 : 20] }) }] }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Cute ${mascot.id} mascot`} onPress={() => onPress(mascot.message)} style={[styles.mascotButton, { backgroundColor: mascot.color }]}>
      <Text style={styles.mascotEmoji}>{mascot.emoji}</Text>
      <View style={styles.mascotSpark}><Text style={styles.mascotSparkText}>✦</Text></View>
    </Pressable>
  </Animated.View>;
}

const BEAR_SONGS = [
  '🎵 La la la… I found a spark! 🎵',
  '🎶 Bear-y good ideas, coming through! 🎶',
  '♪ Wiggle, wiggle, solve it together! ♪',
  '🎵 Debug the beat, don’t miss a step! 🎵',
];

function DancingBearMascot({ onPress }: { onPress: (message: string) => void }) {
  const x = useRef(new Animated.Value(150)).current;
  const y = useRef(new Animated.Value(250)).current;
  const bob = useRef(new Animated.Value(0)).current;
  const rotation = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const [song, setSong] = useState(BEAR_SONGS[0]);
  const [isDancing, setIsDancing] = useState(false);

  useEffect(() => {
    let active = true;
    const wander = () => {
      const nextX = 24 + Math.random() * 252;
      const nextY = 86 + Math.random() * 340;
      const duration = 2600 + Math.round(Math.random() * 1800);
      Animated.parallel([
        Animated.timing(x, { toValue: nextX, duration, useNativeDriver: true }),
        Animated.timing(y, { toValue: nextY, duration, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(bob, { toValue: -4, duration: 420, useNativeDriver: true }),
          Animated.timing(bob, { toValue: 0, duration: 420, useNativeDriver: true }),
        ]),
      ]).start(({ finished }) => {
        if (active && finished) wander();
      });
    };
    wander();
    return () => { active = false; x.stopAnimation(); y.stopAnimation(); bob.stopAnimation(); };
  }, [bob, x, y]);

  const dance = () => {
    const nextSong = BEAR_SONGS[Math.floor(Math.random() * BEAR_SONGS.length)];
    setSong(nextSong);
    setIsDancing(true);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(rotation, { toValue: -1, duration: 150, useNativeDriver: true }),
        Animated.timing(rotation, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(rotation, { toValue: -1, duration: 150, useNativeDriver: true }),
        Animated.timing(rotation, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.18, duration: 180, useNativeDriver: true }),
        Animated.timing(scale, { toValue: .92, duration: 150, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1.08, duration: 150, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(bob, { toValue: -12, duration: 180, useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(bob, { toValue: -8, duration: 160, useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]),
    ]).start(() => { setIsDancing(false); onPress(nextSong); });
  };

  return <Animated.View style={[styles.bearWrap, { transform: [{ translateX: x }, { translateY: Animated.add(y, bob) }, { rotate: rotation.interpolate({ inputRange: [-1, 1], outputRange: ['-13deg', '13deg'] }) }, { scale }] }]}>
    {isDancing ? <View style={styles.bearBubble}><Text style={styles.bearBubbleText}>{song}</Text></View> : null}
    <Pressable accessibilityRole="button" accessibilityLabel="Tap the dancing brown bear" onPress={dance} style={styles.bearButton}>
      <Text style={styles.bearHat}>🎓</Text>
      <Text style={styles.bearEmoji}>🐻</Text>
      <View style={styles.bearSpark}><Text style={styles.mascotSparkText}>♪</Text></View>
    </Pressable>
  </Animated.View>;
}

function SparkBurst({ x, y, token }: { x: number; y: number; token: number }) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: 720, useNativeDriver: true }).start();
  }, [progress, token]);
  const opacity = progress.interpolate({ inputRange: [0, .25, 1], outputRange: [0, 1, 0] });
  const particles = [
    { text: '✦', x: -20, y: -17 },
    { text: '✧', x: 19, y: -12 },
    { text: '•', x: -17, y: 17 },
    { text: '✦', x: 19, y: 16 },
  ];
  return <Animated.View pointerEvents="none" style={[styles.sparkBurst, { left: x - 24, top: y - 24, opacity }]}>
    {particles.map((particle, index) => <Animated.Text key={`${token}-${index}`} style={[styles.sparkParticle, { transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, particle.x] }) }, { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, particle.y] }) }, { scale: progress.interpolate({ inputRange: [0, .4, 1], outputRange: [.4, 1.2, .7] }) }] }]}>{particle.text}</Animated.Text>)}
  </Animated.View>;
}

function MovableDrop({ drop, boardWidth, camera, zoom, userId, onMove, onReact, onReply, effectToken, effectMode }: { drop: CanvasDrop; boardWidth: number; camera: { x: number; y: number }; zoom: number; userId: string; onMove: (drop: CanvasDrop, x: number, y: number) => void; onReact: (drop: CanvasDrop) => void; onReply: (drop: CanvasDrop) => void; effectToken?: number; effectMode?: CardEffectMode }) {
  const [position, setPosition] = useState({ x: drop.x, y: drop.y });
  const point = useRef(position);
  const start = useRef(position);
  const dragReady = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardScale = useRef(new Animated.Value(1)).current;
  const celebrationOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => { const next = { x: drop.x, y: drop.y }; point.current = next; setPosition(next); }, [drop.x, drop.y]);
  useEffect(() => {
    if (!effectToken) return;
    cardScale.setValue(.96);
    celebrationOpacity.setValue(1);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(cardScale, { toValue: 1.08, duration: 130, useNativeDriver: true }),
        Animated.timing(cardScale, { toValue: .97, duration: 120, useNativeDriver: true }),
        Animated.timing(cardScale, { toValue: 1.03, duration: 120, useNativeDriver: true }),
        Animated.timing(cardScale, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(420),
        Animated.timing(celebrationOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
    ]).start();
  }, [cardScale, celebrationOpacity, effectToken]);
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      start.current = point.current;
      dragReady.current = false;
      longPressTimer.current = setTimeout(() => { dragReady.current = true; }, 360);
    },
    onPanResponderMove: (_e, g) => {
      if (!dragReady.current) return;
      const next = { x: start.current.x + g.dx / zoom, y: start.current.y + g.dy / zoom };
      point.current = next;
      setPosition(next);
    },
    onPanResponderRelease: (_e, g) => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      if (dragReady.current && Math.abs(g.dx) + Math.abs(g.dy) > 5) onMove(drop, point.current.x, point.current.y);
      dragReady.current = false;
    },
    onPanResponderTerminate: () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      dragReady.current = false;
    },
  }), [drop, onMove, zoom]);
  const reacted = drop.reactedBy.includes(userId);
  const screenX = (position.x - camera.x) * zoom + boardWidth / 2 - CARD_WIDTH / 2;
  const screenY = (position.y - camera.y) * zoom + BOARD_HEIGHT / 2 - 65;
  const template = TEMPLATES.find(item => item.id === drop.template);
  const looksLikeCode = drop.kind === 'text' && (/```/.test(drop.text) || /^\s*(const|let|function|class|def|SELECT)\b/m.test(drop.text));
  const celebration = effectMode === 'first-spark' ? '🎉' : effectMode === 'reply' ? '🌱' : '✨';
  return <Animated.View {...pan.panHandlers} style={[styles.dropCard, { left: screenX, top: screenY, backgroundColor: drop.color, transform: [{ scale: zoom }, { scale: cardScale }, { rotate: cardScale.interpolate({ inputRange: [.96, 1.08], outputRange: ['-2deg', '2deg'] }) }] }]}>
    {effectToken ? <Animated.View pointerEvents="none" style={[styles.cardCelebration, { opacity: celebrationOpacity }]}><Text style={styles.cardCelebrationText}>{celebration}</Text><Text style={[styles.cardCelebrationText, styles.cardCelebrationSecond]}>✦</Text></Animated.View> : null}
    <View style={styles.dropTop}><View style={[styles.tinyAvatar, { backgroundColor: colorFor(drop.authorId) }]}><Text style={styles.tinyAvatarText}>{initials(drop.authorName)}</Text></View><Text style={styles.dropAuthor} numberOfLines={1}>{drop.authorName}</Text><Ionicons name="move-outline" size={14} color="#6E6A65" /></View>
    {drop.parentId ? <View style={styles.branchBadge}><Ionicons name="git-branch-outline" size={10} color="#5E4A9B" /><Text style={styles.branchBadgeText}>BRANCHED REPLY</Text></View> : template && template.id !== 'FREEFORM' ? <View style={styles.templateBadge}><Text style={styles.templateBadgeText}>{template.emoji} {template.label}</Text></View> : null}
    <Text style={[styles.dropText, looksLikeCode && styles.codeText]}>{drop.text}</Text>
    <View style={styles.dropActions}><Pressable style={[styles.sparkButton, reacted && styles.sparkButtonActive]} onPress={() => onReact(drop)}><Text>{reacted ? '✨' : '✦'}</Text><Text style={styles.sparkText}>{drop.reactedBy.length || 'spark'}</Text></Pressable><Pressable style={styles.replyButton} onPress={() => onReply(drop)}><Ionicons name="git-branch-outline" size={12} color="#5E4A9B" /><Text style={styles.replyText}>Reply</Text></Pressable></View>
  </Animated.View>;
}

function BranchLines({ drops, boardWidth, camera, zoom, activeBranchId, animationToken }: { drops: CanvasDrop[]; boardWidth: number; camera: { x: number; y: number }; zoom: number; activeBranchId: string | null; animationToken: number }) {
  const progress = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!activeBranchId) return;
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: 700, useNativeDriver: false }).start();
  }, [activeBranchId, animationToken, progress]);
  const activeDrop = activeBranchId ? drops.find((drop) => drop.id === activeBranchId) : undefined;
  const activePoint = activeDrop ? { x: (activeDrop.x - camera.x) * zoom + boardWidth / 2, y: (activeDrop.y - camera.y) * zoom + BOARD_HEIGHT / 2 } : null;
  return <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
    <Svg pointerEvents="none" width={boardWidth} height={BOARD_HEIGHT}>
    {drops.filter(drop => drop.parentId).map(drop => {
    const parent = drops.find(item => item.id === drop.parentId);
    if (!parent) return null;
    const x1 = (parent.x - camera.x) * zoom + boardWidth / 2;
    const y1 = (parent.y - camera.y) * zoom + BOARD_HEIGHT / 2;
    const x2 = (drop.x - camera.x) * zoom + boardWidth / 2;
    const y2 = (drop.y - camera.y) * zoom + BOARD_HEIGHT / 2;
    const direction = x2 >= x1 ? 1 : -1;
    const bend = Math.max(36, Math.min(120, Math.abs(x2 - x1) * .45));
    const path = `M ${x1} ${y1} C ${x1 + direction * bend} ${y1}, ${x2 - direction * bend} ${y2}, ${x2} ${y2}`;
    const active = drop.id === activeBranchId;
    return <Fragment key={`branch-${drop.id}`}><Path d={path} fill="none" stroke="#6C4CF6" strokeWidth={5} strokeLinecap="round" opacity={.12} /><AnimatedPath d={path} fill="none" stroke="#8B78D7" strokeWidth={2.5} strokeLinecap="round" opacity={active ? .85 : .7} strokeDasharray={active ? [1000, 1000] : undefined} strokeDashoffset={active ? progress.interpolate({ inputRange: [0, 1], outputRange: [1000, 0] }) : undefined} /></Fragment>;
  })}
    </Svg>
    {activePoint ? <SparkBurst key={`${activeBranchId}-${animationToken}`} x={activePoint.x} y={activePoint.y} token={animationToken} /> : null}
  </View>;
}

function MiniMap({ drops, camera, onHome }: { drops: CanvasDrop[]; camera: { x: number; y: number }; onHome: () => void }) {
  const points = drops.length ? drops : [{ x: 0, y: 0 }];
  const minX = Math.min(camera.x, ...points.map(item => item.x));
  const maxX = Math.max(camera.x, ...points.map(item => item.x));
  const minY = Math.min(camera.y, ...points.map(item => item.y));
  const maxY = Math.max(camera.y, ...points.map(item => item.y));
  const rangeX = Math.max(360, maxX - minX + 240);
  const rangeY = Math.max(280, maxY - minY + 180);
  return <Pressable accessibilityRole="button" accessibilityLabel="Return to canvas centre" style={styles.minimap} onPress={onHome}>
    {drops.slice(-40).map(drop => <View key={drop.id} style={[styles.mapDot, { left: 6 + ((drop.x - minX + 120) / rangeX) * 66, top: 6 + ((drop.y - minY + 90) / rangeY) * 42, backgroundColor: drop.color }]} />)}
    <View style={[styles.mapCamera, { left: 4 + ((camera.x - minX + 120) / rangeX) * 66, top: 4 + ((camera.y - minY + 90) / rangeY) * 42 }]} />
  </Pressable>;
}

export default function CampusCanvasScreen() {
  const responsive = useResponsiveLayout();
  const { user, profile } = useAuthStore();
  const userId = user?.uid ?? 'local-user';
  const userName = profile?.name ?? 'You';
  const roomId = CANVAS_ROOM_ID;
  const [drops, setDrops] = useState<CanvasDrop[]>(DEMO_DROPS);
  const [people, setPeople] = useState<CanvasPerson[]>([]);
  const [boardWidth, setBoardWidth] = useState(340);
  const [camera, setCamera] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [draftPoint, setDraftPoint] = useState<{ screenX: number; screenY: number; worldX: number; worldY: number } | null>(null);
  const [draft, setDraft] = useState('');
  const [chatDraft, setChatDraft] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [isSynced, setIsSynced] = useState(Boolean(user));
  const [notice, setNotice] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<CanvasDrop | null>(null);
  const selectedTemplate: CanvasDropTemplate = 'FREEFORM';
  const [searchQuery, setSearchQuery] = useState('');
  const [showOpenOnly, setShowOpenOnly] = useState(false);
  const [canvasLocked, setCanvasLocked] = useState(false);
  const [canvasFullScreen, setCanvasFullScreen] = useState(false);
  const [foundSurprise, setFoundSurprise] = useState(false);
  const [cardEffect, setCardEffect] = useState<CardEffect | null>(null);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [branchAnimationToken, setBranchAnimationToken] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const composerRef = useRef<View>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const room = CANVAS_ROOM;
  const dailySurprise = useMemo(() => getDailySurprise(roomId), [roomId]);
  const cameraRef = useRef(camera);
  const zoomRef = useRef(zoom);
  const gestureStart = useRef({ camera, zoom });
  const canvasMovedRef = useRef(false);
  const reactionCountsRef = useRef(new Map<string, number>());

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', event => setKeyboardHeight(event.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  useEffect(() => {
    if (!draftPoint || !keyboardHeight) return;
    const revealComposer = () => composerRef.current?.measureInWindow((_x, y, _width, height) => {
      const visibleBottom = Dimensions.get('window').height - keyboardHeight - 16;
      const bottom = y + height;
      if (bottom > visibleBottom) {
        scrollRef.current?.scrollTo({ y: Math.max(0, bottom - visibleBottom), animated: true });
      } else if (y < 16) {
        scrollRef.current?.scrollTo({ y: Math.max(0, y - 16), animated: true });
      }
    });
    const timer = setTimeout(revealComposer, 80);
    return () => clearTimeout(timer);
  }, [draftPoint, keyboardHeight]);

  useEffect(() => { cameraRef.current = camera; }, [camera]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  useEffect(() => { setCamera({ x: 0, y: 0 }); setZoom(1); setDraftPoint(null); }, [roomId]);

  useEffect(() => {
    let mounted = true;
    setFoundSurprise(false);
    AsyncStorage.getItem(`citians.canvas-surprise.${roomId}.${getTodayKey()}`).then((value) => {
      if (mounted) setFoundSurprise(value === 'found');
    }).catch(() => undefined);
    return () => { mounted = false; };
  }, [roomId]);

  useEffect(() => { reactionCountsRef.current = new Map(); }, [roomId, userId]);

  useEffect(() => {
    setDrops(user ? [] : DEMO_DROPS); setPeople([]);
    if (!user) { setIsSynced(false); return; }
    const identity = { id: userId, name: userName, color: colorFor(userId) };
    enterCanvasRoom(roomId, identity).catch(() => setIsSynced(false));
    const beat = setInterval(() => enterCanvasRoom(roomId, identity).catch(() => undefined), 30_000);
    const offDrops = subscribeToCanvasDrops(roomId, items => { setDrops(items); setIsSynced(true); }, () => { setIsSynced(false); setDrops(DEMO_DROPS); });
    const offPeople = subscribeToCanvasPeople(roomId, setPeople);
    return () => { clearInterval(beat); offDrops(); offPeople(); leaveCanvasRoom(roomId, userId).catch(() => undefined); };
  }, [roomId, user, userId, userName]);

  const findSurprise = () => {
    setFoundSurprise(true);
    AsyncStorage.setItem(`citians.canvas-surprise.${roomId}.${getTodayKey()}`, 'found').catch(() => undefined);
    setNotice(`You found the ${dailySurprise.name}! 🎉`);
  };

  const mentionSuggestions = useMemo(() => {
    const match = draft.match(/(^|\s)@([^\s@]*)$/);
    if (!match) return [];
    const query = match[2].toLowerCase();
    return people.filter((person) => person.id !== userId && person.name.toLowerCase().startsWith(query)).slice(0, 4);
  }, [draft, people, userId]);

  const chooseMention = (person: CanvasPerson) => {
    const match = draft.match(/(^|\s)@([^\s@]*)$/);
    if (!match || match.index === undefined) return;
    const tokenStart = match.index + match[1].length;
    setDraft(`${draft.slice(0, tokenStart)}@${person.name} `);
  };

  const saveDrop = useCallback(async (text: string, at?: { worldX: number; worldY: number }) => {
    const clean = text.trim(); if (!clean) return;
    const parent = replyTarget;
    const localId = `local-${Date.now()}-${Math.round(Math.random() * 1000)}`;
    const mentionedPeople = people.filter((person) => {
      if (person.id === userId) return false;
      const normalizedText = clean.toLowerCase();
      const fullName = `@${person.name.toLowerCase()}`;
      const firstName = `@${person.name.trim().split(/\s+/)[0].toLowerCase()}`;
      return normalizedText.includes(fullName) || normalizedText.includes(firstName);
    });
    const payload = { kind: 'text' as const, authorId: userId, authorName: userName, text: clean, x: at?.worldX ?? camera.x + (Math.random() - .5) * 100, y: at?.worldY ?? camera.y + (Math.random() - .5) * 100, color: NOTE_COLORS[drops.length % NOTE_COLORS.length], reactedBy: [] as string[], parentId: parent?.id ?? null, template: selectedTemplate, mentions: mentionedPeople.map((person) => person.id), mentionNames: mentionedPeople.map((person) => person.name) };
    let createdId = localId;
    if (user && isSynced) {
      try { createdId = await createCanvasDrop(roomId, payload); }
      catch { setIsSynced(false); setDrops(items => [...items, { id: localId, ...payload }]); }
    } else setDrops(items => [...items, { id: localId, ...payload }]);
    if (parent) {
      setActiveBranchId(createdId);
      setBranchAnimationToken((token) => token + 1);
      setCardEffect({ dropId: parent.id, token: Date.now(), mode: 'reply' });
    }
    setDraft(''); setChatDraft(''); setDraftPoint(null); setReplyTarget(null); setNotice(parent ? `Reply linked to ${parent.authorName} ✦` : 'Your thought landed ✦');
  }, [camera.x, camera.y, drops.length, isSynced, people, replyTarget, roomId, selectedTemplate, user, userId, userName]);

  const moveDrop = useCallback((drop: CanvasDrop, x: number, y: number) => { setDrops(items => items.map(item => item.id === drop.id ? { ...item, x, y } : item)); if (user && isSynced && !drop.id.startsWith('local-')) moveCanvasDrop(roomId, drop.id, x, y).catch(() => setIsSynced(false)); }, [isSynced, roomId, user]);
  const react = useCallback((drop: CanvasDrop) => { const had = drop.reactedBy.includes(userId); setDrops(items => items.map(item => item.id === drop.id ? { ...item, reactedBy: had ? item.reactedBy.filter(id => id !== userId) : [...item.reactedBy, userId] } : item)); if (user && isSynced && !drop.id.startsWith('local-')) toggleCanvasReaction(roomId, drop.id, userId, had).catch(() => setIsSynced(false)); }, [isSynced, roomId, user, userId]);

  const canvasPan = useMemo(() => Gesture.Pan().enabled(true).maxPointers(1).minDistance(4).runOnJS(true)
    .onBegin(() => { canvasMovedRef.current = false; gestureStart.current = { camera: cameraRef.current, zoom: zoomRef.current }; setDraftPoint(null); })
    .onUpdate(event => { canvasMovedRef.current = true; const start = gestureStart.current; const next = { x: start.camera.x - event.translationX / start.zoom, y: start.camera.y - event.translationY / start.zoom }; cameraRef.current = next; setCamera(next); })
    .onFinalize(() => { setTimeout(() => { canvasMovedRef.current = false; }, 160); }), [canvasLocked]);
  const canvasPinch = useMemo(() => Gesture.Pinch().enabled(true).runOnJS(true)
    .onBegin(() => { canvasMovedRef.current = false; gestureStart.current = { camera: cameraRef.current, zoom: zoomRef.current }; setDraftPoint(null); })
    .onUpdate(event => { canvasMovedRef.current = true; const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, gestureStart.current.zoom * event.scale)); zoomRef.current = next; setZoom(next); })
    .onFinalize(() => { setTimeout(() => { canvasMovedRef.current = false; }, 160); }), [canvasLocked]);
  const canvasGesture = useMemo(() => Gesture.Simultaneous(canvasPan, canvasPinch), [canvasPan, canvasPinch]);
  const onCanvasPress = (event: { nativeEvent: { locationX: number; locationY: number } }) => {
    if (canvasMovedRef.current) return;
    const locationX = Number.isFinite(event.nativeEvent.locationX) ? event.nativeEvent.locationX : boardWidth / 2;
    const locationY = Number.isFinite(event.nativeEvent.locationY) ? event.nativeEvent.locationY : BOARD_HEIGHT / 2;
    setDraftPoint({ screenX: locationX, screenY: locationY, worldX: camera.x + (locationX - boardWidth / 2) / zoom, worldY: camera.y + (locationY - BOARD_HEIGHT / 2) / zoom }); setDraft('');
  };
  const onBoardLayout = (event: LayoutChangeEvent) => setBoardWidth(event.nativeEvent.layout.width);
  const textDrops = drops.filter(drop => drop.kind === 'text');
  useEffect(() => {
    const previous = reactionCountsRef.current;
    const addedSpark = textDrops.find((drop) => {
      const oldCount = previous.get(drop.id);
      return oldCount !== undefined && drop.reactedBy.length > oldCount;
    });
    if (addedSpark) {
      const oldCount = previous.get(addedSpark.id) ?? 0;
      setCardEffect({ dropId: addedSpark.id, token: Date.now(), mode: addedSpark.authorId === userId && oldCount === 0 ? 'first-spark' : 'reaction' });
    }
    reactionCountsRef.current = new Map(textDrops.map((drop) => [drop.id, drop.reactedBy.length]));
  }, [textDrops, userId]);
  const visiblePeople: CanvasPerson[] = people.length ? people : [{ id: userId, name: userName, color: colorFor(userId), isTalking: false }];
  const openDropIds = useMemo(() => new Set(textDrops.filter(drop => !drop.parentId && !textDrops.some(reply => reply.parentId === drop.id)).map(drop => drop.id)), [textDrops]);
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const boardDrops = useMemo(() => textDrops.filter((drop) => {
    if (showOpenOnly && !openDropIds.has(drop.id)) return false;
    if (!normalizedSearch) return true;
    return [drop.text, drop.authorName, ...(drop.tags ?? []), ...(drop.mentionNames ?? [])].join(' ').toLowerCase().includes(normalizedSearch);
  }), [normalizedSearch, openDropIds, showOpenOnly, textDrops]);
  const visibleDrops = useMemo(() => boardDrops.filter(drop => {
    const x = (drop.x - camera.x) * zoom + boardWidth / 2;
    const y = (drop.y - camera.y) * zoom + BOARD_HEIGHT / 2;
    return x > -220 && x < boardWidth + 220 && y > -180 && y < BOARD_HEIGHT + 180;
  }), [boardDrops, boardWidth, camera.x, camera.y, zoom]);
  const grid = useMemo(() => {
    const size = GRID_SIZE * zoom;
    const offsetX = ((boardWidth / 2 - camera.x * zoom) % size + size) % size;
    const offsetY = ((BOARD_HEIGHT / 2 - camera.y * zoom) % size + size) % size;
    return { size, offsetX, offsetY, columns: Math.ceil(boardWidth / size) + 1, rows: Math.ceil(BOARD_HEIGHT / size) + 1 };
  }, [boardWidth, camera.x, camera.y, zoom]);
  const changeZoom = (amount: number) => setZoom(current => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current + amount)));
  const goHome = () => { setCamera({ x: 0, y: 0 }); setZoom(1); setDraftPoint(null); };
  const jumpToDrop = (drop: CanvasDrop) => { setCamera({ x: drop.x, y: drop.y }); setZoom(Math.max(zoom, .85)); setShowChat(false); setDraftPoint(null); };

  return <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView ref={scrollRef} scrollEnabled={!canvasLocked} contentContainerStyle={[styles.content, responsive.readableContentStyle, { paddingHorizontal: canvasFullScreen ? 0 : responsive.gutter, paddingTop: canvasFullScreen ? 0 : undefined }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {!canvasFullScreen ? <><View style={styles.hero}><View style={styles.heroCopy}><View style={styles.eyebrowRow}><View style={styles.liveDot} /><Text style={styles.eyebrow}>{isSynced ? 'LIVE TOGETHER' : 'PLAYGROUND MODE'}</Text></View><Text style={styles.title}>Say it where it matters.</Text><Text style={styles.subtitle}>A shared campus space for thoughts and tiny sparks.</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Open room chat" style={styles.chatButton} onPress={() => setShowChat(true)}><Ionicons name="chatbubbles" size={19} color="#FFF" />{textDrops.length ? <View style={styles.chatBadge}><Text style={styles.chatBadgeText}>{textDrops.length}</Text></View> : null}</Pressable></View>
      <View style={styles.searchBar}><Ionicons name="search-outline" size={18} color="#6E6685" /><TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder="Search cards, students, or tags..." placeholderTextColor="#8A8179" style={styles.searchInput} returnKeyType="search" />{searchQuery ? <Pressable accessibilityLabel="Clear canvas search" onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={18} color="#8A8179" /></Pressable> : null}</View>
       <View style={styles.canvasFilterRow}><Text style={styles.canvasFilterHint}>{searchQuery.trim() ? `${boardDrops.length} matching card${boardDrops.length === 1 ? '' : 's'}` : showOpenOnly ? `${openDropIds.size} open conversation${openDropIds.size === 1 ? '' : 's'}` : `${textDrops.length} drops on the canvas`}</Text><Pressable accessibilityRole="button" accessibilityLabel={showOpenOnly ? 'Show all canvas drops' : 'Show open conversations only'} style={[styles.filterButton, showOpenOnly && styles.filterButtonActive]} onPress={() => setShowOpenOnly(value => !value)}><Ionicons name={showOpenOnly ? 'filter' : 'filter-outline'} size={13} color={showOpenOnly ? '#FFF' : '#5E4A9B'} /><Text style={[styles.filterButtonText, showOpenOnly && styles.filterButtonTextActive]}>{showOpenOnly ? 'Open only' : 'All drops'}</Text></Pressable></View></> : null}
       <View style={[styles.boardShell, canvasFullScreen && styles.boardShellFullScreen]}><View style={styles.boardToolbar}><View><Text style={styles.boardHint}>{canvasLocked ? '🔒 page scroll locked · canvas movable' : '✋ drag space · pinch to zoom'}</Text><Text style={styles.worldPosition}>{Math.round(camera.x)}, {Math.round(camera.y)} · {Math.round(zoom * 100)}%</Text></View><View style={styles.toolbarActions}><Pressable accessibilityRole="button" accessibilityLabel={canvasLocked ? 'Unlock page scrolling' : 'Lock page scrolling'} style={[styles.lockButton, canvasLocked && styles.lockButtonActive]} onPress={() => { setCanvasLocked(value => !value); setDraftPoint(null); }}><Ionicons name={canvasLocked ? 'lock-closed' : 'lock-open-outline'} size={13} color={canvasLocked ? '#FFF' : '#5E4A9B'} /><Text style={[styles.lockButtonText, canvasLocked && styles.lockButtonTextActive]}>{canvasLocked ? 'Locked' : 'Lock'}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={canvasFullScreen ? 'Exit canvas fullscreen' : 'Open canvas fullscreen'} style={styles.fullScreenButton} onPress={() => setCanvasFullScreen(value => !value)}><Ionicons name={canvasFullScreen ? 'contract-outline' : 'expand-outline'} size={15} color="#5E4A9B" /></Pressable><View style={styles.syncPill}><View style={[styles.syncDot, !isSynced && styles.syncDotDemo]} /><Text style={styles.syncText}>{isSynced ? `${visiblePeople.length} here` : 'demo'}</Text></View></View></View>
        <View style={[styles.board, { backgroundColor: room.tint }]} onLayout={onBoardLayout}>
          <GestureDetector gesture={canvasGesture}><View style={StyleSheet.absoluteFill}><Pressable accessibilityRole="button" accessibilityLabel="Tap to add to infinite conversation canvas" style={StyleSheet.absoluteFill} onPress={onCanvasPress} /></View></GestureDetector>
          {Array.from({ length: grid.columns }).map((_, i) => <View pointerEvents="none" key={`v-${i}`} style={[styles.gridLine, styles.gridVertical, { left: grid.offsetX + i * grid.size }]} />)}
          {Array.from({ length: grid.rows }).map((_, i) => <View pointerEvents="none" key={`h-${i}`} style={[styles.gridLine, styles.gridHorizontal, { top: grid.offsetY + i * grid.size }]} />)}
          <Text style={styles.boardWatermark}>{room.emoji}</Text>
           <BranchLines drops={visibleDrops} boardWidth={boardWidth} camera={camera} zoom={zoom} activeBranchId={activeBranchId} animationToken={branchAnimationToken} />
           {!foundSurprise ? <Pressable accessibilityRole="button" accessibilityLabel={`Find hidden ${dailySurprise.name}`} onPress={findSurprise} style={[styles.surpriseButton, { left: (dailySurprise.x - camera.x) * zoom + boardWidth / 2 - 15, top: (dailySurprise.y - camera.y) * zoom + BOARD_HEIGHT / 2 - 15, backgroundColor: dailySurprise.color, transform: [{ scale: Math.max(.72, Math.min(1.05, zoom)) }] }]}><Text style={styles.surpriseEmoji}>{dailySurprise.emoji}</Text><View style={styles.surpriseDot} /></Pressable> : null}
           {visibleDrops.map(drop => { const effect = cardEffect?.dropId === drop.id ? cardEffect : null; return <MovableDrop key={drop.id} drop={drop} boardWidth={boardWidth} camera={camera} zoom={zoom} userId={userId} onMove={moveDrop} onReact={react} effectToken={effect?.token} effectMode={effect?.mode} onReply={(target) => { setReplyTarget(target); setNotice(`Tap where you want to place a reply to ${target.authorName}`); }} />; })}
           {!textDrops.length && !draftPoint ? <View style={styles.emptyState} pointerEvents="none"><Text style={styles.emptyEmoji}>✦</Text><Text style={styles.emptyTitle}>This space is wide open</Text><Text style={styles.emptyText}>Tap anywhere and be the first thought in the room.</Text></View> : null}
           {textDrops.length > 0 && !boardDrops.length && !draftPoint ? <View style={styles.emptyState} pointerEvents="none"><Text style={styles.emptyEmoji}>⌕</Text><Text style={styles.emptyTitle}>No matching cards</Text><Text style={styles.emptyText}>Try another student, phrase, or tag.</Text></View> : null}
          {draftPoint ? <View ref={composerRef} style={[styles.inlineComposer, { left: Math.min(Math.max(8, draftPoint.screenX - 20), Math.max(8, boardWidth - 216)), top: Math.min(draftPoint.screenY, BOARD_HEIGHT - 130) }]}><Text style={styles.inlineLabel}>{replyTarget ? `REPLY TO ${replyTarget.authorName.toUpperCase()}` : `${TEMPLATES.find(item => item.id === selectedTemplate)?.emoji ?? '✦'} ${TEMPLATES.find(item => item.id === selectedTemplate)?.label.toUpperCase()}`}</Text><TextInput autoFocus multiline value={draft} onChangeText={setDraft} maxLength={220} placeholder={replyTarget ? 'Write your reply…' : TEMPLATES.find(item => item.id === selectedTemplate)?.prompt} placeholderTextColor="#8A8179" style={styles.inlineInput} />{mentionSuggestions.length ? <View style={styles.mentionSuggestions}>{mentionSuggestions.map((person) => <Pressable key={person.id} style={styles.mentionSuggestion} onPress={() => chooseMention(person)}><View style={[styles.mentionAvatar, { backgroundColor: person.color }]}><Text style={styles.mentionAvatarText}>{initials(person.name)}</Text></View><Text style={styles.mentionName}>@{person.name}</Text></Pressable>)}</View> : null}<View style={styles.inlineActions}><Pressable onPress={() => { setDraftPoint(null); setReplyTarget(null); }}><Text style={styles.cancelText}>Cancel</Text></Pressable><Pressable style={[styles.landButton, !draft.trim() && styles.disabled]} disabled={!draft.trim()} onPress={() => saveDrop(draft, draftPoint)}><Text style={styles.landButtonText}>{replyTarget ? 'Connect it ↑' : 'Land it ↑'}</Text></Pressable></View></View> : null}
          <View style={styles.zoomControls}><Pressable accessibilityLabel="Zoom in" style={styles.zoomButton} onPress={() => changeZoom(.18)}><Ionicons name="add" size={17} color="#332D50" /></Pressable><View style={styles.zoomDivider} /><Pressable accessibilityLabel="Zoom out" style={styles.zoomButton} onPress={() => changeZoom(-.18)}><Ionicons name="remove" size={17} color="#332D50" /></Pressable><View style={styles.zoomDivider} /><Pressable accessibilityLabel="Reset canvas view" style={styles.zoomButton} onPress={goHome}><Ionicons name="locate-outline" size={16} color="#6C4CF6" /></Pressable></View>
           <MiniMap drops={textDrops} camera={camera} onHome={goHome} />
           {boardDrops.length > 0 ? <Pressable accessibilityRole="button" accessibilityLabel="Jump to latest conversation" style={styles.latestButton} onPress={() => jumpToDrop(boardDrops[boardDrops.length - 1])}><Ionicons name="navigate" size={13} color="#FFF" /><Text style={styles.latestText}>Latest</Text></Pressable> : null}
        </View>
      </View>
    </ScrollView>
    <Modal visible={showChat} animationType="slide" transparent onRequestClose={() => setShowChat(false)}><KeyboardAvoidingView style={styles.modalShade} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><Pressable style={styles.modalDismiss} onPress={() => setShowChat(false)} /><View style={styles.chatSheet}><View style={styles.sheetHandle} /><View style={styles.chatHeader}><View><Text style={styles.chatTitle}>{room.emoji} Room thread</Text><Text style={styles.chatSubtitle}>Tap a message to fly to it on the canvas.</Text></View><Pressable style={styles.closeButton} onPress={() => setShowChat(false)}><Ionicons name="close" size={20} color="#31302E" /></Pressable></View><ScrollView style={styles.chatList} contentContainerStyle={styles.chatListContent} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">{!textDrops.length ? <Text style={styles.noChat}>No messages yet — start something.</Text> : textDrops.map(drop => <Pressable accessibilityRole="button" accessibilityLabel={`Go to message from ${drop.authorName}`} onPress={() => jumpToDrop(drop)} key={drop.id} style={styles.chatRow}><View style={[styles.chatAvatar, { backgroundColor: colorFor(drop.authorId) }]}><Text style={styles.chatAvatarText}>{initials(drop.authorName)}</Text></View><View style={styles.chatBubble}><Text style={styles.chatAuthor}>{drop.authorName}</Text><Text style={styles.chatMessage}>{drop.text}</Text><Text style={styles.chatCoordinates}>⌖ {Math.round(drop.x)}, {Math.round(drop.y)}</Text></View></Pressable>)}</ScrollView><View style={styles.chatComposer}><TextInput value={chatDraft} onChangeText={setChatDraft} placeholder="Add near this view…" placeholderTextColor="#8A8179" style={styles.chatInput} /><Pressable disabled={!chatDraft.trim()} style={[styles.chatSend, !chatDraft.trim() && styles.disabled]} onPress={() => saveDrop(chatDraft)}><Ionicons name="arrow-up" size={19} color="#FFF" /></Pressable></View></View></KeyboardAvoidingView></Modal>
    {notice ? <Pressable style={styles.notice} onPress={() => setNotice(null)}><Text style={styles.noticeText}>{notice}</Text></Pressable> : null}
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F4EE' }, content: { paddingHorizontal: spacing.md, paddingTop: 10, paddingBottom: 56 },
  surpriseButton: { position: 'absolute', width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', zIndex: 2, borderWidth: 2, borderColor: 'rgba(255,255,255,.9)', shadowColor: '#6C4CF6', shadowOpacity: .22, shadowRadius: 7, shadowOffset: { width: 0, height: 3 }, elevation: 4 }, surpriseEmoji: { fontSize: 16 }, surpriseDot: { position: 'absolute', right: -1, top: -2, width: 7, height: 7, borderRadius: 4, backgroundColor: '#FF5A4F', borderWidth: 1, borderColor: '#FFF' },
  sparkBurst: { position: 'absolute', width: 48, height: 48, zIndex: 20, alignItems: 'center', justifyContent: 'center' }, sparkParticle: { position: 'absolute', color: '#F1A92B', fontSize: 18, fontWeight: '900' },
  cardCelebration: { position: 'absolute', top: -24, right: 8, zIndex: 8, flexDirection: 'row', alignItems: 'center' }, cardCelebrationText: { fontSize: 21 }, cardCelebrationSecond: { color: '#F1A92B', fontSize: 15, marginLeft: 4, marginTop: -11 },
  hero: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 }, heroCopy: { flex: 1, paddingRight: 14 }, eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 }, liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FF5A4F' }, eyebrow: { fontSize: 9, fontFamily: fontFamilies.mono, letterSpacing: 1.3, color: '#665F58' }, title: { color: '#1E1D1B', fontSize: 31, lineHeight: 34, fontFamily: fontFamilies.displayStrong, letterSpacing: -1 }, subtitle: { color: '#69635D', fontFamily: fontFamilies.body, fontSize: 13, lineHeight: 19, marginTop: 5 },
  chatButton: { width: 48, height: 48, borderRadius: 17, backgroundColor: '#1F1E1C', alignItems: 'center', justifyContent: 'center' }, chatBadge: { position: 'absolute', right: -5, top: -5, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: '#FF5A4F', borderWidth: 2, borderColor: '#F7F4EE', alignItems: 'center', justifyContent: 'center' }, chatBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '900' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E4DDED', borderRadius: 16, paddingHorizontal: 12, minHeight: 44, marginBottom: 8 }, searchInput: { flex: 1, minHeight: 40, color: '#332D50', fontSize: 13, paddingVertical: 0 },
  canvasFilterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }, canvasFilterHint: { color: '#8A8179', fontSize: 10, fontWeight: '700', flex: 1 }, filterButton: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 13, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: '#EEE9FF' }, filterButtonActive: { backgroundColor: '#6C4CF6' }, filterButtonText: { color: '#5E4A9B', fontSize: 9, fontWeight: '900' }, filterButtonTextActive: { color: '#FFF' },
  boardShell: { backgroundColor: '#FFF', borderRadius: 25, padding: 7, borderWidth: 1, borderColor: '#E7E1D8', shadowColor: '#4B4035', shadowOpacity: .08, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 3 }, boardShellFullScreen: { borderRadius: 0, borderWidth: 0, padding: 0, minHeight: '100%' }, boardToolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 9, paddingVertical: 7 }, boardHint: { color: '#5F5872', fontSize: 10, fontWeight: '800' }, worldPosition: { color: '#9A92AE', fontSize: 8, fontWeight: '700', marginTop: 2 }, toolbarActions: { flexDirection: 'row', alignItems: 'center', gap: 6 }, lockButton: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 14, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: '#EEE9FF', borderWidth: 1, borderColor: '#DCD1FF' }, lockButtonActive: { backgroundColor: '#6C4CF6', borderColor: '#6C4CF6' }, lockButtonText: { color: '#5E4A9B', fontSize: 9, fontWeight: '900' }, lockButtonTextActive: { color: '#FFF' }, fullScreenButton: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEE9FF', borderWidth: 1, borderColor: '#DCD1FF' }, syncPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F1EFEA', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 }, syncDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#2AA878' }, syncDotDemo: { backgroundColor: '#F19A3E' }, syncText: { color: '#625D57', fontSize: 9, fontWeight: '900' },
  board: { height: BOARD_HEIGHT, borderRadius: 20, overflow: 'hidden' }, gridLine: { position: 'absolute', backgroundColor: 'rgba(108,76,246,.10)' }, gridVertical: { top: 0, bottom: 0, width: 1 }, gridHorizontal: { left: 0, right: 0, height: 1 }, boardWatermark: { position: 'absolute', left: '47%', top: '44%', fontSize: 54, opacity: .035 }, mascotWrap: { position: 'absolute', width: 42, height: 48, zIndex: 3 }, mascotButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,.86)', shadowColor: '#483A64', shadowOpacity: .18, shadowRadius: 7, shadowOffset: { width: 0, height: 4 }, elevation: 4 }, mascotEmoji: { fontSize: 23 }, mascotSpark: { position: 'absolute', right: -3, top: -5, width: 14, height: 14, borderRadius: 7, backgroundColor: '#FFF8B6', alignItems: 'center', justifyContent: 'center' }, mascotSparkText: { color: '#D88924', fontSize: 9, fontWeight: '900' }, bearWrap: { position: 'absolute', left: 0, top: 0, width: 74, height: 92, zIndex: 4, alignItems: 'center' }, bearButton: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#B86F46', borderWidth: 3, borderColor: '#FFE7C4', alignItems: 'center', justifyContent: 'center', shadowColor: '#6F3F2C', shadowOpacity: .3, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 6 }, bearEmoji: { fontSize: 32, marginTop: 5 }, bearHat: { position: 'absolute', zIndex: 2, top: -18, right: 1, fontSize: 18, transform: [{ rotate: '12deg' }] }, bearSpark: { position: 'absolute', right: -7, top: -7, width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFF4A8', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' }, bearBubble: { position: 'absolute', bottom: 69, left: -25, width: 124, backgroundColor: '#FFFDF7', borderRadius: 13, borderBottomLeftRadius: 4, paddingHorizontal: 8, paddingVertical: 7, shadowColor: '#573B2B', shadowOpacity: .18, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5 }, bearBubbleText: { color: '#754833', fontSize: 9, lineHeight: 13, fontWeight: '900', textAlign: 'center' },
  dropCard: { position: 'absolute', width: CARD_WIDTH, minHeight: 112, borderRadius: 17, padding: 11, shadowColor: '#554A40', shadowOpacity: .14, shadowRadius: 8, shadowOffset: { width: 0, height: 5 }, elevation: 5, transform: [{ rotate: '-1deg' }] }, dropTop: { flexDirection: 'row', alignItems: 'center', gap: 6 }, tinyAvatar: { width: 23, height: 23, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, tinyAvatarText: { color: '#FFF', fontSize: 8, fontWeight: '900' }, dropAuthor: { flex: 1, color: '#3D3935', fontSize: 10, fontWeight: '900' }, templateBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,.55)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3, marginTop: 7 }, templateBadgeText: { color: '#5E4A9B', fontSize: 8, fontWeight: '900' }, branchBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 3, backgroundColor: 'rgba(255,255,255,.65)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3, marginTop: 7 }, branchBadgeText: { color: '#5E4A9B', fontSize: 7, fontWeight: '900', letterSpacing: .5 }, dropText: { color: '#272522', fontSize: 13, lineHeight: 18, fontWeight: '700', marginTop: 9 }, codeText: { fontFamily: fontFamilies.mono, fontSize: 11, lineHeight: 16, backgroundColor: 'rgba(255,255,255,.45)', borderRadius: 8, padding: 7 }, dropActions: { flexDirection: 'row', alignItems: 'center', gap: 5 }, sparkButton: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(255,255,255,.55)', marginTop: 9 }, sparkButtonActive: { backgroundColor: '#FFF' }, sparkText: { color: '#625D57', fontSize: 9, fontWeight: '900' }, replyButton: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(255,255,255,.55)', marginTop: 9 }, replyText: { color: '#5E4A9B', fontSize: 9, fontWeight: '900' },
  emptyState: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 48 }, emptyEmoji: { fontSize: 27, color: '#A9A099' }, emptyTitle: { color: '#4B4641', fontSize: 17, fontFamily: fontFamilies.display, marginTop: 8 }, emptyText: { color: '#7E766F', fontFamily: fontFamilies.body, fontSize: 12, textAlign: 'center', lineHeight: 18, marginTop: 4 },
  inlineComposer: { position: 'absolute', width: 208, backgroundColor: '#FFF', borderRadius: 17, padding: 11, shadowColor: '#312A25', shadowOpacity: .2, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 8 }, inlineLabel: { color: '#FF5A4F', fontSize: 8, fontWeight: '900', letterSpacing: 1.2 }, inlineInput: { minHeight: 52, maxHeight: 82, color: '#272522', fontSize: 13, lineHeight: 18, paddingVertical: 7, textAlignVertical: 'top' }, mentionSuggestions: { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E4DDED', padding: 4, marginTop: 4 }, mentionSuggestion: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 6, paddingVertical: 6, borderRadius: 8 }, mentionAvatar: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }, mentionAvatarText: { color: '#FFF', fontSize: 8, fontWeight: '900' }, mentionName: { color: '#4B4641', fontSize: 11, fontWeight: '800' }, inlineActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, cancelText: { color: '#777069', fontSize: 10, fontWeight: '700' }, landButton: { backgroundColor: '#1F1E1C', borderRadius: 12, paddingHorizontal: 11, paddingVertical: 7 }, landButtonText: { color: '#FFF', fontSize: 10, fontWeight: '900' }, disabled: { opacity: .3 },
  zoomControls: { position: 'absolute', right: 10, top: 10, backgroundColor: 'rgba(255,255,255,.94)', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#DED7F5', shadowColor: '#6C4CF6', shadowOpacity: .14, shadowRadius: 8, elevation: 5 }, zoomButton: { width: 34, height: 33, alignItems: 'center', justifyContent: 'center' }, zoomDivider: { height: 1, backgroundColor: '#EAE5F8' },
  minimap: { position: 'absolute', left: 10, bottom: 10, width: 78, height: 54, borderRadius: 11, backgroundColor: 'rgba(36,31,60,.86)', borderWidth: 1, borderColor: 'rgba(255,255,255,.45)', overflow: 'hidden' }, mapDot: { position: 'absolute', width: 5, height: 5, borderRadius: 3, borderWidth: 1, borderColor: '#FFF' }, mapCamera: { position: 'absolute', width: 11, height: 9, borderWidth: 1.5, borderColor: '#FFDF65', borderRadius: 2 }, latestButton: { position: 'absolute', right: 10, bottom: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#6C4CF6', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 13 }, latestText: { color: '#FFF', fontSize: 9, fontWeight: '900' },
  modalShade: { flex: 1, backgroundColor: 'rgba(22,20,18,.35)', justifyContent: 'flex-end' }, modalDismiss: { flex: 1 }, chatSheet: { height: '72%', backgroundColor: '#F9F7F3', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: spacing.md, paddingBottom: spacing.md }, sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#D2CCC5', alignSelf: 'center', marginTop: 9, marginBottom: 15 }, chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, chatTitle: { color: '#242220', fontSize: 19, fontWeight: '900' }, chatSubtitle: { color: '#777069', fontSize: 10, marginTop: 3 }, closeButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#ECE8E2', alignItems: 'center', justifyContent: 'center' }, chatList: { flex: 1, marginTop: 14 }, chatListContent: { paddingVertical: 8, gap: 11 }, chatRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 }, chatAvatar: { width: 29, height: 29, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, chatAvatarText: { color: '#FFF', fontSize: 8, fontWeight: '900' }, chatBubble: { flex: 1, backgroundColor: '#FFF', borderRadius: 15, borderTopLeftRadius: 5, padding: 11, borderWidth: 1, borderColor: '#E9E3DC' }, chatAuthor: { color: '#6E675F', fontSize: 9, fontWeight: '900' }, chatMessage: { color: '#2B2926', fontSize: 13, lineHeight: 18, marginTop: 3 }, chatCoordinates: { color: '#8B82A3', fontSize: 8, fontWeight: '800', marginTop: 5 }, noChat: { color: '#8A8179', textAlign: 'center', marginTop: 40, fontSize: 12 }, chatComposer: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#FFF', borderRadius: 18, padding: 7, borderWidth: 1, borderColor: '#E5DFD7' }, chatInput: { flex: 1, minHeight: 39, color: '#272522', paddingHorizontal: 9, fontSize: 13 }, chatSend: { width: 39, height: 39, borderRadius: 14, backgroundColor: '#1F1E1C', alignItems: 'center', justifyContent: 'center' },
  notice: { position: 'absolute', left: 38, right: 38, bottom: 18, backgroundColor: '#1F1E1C', borderRadius: 20, paddingVertical: 11, paddingHorizontal: 16, alignItems: 'center', shadowColor: '#000', shadowOpacity: .2, shadowRadius: 10 }, noticeText: { color: '#FFF', fontSize: 11, fontWeight: '900' },
});
