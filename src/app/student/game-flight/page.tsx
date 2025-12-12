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
  IconButton,
} from "@mui/material";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
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
  targetWordsToWin: number;
  isGameOver: boolean;
  isVictory: boolean;
  isPaused: boolean;
  bossPhase: number;
  bossAttackCooldown: number;
  playerInvincible: boolean;
  invincibleEndTime: number;
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
const BOSS_BULLET_SPEED = 6;
const LETTER_FALL_SPEED = 2;
const TARGET_WORDS_TO_WIN = 5;
const MAX_BOSS_HEALTH = 1000;
const MAX_PLAYER_HEALTH = 100;

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
  const [gameStarted, setGameStarted] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showResult, setShowResult] = useState(false);

  const gameStateRef = useRef<GameState>({
    playerX: CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2,
    playerY: CANVAS_HEIGHT - PLAYER_HEIGHT - 20,
    playerHealth: MAX_PLAYER_HEALTH,
    maxPlayerHealth: MAX_PLAYER_HEALTH,
    bossX: CANVAS_WIDTH / 2 - BOSS_WIDTH / 2,
    bossY: 50,
    bossHealth: MAX_BOSS_HEALTH,
    maxBossHealth: MAX_BOSS_HEALTH,
    bullets: [],
    fallingLetters: [],
    activePowerUps: [],
    score: 0,
    correctLetters: [],
    currentWord: null,
    targetSpelling: "",
    collectedLetters: [],
    wordsCompleted: 0,
    targetWordsToWin: TARGET_WORDS_TO_WIN,
    isGameOver: false,
    isVictory: false,
    isPaused: false,
    bossPhase: 1,
    bossAttackCooldown: 0,
    playerInvincible: false,
    invincibleEndTime: 0,
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
        // 接受有 spelling 或有 word 的單字（用 word 當作備用拼音）
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
    return { word, spelling: spelling.toLowerCase().replace(/[^a-z]/g, "") };
  };

  const startGame = async () => {
    if (!selectedVocabId) {
      alert("請選擇單字本");
      return;
    }

    const loadedWords = await loadWords(selectedVocabId);
    if (loadedWords.length < 5) {
      alert("單字本需要至少 5 個單字才能玩遊戲");
      return;
    }

    const firstWord = selectNextWord(loadedWords);
    if (!firstWord) return;

    const initialState: GameState = {
      playerX: CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2,
      playerY: CANVAS_HEIGHT - PLAYER_HEIGHT - 20,
      playerHealth: MAX_PLAYER_HEALTH,
      maxPlayerHealth: MAX_PLAYER_HEALTH,
      bossX: CANVAS_WIDTH / 2 - BOSS_WIDTH / 2,
      bossY: 50,
      bossHealth: MAX_BOSS_HEALTH,
      maxBossHealth: MAX_BOSS_HEALTH,
      bullets: [],
      fallingLetters: [],
      activePowerUps: [],
      score: 0,
      correctLetters: firstWord.spelling.split(""),
      currentWord: firstWord.word,
      targetSpelling: firstWord.spelling,
      collectedLetters: [],
      wordsCompleted: 0,
      targetWordsToWin: TARGET_WORDS_TO_WIN,
      isGameOver: false,
      isVictory: false,
      isPaused: false,
      bossPhase: 1,
      bossAttackCooldown: 60,
      playerInvincible: false,
      invincibleEndTime: 0,
    };

    gameStateRef.current = initialState;
    setDisplayState(initialState);
    setGameStarted(true);
    setShowResult(false);
    bulletIdRef.current = 0;
    letterIdRef.current = 0;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
      if (e.key === " " || e.key === "Escape") {
        e.preventDefault();
      }
      if (e.key === "Escape" && gameStarted) {
        gameStateRef.current.isPaused = !gameStateRef.current.isPaused;
        setDisplayState({ ...gameStateRef.current });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [gameStarted]);

  useEffect(() => {
    if (!gameStarted) return;

    const gameLoop = () => {
      const state = gameStateRef.current;
      if (state.isGameOver || state.isPaused) {
        gameLoopRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      const now = Date.now();

      // 玩家移動
      if (keysRef.current.has("arrowleft") || keysRef.current.has("a")) {
        state.playerX = Math.max(0, state.playerX - PLAYER_SPEED);
      }
      if (keysRef.current.has("arrowright") || keysRef.current.has("d")) {
        state.playerX = Math.min(CANVAS_WIDTH - PLAYER_WIDTH, state.playerX + PLAYER_SPEED);
      }
      if (keysRef.current.has("arrowup") || keysRef.current.has("w")) {
        state.playerY = Math.max(CANVAS_HEIGHT / 2, state.playerY - PLAYER_SPEED);
      }
      if (keysRef.current.has("arrowdown") || keysRef.current.has("s")) {
        state.playerY = Math.min(CANVAS_HEIGHT - PLAYER_HEIGHT, state.playerY + PLAYER_SPEED);
      }

      // 玩家射擊
      if (keysRef.current.has(" ")) {
        const shootCooldown = state.activePowerUps.some(
          (p) => p.type === "rapid" && p.endTime > now
        ) ? 100 : 200;
        
        if (now - lastShotTimeRef.current > shootCooldown) {
          lastShotTimeRef.current = now;
          const hasSpread = state.activePowerUps.some((p) => p.type === "spread" && p.endTime > now);
          const hasDamage = state.activePowerUps.some((p) => p.type === "damage" && p.endTime > now);
          const damage = hasDamage ? 30 : 15;

          if (hasSpread) {
            state.bullets.push(
              { id: bulletIdRef.current++, x: state.playerX + PLAYER_WIDTH / 2 - 4, y: state.playerY, damage, isPlayer: true, width: 8, height: 15, speed: BULLET_SPEED, color: "#00ff00", type: "spread", targetX: -3 },
              { id: bulletIdRef.current++, x: state.playerX + PLAYER_WIDTH / 2 - 4, y: state.playerY, damage, isPlayer: true, width: 8, height: 15, speed: BULLET_SPEED, color: "#00ff00", type: "normal" },
              { id: bulletIdRef.current++, x: state.playerX + PLAYER_WIDTH / 2 - 4, y: state.playerY, damage, isPlayer: true, width: 8, height: 15, speed: BULLET_SPEED, color: "#00ff00", type: "spread", targetX: 3 }
            );
          } else {
            state.bullets.push({
              id: bulletIdRef.current++, x: state.playerX + PLAYER_WIDTH / 2 - 4, y: state.playerY,
              damage, isPlayer: true, width: 8, height: 15, speed: BULLET_SPEED, color: "#00ff00", type: "normal"
            });
          }
        }
      }

      // Boss 移動
      const bossTargetX = state.playerX + PLAYER_WIDTH / 2 - BOSS_WIDTH / 2;
      const bossMoveSpeed = 2 + state.bossPhase * 0.5;
      if (Math.abs(state.bossX - bossTargetX) > bossMoveSpeed) {
        state.bossX += bossTargetX > state.bossX ? bossMoveSpeed : -bossMoveSpeed;
      }
      state.bossX = Math.max(0, Math.min(CANVAS_WIDTH - BOSS_WIDTH, state.bossX));

      // Boss 攻擊
      state.bossAttackCooldown--;
      if (state.bossAttackCooldown <= 0) {
        const attackType = Math.random();
        if (attackType < 0.4) {
          state.bullets.push({
            id: bulletIdRef.current++, x: state.bossX + BOSS_WIDTH / 2 - 15, y: state.bossY + BOSS_HEIGHT,
            damage: 20, isPlayer: false, width: 30, height: 30, speed: BOSS_BULLET_SPEED, color: "#ff4444", type: "large"
          });
          state.bossAttackCooldown = 60 - state.bossPhase * 5;
        } else if (attackType < 0.7) {
          for (let i = -2; i <= 2; i++) {
            state.bullets.push({
              id: bulletIdRef.current++, x: state.bossX + BOSS_WIDTH / 2 - 6, y: state.bossY + BOSS_HEIGHT,
              damage: 10, isPlayer: false, width: 12, height: 12, speed: BOSS_BULLET_SPEED * 0.8, color: "#ff8800", type: "spread", targetX: i * 2
            });
          }
          state.bossAttackCooldown = 90 - state.bossPhase * 8;
        } else {
          state.bullets.push({
            id: bulletIdRef.current++, x: state.bossX + BOSS_WIDTH / 2 - 8, y: state.bossY + BOSS_HEIGHT,
            damage: 15, isPlayer: false, width: 16, height: 16, speed: BOSS_BULLET_SPEED * 0.6, color: "#ff00ff", type: "tracking",
            targetX: state.playerX + PLAYER_WIDTH / 2, targetY: state.playerY + PLAYER_HEIGHT / 2
          });
          state.bossAttackCooldown = 80 - state.bossPhase * 6;
        }
      }

      // 生成掉落字母
      if (Math.random() < 0.03 && state.correctLetters.length > 0) {
        const nextIndex = state.collectedLetters.length;
        const isCorrect = Math.random() < 0.35;
        let letter: string;
        
        if (isCorrect && nextIndex < state.correctLetters.length) {
          letter = state.correctLetters[nextIndex];
        } else {
          letter = String.fromCharCode(97 + Math.floor(Math.random() * 26));
        }

        state.fallingLetters.push({
          id: letterIdRef.current++,
          letter,
          x: Math.random() * (CANVAS_WIDTH - 30),
          y: -30,
          speed: LETTER_FALL_SPEED + Math.random() * 1,
        });
      }

      // 更新子彈
      state.bullets = state.bullets.map((bullet) => {
        if (bullet.isPlayer) {
          return { ...bullet, y: bullet.y - bullet.speed, x: bullet.x + (bullet.targetX || 0) };
        } else {
          if (bullet.type === "tracking") {
            const dx = (bullet.targetX || 0) - bullet.x;
            const dy = (bullet.targetY || 0) - bullet.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
              return { ...bullet, x: bullet.x + (dx / dist) * bullet.speed, y: bullet.y + (dy / dist) * bullet.speed };
            }
          }
          return { ...bullet, y: bullet.y + bullet.speed, x: bullet.x + (bullet.targetX || 0) };
        }
      }).filter((b) => b.y > -50 && b.y < CANVAS_HEIGHT + 50 && b.x > -50 && b.x < CANVAS_WIDTH + 50);

      // 更新字母
      state.fallingLetters = state.fallingLetters
        .map((l) => ({ ...l, y: l.y + l.speed }))
        .filter((l) => l.y < CANVAS_HEIGHT + 30);

      // 玩家子彈擊中 Boss
      state.bullets = state.bullets.filter((bullet) => {
        if (bullet.isPlayer &&
          bullet.x < state.bossX + BOSS_WIDTH && bullet.x + bullet.width > state.bossX &&
          bullet.y < state.bossY + BOSS_HEIGHT && bullet.y + bullet.height > state.bossY) {
          state.bossHealth -= bullet.damage;
          return false;
        }
        return true;
      });

      // 檢查無敵
      if (state.playerInvincible && now > state.invincibleEndTime) {
        state.playerInvincible = false;
      }

      // Boss 子彈擊中玩家
      const hasShield = state.activePowerUps.some((p) => p.type === "shield" && p.endTime > now);
      state.bullets = state.bullets.filter((bullet) => {
        if (!bullet.isPlayer &&
          bullet.x < state.playerX + PLAYER_WIDTH && bullet.x + bullet.width > state.playerX &&
          bullet.y < state.playerY + PLAYER_HEIGHT && bullet.y + bullet.height > state.playerY) {
          if (!state.playerInvincible) {
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
        if (letter.x < state.playerX + PLAYER_WIDTH && letter.x + 25 > state.playerX &&
          letter.y < state.playerY + PLAYER_HEIGHT && letter.y + 25 > state.playerY) {
          const nextIndex = state.collectedLetters.length;
          const expectedLetter = state.correctLetters[nextIndex];
          
          if (letter.letter === expectedLetter) {
            state.collectedLetters.push(letter.letter);
            state.score += 10;

            if (state.collectedLetters.length === state.correctLetters.length) {
              state.wordsCompleted++;
              state.score += 50;

              const powerUpType = ["spread", "damage", "shield", "rapid"][Math.floor(Math.random() * 4)] as "spread" | "damage" | "shield" | "rapid";
              state.activePowerUps.push({ type: powerUpType, endTime: now + 10000 });
              state.bossHealth -= 100;

              if (wordsRef.current.length > 0) {
                const nextWord = wordsRef.current[Math.floor(Math.random() * wordsRef.current.length)];
                const spelling = (nextWord.spelling || nextWord.word).toLowerCase().replace(/[^a-z]/g, "");
                state.currentWord = nextWord;
                state.targetSpelling = spelling;
                state.correctLetters = spelling.split("");
                state.collectedLetters = [];
              }
            }
          } else {
            state.playerHealth -= 5;
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
      } else if (state.bossHealth <= 0 && state.wordsCompleted >= state.targetWordsToWin) {
        state.isGameOver = true;
        state.isVictory = true;
        state.score += 50;
        setShowResult(true);
      } else if (state.bossHealth <= 0) {
        state.bossHealth = state.maxBossHealth * 0.3;
      }

      // 渲染
      renderGame(state);
      setDisplayState({ ...state });

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameStarted]);

  const renderGame = (state: GameState) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 背景
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 星星
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 50; i++) {
      const x = (i * 73) % CANVAS_WIDTH;
      const y = (i * 41 + Date.now() * 0.02) % CANVAS_HEIGHT;
      ctx.fillRect(x, y, 2, 2);
    }

    // Boss
    const bossGradient = ctx.createLinearGradient(state.bossX, state.bossY, state.bossX, state.bossY + BOSS_HEIGHT);
    bossGradient.addColorStop(0, state.bossPhase === 3 ? "#ff0000" : state.bossPhase === 2 ? "#ff4400" : "#cc0000");
    bossGradient.addColorStop(1, "#8b0000");
    ctx.fillStyle = bossGradient;
    ctx.beginPath();
    ctx.moveTo(state.bossX + BOSS_WIDTH / 2, state.bossY);
    ctx.lineTo(state.bossX + BOSS_WIDTH, state.bossY + BOSS_HEIGHT);
    ctx.lineTo(state.bossX, state.bossY + BOSS_HEIGHT);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#ffff00";
    ctx.beginPath();
    ctx.arc(state.bossX + BOSS_WIDTH / 2 - 15, state.bossY + 40, 8, 0, Math.PI * 2);
    ctx.arc(state.bossX + BOSS_WIDTH / 2 + 15, state.bossY + 40, 8, 0, Math.PI * 2);
    ctx.fill();

    // 玩家
    const playerFlash = state.playerInvincible && Math.floor(Date.now() / 100) % 2 === 0;
    if (!playerFlash) {
      const playerGradient = ctx.createLinearGradient(state.playerX, state.playerY + PLAYER_HEIGHT, state.playerX, state.playerY);
      playerGradient.addColorStop(0, "#0066ff");
      playerGradient.addColorStop(1, "#00ccff");
      ctx.fillStyle = playerGradient;
      ctx.beginPath();
      ctx.moveTo(state.playerX + PLAYER_WIDTH / 2, state.playerY);
      ctx.lineTo(state.playerX + PLAYER_WIDTH, state.playerY + PLAYER_HEIGHT);
      ctx.lineTo(state.playerX, state.playerY + PLAYER_HEIGHT);
      ctx.closePath();
      ctx.fill();

      if (state.activePowerUps.some((p) => p.type === "shield" && p.endTime > Date.now())) {
        ctx.strokeStyle = "#00ffff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(state.playerX + PLAYER_WIDTH / 2, state.playerY + PLAYER_HEIGHT / 2, 35, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // 子彈
    state.bullets.forEach((bullet) => {
      ctx.fillStyle = bullet.color;
      if (bullet.type === "large" || bullet.type === "tracking") {
        ctx.beginPath();
        ctx.arc(bullet.x + bullet.width / 2, bullet.y + bullet.height / 2, bullet.width / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
      }
    });

    // 字母
    state.fallingLetters.forEach((letter) => {
      const nextExpected = state.correctLetters[state.collectedLetters.length];
      const isNext = letter.letter === nextExpected;
      ctx.fillStyle = isNext ? "#00ff00" : "#ffffff";
      ctx.strokeStyle = isNext ? "#00ff00" : "#888888";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(letter.x, letter.y, 28, 28, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = isNext ? "#000000" : "#333333";
      ctx.font = "bold 18px Arial";
      ctx.textAlign = "center";
      ctx.fillText(letter.letter.toUpperCase(), letter.x + 14, letter.y + 20);
    });

    // Boss 血條
    ctx.fillStyle = "#333333";
    ctx.fillRect(50, 15, CANVAS_WIDTH - 100, 20);
    ctx.fillStyle = "#ff4444";
    ctx.fillRect(50, 15, ((CANVAS_WIDTH - 100) * Math.max(0, state.bossHealth)) / state.maxBossHealth, 20);
    ctx.strokeStyle = "#ffffff";
    ctx.strokeRect(50, 15, CANVAS_WIDTH - 100, 20);
    ctx.fillStyle = "#ffffff";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`BOSS HP: ${Math.max(0, Math.floor(state.bossHealth))} / ${state.maxBossHealth}`, CANVAS_WIDTH / 2, 30);

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
    ctx.fillStyle = "#ffff00";
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "right";
    ctx.fillText(`分數: ${state.score}`, CANVAS_WIDTH - 10, CANVAS_HEIGHT - 15);

    // 當前單字
    if (state.currentWord) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 20px Arial";
      ctx.textAlign = "center";
      ctx.fillText(`${state.currentWord.word} - ${state.currentWord.explanation}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 60);

      const spelling = state.targetSpelling.toUpperCase();
      let displayText = "";
      for (let i = 0; i < spelling.length; i++) {
        displayText += i < state.collectedLetters.length ? spelling[i] : "_";
        displayText += " ";
      }
      ctx.fillStyle = "#00ffff";
      ctx.font = "bold 24px monospace";
      ctx.fillText(displayText, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 85);
    }

    // 單字進度
    ctx.fillStyle = "#ffffff";
    ctx.font = "16px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`完成單字: ${state.wordsCompleted} / ${state.targetWordsToWin}`, 10, CANVAS_HEIGHT - 60);

    // 增益
    const now = Date.now();
    const icons: Record<string, string> = { spread: "🔫", damage: "💥", shield: "🛡️", rapid: "⚡" };
    state.activePowerUps.forEach((p, i) => {
      const remaining = Math.ceil((p.endTime - now) / 1000);
      ctx.fillStyle = "#ffffff";
      ctx.font = "16px Arial";
      ctx.textAlign = "left";
      ctx.fillText(`${icons[p.type]} ${remaining}s`, 180 + i * 60, CANVAS_HEIGHT - 15);
    });

    // 暫停
    if (state.isPaused) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 48px Arial";
      ctx.textAlign = "center";
      ctx.fillText("暫停", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      ctx.font = "20px Arial";
      ctx.fillText("按 ESC 繼續", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
    }
  };

  const handleRestart = () => {
    setShowResult(false);
    startGame();
  };

  const handleBackToSelect = () => {
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
    }
    setGameStarted(false);
    setShowResult(false);
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>🎮 單字飛機大戰</Typography>

      {!gameStarted ? (
        <Paper sx={{ p: 4 }}>
          <Typography variant="h6" gutterBottom>遊戲說明</Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            駕駛戰機對抗 Boss！收集正確的拼音字母組成單字來獲得增強能力。完成 {TARGET_WORDS_TO_WIN} 個單字後才能擊敗 Boss！
          </Typography>

          <Box sx={{ mb: 3, p: 2, bgcolor: "#f5f5f5", borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>操作方式</Typography>
            <Typography variant="body2">• WASD 或 方向鍵：移動飛機</Typography>
            <Typography variant="body2">• 空白鍵：發射子彈</Typography>
            <Typography variant="body2">• ESC：暫停遊戲</Typography>
          </Box>

          <Box sx={{ mb: 3, p: 2, bgcolor: "#e3f2fd", borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>增強效果（完成單字後獲得）</Typography>
            <Typography variant="body2">🔫 多彈道 - 同時發射 3 發子彈</Typography>
            <Typography variant="body2">💥 傷害提升 - 子彈傷害 x2</Typography>
            <Typography variant="body2">🛡️ 護盾 - 免疫一次傷害</Typography>
            <Typography variant="body2">⚡ 快速射擊 - 射速提升</Typography>
          </Box>

          <Box sx={{ mb: 3, p: 2, bgcolor: "#fff3e0", borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Boss 攻擊模式</Typography>
            <Typography variant="body2">🔴 大型子彈 - 高傷害單發攻擊</Typography>
            <Typography variant="body2">🟠 散射彈幕 - 扇形多發子彈</Typography>
            <Typography variant="body2">🟣 追蹤彈 - 會追蹤玩家的子彈</Typography>
          </Box>

          <Box sx={{ mb: 3, p: 2, bgcolor: "#e8f5e9", borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>勝利條件</Typography>
            <Typography variant="body2">• 收集正確字母組成單字（綠色 = 正確的下一個字母）</Typography>
            <Typography variant="body2">• 完成至少 {TARGET_WORDS_TO_WIN} 個單字</Typography>
            <Typography variant="body2">• 擊敗 Boss（血量歸零）→ 通關獎勵 50 積分</Typography>
          </Box>

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>選擇單字本</InputLabel>
            <Select value={selectedVocabId} onChange={(e) => setSelectedVocabId(e.target.value)} label="選擇單字本">
              {vocabularies.map((v) => (
                <MenuItem key={v.vocabularyId} value={v.vocabularyId}>
                  {v.name} ({v.wordCount} 個單字)
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button variant="contained" size="large" fullWidth onClick={startGame} disabled={!selectedVocabId} sx={{ py: 2 }}>
            開始遊戲
          </Button>
        </Paper>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Box sx={{ mb: 2, display: "flex", gap: 2 }}>
            <IconButton onClick={() => setSoundEnabled(!soundEnabled)}>
              {soundEnabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
            </IconButton>
            <Button variant="outlined" onClick={handleBackToSelect}>返回選擇</Button>
          </Box>
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            style={{ border: "3px solid #333", borderRadius: "8px", background: "#1a1a2e" }}
            tabIndex={0}
          />
          <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
            WASD/方向鍵 移動 | 空白鍵 射擊 | ESC 暫停
          </Typography>
        </Box>
      )}

      <Dialog open={showResult} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ textAlign: "center" }}>
          {displayState.isVictory ? "🎉 勝利！" : "💀 遊戲結束"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: "center", py: 2 }}>
            <Typography variant="h4" color="primary" gutterBottom>{displayState.score} 分</Typography>
            <Typography variant="body1">完成單字: {displayState.wordsCompleted} / {displayState.targetWordsToWin}</Typography>
            {displayState.isVictory && <Chip label="通關獎勵 +50 積分" color="success" sx={{ mt: 2 }} />}
            {!displayState.isVictory && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                {displayState.wordsCompleted < displayState.targetWordsToWin
                  ? `提示：需要完成 ${displayState.targetWordsToWin} 個單字才能擊敗 Boss`
                  : "再接再厲！"}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", pb: 3 }}>
          <Button variant="outlined" onClick={handleBackToSelect}>返回選擇</Button>
          <Button variant="contained" onClick={handleRestart}>再玩一次</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
