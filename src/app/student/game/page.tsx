"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Card,
  CardContent,
  Grid,
} from "@mui/material";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

// ==================== 類型定義 ====================
interface Vocabulary {
  vocabularyId: string;
  name: string;
  langUse: string;
  langExp: string;
  wordCount: number;
}

interface Word {
  id?: string;
  word: string;
  spelling?: string | null;
  explanation: string;
  partOfSpeech?: string | null;
  sentence?: string | null;
}

interface Bullet {
  id: number;
  x: number;
  y: number;
  damage: number;
  isPlayer: boolean;
  width: number;
  height: number;
  speed: number;
  color: string;
  type: "normal" | "spread" | "large" | "tracking";
  targetX?: number;
  targetY?: number;
  createdAt?: number;
}

interface FallingLetter {
  id: number;
  letter: string;
  x: number;
  y: number;
  speed: number;
}

interface ActivePowerUp {
  type: "spread" | "damage" | "shield" | "rapid";
  endTime: number;
}

type Difficulty = "easy" | "normal" | "hard" | "hell";
type GameType = "none" | "plane-shooter" | "game-flight";

interface DifficultySettings {
  name: string;
  color: string;
  bossHealth: number;
  bossAttackSpeed: number;
  bossSpeed: number;
  letterFrequency: number;
  letterSpeed: number;
  wrongLetterDamage: number;
  playerDamage: number;
  playerShootCooldown: number;
  trackingDuration: number;
}

// 飛機大戰難度設定
const PLANE_SHOOTER_DIFFICULTY: Record<Difficulty, DifficultySettings> = {
  easy: {
    name: "😊 簡單",
    color: "#4caf50",
    bossHealth: 10000,
    bossAttackSpeed: 2.5,
    bossSpeed: 1.5,
    letterFrequency: 0.025,
    letterSpeed: 0.8,
    wrongLetterDamage: 0,
    playerDamage: 15,
    playerShootCooldown: 300,
    trackingDuration: 2000,
  },
  normal: {
    name: "😐 普通",
    color: "#2196f3",
    bossHealth: 30000,
    bossAttackSpeed: 1.8,
    bossSpeed: 2,
    letterFrequency: 0.022,
    letterSpeed: 1,
    wrongLetterDamage: 0,
    playerDamage: 12,
    playerShootCooldown: 280,
    trackingDuration: 2500,
  },
  hard: {
    name: "😈 困難",
    color: "#ff9800",
    bossHealth: 100000,
    bossAttackSpeed: 1.2,
    bossSpeed: 2.5,
    letterFrequency: 0.018,
    letterSpeed: 1.2,
    wrongLetterDamage: 5,
    playerDamage: 10,
    playerShootCooldown: 260,
    trackingDuration: 3000,
  },
  hell: {
    name: "💀 地獄",
    color: "#f44336",
    bossHealth: 1000000000,
    bossAttackSpeed: 0.8,
    bossSpeed: 3,
    letterFrequency: 0.015,
    letterSpeed: 1.5,
    wrongLetterDamage: 10,
    playerDamage: 8,
    playerShootCooldown: 250,
    trackingDuration: 4000,
  },
};

// 單字飛機大戰難度設定
const GAME_FLIGHT_DIFFICULTY: Record<Difficulty, DifficultySettings> = {
  easy: {
    name: "😊 簡單",
    color: "#4caf50",
    bossHealth: 10000,
    bossAttackSpeed: 2.5,
    bossSpeed: 1.5,
    letterFrequency: 0.03,
    letterSpeed: 0.8,
    wrongLetterDamage: 0,
    playerDamage: 25,
    playerShootCooldown: 300,
    trackingDuration: 2000,
  },
  normal: {
    name: "😐 普通",
    color: "#2196f3",
    bossHealth: 30000,
    bossAttackSpeed: 1.8,
    bossSpeed: 2,
    letterFrequency: 0.025,
    letterSpeed: 1,
    wrongLetterDamage: 0,
    playerDamage: 18,
    playerShootCooldown: 280,
    trackingDuration: 2500,
  },
  hard: {
    name: "😈 困難",
    color: "#ff9800",
    bossHealth: 100000,
    bossAttackSpeed: 1.2,
    bossSpeed: 2.5,
    letterFrequency: 0.02,
    letterSpeed: 1.2,
    wrongLetterDamage: 5,
    playerDamage: 15,
    playerShootCooldown: 260,
    trackingDuration: 3000,
  },
  hell: {
    name: "💀 地獄",
    color: "#f44336",
    bossHealth: 1000000000,
    bossAttackSpeed: 0.8,
    bossSpeed: 3,
    letterFrequency: 0.015,
    letterSpeed: 1.5,
    wrongLetterDamage: 10,
    playerDamage: 12,
    playerShootCooldown: 250,
    trackingDuration: 4000,
  },
};

interface GameState {
  playerX: number;
  playerY: number;
  playerHealth: number;
  maxPlayerHealth: number;
  bossX: number;
  bossY: number;
  bossHealth: number;
  maxBossHealth: number;
  bullets: Bullet[];
  fallingLetters: FallingLetter[];
  activePowerUps: ActivePowerUp[];
  score: number;
  correctLetters: string[];
  currentWord: Word | null;
  targetSpelling: string;
  collectedLetters: string[];
  wordsCompleted: number;
  isGameOver: boolean;
  isVictory: boolean;
  isPaused: boolean;
  bossPhase: number;
  bossAttackCooldown: number;
  playerInvincible: boolean;
  invincibleEndTime: number;
  difficulty: Difficulty;
}

// ==================== 遊戲常數 ====================
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PLAYER_WIDTH = 50;
const PLAYER_HEIGHT = 40;
const BOSS_WIDTH = 120;
const BOSS_HEIGHT = 80;
const PLAYER_SPEED = 8;
const BULLET_SPEED = 12;
const BOSS_BULLET_SPEED = 4;
const LETTER_FALL_SPEED = 1.5;
const MAX_PLAYER_HEALTH = 100;
const WORDS_FOR_DOUBLE_SCORE = 5;

// ==================== 遊戲列表 ====================
const GAME_LIST = [
  {
    id: "plane-shooter",
    name: "✈️ 飛機大戰",
    description: "操控飛機擊敗 Boss，收集字母拼出單字獲得增強效果！",
    color: "#1976d2",
  },
  {
    id: "game-flight",
    name: "✈️ 單字飛機大戰",
    description: "經典飛機大戰遊戲，收集字母拼出單字！",
    color: "#9c27b0",
  },
  {
    id: "coming-soon-1",
    name: "🎯 單字射擊（即將推出）",
    description: "射擊正確的單字翻譯",
    color: "#9e9e9e",
    disabled: true,
  },
  {
    id: "coming-soon-2",
    name: "🧩 單字拼圖（即將推出）",
    description: "拖拽字母拼出正確單字",
    color: "#9e9e9e",
    disabled: true,
  },
];

// ==================== 主組件 ====================
export default function StudentGamePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const lastShotTimeRef = useRef<number>(0);
  const bulletIdRef = useRef<number>(0);
  const letterIdRef = useRef<number>(0);
  const wordsRef = useRef<Word[]>([]);

  const [loading, setLoading] = useState(true);
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  const [selectedVocabId, setSelectedVocabId] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>("normal");
  const [selectedGame, setSelectedGame] = useState<GameType>("none");
  const [gameStarted, setGameStarted] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const gameStateRef = useRef<GameState>({
    playerX: CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2,
    playerY: CANVAS_HEIGHT - PLAYER_HEIGHT - 20,
    playerHealth: MAX_PLAYER_HEALTH,
    maxPlayerHealth: MAX_PLAYER_HEALTH,
    bossX: CANVAS_WIDTH / 2 - BOSS_WIDTH / 2,
    bossY: 50,
    bossHealth: 30000,
    maxBossHealth: 30000,
    bullets: [],
    fallingLetters: [],
    activePowerUps: [],
    score: 0,
    correctLetters: [],
    currentWord: null,
    targetSpelling: "",
    collectedLetters: [],
    wordsCompleted: 0,
    isGameOver: false,
    isVictory: false,
    isPaused: false,
    bossPhase: 1,
    bossAttackCooldown: 0,
    playerInvincible: false,
    invincibleEndTime: 0,
    difficulty: "normal",
  });

  const [displayState, setDisplayState] = useState<GameState>(gameStateRef.current);

  useEffect(() => {
    if (!session) {
      router.push("/login");
      return;
    }
    loadVocabularies();
  }, [session, router]);

  const loadVocabularies = async () => {
    try {
      const response = await fetch("/api/student/vocabularies?limit=100");
      if (response.ok) {
        const data = await response.json();
        setVocabularies(data.vocabularies || []);
      }
    } catch (error) {
      console.error("載入單字本失敗:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadWords = async (vocabId: string) => {
    try {
      const response = await fetch(`/api/student/vocabularies/${vocabId}/words?limit=1000`);
      if (response.ok) {
        const data = await response.json();
        const validWords = (data.words || []).filter(
          (w: Word) => (w.spelling && w.spelling.length > 0) || (w.word && w.word.length > 0)
        );
        wordsRef.current = validWords;
        return validWords;
      }
    } catch (error) {
      console.error("載入單字失敗:", error);
    }
    return [];
  };

  const selectNextWord = (wordList: Word[]): { word: Word; spelling: string } | null => {
    if (wordList.length === 0) return null;
    const word = wordList[Math.floor(Math.random() * wordList.length)];
    const spelling = word.spelling || word.word;
    // 支援所有語言：保留所有字母和字符，只移除空格和標點符號
    const cleanedSpelling = spelling
      .toLowerCase()
      .replace(/\s+/g, "") // 移除空格
      .replace(/[^\p{L}\p{N}]/gu, ""); // 保留所有字母和數字，移除標點符號
    if (cleanedSpelling.length === 0) return null; // 如果清理後沒有字符，跳過
    return { word, spelling: cleanedSpelling };
  };

  const formatBossHealth = (health: number): string => {
    if (health >= 1000000000) return (health / 1000000000).toFixed(1) + "B";
    if (health >= 1000000) return (health / 1000000).toFixed(1) + "M";
    if (health >= 1000) return (health / 1000).toFixed(1) + "K";
    return Math.floor(health).toString();
  };

  const getDifficultySettings = (): Record<Difficulty, DifficultySettings> => {
    if (selectedGame === "game-flight") {
      return GAME_FLIGHT_DIFFICULTY;
    }
    return PLANE_SHOOTER_DIFFICULTY;
  };

  const startGame = async () => {
    if (!selectedVocabId) {
      alert("請選擇單字本");
      return;
    }

    const loadedWords = await loadWords(selectedVocabId);
    if (loadedWords.length < 3) {
      alert("單字本需要至少 3 個單字才能玩遊戲");
      return;
    }

    const firstWord = selectNextWord(loadedWords);
    if (!firstWord) return;

    const settings = getDifficultySettings()[selectedDifficulty];

    const initialState: GameState = {
      playerX: CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2,
      playerY: CANVAS_HEIGHT - PLAYER_HEIGHT - 20,
      playerHealth: MAX_PLAYER_HEALTH,
      maxPlayerHealth: MAX_PLAYER_HEALTH,
      bossX: CANVAS_WIDTH / 2 - BOSS_WIDTH / 2,
      bossY: 50,
      bossHealth: settings.bossHealth,
      maxBossHealth: settings.bossHealth,
      bullets: [],
      fallingLetters: [],
      activePowerUps: [],
      score: 0,
      correctLetters: firstWord.spelling.split(""),
      currentWord: firstWord.word,
      targetSpelling: firstWord.spelling,
      collectedLetters: [],
      wordsCompleted: 0,
      isGameOver: false,
      isVictory: false,
      isPaused: false,
      bossPhase: 1,
      bossAttackCooldown: 60,
      playerInvincible: false,
      invincibleEndTime: 0,
      difficulty: selectedDifficulty,
    };

    gameStateRef.current = initialState;
    setDisplayState(initialState);
    setGameStarted(true);
    setShowResult(false);
  };

  const renderGame = useCallback((state: GameState) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const settings = getDifficultySettings()[state.difficulty];

    // 背景
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 星星
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 50; i++) {
      const x = (i * 137 + Date.now() * 0.01) % CANVAS_WIDTH;
      const y = (i * 89 + Date.now() * 0.02) % CANVAS_HEIGHT;
      ctx.fillRect(x, y, 2, 2);
    }

    // Boss
    const bossColor = state.bossPhase === 3 ? "#ff0000" : state.bossPhase === 2 ? "#ff4400" : "#cc0000";
    ctx.beginPath();
    ctx.moveTo(state.bossX + BOSS_WIDTH / 2, state.bossY);
    ctx.lineTo(state.bossX + BOSS_WIDTH, state.bossY + BOSS_HEIGHT);
    ctx.lineTo(state.bossX, state.bossY + BOSS_HEIGHT);
    ctx.closePath();
    ctx.fillStyle = bossColor;
    ctx.fill();
    ctx.strokeStyle = "#8b0000";
    ctx.stroke();

    // Boss 眼睛
    ctx.fillStyle = "#ffff00";
    ctx.beginPath();
    ctx.arc(state.bossX + BOSS_WIDTH / 2 - 15, state.bossY + 40, 8, 0, Math.PI * 2);
    ctx.arc(state.bossX + BOSS_WIDTH / 2 + 15, state.bossY + 40, 8, 0, Math.PI * 2);
    ctx.fill();

    // 玩家
    if (!state.playerInvincible || Math.floor(Date.now() / 100) % 2 === 0) {
      ctx.beginPath();
      ctx.moveTo(state.playerX + PLAYER_WIDTH / 2, state.playerY);
      ctx.lineTo(state.playerX + PLAYER_WIDTH, state.playerY + PLAYER_HEIGHT);
      ctx.lineTo(state.playerX, state.playerY + PLAYER_HEIGHT);
      ctx.closePath();
      ctx.fillStyle = "#0066ff";
      ctx.fill();
      ctx.strokeStyle = "#00ccff";
      ctx.stroke();

      // 護盾
      if (state.activePowerUps.some((p) => p.type === "shield" && p.endTime > Date.now())) {
        ctx.strokeStyle = "#00ffff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(state.playerX + PLAYER_WIDTH / 2, state.playerY + PLAYER_HEIGHT / 2, 35, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 1;
      }
    }

    // 子彈
    state.bullets.forEach((bullet) => {
      if (bullet.type === "large" || bullet.type === "tracking") {
        ctx.fillStyle = bullet.color;
        ctx.beginPath();
        ctx.arc(bullet.x + bullet.width / 2, bullet.y + bullet.height / 2, bullet.width / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = bullet.color;
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
      }
    });

    // 掉落字母
    state.fallingLetters.forEach((letter) => {
      const nextIndex = state.collectedLetters.length;
      const expected = state.correctLetters[nextIndex] || "";
      const isCorrect = letter.letter === expected;

      ctx.fillStyle = isCorrect ? "#00ff00" : "#ffffff";
      ctx.fillRect(letter.x, letter.y, 28, 28);
      ctx.strokeStyle = isCorrect ? "#00ff00" : "#666666";
      ctx.strokeRect(letter.x, letter.y, 28, 28);
      ctx.fillStyle = isCorrect ? "#000000" : "#333333";
      ctx.font = "bold 16px Arial";
      ctx.textAlign = "center";
      ctx.fillText(letter.letter.toUpperCase(), letter.x + 14, letter.y + 20);
    });

    // Boss 血條
    ctx.fillStyle = "#333333";
    ctx.fillRect(50, 15, CANVAS_WIDTH - 100, 20);
    ctx.fillStyle = "#ff4444";
    const healthRatio = Math.max(0, state.bossHealth) / state.maxBossHealth;
    ctx.fillRect(50, 15, (CANVAS_WIDTH - 100) * healthRatio, 20);
    ctx.strokeStyle = "#ffffff";
    ctx.strokeRect(50, 15, CANVAS_WIDTH - 100, 20);
    ctx.fillStyle = "#ffffff";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      `BOSS: ${formatBossHealth(Math.max(0, state.bossHealth))} / ${formatBossHealth(state.maxBossHealth)}`,
      CANVAS_WIDTH / 2,
      30
    );

    // 難度顯示
    ctx.fillStyle = settings.color;
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "left";
    ctx.fillText(settings.name, 10, 28);

    // 玩家血條
    ctx.fillStyle = "#333333";
    ctx.fillRect(10, CANVAS_HEIGHT - 30, 150, 20);
    ctx.fillStyle = "#00ff00";
    ctx.fillRect(10, CANVAS_HEIGHT - 30, (150 * Math.max(0, state.playerHealth)) / state.maxPlayerHealth, 20);
    ctx.strokeStyle = "#ffffff";
    ctx.strokeRect(10, CANVAS_HEIGHT - 30, 150, 20);
    ctx.fillStyle = "#ffffff";
    ctx.font = "12px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`HP: ${Math.max(0, state.playerHealth)}`, 15, CANVAS_HEIGHT - 15);

    // 分數
    const hasDoubleScore = state.wordsCompleted >= WORDS_FOR_DOUBLE_SCORE;
    ctx.fillStyle = hasDoubleScore ? "#00ff00" : "#ffff00";
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "right";
    ctx.fillText(`分數: ${state.score}${hasDoubleScore ? " (x2)" : ""}`, CANVAS_WIDTH - 10, CANVAS_HEIGHT - 15);

    // 當前單字提示
    if (state.currentWord) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 22px Arial";
      ctx.textAlign = "center";
      ctx.fillText(`提示: ${state.currentWord.explanation}`, CANVAS_WIDTH / 2, 60);

      const spelling = state.targetSpelling.toUpperCase();
      let displayText = "";
      for (let i = 0; i < spelling.length; i++) {
        displayText += i < state.collectedLetters.length ? spelling[i] : "_";
        displayText += " ";
      }
      ctx.fillStyle = "#00ffff";
      ctx.font = "bold 28px monospace";
      ctx.fillText(displayText, CANVAS_WIDTH / 2, 90);
    }

    // 單字進度
    ctx.fillStyle = "#ffffff";
    ctx.font = "16px Arial";
    ctx.textAlign = "left";
    ctx.fillText(
      `完成單字: ${state.wordsCompleted}${state.wordsCompleted >= WORDS_FOR_DOUBLE_SCORE ? " ✓雙倍!" : ` / ${WORDS_FOR_DOUBLE_SCORE}`}`,
      10,
      CANVAS_HEIGHT - 55
    );

    // 增益效果
    const now = Date.now();
    const icons: Record<string, string> = { spread: "散", damage: "強", shield: "盾", rapid: "速" };
    const colors: Record<string, string> = { spread: "#ff6600", damage: "#ff0000", shield: "#00ffff", rapid: "#ffff00" };
    let powerUpX = CANVAS_WIDTH - 60;
    state.activePowerUps.forEach((p) => {
      const remaining = Math.ceil((p.endTime - now) / 1000);
      if (remaining > 0) {
        ctx.fillStyle = colors[p.type] || "#ffffff";
        ctx.fillRect(powerUpX - 20, 50, 40, 25);
        ctx.fillStyle = "#000000";
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";
        ctx.fillText(`${icons[p.type]}${remaining}`, powerUpX, 67);
        powerUpX -= 50;
      }
    });

    // 暫停
    if (state.isPaused) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 48px Arial";
      ctx.textAlign = "center";
      ctx.fillText("暫停", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      ctx.font = "24px Arial";
      ctx.fillText("按 ESC 繼續", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
    }
  }, [selectedGame]);

  useEffect(() => {
    if (!gameStarted || (selectedGame !== "plane-shooter" && selectedGame !== "game-flight")) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
      if (e.key === "Escape") {
        gameStateRef.current.isPaused = !gameStateRef.current.isPaused;
      }
      if (e.key === " ") e.preventDefault();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    const gameLoop = () => {
      const state = gameStateRef.current;
      if (state.isGameOver || state.isPaused) {
        renderGame(state);
        gameLoopRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      const now = Date.now();
      const settings = getDifficultySettings()[state.difficulty];

      // 玩家移動
      if (keysRef.current.has("arrowleft") || keysRef.current.has("a")) {
        state.playerX = Math.max(0, state.playerX - PLAYER_SPEED);
      }
      if (keysRef.current.has("arrowright") || keysRef.current.has("d")) {
        state.playerX = Math.min(CANVAS_WIDTH - PLAYER_WIDTH, state.playerX + PLAYER_SPEED);
      }
      if (keysRef.current.has("arrowup") || keysRef.current.has("w")) {
        state.playerY = Math.max(100, state.playerY - PLAYER_SPEED);
      }
      if (keysRef.current.has("arrowdown") || keysRef.current.has("s")) {
        state.playerY = Math.min(CANVAS_HEIGHT - PLAYER_HEIGHT, state.playerY + PLAYER_SPEED);
      }

      // 玩家射擊（使用難度設定的冷卻時間）
      if (keysRef.current.has(" ") || keysRef.current.has("j")) {
        const baseShootCooldown = settings.playerShootCooldown;
        const shootCooldown = state.activePowerUps.some((p) => p.type === "rapid" && p.endTime > now)
          ? baseShootCooldown * 0.5
          : baseShootCooldown;

        if (now - lastShotTimeRef.current > shootCooldown) {
          lastShotTimeRef.current = now;
          const hasSpread = state.activePowerUps.some((p) => p.type === "spread" && p.endTime > now);
          const hasDamage = state.activePowerUps.some((p) => p.type === "damage" && p.endTime > now);
          const damage = hasDamage ? settings.playerDamage * 2 : settings.playerDamage;

          if (hasSpread) {
            state.bullets.push(
              {
                id: bulletIdRef.current++,
                x: state.playerX + PLAYER_WIDTH / 2 - 4,
                y: state.playerY,
                damage,
                isPlayer: true,
                width: 8,
                height: 15,
                speed: BULLET_SPEED,
                color: "#00ff00",
                type: "spread",
                targetX: -3,
              },
              {
                id: bulletIdRef.current++,
                x: state.playerX + PLAYER_WIDTH / 2 - 4,
                y: state.playerY,
                damage,
                isPlayer: true,
                width: 8,
                height: 15,
                speed: BULLET_SPEED,
                color: "#00ff00",
                type: "normal",
              },
              {
                id: bulletIdRef.current++,
                x: state.playerX + PLAYER_WIDTH / 2 - 4,
                y: state.playerY,
                damage,
                isPlayer: true,
                width: 8,
                height: 15,
                speed: BULLET_SPEED,
                color: "#00ff00",
                type: "spread",
                targetX: 3,
              }
            );
          } else {
            state.bullets.push({
              id: bulletIdRef.current++,
              x: state.playerX + PLAYER_WIDTH / 2 - 4,
              y: state.playerY,
              damage,
              isPlayer: true,
              width: 8,
              height: 15,
              speed: BULLET_SPEED,
              color: "#00ff00",
              type: "normal",
            });
          }
        }
      }

      // Boss 移動
      const bossTargetX = state.playerX + PLAYER_WIDTH / 2 - BOSS_WIDTH / 2;
      const bossMoveSpeed = settings.bossSpeed + state.bossPhase * 0.3;
      if (Math.abs(state.bossX - bossTargetX) > bossMoveSpeed) {
        state.bossX += bossTargetX > state.bossX ? bossMoveSpeed : -bossMoveSpeed;
      }
      state.bossX = Math.max(0, Math.min(CANVAS_WIDTH - BOSS_WIDTH, state.bossX));

      // Boss 攻擊
      state.bossAttackCooldown--;
      if (state.bossAttackCooldown <= 0) {
        const attackType = Math.random();
        const cooldownMultiplier = settings.bossAttackSpeed;

        if (attackType < 0.4) {
          state.bullets.push({
            id: bulletIdRef.current++,
            x: state.bossX + BOSS_WIDTH / 2 - 15,
            y: state.bossY + BOSS_HEIGHT,
            damage: 15,
            isPlayer: false,
            width: 30,
            height: 30,
            speed: BOSS_BULLET_SPEED,
            color: "#ff4444",
            type: "large",
          });
          state.bossAttackCooldown = Math.floor((70 - state.bossPhase * 5) * cooldownMultiplier);
        } else if (attackType < 0.7) {
          for (let i = -2; i <= 2; i++) {
            state.bullets.push({
              id: bulletIdRef.current++,
              x: state.bossX + BOSS_WIDTH / 2 - 6,
              y: state.bossY + BOSS_HEIGHT,
              damage: 8,
              isPlayer: false,
              width: 12,
              height: 12,
              speed: BOSS_BULLET_SPEED * 0.8,
              color: "#ff8800",
              type: "spread",
              targetX: i * 1.5,
            });
          }
          state.bossAttackCooldown = Math.floor((90 - state.bossPhase * 8) * cooldownMultiplier);
        } else {
          state.bullets.push({
            id: bulletIdRef.current++,
            x: state.bossX + BOSS_WIDTH / 2 - 8,
            y: state.bossY + BOSS_HEIGHT,
            damage: 12,
            isPlayer: false,
            width: 16,
            height: 16,
            speed: BOSS_BULLET_SPEED * 0.4,
            color: "#ff00ff",
            type: "tracking",
            createdAt: now,
          });
          state.bossAttackCooldown = Math.floor((80 - state.bossPhase * 6) * cooldownMultiplier);
        }
      }

      // 生成掉落字母
      const hasRecentLetter = state.fallingLetters.some((l) => l.y < 120);
      if (Math.random() < settings.letterFrequency && state.correctLetters.length > 0 && !hasRecentLetter) {
        const nextIndex = state.collectedLetters.length;
        const isCorrect = Math.random() < 0.5;
        let letter: string;

        if (isCorrect && nextIndex < state.correctLetters.length) {
          letter = state.correctLetters[nextIndex];
        } else {
          // 從目標單字的所有字符中隨機選擇一個作為干擾字母，支援所有語言
          // 這樣可以確保干擾字母與目標單字使用相同的字符集（中文、日文、韓文、英文等）
          const allLetters = state.correctLetters;
          if (allLetters.length > 0) {
            letter = allLetters[Math.floor(Math.random() * allLetters.length)];
          } else {
            // 備用方案：如果沒有字符（不應該發生），使用常見字符
            letter = "?";
          }
        }

        state.fallingLetters.push({
          id: letterIdRef.current++,
          letter,
          x: Math.random() * (CANVAS_WIDTH - 30),
          y: -30,
          speed: LETTER_FALL_SPEED * settings.letterSpeed,
        });
      }

      // 更新子彈
      state.bullets = state.bullets
        .map((bullet) => {
          if (bullet.isPlayer) {
            return { ...bullet, y: bullet.y - bullet.speed, x: bullet.x + (bullet.targetX || 0) };
          } else {
            if (bullet.type === "tracking") {
              const dx = state.playerX + PLAYER_WIDTH / 2 - bullet.x;
              const dy = state.playerY + PLAYER_HEIGHT / 2 - bullet.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist > 0) {
                return {
                  ...bullet,
                  x: bullet.x + (dx / dist) * bullet.speed,
                  y: bullet.y + (dy / dist) * bullet.speed,
                };
              }
            }
            return { ...bullet, y: bullet.y + bullet.speed, x: bullet.x + (bullet.targetX || 0) };
          }
        })
        .filter((b) => {
          if (b.type === "tracking" && b.createdAt && now - b.createdAt > settings.trackingDuration) {
            return false;
          }
          return b.y > -50 && b.y < CANVAS_HEIGHT + 50 && b.x > -50 && b.x < CANVAS_WIDTH + 50;
        });

      // 更新字母
      state.fallingLetters = state.fallingLetters
        .map((l) => ({ ...l, y: l.y + l.speed }))
        .filter((l) => l.y < CANVAS_HEIGHT + 30);

      // 玩家子彈擊中 Boss
      state.bullets = state.bullets.filter((bullet) => {
        if (
          bullet.isPlayer &&
          bullet.x < state.bossX + BOSS_WIDTH &&
          bullet.x + bullet.width > state.bossX &&
          bullet.y < state.bossY + BOSS_HEIGHT &&
          bullet.y + bullet.height > state.bossY
        ) {
          state.bossHealth -= bullet.damage;
          const baseScore = 1;
          state.score += state.wordsCompleted >= WORDS_FOR_DOUBLE_SCORE ? baseScore * 2 : baseScore;
          return false;
        }
        return true;
      });

      // 檢查無敵
      if (state.playerInvincible && now > state.invincibleEndTime) {
        state.playerInvincible = false;
      }

      // Boss 子彈擊中玩家
      state.bullets = state.bullets.filter((bullet) => {
        if (
          !bullet.isPlayer &&
          bullet.x < state.playerX + PLAYER_WIDTH &&
          bullet.x + bullet.width > state.playerX &&
          bullet.y < state.playerY + PLAYER_HEIGHT &&
          bullet.y + bullet.height > state.playerY
        ) {
          if (!state.playerInvincible) {
            const hasShield = state.activePowerUps.some((p) => p.type === "shield" && p.endTime > now);
            if (hasShield) {
              state.activePowerUps = state.activePowerUps.filter((p) => p.type !== "shield");
            } else {
              state.playerHealth -= bullet.damage;
              state.playerInvincible = true;
              state.invincibleEndTime = now + 1000;
            }
          }
          return false;
        }
        return true;
      });

      // 收集字母
      state.fallingLetters = state.fallingLetters.filter((letter) => {
        if (
          letter.x < state.playerX + PLAYER_WIDTH &&
          letter.x + 28 > state.playerX &&
          letter.y < state.playerY + PLAYER_HEIGHT &&
          letter.y + 28 > state.playerY
        ) {
          const nextIndex = state.collectedLetters.length;
          if (nextIndex < state.correctLetters.length) {
            const expectedLetter = state.correctLetters[nextIndex];
            if (letter.letter === expectedLetter) {
              state.collectedLetters.push(letter.letter);
              const baseScore = 10;
              state.score += state.wordsCompleted >= WORDS_FOR_DOUBLE_SCORE ? baseScore * 2 : baseScore;

              if (state.collectedLetters.length === state.correctLetters.length) {
                state.wordsCompleted++;
                const wordBonus = 50;
                state.score += state.wordsCompleted >= WORDS_FOR_DOUBLE_SCORE ? wordBonus * 2 : wordBonus;

                const powerTypes: ("spread" | "damage" | "shield" | "rapid")[] = ["spread", "damage", "shield", "rapid"];
                const powerType = powerTypes[Math.floor(Math.random() * powerTypes.length)];
                state.activePowerUps.push({ type: powerType, endTime: now + 10000 });

                const nextWord = selectNextWord(wordsRef.current);
                if (nextWord) {
                  state.currentWord = nextWord.word;
                  state.targetSpelling = nextWord.spelling;
                  state.correctLetters = nextWord.spelling.split("");
                  state.collectedLetters = [];
                }
              }
            } else {
              if (settings.wrongLetterDamage > 0) {
                state.playerHealth -= settings.wrongLetterDamage;
              }
            }
          }
          return false;
        }
        return true;
      });

      // 清理過期增益
      state.activePowerUps = state.activePowerUps.filter((p) => p.endTime > now);

      // 更新 Boss 階段
      const healthPercent = state.bossHealth / state.maxBossHealth;
      if (healthPercent < 0.3) state.bossPhase = 3;
      else if (healthPercent < 0.6) state.bossPhase = 2;
      else state.bossPhase = 1;

      // 檢查遊戲結束
      if (state.playerHealth <= 0) {
        state.isGameOver = true;
        state.isVictory = false;
        setShowResult(true);
      } else if (state.bossHealth <= 0) {
        state.isGameOver = true;
        state.isVictory = true;
        const victoryBonus = 100;
        state.score += state.wordsCompleted >= WORDS_FOR_DOUBLE_SCORE ? victoryBonus * 2 : victoryBonus;
        setShowResult(true);
      }

      renderGame(state);
      setDisplayState({ ...state });
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameStarted, selectedGame, renderGame]);

  const handleRestart = () => {
    setShowResult(false);
    setGameStarted(false);
  };

  const handleBackToGameSelect = () => {
    setShowResult(false);
    setGameStarted(false);
    setSelectedGame("none");
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  // 遊戲選擇畫面
  if (selectedGame === "none") {
    return (
      <Box>
        <Typography variant="h4" sx={{ mb: 3 }}>
          🎮 單字遊戲
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          選擇一個遊戲開始學習單字！
        </Typography>

        <Grid container spacing={3}>
          {GAME_LIST.map((game) => (
            <Grid item xs={12} sm={6} md={4} key={game.id}>
              <Card
                sx={{
                  height: "100%",
                  cursor: game.disabled ? "not-allowed" : "pointer",
                  opacity: game.disabled ? 0.5 : 1,
                  transition: "transform 0.2s, box-shadow 0.2s",
                  "&:hover": game.disabled
                    ? {}
                    : {
                        transform: "translateY(-4px)",
                        boxShadow: 4,
                      },
                }}
                onClick={() => !game.disabled && setSelectedGame(game.id as GameType)}
              >
                <Box
                  sx={{
                    height: 120,
                    backgroundColor: game.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Typography variant="h2">{game.name.split(" ")[0]}</Typography>
                </Box>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {game.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {game.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  // 遊戲設定畫面
  if (!gameStarted) {
    const currentGame = GAME_LIST.find((g) => g.id === selectedGame);
    const difficultySettings = getDifficultySettings();

    return (
      <Box>
        <Button variant="text" onClick={() => setSelectedGame("none")} sx={{ mb: 2 }}>
          ← 返回遊戲列表
        </Button>

        <Typography variant="h4" sx={{ mb: 3 }}>
          {currentGame?.name || "遊戲設定"}
        </Typography>

        <Paper sx={{ p: 3, maxWidth: 600, mx: "auto" }}>
          <Typography variant="h6" gutterBottom>
            遊戲說明
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              • WASD 或 方向鍵移動飛機
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • 空白鍵 或 J 鍵發射子彈
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • 收集正確的字母（綠色）拼出單字
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • 完成單字獲得增強效果
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • <b>打敗 Boss 即可獲勝！</b>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • 完成 5 個單字後，所有分數 <b>x2</b>！
            </Typography>
          </Box>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>選擇單字本</InputLabel>
            <Select value={selectedVocabId} label="選擇單字本" onChange={(e) => setSelectedVocabId(e.target.value)}>
              {vocabularies.map((vocab) => (
                <MenuItem key={vocab.vocabularyId} value={vocab.vocabularyId}>
                  {vocab.name} ({vocab.wordCount} 個單字)
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            選擇難度
          </Typography>
          <ToggleButtonGroup
            value={selectedDifficulty}
            exclusive
            onChange={(_, value) => value && setSelectedDifficulty(value)}
            fullWidth
            sx={{ mb: 2 }}
          >
            {(Object.keys(difficultySettings) as Difficulty[]).map((diff) => (
              <ToggleButton
                key={diff}
                value={diff}
                sx={{
                  color: difficultySettings[diff].color,
                  "&.Mui-selected": {
                    backgroundColor: difficultySettings[diff].color,
                    color: "#fff",
                    "&:hover": {
                      backgroundColor: difficultySettings[diff].color,
                    },
                  },
                }}
              >
                {difficultySettings[diff].name}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <Box sx={{ mb: 2, p: 2, bgcolor: "grey.100", borderRadius: 1 }}>
            <Typography variant="body2">
              <b>{difficultySettings[selectedDifficulty].name}</b>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Boss 血量: {formatBossHealth(difficultySettings[selectedDifficulty].bossHealth)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              錯誤字母傷害:{" "}
              {difficultySettings[selectedDifficulty].wrongLetterDamage === 0
                ? "無"
                : `-${difficultySettings[selectedDifficulty].wrongLetterDamage} HP`}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              攻擊速度:{" "}
              {selectedDifficulty === "easy"
                ? "慢"
                : selectedDifficulty === "normal"
                  ? "普通"
                  : selectedDifficulty === "hard"
                    ? "快"
                    : "極快"}
            </Typography>
          </Box>

          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={startGame}
            disabled={!selectedVocabId}
            sx={{
              py: 2,
              backgroundColor: difficultySettings[selectedDifficulty].color,
              "&:hover": {
                backgroundColor: difficultySettings[selectedDifficulty].color,
                filter: "brightness(0.9)",
              },
            }}
          >
            開始遊戲
          </Button>
        </Paper>
      </Box>
    );
  }

  // 遊戲進行中
  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{ border: "2px solid #333", borderRadius: 8, backgroundColor: "#1a1a2e" }}
        />
      </Box>

      <Dialog open={showResult} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ textAlign: "center", fontSize: 28 }}>
          {displayState.isVictory ? "🎉 勝利！" : "💀 遊戲結束"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: "center", py: 2 }}>
            <Typography variant="h3" sx={{ color: "#ffcc00", mb: 2 }}>
              {displayState.score} 分
            </Typography>
            <Chip
              label={getDifficultySettings()[displayState.difficulty].name}
              sx={{
                backgroundColor: getDifficultySettings()[displayState.difficulty].color,
                color: "#fff",
                mb: 2,
              }}
            />
            <Typography variant="body1" sx={{ mb: 1 }}>
              完成單字: {displayState.wordsCompleted} 個
            </Typography>
            {displayState.wordsCompleted >= WORDS_FOR_DOUBLE_SCORE && (
              <Typography variant="body1" sx={{ color: "#4caf50", mb: 1 }}>
                ✓ 已解鎖雙倍分數！
              </Typography>
            )}
            {displayState.isVictory && (
              <Typography variant="body1" sx={{ color: "#4caf50" }}>
                🏆 通關獎勵 +{displayState.wordsCompleted >= WORDS_FOR_DOUBLE_SCORE ? 200 : 100} 分
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", pb: 3 }}>
          <Button variant="outlined" onClick={handleBackToGameSelect}>
            返回遊戲列表
          </Button>
          <Button variant="contained" onClick={handleRestart}>
            再玩一次
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
