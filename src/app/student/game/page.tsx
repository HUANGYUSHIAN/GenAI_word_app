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
  spawnTime?: number; // 生成時間
  expireTime?: number; // 過期時間
}

interface Cactus {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
}

interface FlyingLetter {
  id: number;
  letter: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Zombie {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  health: number;
  maxHealth: number;
  attackCooldown: number;
  lastAttack: number;
  angle?: number; // 朝向玩家的角度
  type?: "normal" | "fast"; // 殭屍類型
}

interface Grenade {
  id: number;
  x: number;
  y: number;
  radius: number;
  explosionTime: number;
  damage: number;
}

interface Explosion {
  id: number;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
}

interface Fruit {
  id: number;
  x: number;
  y: number;
  radius: number;
  vx: number; // 水平速度
  vy: number; // 垂直速度
  letter: string | null; // 字母（null 表示炸彈）
  type: "fruit" | "bomb";
  color: string;
  fruitType?: string; // 水果類型：apple, orange, strawberry, watermelon, banana, etc.
  isSliced: boolean;
  sliceTime?: number;
}

interface SliceTrail {
  points: Array<{ x: number; y: number; time: number }>;
}

interface PerfectAnimation {
  show: boolean;
  startTime: number;
  duration: number;
}

interface BuildingCell {
  id: string;
  type: "window" | "door" | "roof" | "chimney" | "mailbox" | "flower" | "tree" | "fence" | "garage" | "wall";
  state: "normal" | "broken";
  x: number;
  y: number;
  width: number;
  height: number;
  repairTarget?: boolean; // 玩家是否正在修補這個目標
  floor?: number; // 樓層（1或2）
}

interface ExplosionEffect {
  id: string;
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
  color: string;
}

interface Question {
  word: string;
  spelling: string;
  explanation: string;
  choices: string[];
  correctIndex: number;
}

interface ActivePowerUp {
  type: "spread" | "damage" | "shield" | "rapid";
  endTime: number;
}

type Difficulty = "easy" | "normal" | "hard" | "hell";
type GameType = "none" | "plane-shooter" | "dino-game" | "zombie-shooter" | "fruit-slicer" | "fixit";

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
  maxPlayerHealth: number;
  pointsPerWord: number; // 每完成一個單字獲得的積分
  maxPoints: number; // 一局最多可獲得的積分
}

// 飛機大戰難度設定
const PLANE_SHOOTER_DIFFICULTY: Record<Difficulty, DifficultySettings> = {
  easy: {
    name: "😊 簡單",
    color: "#4caf50",
    bossHealth: 10000,
    bossAttackSpeed: 2.5,
    bossSpeed: 1.5,
    letterFrequency: 0.08,
    letterSpeed: 0.8,
    wrongLetterDamage: 0,
    playerDamage: 15,
    playerShootCooldown: 300,
    trackingDuration: 2000,
    maxPlayerHealth: 300,
    pointsPerWord: 1,
    maxPoints: 10,
  },
  normal: {
    name: "😐 普通",
    color: "#2196f3",
    bossHealth: 30000,
    bossAttackSpeed: 1.8,
    bossSpeed: 2,
    letterFrequency: 0.08,
    letterSpeed: 1,
    wrongLetterDamage: 0,
    playerDamage: 12,
    playerShootCooldown: 280,
    trackingDuration: 2500,
    maxPlayerHealth: 250,
    pointsPerWord: 1.5,
    maxPoints: 15,
  },
  hard: {
    name: "😈 困難",
    color: "#ff9800",
    bossHealth: 100000,
    bossAttackSpeed: 1.2,
    bossSpeed: 2.5,
    letterFrequency: 0.08,
    letterSpeed: 1.2,
    wrongLetterDamage: 5,
    playerDamage: 10,
    playerShootCooldown: 260,
    trackingDuration: 3000,
    maxPlayerHealth: 100,
    pointsPerWord: 2,
    maxPoints: 20,
  },
  hell: {
    name: "💀 地獄",
    color: "#f44336",
    bossHealth: 1000000000,
    bossAttackSpeed: 0.8,
    bossSpeed: 3,
    letterFrequency: 0.08,
    letterSpeed: 1.5,
    wrongLetterDamage: 10,
    playerDamage: 8,
    playerShootCooldown: 250,
    trackingDuration: 4000,
    maxPlayerHealth: 100,
    pointsPerWord: 5,
    maxPoints: 50,
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
    maxPlayerHealth: 300,
    pointsPerWord: 1,
    maxPoints: 10,
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
    maxPlayerHealth: 250,
    pointsPerWord: 1.5,
    maxPoints: 15,
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
    maxPlayerHealth: 100,
    pointsPerWord: 2,
    maxPoints: 20,
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
    maxPlayerHealth: 100,
    pointsPerWord: 5,
    maxPoints: 50,
  },
};

// 殭屍射擊遊戲難度設定
const ZOMBIE_SHOOTER_DIFFICULTY: Record<Difficulty, DifficultySettings> = {
  easy: {
    name: "😊 簡單",
    color: "#4caf50",
    bossHealth: 0,
    bossAttackSpeed: 0,
    bossSpeed: 0,
    letterFrequency: 0.15,
    letterSpeed: 1,
    wrongLetterDamage: 0,
    playerDamage: 20,
    playerShootCooldown: 200,
    trackingDuration: 0,
    maxPlayerHealth: 200,
    pointsPerWord: 1,
    maxPoints: 10,
  },
  normal: {
    name: "😐 普通",
    color: "#2196f3",
    bossHealth: 0,
    bossAttackSpeed: 0,
    bossSpeed: 0,
    letterFrequency: 0.12,
    letterSpeed: 1.2,
    wrongLetterDamage: 0,
    playerDamage: 15,
    playerShootCooldown: 180,
    trackingDuration: 0,
    maxPlayerHealth: 150,
    pointsPerWord: 1.5,
    maxPoints: 15,
  },
  hard: {
    name: "😈 困難",
    color: "#ff9800",
    bossHealth: 0,
    bossAttackSpeed: 0,
    bossSpeed: 0,
    letterFrequency: 0.1,
    letterSpeed: 1.5,
    wrongLetterDamage: 0,
    playerDamage: 12,
    playerShootCooldown: 160,
    trackingDuration: 0,
    maxPlayerHealth: 100,
    pointsPerWord: 2,
    maxPoints: 20,
  },
  hell: {
    name: "💀 地獄",
    color: "#f44336",
    bossHealth: 0,
    bossAttackSpeed: 0,
    bossSpeed: 0,
    letterFrequency: 0.08,
    letterSpeed: 2,
    wrongLetterDamage: 0,
    playerDamage: 10,
    playerShootCooldown: 140,
    trackingDuration: 0,
    maxPlayerHealth: 80,
    pointsPerWord: 5,
    maxPoints: 50,
  },
};

// 切水果遊戲難度設定
const FRUIT_SLICER_DIFFICULTY: Record<Difficulty, DifficultySettings> = {
  easy: {
    name: "😊 簡單",
    color: "#4caf50",
    bossHealth: 0,
    bossAttackSpeed: 0,
    bossSpeed: 0,
    letterFrequency: 0,
    letterSpeed: 1,
    wrongLetterDamage: 0,
    playerDamage: 0,
    playerShootCooldown: 0,
    trackingDuration: 0,
    maxPlayerHealth: 200,
    pointsPerWord: 1,
    maxPoints: 10,
  },
  normal: {
    name: "😐 普通",
    color: "#2196f3",
    bossHealth: 0,
    bossAttackSpeed: 0,
    bossSpeed: 0,
    letterFrequency: 0,
    letterSpeed: 1.2, // 速度 +20%
    wrongLetterDamage: 0,
    playerDamage: 0,
    playerShootCooldown: 0,
    trackingDuration: 0,
    maxPlayerHealth: 150,
    pointsPerWord: 1.5,
    maxPoints: 15,
  },
  hard: {
    name: "😈 困難",
    color: "#ff9800",
    bossHealth: 0,
    bossAttackSpeed: 0,
    bossSpeed: 0,
    letterFrequency: 0,
    letterSpeed: 1.5,
    wrongLetterDamage: 0,
    playerDamage: 0,
    playerShootCooldown: 0,
    trackingDuration: 0,
    maxPlayerHealth: 100,
    pointsPerWord: 2,
    maxPoints: 20,
  },
  hell: {
    name: "💀 地獄",
    color: "#f44336",
    bossHealth: 0,
    bossAttackSpeed: 0,
    bossSpeed: 0,
    letterFrequency: 0,
    letterSpeed: 2,
    wrongLetterDamage: 0,
    playerDamage: 0,
    playerShootCooldown: 0,
    trackingDuration: 0,
    maxPlayerHealth: 80,
    pointsPerWord: 5,
    maxPoints: 50,
  },
};

// 房屋修繕遊戲難度設定
const FIXIT_DIFFICULTY: Record<Difficulty, DifficultySettings> = {
  easy: {
    name: "😊 簡單",
    color: "#4caf50",
    bossHealth: 0,
    bossAttackSpeed: 0,
    bossSpeed: 0,
    letterFrequency: 0,
    letterSpeed: 1,
    wrongLetterDamage: 0,
    playerDamage: 0,
    playerShootCooldown: 0,
    trackingDuration: 0,
    maxPlayerHealth: 100,
    pointsPerWord: 1,
    maxPoints: 10,
  },
  normal: {
    name: "😐 普通",
    color: "#2196f3",
    bossHealth: 0,
    bossAttackSpeed: 0,
    bossSpeed: 0,
    letterFrequency: 0,
    letterSpeed: 1.2,
    wrongLetterDamage: 0,
    playerDamage: 0,
    playerShootCooldown: 0,
    trackingDuration: 0,
    maxPlayerHealth: 80,
    pointsPerWord: 1.5,
    maxPoints: 15,
  },
  hard: {
    name: "😈 困難",
    color: "#ff9800",
    bossHealth: 0,
    bossAttackSpeed: 0,
    bossSpeed: 0,
    letterFrequency: 0,
    letterSpeed: 1.5,
    wrongLetterDamage: 0,
    playerDamage: 0,
    playerShootCooldown: 0,
    trackingDuration: 0,
    maxPlayerHealth: 60,
    pointsPerWord: 2,
    maxPoints: 20,
  },
  hell: {
    name: "💀 地獄",
    color: "#f44336",
    bossHealth: 0,
    bossAttackSpeed: 0,
    bossSpeed: 0,
    letterFrequency: 0,
    letterSpeed: 2,
    wrongLetterDamage: 0,
    playerDamage: 0,
    playerShootCooldown: 0,
    trackingDuration: 0,
    maxPlayerHealth: 40,
    pointsPerWord: 5,
    maxPoints: 50,
  },
};

interface GameState {
  playerX?: number; // 玩家X位置（飛機大戰、fixit遊戲）
  playerY?: number; // 玩家Y位置（飛機大戰、fixit遊戲）
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
  points: number; // 積分（一局最多20）
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
  // 小恐龍遊戲專用狀態
  dinoY?: number;
  dinoVelocity?: number;
  isJumping?: boolean;
  jumpCount?: number; // 跳躍次數（用於二段跳）
  groundY?: number;
  cacti?: Cactus[];
  flyingLetters?: FlyingLetter[];
  gameSpeed?: number;
  isDashing?: boolean;
  dashEndTime?: number;
  lastCactusSpawn?: number;
  lastLetterSpawn?: number;
  effectMessage?: string; // 效果提示訊息
  effectMessageEndTime?: number; // 效果提示結束時間
  // 殭屍射擊遊戲專用狀態
  zombies?: Zombie[];
  grenades?: Grenade[];
  explosions?: Explosion[];
  playerBullets?: Bullet[];
  weaponLevel?: number; // 武器等級 (0=普通, 1=升級)
  autoShootCooldown?: number;
  lastZombieSpawn?: number;
  zombieSpawnRate?: number;
  letterSpawnRate?: number;
  mouseX?: number; // 滑鼠X座標
  mouseY?: number; // 滑鼠Y座標
  shootAngle?: number; // 射擊角度
  // 切水果遊戲專用狀態
  fruits?: Fruit[];
  sliceTrail?: SliceTrail;
  isSlicing?: boolean;
  perfectAnimation?: PerfectAnimation;
  screenShake?: { intensity: number; endTime: number };
  lastFruitSpawn?: number;
  targetWordCount?: number; // 目標完成單字數（例如 10）
  // 房屋修繕遊戲專用狀態
  buildingCells?: BuildingCell[];
  buildingHp?: number;
  maxBuildingHp?: number;
  repairSpeed?: number;
  baseRepairSpeed?: number;
  damageSpeed?: number;
  baseDamageSpeed?: number;
  currentQuestion?: Question | null;
  isQuestionActive?: boolean;
  questionStartTime?: number;
  lastDamageTime?: number;
  lastRepairTime?: number;
  repairSpeedBoostEndTime?: number;
  damageSpeedBoostEndTime?: number;
  answeredCount?: number;
  correctCount?: number;
  totalQuestions?: number;
  // 房屋修繕遊戲專用狀態
  repairTargetCellId?: string | null; // 當前要修補的目標格子ID
  villainX?: number; // 壞人X位置
  villainY?: number; // 壞人Y位置
  villainTargetX?: number; // 壞人目標X位置
  villainTargetY?: number; // 壞人目標Y位置
  fixitExplosions?: ExplosionEffect[]; // 爆炸特效列表（fixit遊戲專用）
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

// 小恐龍遊戲常數
const DINO_WIDTH = 40;
const DINO_HEIGHT = 50;
const DINO_START_X = 100;
const DINO_GROUND_Y = CANVAS_HEIGHT - 100;
const DINO_JUMP_POWER = -15;
const GRAVITY = 0.8;
const CACTUS_WIDTH = 30;
const CACTUS_HEIGHT = 60;
const CACTUS_SPAWN_INTERVAL = 2000;
const LETTER_SPAWN_INTERVAL = 3000;
const LETTER_SIZE = 30;
const DASH_DURATION = 2000;
const INVINCIBLE_DURATION = 3000;

// 殭屍射擊遊戲常數
const ZOMBIE_WIDTH = 40;
const ZOMBIE_HEIGHT = 50;
const ZOMBIE_SPEED = 0.5; // 普通殭屍速度
const FAST_ZOMBIE_SPEED = 1.2; // 快速殭屍速度
const ZOMBIE_HEALTH = 30;
const FAST_ZOMBIE_HEALTH = 20; // 快速殭屍血量較少
const ZOMBIE_ATTACK_DAMAGE = 10;
const ZOMBIE_ATTACK_COOLDOWN = 2000;
const ZOMBIE_SPAWN_INTERVAL = 3000; // 增加生成間隔
const LETTER_SIZE_ZOMBIE = 25;
const LETTER_EXPIRE_TIME = 8000; // 字母8秒後消失
const GRENADE_RADIUS = 80;
const GRENADE_DAMAGE = 50;
const EXPLOSION_DURATION = 500;
const PLAYER_BULLET_SPEED = 10;
const PLAYER_BULLET_DAMAGE = 15;
const PLAYER_CENTER_Y = CANVAS_HEIGHT / 2; // 玩家固定在中間高度

// 切水果遊戲常數
const FRUIT_RADIUS = 30;
// 重新計算：確保水果不飛出畫面，最高點在可見區域，停留約3秒
// 遊戲區域：從 y=120 (HUD底部) 到 y=520 (STATUS頂部)，高度400px
// 水果從 y=520 開始，最高點設在 y=250（中間偏上，可見區域內）
// 上升距離：520 - 250 = 270px
// 假設60fps，3秒=180幀，上升90幀，下降90幀
// 拋物線公式：h = 0.5 * g * t^2
// 270 = 0.5 * g * 90^2，所以 g = 270 / (0.5 * 8100) ≈ 0.0667
// 初始速度 v0 = g * 90 ≈ 6.0
const FRUIT_BASE_SPEED = 6.0; // 初始向上速度，確保最高點在可見區域內
const FRUIT_SPAWN_INTERVAL = 800;
const BOMB_SPAWN_CHANCE = 0.15; // 15% 機率生成炸彈
const GRAVITY_FRUIT = 0.067; // 重力，確保水果在3秒內完成拋物線且不飛出畫面
const SLICE_TRAIL_DURATION = 200; // 切痕持續時間（毫秒）
const PERFECT_ANIMATION_DURATION = 2000; // Perfect! 動畫持續時間
const INVINCIBLE_TIME_ON_WORD_COMPLETE = 3000; // 完成單字後無敵時間
const HP_HEAL_ON_WORD_COMPLETE = 20; // 完成單字回復的 HP
const WRONG_LETTER_HP_LOSS = 5; // 切錯字母扣的 HP
const BOMB_HP_LOSS = 30; // 切到炸彈扣的 HP
const HUD_HEIGHT = 120; // HUD 區域高度
const STATUS_HEIGHT = 80; // 狀態區高度
const GAME_AREA_HEIGHT = CANVAS_HEIGHT - HUD_HEIGHT - STATUS_HEIGHT; // 遊戲區域高度

// 房屋修繕遊戲常數
// 房屋修繕遊戲常數（重新設計）
const PLAYER_SIZE = 30; // 玩家大小
const PLAYER_SPEED_FIXIT = 3; // 玩家移動速度
const BASE_DAMAGE_INTERVAL = 3000; // 基礎破壞間隔（毫秒）
const QUESTION_INTERVAL = 5000; // 題目出現間隔（毫秒）
const PERFECT_ANIMATION_DURATION_FIXIT = 1500; // Perfect 動畫持續時間
const COLLISION_DISTANCE = 40; // 碰撞檢測距離（玩家與破損區域的距離）
const HOUSE_X = CANVAS_WIDTH / 2 - 200; // 房子X位置（居中）
const HOUSE_Y = HUD_HEIGHT + 20; // 房子Y位置
const HOUSE_WIDTH = 400; // 房子寬度
const HOUSE_HEIGHT = 400; // 房子高度
const VILLAIN_SIZE = 40; // 壞人大小
const VILLAIN_SPEED = 1.5; // 壞人移動速度
// EXPLOSION_DURATION 已在上面定義（第669行），用於殭屍射擊遊戲，房屋修繕遊戲也使用同一個常量

// ==================== 遊戲列表 ====================
const GAME_LIST = [
  {
    id: "plane-shooter",
    name: "✈️ 飛機大戰",
    description: "操控飛機擊敗 Boss，收集字母拼出單字獲得增強效果！",
    color: "#1976d2",
  },
  {
    id: "dino-game",
    name: "🦕 小恐龍逃脫遊戲",
    description: "跳起來收集字母拼出單字，跳過仙人掌避免碰撞，完成單字可復活無敵衝刺！",
    color: "#4caf50",
  },
  {
    id: "zombie-shooter",
    name: "🧟 殭屍射擊遊戲",
    description: "自動射擊殭屍，收集字母拼出單字！拼對字母獲得手榴彈，完成單字升級武器！",
    color: "#8b4513",
  },
  {
    id: "fruit-slicer",
    name: "🍎 單字切水果",
    description: "用滑鼠切水果收集字母拼出單字！小心炸彈！完成單字獲得無敵時間和回復！",
    color: "#ff6b6b",
  },
  {
    id: "fixit",
    name: "🔨 房屋修繕單字戰",
    description: "修補被破壞的大樓！答對單字題目提升修補速度，答錯會加速破壞！",
    color: "#8b4513",
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
    points: 0,
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
    if (selectedGame === "zombie-shooter") {
      return ZOMBIE_SHOOTER_DIFFICULTY;
    }
    if (selectedGame === "fruit-slicer") {
      return FRUIT_SLICER_DIFFICULTY;
    }
    if (selectedGame === "fixit") {
      return FIXIT_DIFFICULTY;
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

    if (selectedGame === "dino-game") {
      // 小恐龍遊戲初始化
      const initialState: GameState = {
        playerX: 0,
        playerY: 0,
        playerHealth: MAX_PLAYER_HEALTH,
        maxPlayerHealth: MAX_PLAYER_HEALTH,
        bossX: 0,
        bossY: 0,
        bossHealth: 0,
        maxBossHealth: 0,
        bullets: [],
        fallingLetters: [],
        activePowerUps: [],
        score: 0,
        points: 0,
        correctLetters: firstWord.spelling.split(""),
        currentWord: firstWord.word,
        targetSpelling: firstWord.spelling,
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
        dinoY: DINO_GROUND_Y,
        dinoVelocity: 0,
        isJumping: false,
        jumpCount: 0,
        groundY: DINO_GROUND_Y,
        cacti: [],
        flyingLetters: [],
        gameSpeed: 3,
        isDashing: false,
        dashEndTime: 0,
        lastCactusSpawn: Date.now(),
        lastLetterSpawn: Date.now(),
      };
      gameStateRef.current = initialState;
      setDisplayState(initialState);
      setGameStarted(true);
      setShowResult(false);
      return;
    }

    if (selectedGame === "zombie-shooter") {
      // 殭屍射擊遊戲初始化
      const settings = ZOMBIE_SHOOTER_DIFFICULTY[selectedDifficulty];
      const initialState: GameState = {
        playerX: CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2, // 玩家在中間
        playerY: PLAYER_CENTER_Y - PLAYER_HEIGHT / 2, // 初始位置在中間高度
        playerHealth: settings.maxPlayerHealth,
        maxPlayerHealth: settings.maxPlayerHealth,
        bossX: 0,
        bossY: 0,
        bossHealth: 0,
        maxBossHealth: 0,
        bullets: [],
        fallingLetters: [],
        activePowerUps: [],
        score: 0,
        points: 0,
        correctLetters: firstWord.spelling.split(""),
        currentWord: firstWord.word,
        targetSpelling: firstWord.spelling,
        collectedLetters: [],
        wordsCompleted: 0,
        isGameOver: false,
        isVictory: false,
        isPaused: false,
        bossPhase: 1,
        bossAttackCooldown: 0,
        playerInvincible: false,
        invincibleEndTime: 0,
        difficulty: selectedDifficulty,
        zombies: [],
        grenades: [],
        explosions: [],
        playerBullets: [],
        weaponLevel: 0,
        autoShootCooldown: 0,
        lastZombieSpawn: Date.now(),
        lastLetterSpawn: Date.now(),
        zombieSpawnRate: ZOMBIE_SPAWN_INTERVAL,
        letterSpawnRate: 2000,
        mouseX: CANVAS_WIDTH / 2,
        mouseY: PLAYER_CENTER_Y,
        shootAngle: 0,
      };
      gameStateRef.current = initialState;
      setDisplayState(initialState);
      setGameStarted(true);
      setShowResult(false);
      return;
    }

    if (selectedGame === "fruit-slicer") {
      // 切水果遊戲初始化
      const settings = FRUIT_SLICER_DIFFICULTY[selectedDifficulty];
      const initialState: GameState = {
        playerX: 0,
        playerY: 0,
        playerHealth: settings.maxPlayerHealth,
        maxPlayerHealth: settings.maxPlayerHealth,
        bossX: 0,
        bossY: 0,
        bossHealth: 0,
        maxBossHealth: 0,
        bullets: [],
        fallingLetters: [],
        activePowerUps: [],
        score: 0,
        points: 0,
        correctLetters: firstWord.spelling.split(""),
        currentWord: firstWord.word,
        targetSpelling: firstWord.spelling,
        collectedLetters: [],
        wordsCompleted: 0,
        isGameOver: false,
        isVictory: false,
        isPaused: false,
        bossPhase: 1,
        bossAttackCooldown: 0,
        playerInvincible: false,
        invincibleEndTime: 0,
        difficulty: selectedDifficulty,
        fruits: [],
        sliceTrail: { points: [] },
        isSlicing: false,
        perfectAnimation: { show: false, startTime: 0, duration: PERFECT_ANIMATION_DURATION },
        screenShake: { intensity: 0, endTime: 0 },
        lastFruitSpawn: Date.now(),
        targetWordCount: 10, // 目標完成 10 個單字
      };
      gameStateRef.current = initialState;
      setDisplayState(initialState);
      setGameStarted(true);
      setShowResult(false);
      return;
    }

    if (selectedGame === "fixit") {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/e42c80ae-c6e7-4b7a-90e3-b372014f1250',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:1013',message:'Fixit game initialization started',data:{selectedDifficulty,loadedWordsCount:loadedWords.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      // 房屋修繕遊戲初始化
      const settings = FIXIT_DIFFICULTY[selectedDifficulty];
      
      // 初始化精緻的房子結構（完全符合圖片描述）
      const buildingCells: BuildingCell[] = [];
      let cellId = 0;
      
      const roofY = HOUSE_Y;
      const roofHeight = 50; // 屋頂高度
      const firstFloorY = HOUSE_Y + roofHeight + 10; // 一樓開始位置
      const secondFloorY = HOUSE_Y + roofHeight + 140; // 二樓開始位置
      const wallHeight = 130; // 每層牆壁高度
      
      // 屋頂（深紫紅色，中央矩形 + 兩側三角形山牆）
      // 中央矩形屋頂（60%寬度）
      const centralRoofWidth = HOUSE_WIDTH * 0.6;
      const centralRoofX = HOUSE_X + (HOUSE_WIDTH - centralRoofWidth) / 2;
      for (let i = 0; i < 6; i++) {
        buildingCells.push({
          id: `roof-central-${cellId++}`,
          type: "roof",
          state: "normal",
          x: centralRoofX + (i * centralRoofWidth / 6),
          y: roofY,
          width: centralRoofWidth / 6,
          height: roofHeight,
        });
      }
      // 左側三角形山牆（簡化為矩形）
      buildingCells.push({
        id: `roof-left-${cellId++}`,
        type: "roof",
        state: "normal",
        x: HOUSE_X,
        y: roofY,
        width: (HOUSE_WIDTH - centralRoofWidth) / 2,
        height: roofHeight,
      });
      // 右側三角形山牆
      buildingCells.push({
        id: `roof-right-${cellId++}`,
        type: "roof",
        state: "normal",
        x: HOUSE_X + HOUSE_WIDTH - (HOUSE_WIDTH - centralRoofWidth) / 2,
        y: roofY,
        width: (HOUSE_WIDTH - centralRoofWidth) / 2,
        height: roofHeight,
      });
      
      // 中央屋頂的小三角形窗戶
      buildingCells.push({
        id: `roof-window-${cellId++}`,
        type: "window",
        state: "normal",
        x: HOUSE_X + HOUSE_WIDTH / 2 - 15,
        y: roofY + 10,
        width: 30,
        height: 25,
      });
      
      // 煙囪（淺棕色/米色，從中央屋頂左側突出）
      buildingCells.push({
        id: `chimney-${cellId++}`,
        type: "chimney",
        state: "normal",
        x: centralRoofX + 30,
        y: roofY - 40,
        width: 40,
        height: 70,
      });
      
      // 二樓窗戶（5個：中央屋頂下3個並排，兩側山牆各1個）
      // 中央3個並排窗戶
      const windowSpacing = 60;
      const centralWindowsStartX = HOUSE_X + HOUSE_WIDTH / 2 - (windowSpacing * 1.5);
      for (let i = 0; i < 3; i++) {
        buildingCells.push({
          id: `window-2f-center-${cellId++}`,
          type: "window",
          state: "normal",
          x: centralWindowsStartX + (i * windowSpacing),
          y: secondFloorY + 20,
          width: 50,
          height: 50,
          floor: 2,
        });
      }
      // 左側山牆窗戶
      buildingCells.push({
        id: `window-2f-left-${cellId++}`,
        type: "window",
        state: "normal",
        x: HOUSE_X + 20,
        y: secondFloorY + 20,
        width: 50,
        height: 50,
        floor: 2,
      });
      // 右側山牆窗戶
      buildingCells.push({
        id: `window-2f-right-${cellId++}`,
        type: "window",
        state: "normal",
        x: HOUSE_X + HOUSE_WIDTH - 70,
        y: secondFloorY + 20,
        width: 50,
        height: 50,
        floor: 2,
      });
      
      // 一樓窗戶（4個：兩側山牆各2個）
      for (let i = 0; i < 2; i++) {
        // 左側山牆2個窗戶
        buildingCells.push({
          id: `window-1f-left-${cellId++}`,
          type: "window",
          state: "normal",
          x: HOUSE_X + 20 + (i * 60),
          y: firstFloorY + 150,
          width: 50,
          height: 50,
          floor: 1,
        });
        // 右側山牆2個窗戶
        buildingCells.push({
          id: `window-1f-right-${cellId++}`,
          type: "window",
          state: "normal",
          x: HOUSE_X + HOUSE_WIDTH - 70 - (i * 60),
          y: firstFloorY + 150,
          width: 50,
          height: 50,
          floor: 1,
        });
      }
      
      // 門（中央第一層，深紫紅色拱形，位置再往下移）
      buildingCells.push({
        id: `door-${cellId++}`,
        type: "door",
        state: "normal",
        x: HOUSE_X + HOUSE_WIDTH / 2 - 40,
        y: firstFloorY + 220,
        width: 80,
        height: 110,
      });
      
      // 拱門/車庫（門的兩側，較寬的拱形開口，內有帶兩條水平線的矩形）
      buildingCells.push({
        id: `garage-left-${cellId++}`,
        type: "garage",
        state: "normal",
        x: HOUSE_X + HOUSE_WIDTH / 2 - 140,
        y: firstFloorY + 150,
        width: 90,
        height: 80,
      });
      buildingCells.push({
        id: `garage-right-${cellId++}`,
        type: "garage",
        state: "normal",
        x: HOUSE_X + HOUSE_WIDTH / 2 + 50,
        y: firstFloorY + 150,
        width: 90,
        height: 80,
      });
      
      // 花園/灌木叢（底部兩側各一個圓形、蓬鬆的綠色灌木叢）
      const gardenY = HOUSE_Y + HOUSE_HEIGHT;
      // 左側灌木叢
      buildingCells.push({
        id: `shrub-left-${cellId++}`,
        type: "flower",
        state: "normal",
        x: HOUSE_X - 40,
        y: gardenY - 30,
        width: 80,
        height: 60,
      });
      // 右側灌木叢
      buildingCells.push({
        id: `shrub-right-${cellId++}`,
        type: "flower",
        state: "normal",
        x: HOUSE_X + HOUSE_WIDTH - 40,
        y: gardenY - 30,
        width: 80,
        height: 60,
      });
      
      // 花圃（房子前方，6個花盆）
      for (let i = 0; i < 6; i++) {
        buildingCells.push({
          id: `flower-${cellId++}`,
          type: "flower",
          state: "normal",
          x: HOUSE_X + 50 + (i * 50),
          y: gardenY,
          width: 40,
          height: 40,
        });
      }
      
      // 樹（房子兩側，如果需要）
      buildingCells.push({
        id: `tree-left-${cellId++}`,
        type: "tree",
        state: "normal",
        x: HOUSE_X - 80,
        y: HOUSE_Y + 100,
        width: 70,
        height: 150,
      });
      buildingCells.push({
        id: `tree-right-${cellId++}`,
        type: "tree",
        state: "normal",
        x: HOUSE_X + HOUSE_WIDTH + 10,
        y: HOUSE_Y + 100,
        width: 70,
        height: 150,
      });
      
      // 信箱（右側，藍色立方體帶紅色旗子）
      buildingCells.push({
        id: `mailbox-${cellId++}`,
        type: "mailbox",
        state: "normal",
        x: HOUSE_X + HOUSE_WIDTH + 30,
        y: gardenY - 20,
        width: 30,
        height: 40,
      });
      
      const maxBuildingHp = buildingCells.length; // 總元素數
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/e42c80ae-c6e7-4b7a-90e3-b372014f1250',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:1040',message:'Building cells created',data:{cellsCount:buildingCells.length,maxBuildingHp},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      const initialState: GameState = {
        playerX: HOUSE_X - 60, // 玩家初始位置（房子左側）
        playerY: HOUSE_Y + HOUSE_HEIGHT / 2, // 玩家初始位置（房子中間高度）
        playerHealth: 100,
        maxPlayerHealth: 100,
        bossX: 0,
        bossY: 0,
        bossHealth: 0,
        maxBossHealth: 0,
        bullets: [],
        fallingLetters: [],
        activePowerUps: [],
        score: 0,
        points: 0,
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
        difficulty: selectedDifficulty,
        buildingCells,
        buildingHp: maxBuildingHp,
        maxBuildingHp,
        repairSpeed: 0,
        baseRepairSpeed: 0,
        damageSpeed: BASE_DAMAGE_INTERVAL / settings.letterSpeed,
        baseDamageSpeed: BASE_DAMAGE_INTERVAL / settings.letterSpeed,
        currentQuestion: null,
        isQuestionActive: false,
        questionStartTime: 0,
        lastDamageTime: Date.now(),
        lastRepairTime: 0,
        repairSpeedBoostEndTime: 0,
        damageSpeedBoostEndTime: 0,
        answeredCount: 0,
        correctCount: 0,
        totalQuestions: loadedWords.length,
        repairTargetCellId: null, // 當前修補目標
        perfectAnimation: { show: false, startTime: 0, duration: PERFECT_ANIMATION_DURATION_FIXIT },
        villainX: HOUSE_X + HOUSE_WIDTH / 2, // 壞人初始位置（房子上方）
        villainY: HOUSE_Y - 30, // 壞人初始位置
        villainTargetX: HOUSE_X + HOUSE_WIDTH / 2, // 壞人目標X
        villainTargetY: HOUSE_Y - 30, // 壞人目標Y
        fixitExplosions: [], // 爆炸特效列表
      };
      gameStateRef.current = initialState;
      setDisplayState(initialState);
      setGameStarted(true);
      setShowResult(false);
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/e42c80ae-c6e7-4b7a-90e3-b372014f1250',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:1090',message:'Fixit game initialized and started',data:{buildingHp:initialState.buildingHp,isQuestionActive:initialState.isQuestionActive,buildingCellsCount:initialState.buildingCells?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      return;
    }

    // 飛機大戰遊戲初始化
    const settings = getDifficultySettings()[selectedDifficulty];
    const initialState: GameState = {
      playerX: CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2,
      playerY: CANVAS_HEIGHT - PLAYER_HEIGHT - 20,
      playerHealth: settings.maxPlayerHealth,
      maxPlayerHealth: settings.maxPlayerHealth,
      bossX: CANVAS_WIDTH / 2 - BOSS_WIDTH / 2,
      bossY: 50,
      bossHealth: settings.bossHealth,
      maxBossHealth: settings.bossHealth,
      bullets: [],
      fallingLetters: [],
      activePowerUps: [],
      score: 0,
      points: 0,
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

  const renderDinoGame = useCallback((state: GameState) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 清除畫布（避免殘影）
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 背景（天空和地面）
    ctx.fillStyle = "#87CEEB";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // 地面
    ctx.fillStyle = "#8B7355";
    ctx.fillRect(0, DINO_GROUND_Y + DINO_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT - DINO_GROUND_Y - DINO_HEIGHT);
    
    // 地面線
    ctx.strokeStyle = "#654321";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, DINO_GROUND_Y + DINO_HEIGHT);
    ctx.lineTo(CANVAS_WIDTH, DINO_GROUND_Y + DINO_HEIGHT);
    ctx.stroke();

    // 繪製仙人掌（底部在地面上，高度要能跳過）
    if (state.cacti) {
      const groundY = state.groundY || DINO_GROUND_Y;
      state.cacti.forEach((cactus) => {
        ctx.fillStyle = "#228B22";
        // 仙人掌底部在地面上（和恐龍站的地方一樣）
        const cactusY = groundY - cactus.height;
        ctx.fillRect(cactus.x, cactusY, cactus.width, cactus.height);
        // 仙人掌刺
        ctx.fillStyle = "#006400";
        for (let i = 0; i < cactus.height; i += 10) {
          ctx.fillRect(cactus.x - 3, cactusY + i, 3, 5);
          ctx.fillRect(cactus.x + cactus.width, cactusY + i, 3, 5);
        }
      });
    }

    // 繪製飛行字母（都白色，不顯示提示）
    if (state.flyingLetters) {
      state.flyingLetters.forEach((letter) => {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(letter.x, letter.y, letter.width, letter.height);
        ctx.strokeStyle = "#666666";
        ctx.lineWidth = 2;
        ctx.strokeRect(letter.x, letter.y, letter.width, letter.height);
        ctx.fillStyle = "#000000";
        ctx.font = "bold 20px Arial";
        ctx.textAlign = "center";
        ctx.fillText(letter.letter.toUpperCase(), letter.x + letter.width / 2, letter.y + letter.height / 2 + 7);
      });
    }

    // 繪製小恐龍
    const dinoY = state.dinoY || DINO_GROUND_Y;
    const isInvincible = state.playerInvincible && Date.now() < state.invincibleEndTime;
    const isDashing = state.isDashing && Date.now() < (state.dashEndTime || 0);
    
    if (!isInvincible || Math.floor(Date.now() / 100) % 2 === 0) {
      // 恐龍身體
      ctx.fillStyle = isDashing ? "#ff6600" : "#4a4a4a";
      ctx.fillRect(DINO_START_X, dinoY, DINO_WIDTH, DINO_HEIGHT);
      
      // 恐龍眼睛
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(DINO_START_X + 10, dinoY + 10, 8, 8);
      ctx.fillRect(DINO_START_X + 22, dinoY + 10, 8, 8);
      ctx.fillStyle = "#000000";
      ctx.fillRect(DINO_START_X + 12, dinoY + 12, 4, 4);
      ctx.fillRect(DINO_START_X + 24, dinoY + 12, 4, 4);
      
      // 恐龍腿
      ctx.fillStyle = isDashing ? "#ff6600" : "#4a4a4a";
      const legOffset = Math.sin(Date.now() / 100) * 5;
      ctx.fillRect(DINO_START_X + 5, dinoY + DINO_HEIGHT, 8, 10);
      ctx.fillRect(DINO_START_X + 27, dinoY + DINO_HEIGHT + legOffset, 8, 10);
    }

    // 無敵效果
    if (isInvincible) {
      ctx.strokeStyle = "#00ffff";
      ctx.lineWidth = 3;
      ctx.strokeRect(DINO_START_X - 5, dinoY - 5, DINO_WIDTH + 10, DINO_HEIGHT + 10);
    }

    // 衝刺效果
    if (isDashing) {
      ctx.fillStyle = "rgba(255, 102, 0, 0.3)";
      ctx.fillRect(DINO_START_X - 20, dinoY, 20, DINO_HEIGHT);
    }

    // UI 資訊
    ctx.fillStyle = "#333333";
    ctx.fillRect(10, 10, 200, 80);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`積分: ${state.points || 0}/20`, 20, 35);
    ctx.fillText(`HP: ${state.playerHealth}/${state.maxPlayerHealth}`, 20, 55);
    
    // 血條
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(20, 65, 180, 15);
    ctx.fillStyle = "#00ff00";
    ctx.fillRect(20, 65, (180 * state.playerHealth) / state.maxPlayerHealth, 15);
    ctx.strokeStyle = "#ffffff";
    ctx.strokeRect(20, 65, 180, 15);

    // 當前單字提示
    if (state.currentWord) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 18px Arial";
      ctx.textAlign = "center";
      ctx.fillText(`提示: ${state.currentWord.explanation}`, CANVAS_WIDTH / 2, 30);

      const spelling = state.targetSpelling.toUpperCase();
      let displayText = "";
      for (let i = 0; i < spelling.length; i++) {
        displayText += i < state.collectedLetters.length ? spelling[i] : "_";
        displayText += " ";
      }
      ctx.fillStyle = "#00ffff";
      ctx.font = "bold 24px monospace";
      ctx.fillText(displayText, CANVAS_WIDTH / 2, 55);
    }

    // 效果提示訊息（告知玩家獲得什麼效果）
    const now = Date.now();
    if (state.effectMessage && state.effectMessageEndTime && now < state.effectMessageEndTime) {
      const remaining = state.effectMessageEndTime - now;
      const alpha = Math.min(1, remaining / 800); // 最後0.8秒淡出
      // 半透明黑色背景
      ctx.fillStyle = `rgba(0, 0, 0, ${0.8 * alpha})`;
      ctx.fillRect(CANVAS_WIDTH / 2 - 250, 80, 500, 80);
      // 黃色邊框（更粗更明顯）
      ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
      ctx.lineWidth = 4;
      ctx.strokeRect(CANVAS_WIDTH / 2 - 250, 80, 500, 80);
      // 白色文字（更大更清楚）
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.font = "bold 28px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(state.effectMessage, CANVAS_WIDTH / 2, 120);
    }

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
  }, []);

  const renderZombieShooter = useCallback((state: GameState) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 清除畫布
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 破碎街道背景
    // 天空（灰暗）
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, "#4a4a4a");
    gradient.addColorStop(1, "#2a2a2a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // 建築物剪影
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, 150, CANVAS_HEIGHT - 100);
    ctx.fillRect(650, 0, 150, CANVAS_HEIGHT - 80);
    ctx.fillRect(200, 0, 100, CANVAS_HEIGHT - 120);
    ctx.fillRect(500, 0, 120, CANVAS_HEIGHT - 90);
    
    // 破碎的窗戶
    ctx.fillStyle = "#3a3a3a";
    ctx.fillRect(20, 50, 30, 40);
    ctx.fillRect(60, 80, 30, 40);
    ctx.fillRect(670, 60, 30, 40);
    ctx.fillRect(710, 90, 30, 40);
    ctx.fillRect(220, 30, 30, 40);
    ctx.fillRect(520, 50, 30, 40);
    
    // 地面（破碎的街道）
    ctx.fillStyle = "#3a3a3a";
    ctx.fillRect(0, CANVAS_HEIGHT - 40, CANVAS_WIDTH, 40);
    
    // 街道裂縫
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(100, CANVAS_HEIGHT - 40);
    ctx.lineTo(120, CANVAS_HEIGHT - 20);
    ctx.moveTo(300, CANVAS_HEIGHT - 40);
    ctx.lineTo(320, CANVAS_HEIGHT - 20);
    ctx.moveTo(500, CANVAS_HEIGHT - 40);
    ctx.lineTo(520, CANVAS_HEIGHT - 20);
    ctx.moveTo(700, CANVAS_HEIGHT - 40);
    ctx.lineTo(720, CANVAS_HEIGHT - 20);
    ctx.stroke();
    
    // 街道標線（破碎）
    ctx.strokeStyle = "#5a5a5a";
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_HEIGHT - 20);
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT - 20);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // 碎片和垃圾
    ctx.fillStyle = "#4a4a4a";
    ctx.fillRect(150, CANVAS_HEIGHT - 35, 20, 15);
    ctx.fillRect(400, CANVAS_HEIGHT - 30, 15, 10);
    ctx.fillRect(600, CANVAS_HEIGHT - 38, 25, 18);

    // 繪製爆炸效果
    if (state.explosions) {
      state.explosions.forEach((explosion) => {
        const progress = explosion.life / explosion.maxLife;
        const radius = explosion.maxRadius * (1 - progress);
        const alpha = 1 - progress;
        
        // 外圈（橙色）
        ctx.fillStyle = `rgba(255, 165, 0, ${alpha * 0.6})`;
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // 內圈（黃色）
        ctx.fillStyle = `rgba(255, 255, 0, ${alpha * 0.8})`;
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // 繪製手榴彈
    if (state.grenades) {
      state.grenades.forEach((grenade) => {
        ctx.fillStyle = "#8b4513";
        ctx.beginPath();
        ctx.arc(grenade.x, grenade.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#654321";
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }

    // 繪製玩家子彈
    if (state.playerBullets) {
      state.playerBullets.forEach((bullet) => {
        ctx.fillStyle = bullet.color || "#00ffff";
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        // 子彈光效
        ctx.fillStyle = "rgba(0, 255, 255, 0.5)";
        ctx.fillRect(bullet.x - 2, bullet.y - 2, bullet.width + 4, bullet.height + 4);
      });
    }

    // 繪製殭屍
    if (state.zombies) {
      state.zombies.forEach((zombie) => {
        // 殭屍Y座標是底部，需要轉換為頂部
        const zombieY = zombie.y - zombie.height;
        const isFast = zombie.type === "fast";
        
        if (isFast) {
          // 快速紅色帶血殭屍
          // 身體（紅色，帶血跡）
          ctx.fillStyle = "#8b0000";
          ctx.fillRect(zombie.x, zombieY, zombie.width, zombie.height);
          
          // 血跡效果
          ctx.fillStyle = "#660000";
          ctx.fillRect(zombie.x + 5, zombieY + 5, 8, 10);
          ctx.fillRect(zombie.x + zombie.width - 13, zombieY + 8, 6, 8);
          ctx.fillRect(zombie.x + 12, zombieY + 25, 10, 8);
          
          // 頭部（更暗的紅色）
          ctx.fillStyle = "#5a0000";
          ctx.fillRect(zombie.x + 5, zombieY, zombie.width - 10, zombie.height * 0.4);
          
          // 眼睛（紅色發光）
          ctx.fillStyle = "#ff0000";
          ctx.beginPath();
          ctx.arc(zombie.x + 12, zombieY + 10, 4, 0, Math.PI * 2);
          ctx.arc(zombie.x + zombie.width - 12, zombieY + 10, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(zombie.x + 12, zombieY + 10, 2, 0, Math.PI * 2);
          ctx.arc(zombie.x + zombie.width - 12, zombieY + 10, 2, 0, Math.PI * 2);
          ctx.fill();
          
          // 嘴巴（張開，帶血）
          ctx.fillStyle = "#000000";
          ctx.fillRect(zombie.x + 10, zombieY + 18, zombie.width - 20, 6);
          ctx.fillStyle = "#8b0000";
          ctx.fillRect(zombie.x + 12, zombieY + 20, zombie.width - 24, 2);
          
          // 手臂（向前伸展）
          ctx.fillStyle = "#8b0000";
          ctx.fillRect(zombie.x - 5, zombieY + 15, 8, 12);
          ctx.fillRect(zombie.x + zombie.width - 3, zombieY + 15, 8, 12);
          
          // 血滴效果
          ctx.fillStyle = "#ff0000";
          ctx.beginPath();
          ctx.arc(zombie.x + 8, zombieY + 5, 2, 0, Math.PI * 2);
          ctx.arc(zombie.x + zombie.width - 8, zombieY + 8, 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // 普通綠色殭屍
          // 殭屍身體（淺綠色）
          ctx.fillStyle = "#90ee90";
          ctx.fillRect(zombie.x, zombieY, zombie.width, zombie.height);
          
          // 殭屍頭部
          ctx.fillStyle = "#7ccd7c";
          ctx.fillRect(zombie.x + 5, zombieY, zombie.width - 10, zombie.height * 0.4);
          
          // 眼睛（白色）
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(zombie.x + 8, zombieY + 8, 6, 6);
          ctx.fillRect(zombie.x + zombie.width - 14, zombieY + 8, 6, 6);
          
          // 瞳孔（黑色）
          ctx.fillStyle = "#000000";
          ctx.fillRect(zombie.x + 10, zombieY + 10, 2, 2);
          ctx.fillRect(zombie.x + zombie.width - 12, zombieY + 10, 2, 2);
          
          // 嘴巴（紅色）
          ctx.fillStyle = "#8b0000";
          ctx.fillRect(zombie.x + 12, zombieY + 18, zombie.width - 24, 4);
          
          // 手臂（向前伸展）
          ctx.fillStyle = "#90ee90";
          ctx.fillRect(zombie.x - 5, zombieY + 15, 8, 12);
          ctx.fillRect(zombie.x + zombie.width - 3, zombieY + 15, 8, 12);
        }
        
        // 血條
        const healthPercent = zombie.health / zombie.maxHealth;
        ctx.fillStyle = "#333333";
        ctx.fillRect(zombie.x, zombieY - 8, zombie.width, 4);
        ctx.fillStyle = healthPercent > 0.5 ? "#00ff00" : healthPercent > 0.25 ? "#ffaa00" : "#ff0000";
        ctx.fillRect(zombie.x, zombieY - 8, zombie.width * healthPercent, 4);
        
        // 快速殭屍標記
        if (isFast) {
          ctx.fillStyle = "#ff0000";
          ctx.font = "bold 10px Arial";
          ctx.textAlign = "center";
          ctx.fillText("!", zombie.x + zombie.width / 2, zombieY - 12);
        }
      });
    }

    // 繪製字母（隨機位置，帶有光暈效果和過期倒計時）
    const now = Date.now();
    state.fallingLetters.forEach((letter) => {
      // 計算剩餘時間
      let timeRemaining = 1;
      if (letter.expireTime && letter.spawnTime) {
        const elapsed = now - letter.spawnTime;
        const totalTime = letter.expireTime - letter.spawnTime;
        timeRemaining = Math.max(0, 1 - elapsed / totalTime);
      }
      
      // 根據剩餘時間調整透明度
      const alpha = Math.max(0.3, timeRemaining);
      
      // 光暈效果（根據剩餘時間調整）
      const gradient = ctx.createRadialGradient(
        letter.x + LETTER_SIZE_ZOMBIE / 2,
        letter.y + LETTER_SIZE_ZOMBIE / 2,
        0,
        letter.x + LETTER_SIZE_ZOMBIE / 2,
        letter.y + LETTER_SIZE_ZOMBIE / 2,
        LETTER_SIZE_ZOMBIE
      );
      gradient.addColorStop(0, `rgba(255, 255, 0, ${0.8 * alpha})`);
      gradient.addColorStop(1, `rgba(255, 255, 0, 0)`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(letter.x + LETTER_SIZE_ZOMBIE / 2, letter.y + LETTER_SIZE_ZOMBIE / 2, LETTER_SIZE_ZOMBIE, 0, Math.PI * 2);
      ctx.fill();
      
      // 字母框（根據剩餘時間變色）
      const colorIntensity = Math.floor(255 * alpha);
      ctx.fillStyle = `rgb(${colorIntensity}, ${colorIntensity}, 0)`;
      ctx.fillRect(letter.x, letter.y, LETTER_SIZE_ZOMBIE, LETTER_SIZE_ZOMBIE);
      ctx.strokeStyle = `rgb(${Math.floor(255 * 0.67 * alpha)}, ${Math.floor(170 * 0.67 * alpha)}, 0)`;
      ctx.lineWidth = 2;
      ctx.strokeRect(letter.x, letter.y, LETTER_SIZE_ZOMBIE, LETTER_SIZE_ZOMBIE);
      ctx.fillStyle = "#000000";
      ctx.font = "bold 18px Arial";
      ctx.textAlign = "center";
      ctx.fillText(letter.letter.toUpperCase(), letter.x + LETTER_SIZE_ZOMBIE / 2, letter.y + LETTER_SIZE_ZOMBIE / 2 + 6);
      
      // 過期警告（剩餘時間少於2秒時顯示）
      if (timeRemaining < 0.25 && timeRemaining > 0) {
        ctx.fillStyle = `rgba(255, 0, 0, ${1 - timeRemaining * 4})`;
        ctx.font = "bold 12px Arial";
        ctx.fillText("!", letter.x + LETTER_SIZE_ZOMBIE / 2, letter.y - 5);
      }
    });

    // 繪製玩家（人形拿槍，更精緻）
    const playerX = state.playerX || CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2;
    const playerY = state.playerY || CANVAS_HEIGHT - PLAYER_HEIGHT - 20;
    const playerCenterX = playerX + PLAYER_WIDTH / 2;
    const playerCenterY = playerY + PLAYER_HEIGHT / 2;
    
    if (!state.playerInvincible || Math.floor(Date.now() / 100) % 2 === 0) {
      // 計算武器角度
      const mouseX = state.mouseX || CANVAS_WIDTH / 2;
      const mouseY = state.mouseY || playerCenterY;
      const angle = Math.atan2(mouseY - playerCenterY, mouseX - playerCenterX);
      
      // 玩家頭部（圓形）
      ctx.fillStyle = "#ffdbac"; // 膚色
      ctx.beginPath();
      ctx.arc(playerCenterX, playerY + 8, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#d4a574";
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // 頭髮
      ctx.fillStyle = "#4a3728";
      ctx.beginPath();
      ctx.arc(playerCenterX, playerY + 5, 9, 0, Math.PI, true);
      ctx.fill();
      
      // 眼睛
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(playerCenterX - 3, playerY + 7, 2, 0, Math.PI * 2);
      ctx.arc(playerCenterX + 3, playerY + 7, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.arc(playerCenterX - 3, playerY + 7, 1, 0, Math.PI * 2);
      ctx.arc(playerCenterX + 3, playerY + 7, 1, 0, Math.PI * 2);
      ctx.fill();
      
      // 身體（上半身）
      ctx.fillStyle = "#2c5aa0"; // 藍色衣服
      ctx.fillRect(playerX + 8, playerY + 18, 14, 12);
      ctx.strokeStyle = "#1a3d6b";
      ctx.lineWidth = 1;
      ctx.strokeRect(playerX + 8, playerY + 18, 14, 12);
      
      // 手臂（根據武器角度調整）
      ctx.save();
      ctx.translate(playerCenterX, playerY + 22);
      ctx.rotate(angle);
      ctx.translate(-playerCenterX, -(playerY + 22));
      
      // 左手臂（持槍）
      ctx.fillStyle = "#ffdbac";
      ctx.fillRect(playerCenterX - 2, playerY + 20, 4, 8);
      ctx.strokeStyle = "#d4a574";
      ctx.lineWidth = 1;
      ctx.strokeRect(playerCenterX - 2, playerY + 20, 4, 8);
      
      // 槍（根據武器等級）
      const weaponLength = state.weaponLevel && state.weaponLevel > 0 ? 35 : 25;
      ctx.fillStyle = "#333333";
      ctx.fillRect(playerCenterX, playerY + 22, weaponLength, 3);
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(playerCenterX + weaponLength - 5, playerY + 21, 5, 5);
      
      // 槍口閃光（如果升級）
      if (state.weaponLevel && state.weaponLevel > 0) {
        ctx.fillStyle = "#ffaa00";
        ctx.fillRect(playerCenterX + weaponLength, playerY + 22, 3, 3);
      }
      
      ctx.restore();
      
      // 右手臂
      ctx.fillStyle = "#ffdbac";
      ctx.fillRect(playerX + 6, playerY + 20, 4, 8);
      ctx.strokeStyle = "#d4a574";
      ctx.lineWidth = 1;
      ctx.strokeRect(playerX + 6, playerY + 20, 4, 8);
      
      // 下半身（褲子）
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(playerX + 10, playerY + 30, 10, 10);
      ctx.strokeStyle = "#333333";
      ctx.lineWidth = 1;
      ctx.strokeRect(playerX + 10, playerY + 30, 10, 10);
      
      // 腿
      ctx.fillStyle = "#2c2c2c";
      ctx.fillRect(playerX + 11, playerY + 40, 3, 8);
      ctx.fillRect(playerX + 16, playerY + 40, 3, 8);
    }
    
    // 無敵效果
    if (state.playerInvincible && Date.now() < (state.invincibleEndTime || 0)) {
      ctx.strokeStyle = "#00ffff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(playerCenterX, playerCenterY, PLAYER_WIDTH / 2 + 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // UI - 頂部題目和血條
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, CANVAS_WIDTH, 80);
    
    // 血條
    ctx.fillStyle = "#333333";
    ctx.fillRect(10, 10, 200, 20);
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(10, 10, (200 * state.playerHealth) / state.maxPlayerHealth, 20);
    ctx.strokeStyle = "#ffffff";
    ctx.strokeRect(10, 10, 200, 20);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`HP: ${Math.floor(state.playerHealth)}/${state.maxPlayerHealth}`, 15, 26);

    // 當前單字提示
    if (state.currentWord) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 18px Arial";
      ctx.textAlign = "center";
      ctx.fillText(`提示: ${state.currentWord.explanation}`, CANVAS_WIDTH / 2, 30);

      const spelling = state.targetSpelling.toUpperCase();
      let displayText = "";
      for (let i = 0; i < spelling.length; i++) {
        displayText += i < state.collectedLetters.length ? spelling[i] : "_";
        displayText += " ";
      }
      ctx.fillStyle = "#00ffff";
      ctx.font = "bold 24px monospace";
      ctx.fillText(displayText, CANVAS_WIDTH / 2, 55);
    }

    // 積分和完成單字數
    ctx.fillStyle = "#ffff00";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "right";
    const settings = ZOMBIE_SHOOTER_DIFFICULTY[state.difficulty];
    const maxPoints = settings.maxPoints;
    ctx.fillText(`積分: ${(state.points || 0).toFixed(1)}/${maxPoints}`, CANVAS_WIDTH - 10, 30);
    ctx.fillText(`完成單字: ${state.wordsCompleted}`, CANVAS_WIDTH - 10, 50);

    // 武器等級顯示
    if (state.weaponLevel && state.weaponLevel > 0) {
      ctx.fillStyle = "#ff6600";
      ctx.font = "bold 14px Arial";
      ctx.textAlign = "left";
      ctx.fillText(`武器等級: ${state.weaponLevel}`, 10, 50);
    }

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
  }, []);

  // 緩存背景 canvas（避免每幀重新繪製導致閃爍）
  const backgroundCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const backgroundCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  const renderFruitSlicer = useCallback((state: GameState) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const now = Date.now();
    
    // 畫面震動效果
    let offsetX = 0;
    let offsetY = 0;
    if (state.screenShake && now < state.screenShake.endTime) {
      const remaining = state.screenShake.endTime - now;
      const intensity = state.screenShake.intensity * (remaining / 500); // 500ms 震動
      offsetX = (Math.random() - 0.5) * intensity;
      offsetY = (Math.random() - 0.5) * intensity;
    }
    
    ctx.save();
    ctx.translate(offsetX, offsetY);
    
    // 清除畫布
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 初始化背景 canvas（只生成一次）
    if (!backgroundCanvasRef.current) {
      const bgCanvas = document.createElement("canvas");
      bgCanvas.width = CANVAS_WIDTH;
      bgCanvas.height = CANVAS_HEIGHT;
      const bgCtx = bgCanvas.getContext("2d");
      if (!bgCtx) return;
      
      backgroundCanvasRef.current = bgCanvas;
      backgroundCtxRef.current = bgCtx;
      
      // 生成背景（只生成一次，使用固定的預計算值）
      // 基礎木質顏色
      const baseGradient = bgCtx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      baseGradient.addColorStop(0, "#4a3a2a");
      baseGradient.addColorStop(0.5, "#5a4a3a");
      baseGradient.addColorStop(1, "#3a2a1a");
      bgCtx.fillStyle = baseGradient;
      bgCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // 繪製垂直木板（使用固定的顏色變化）
      const plankWidths = [120, 140, 130, 150, 125, 135, 145];
      let currentX = 0;
      let plankIndex = 0;
      
      // 預定義的木板顏色（固定值，避免閃爍）
      const plankColors = [
        { h: 28, s: 35, l: 22 },
        { h: 30, s: 32, l: 21 },
        { h: 27, s: 34, l: 23 },
        { h: 29, s: 33, l: 22 },
        { h: 26, s: 36, l: 24 },
        { h: 31, s: 31, l: 20 },
        { h: 28, s: 35, l: 22 },
      ];
      
      while (currentX < CANVAS_WIDTH) {
        const plankWidth = plankWidths[plankIndex % plankWidths.length];
        const plankX = currentX;
        const color = plankColors[plankIndex % plankColors.length];
        
        // 每塊木板的漸變
        const plankGradient = bgCtx.createLinearGradient(plankX, 0, plankX + plankWidth, 0);
        const baseColor = `hsl(${color.h}, ${color.s}%, ${color.l}%)`;
        const lighterColor = `hsl(${color.h}, ${color.s}%, ${color.l + 3}%)`;
        plankGradient.addColorStop(0, baseColor);
        plankGradient.addColorStop(0.5, lighterColor);
        plankGradient.addColorStop(1, baseColor);
        bgCtx.fillStyle = plankGradient;
        bgCtx.fillRect(plankX, 0, plankWidth, CANVAS_HEIGHT);
        
        // 木板邊緣
        bgCtx.strokeStyle = "#2a1a0a";
        bgCtx.lineWidth = 2;
        bgCtx.beginPath();
        bgCtx.moveTo(plankX + plankWidth, 0);
        bgCtx.lineTo(plankX + plankWidth, CANVAS_HEIGHT);
        bgCtx.stroke();
        
        // 木紋效果（固定位置）
        bgCtx.strokeStyle = `rgba(0, 0, 0, 0.15)`;
        bgCtx.lineWidth = 1;
        const grainPositions = [0.15, 0.35, 0.5, 0.65, 0.8, 0.25, 0.45, 0.7];
        for (let i = 0; i < grainPositions.length; i++) {
          const grainX = plankX + grainPositions[i] * plankWidth;
          bgCtx.beginPath();
          bgCtx.moveTo(grainX, 0);
          bgCtx.lineTo(grainX + (grainPositions[i] - 0.5) * 2, CANVAS_HEIGHT);
          bgCtx.stroke();
        }
        
        // 木節和瑕疵（固定位置）
        const knotPositions = [
          { x: 0.3, y: 0.2, size: 8, alpha: 0.3 },
          { x: 0.7, y: 0.6, size: 12, alpha: 0.25 },
          { x: 0.5, y: 0.8, size: 6, alpha: 0.35 },
        ];
        for (const knot of knotPositions) {
          const knotX = plankX + knot.x * plankWidth;
          const knotY = knot.y * CANVAS_HEIGHT;
          bgCtx.fillStyle = `rgba(0, 0, 0, ${knot.alpha})`;
          bgCtx.beginPath();
          bgCtx.ellipse(knotX, knotY, knot.size, knot.size * 1.5, 0.5, 0, Math.PI * 2);
          bgCtx.fill();
        }
        
        currentX += plankWidth;
        plankIndex++;
      }
      
      // 繪製劃痕和磨損（固定位置）
      bgCtx.strokeStyle = "rgba(0, 0, 0, 0.3)";
      bgCtx.lineWidth = 1;
      const scratches = [
        { x: 50, y: 100, length: 45, angle: 0.3 },
        { x: 200, y: 250, length: 60, angle: 1.2 },
        { x: 350, y: 150, length: 35, angle: 0.8 },
        { x: 500, y: 300, length: 55, angle: 1.5 },
        { x: 650, y: 200, length: 40, angle: 0.6 },
        { x: 100, y: 400, length: 50, angle: 1.8 },
        { x: 300, y: 450, length: 65, angle: 0.4 },
        { x: 550, y: 500, length: 45, angle: 1.1 },
      ];
      for (const scratch of scratches) {
        bgCtx.beginPath();
        bgCtx.moveTo(scratch.x, scratch.y);
        bgCtx.lineTo(
          scratch.x + Math.cos(scratch.angle) * scratch.length,
          scratch.y + Math.sin(scratch.angle) * scratch.length
        );
        bgCtx.stroke();
      }
      
      // 繪製釘子（固定位置）
      bgCtx.fillStyle = "#1a1a1a";
      const nails = [
        { x: 120, y: 80 }, { x: 260, y: 120 }, { x: 410, y: 90 },
        { x: 550, y: 110 }, { x: 680, y: 85 }, { x: 145, y: 250 },
        { x: 295, y: 280 }, { x: 445, y: 260 }, { x: 595, y: 290 },
        { x: 130, y: 420 }, { x: 280, y: 450 }, { x: 430, y: 430 },
        { x: 580, y: 460 }, { x: 720, y: 440 }, { x: 160, y: 520 },
      ];
      for (const nail of nails) {
        bgCtx.beginPath();
        bgCtx.arc(nail.x, nail.y, 2, 0, Math.PI * 2);
        bgCtx.fill();
        bgCtx.fillStyle = "rgba(0, 0, 0, 0.5)";
        bgCtx.beginPath();
        bgCtx.arc(nail.x + 1, nail.y + 1, 2, 0, Math.PI * 2);
        bgCtx.fill();
        bgCtx.fillStyle = "#1a1a1a";
      }
      
      // 添加暗角效果
      const vignetteGradient = bgCtx.createRadialGradient(
        CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_HEIGHT * 0.3,
        CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_HEIGHT * 0.8
      );
      vignetteGradient.addColorStop(0, "rgba(0, 0, 0, 0)");
      vignetteGradient.addColorStop(1, "rgba(0, 0, 0, 0.2)");
      bgCtx.fillStyle = vignetteGradient;
      bgCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
    
    // 繪製緩存的背景
    if (backgroundCanvasRef.current) {
      ctx.drawImage(backgroundCanvasRef.current, 0, 0);
    }

    // 繪製切痕（逼真的刀痕效果）
    if (state.sliceTrail && state.sliceTrail.points.length > 1) {
      const points = state.sliceTrail.points.filter(p => now - p.time < SLICE_TRAIL_DURATION);
      if (points.length > 0) {
        // 繪製陰影層（更寬、更淡）
        ctx.strokeStyle = "rgba(200, 0, 0, 0.3)";
        ctx.lineWidth = 6;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.shadowBlur = 4;
        ctx.shadowColor = "rgba(255, 0, 0, 0.5)";
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
        
        // 繪製主切痕（漸變效果）
        ctx.shadowBlur = 0;
        const gradient = ctx.createLinearGradient(
          points[0].x, points[0].y,
          points[points.length - 1].x, points[points.length - 1].y
        );
        gradient.addColorStop(0, "#ff0000");
        gradient.addColorStop(0.5, "#ff4444");
        gradient.addColorStop(1, "#ff0000");
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
        
        // 繪製高光（更細的亮線）
        ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
      }
    }

    // 繪製水果
    if (state.fruits) {
      state.fruits.forEach((fruit) => {
        const fruitY = fruit.y - HUD_HEIGHT; // 調整Y座標（HUD區域）
        
        if (fruit.isSliced && fruit.sliceTime) {
          // 繪製被切開的水果（兩半）
          const elapsed = now - fruit.sliceTime;
          const separation = Math.min(30, elapsed / 8); // 增加分離距離
          const rotation = elapsed / 50; // 旋轉效果
          
          // 左半
          ctx.save();
          ctx.translate(fruit.x - separation, fruitY);
          ctx.rotate(-0.3 - rotation);
          ctx.fillStyle = fruit.color;
          ctx.beginPath();
          // 繪製半圓（被切開的部分）
          ctx.arc(0, 0, fruit.radius, -Math.PI / 2, Math.PI / 2);
          ctx.lineTo(0, 0);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = "#333333";
          ctx.lineWidth = 2;
          ctx.stroke();
          // 切面高光
          ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
          ctx.beginPath();
          ctx.moveTo(0, -fruit.radius);
          ctx.lineTo(0, fruit.radius);
          ctx.lineTo(-3, fruit.radius * 0.5);
          ctx.closePath();
          ctx.fill();
          if (fruit.letter) {
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 20px Arial";
            ctx.textAlign = "center";
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 3;
            ctx.strokeText(fruit.letter.toUpperCase(), 0, 5);
            ctx.fillText(fruit.letter.toUpperCase(), 0, 5);
          }
          ctx.restore();
          
          // 右半
          ctx.save();
          ctx.translate(fruit.x + separation, fruitY);
          ctx.rotate(0.3 + rotation);
          ctx.fillStyle = fruit.color;
          ctx.beginPath();
          // 繪製半圓（被切開的部分）
          ctx.arc(0, 0, fruit.radius, Math.PI / 2, -Math.PI / 2);
          ctx.lineTo(0, 0);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = "#333333";
          ctx.lineWidth = 2;
          ctx.stroke();
          // 切面高光
          ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
          ctx.beginPath();
          ctx.moveTo(0, -fruit.radius);
          ctx.lineTo(0, fruit.radius);
          ctx.lineTo(3, fruit.radius * 0.5);
          ctx.closePath();
          ctx.fill();
          if (fruit.letter) {
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 20px Arial";
            ctx.textAlign = "center";
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 3;
            ctx.strokeText(fruit.letter.toUpperCase(), 0, 5);
            ctx.fillText(fruit.letter.toUpperCase(), 0, 5);
          }
          ctx.restore();
        } else {
          // 繪製完整水果（根據水果類型）
          if (fruit.type === "bomb") {
            // 炸彈
            ctx.fillStyle = "#333333";
            ctx.beginPath();
            ctx.arc(fruit.x, fruitY, fruit.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = "#000000";
            ctx.font = "bold 24px Arial";
            ctx.textAlign = "center";
            ctx.fillText("💣", fruit.x, fruitY + 8);
          } else {
            // 繪製不同類型的水果
            const fruitType = fruit.fruitType || "apple";
            
            // 主體顏色
            const gradient = ctx.createRadialGradient(
              fruit.x - fruit.radius * 0.3, fruitY - fruit.radius * 0.3,
              0,
              fruit.x, fruitY,
              fruit.radius
            );
            gradient.addColorStop(0, fruit.color);
            gradient.addColorStop(1, fruit.color + "cc");
            ctx.fillStyle = gradient;
            
            if (fruitType === "apple") {
              // 蘋果：圓形，帶葉子
              ctx.beginPath();
              ctx.arc(fruit.x, fruitY, fruit.radius, 0, Math.PI * 2);
              ctx.fill();
              // 葉子
              ctx.fillStyle = "#44aa44";
              ctx.beginPath();
              ctx.ellipse(fruit.x, fruitY - fruit.radius - 5, 8, 12, -0.3, 0, Math.PI * 2);
              ctx.fill();
            } else if (fruitType === "orange") {
              // 橙子：圓形，帶紋理
              ctx.beginPath();
              ctx.arc(fruit.x, fruitY, fruit.radius, 0, Math.PI * 2);
              ctx.fill();
              // 紋理線
              ctx.strokeStyle = "rgba(255, 200, 0, 0.3)";
              ctx.lineWidth = 1;
              for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.arc(fruit.x, fruitY, fruit.radius * 0.7, i * Math.PI * 2 / 3, (i + 0.5) * Math.PI * 2 / 3);
                ctx.stroke();
              }
            } else if (fruitType === "strawberry") {
              // 草莓：心形，帶種子
              ctx.beginPath();
              ctx.arc(fruit.x, fruitY, fruit.radius, 0, Math.PI * 2);
              ctx.fill();
              // 種子
              ctx.fillStyle = "#ffff00";
              for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const seedX = fruit.x + Math.cos(angle) * fruit.radius * 0.6;
                const seedY = fruitY + Math.sin(angle) * fruit.radius * 0.6;
                ctx.beginPath();
                ctx.arc(seedX, seedY, 2, 0, Math.PI * 2);
                ctx.fill();
              }
            } else if (fruitType === "watermelon") {
              // 西瓜：橢圓形，帶條紋
              ctx.beginPath();
              ctx.ellipse(fruit.x, fruitY, fruit.radius, fruit.radius * 0.9, 0, 0, Math.PI * 2);
              ctx.fill();
              // 條紋
              ctx.strokeStyle = "#006622";
              ctx.lineWidth = 2;
              for (let i = -1; i <= 1; i++) {
                ctx.beginPath();
                ctx.moveTo(fruit.x - fruit.radius, fruitY + i * fruit.radius * 0.3);
                ctx.lineTo(fruit.x + fruit.radius, fruitY + i * fruit.radius * 0.3);
                ctx.stroke();
              }
            } else if (fruitType === "banana") {
              // 香蕉：彎曲的橢圓
              ctx.beginPath();
              ctx.ellipse(fruit.x, fruitY, fruit.radius * 0.7, fruit.radius, -0.3, 0, Math.PI * 2);
              ctx.fill();
              // 香蕉線條
              ctx.strokeStyle = "rgba(200, 150, 0, 0.5)";
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(fruit.x - fruit.radius * 0.5, fruitY - fruit.radius * 0.5);
              ctx.quadraticCurveTo(fruit.x, fruitY, fruit.x + fruit.radius * 0.5, fruitY + fruit.radius * 0.5);
              ctx.stroke();
            } else if (fruitType === "grape") {
              // 葡萄：小圓形群組
              const grapeCount = 6;
              for (let i = 0; i < grapeCount; i++) {
                const angle = (i / grapeCount) * Math.PI * 2;
                const grapeX = fruit.x + Math.cos(angle) * fruit.radius * 0.4;
                const grapeY = fruitY + Math.sin(angle) * fruit.radius * 0.4;
                ctx.beginPath();
                ctx.arc(grapeX, grapeY, fruit.radius * 0.4, 0, Math.PI * 2);
                ctx.fill();
              }
            } else if (fruitType === "pineapple") {
              // 鳳梨：橢圓形，帶菱形紋理
              ctx.beginPath();
              ctx.ellipse(fruit.x, fruitY, fruit.radius * 0.8, fruit.radius, 0, 0, Math.PI * 2);
              ctx.fill();
              // 菱形紋理
              ctx.strokeStyle = "rgba(200, 150, 0, 0.4)";
              ctx.lineWidth = 1;
              for (let i = -2; i <= 2; i++) {
                for (let j = -2; j <= 2; j++) {
                  const x = fruit.x + i * fruit.radius * 0.4;
                  const y = fruitY + j * fruit.radius * 0.4;
                  ctx.beginPath();
                  ctx.moveTo(x - 5, y);
                  ctx.lineTo(x, y - 5);
                  ctx.lineTo(x + 5, y);
                  ctx.lineTo(x, y + 5);
                  ctx.closePath();
                  ctx.stroke();
                }
              }
            } else if (fruitType === "cherry") {
              // 櫻桃：兩個小圓形
              ctx.beginPath();
              ctx.arc(fruit.x - fruit.radius * 0.3, fruitY, fruit.radius * 0.7, 0, Math.PI * 2);
              ctx.fill();
              ctx.beginPath();
              ctx.arc(fruit.x + fruit.radius * 0.3, fruitY, fruit.radius * 0.7, 0, Math.PI * 2);
              ctx.fill();
              // 莖
              ctx.strokeStyle = "#44aa44";
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(fruit.x, fruitY - fruit.radius * 0.7);
              ctx.lineTo(fruit.x, fruitY - fruit.radius - 5);
              ctx.stroke();
            } else {
              // 默認：圓形
              ctx.beginPath();
              ctx.arc(fruit.x, fruitY, fruit.radius, 0, Math.PI * 2);
              ctx.fill();
            }
            
            // 外框
            ctx.strokeStyle = "#333333";
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // 字母
            if (fruit.letter) {
              ctx.fillStyle = "#ffffff";
              ctx.font = "bold 20px Arial";
              ctx.textAlign = "center";
              ctx.strokeStyle = "#000000";
              ctx.lineWidth = 3;
              ctx.strokeText(fruit.letter.toUpperCase(), fruit.x, fruitY + 6);
              ctx.fillText(fruit.letter.toUpperCase(), fruit.x, fruitY + 6);
            }
          }
        }
      });
    }

    // Perfect! 動畫
    if (state.perfectAnimation && state.perfectAnimation.show) {
      const elapsed = now - state.perfectAnimation.startTime;
      if (elapsed < state.perfectAnimation.duration) {
        const progress = elapsed / state.perfectAnimation.duration;
        const scale = progress < 0.3 ? progress / 0.3 : 1 - (progress - 0.3) / 0.7;
        const alpha = progress < 0.5 ? 1 : 1 - (progress - 0.5) / 0.5;
        
        ctx.save();
        ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        ctx.scale(scale, scale);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#ffd700";
        ctx.font = "bold 72px Arial";
        ctx.textAlign = "center";
        ctx.strokeStyle = "#ff6600";
        ctx.lineWidth = 4;
        ctx.strokeText("Perfect!", 0, 0);
        ctx.fillText("Perfect!", 0, 0);
        ctx.restore();
      } else {
        state.perfectAnimation.show = false;
      }
    }

    ctx.restore();

    // HUD 區域（上方）
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, CANVAS_WIDTH, HUD_HEIGHT);
    
    // 提示文字
    if (state.currentWord) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 16px Arial";
      ctx.textAlign = "left";
      const hintText = `提示：${state.currentWord.explanation}`;
      const maxWidth = CANVAS_WIDTH - 20;
      if (ctx.measureText(hintText).width > maxWidth) {
        // 文字太長，截斷
        let truncated = hintText;
        while (ctx.measureText(truncated + "...").width > maxWidth && truncated.length > 0) {
          truncated = truncated.slice(0, -1);
        }
        ctx.fillText(truncated + "...", 10, 25);
      } else {
        ctx.fillText(hintText, 10, 25);
      }
    }
    
    // 單字填空
    if (state.targetSpelling) {
      const spelling = state.targetSpelling.toUpperCase();
      let displayText = "";
      for (let i = 0; i < spelling.length; i++) {
        displayText += i < state.collectedLetters.length ? spelling[i] : "_";
        displayText += " ";
      }
      ctx.fillStyle = "#ffff00";
      ctx.font = "bold 32px monospace";
      ctx.textAlign = "center";
      ctx.fillText(displayText, CANVAS_WIDTH / 2, 60);
    }
    
    // 分數和題號
    ctx.fillStyle = "#ffff00";
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "right";
    const targetCount = state.targetWordCount || 10;
    ctx.fillText(`完成單字：${state.wordsCompleted} / ${targetCount}`, CANVAS_WIDTH - 10, 90);
    ctx.fillText(`分數：${state.score}`, CANVAS_WIDTH - 10, 110);
    
    // HP 血條
    ctx.fillStyle = "#333333";
    ctx.fillRect(10, 70, 200, 20);
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(10, 70, (200 * state.playerHealth) / state.maxPlayerHealth, 20);
    ctx.strokeStyle = "#ffffff";
    ctx.strokeRect(10, 70, 200, 20);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`HP: ${Math.floor(state.playerHealth)}/${state.maxPlayerHealth}`, 15, 86);

    // 狀態區域（下方）
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, CANVAS_HEIGHT - STATUS_HEIGHT, CANVAS_WIDTH, STATUS_HEIGHT);
    
    // 已選字母和完整單字
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`已選字母：${state.collectedLetters.join(" ")}`, 10, CANVAS_HEIGHT - STATUS_HEIGHT + 25);
    ctx.fillText(`完整單字：${state.targetSpelling.toUpperCase()}`, 10, CANVAS_HEIGHT - STATUS_HEIGHT + 50);
    
    // 無敵時間
    if (state.playerInvincible && now < (state.invincibleEndTime || 0)) {
      const remaining = Math.ceil(((state.invincibleEndTime || 0) - now) / 1000);
      ctx.fillStyle = "#00ffff";
      ctx.font = "bold 18px Arial";
      ctx.textAlign = "right";
      ctx.fillText(`無敵時間剩餘：${remaining} 秒`, CANVAS_WIDTH - 10, CANVAS_HEIGHT - STATUS_HEIGHT + 30);
    }

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
  }, []);

  const renderFixit = useCallback((state: GameState) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const now = Date.now();

    // 清除畫布
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 背景（天空和草地）
    const skyGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT / 2);
    skyGradient.addColorStop(0, "#87ceeb");
    skyGradient.addColorStop(1, "#b0e0e6");
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT / 2 + 100);
    
    // 草地
    ctx.fillStyle = "#7cb342";
    ctx.fillRect(0, CANVAS_HEIGHT / 2 + 100, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 先繪製房子主體（牆壁 - 土黃色，符合圖片）
    // 這樣門和窗戶會繪製在牆壁之上
    ctx.fillStyle = "#d4a574"; // 土黃色牆壁
    ctx.fillRect(HOUSE_X, HOUSE_Y + 40, HOUSE_WIDTH, HOUSE_HEIGHT - 40);
    // 牆壁裝飾線（較淺的土黃色邊框）
    ctx.strokeStyle = "#c9a876";
    ctx.lineWidth = 3;
    ctx.strokeRect(HOUSE_X, HOUSE_Y + 40, HOUSE_WIDTH, HOUSE_HEIGHT - 40);
    // 樓層分隔線（米色裝飾線）
    ctx.fillStyle = "#e6d5b8";
    ctx.fillRect(HOUSE_X, HOUSE_Y + 200, HOUSE_WIDTH, 5);
    // 底部裝飾線
    ctx.fillRect(HOUSE_X, HOUSE_Y + HOUSE_HEIGHT - 5, HOUSE_WIDTH, 5);

    // 繪製精緻的房子元素（在牆壁之上）
    if (state.buildingCells) {
      state.buildingCells.forEach((cell) => {
        const centerX = cell.x + cell.width / 2;
        const centerY = cell.y + cell.height / 2;
        
        if (cell.state === "broken") {
          // 繪製破損狀態
          if (cell.type === "window") {
            // 破窗戶（碎掉的樣子，參考圖片）
            // 先繪製窗框
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 4;
            ctx.strokeRect(cell.x, cell.y, cell.width, cell.height);
            // 繪製十字窗框
            ctx.beginPath();
            ctx.moveTo(cell.x + cell.width / 2, cell.y);
            ctx.lineTo(cell.x + cell.width / 2, cell.y + cell.height);
            ctx.moveTo(cell.x, cell.y + cell.height / 2);
            ctx.lineTo(cell.x + cell.width, cell.y + cell.height / 2);
            ctx.stroke();
            
            // 繪製四個窗格
            const paneSize = cell.width / 2;
            // 左上窗格（正常）
            ctx.fillStyle = "#f5deb3";
            ctx.fillRect(cell.x, cell.y, paneSize, paneSize);
            // 左下窗格（正常）
            ctx.fillRect(cell.x, cell.y + paneSize, paneSize, paneSize);
            // 右下窗格（正常）
            ctx.fillRect(cell.x + paneSize, cell.y + paneSize, paneSize, paneSize);
            
            // 右上窗格（破碎）
            ctx.fillStyle = "#f5deb3";
            ctx.fillRect(cell.x + paneSize, cell.y, paneSize, paneSize);
            
            // 繪製破碎效果（從中心點向外輻射的裂痕）
            const centerX = cell.x + paneSize + paneSize / 2;
            const centerY = cell.y + paneSize / 2;
            // 中心撞擊點（深黑色）
            ctx.fillStyle = "#000000";
            ctx.beginPath();
            ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
            ctx.fill();
            
            // 輻射狀裂痕
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 2;
            const crackAngles = [0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4, Math.PI, 5 * Math.PI / 4, 3 * Math.PI / 2, 7 * Math.PI / 4];
            crackAngles.forEach((angle, i) => {
              const length = paneSize / 2 + (i % 2) * 5;
              const endX = centerX + Math.cos(angle) * length;
              const endY = centerY + Math.sin(angle) * length;
              ctx.beginPath();
              ctx.moveTo(centerX, centerY);
              ctx.lineTo(endX, endY);
              ctx.stroke();
            });
          } else if (cell.type === "chimney") {
            // 碎掉的煙囪
            ctx.fillStyle = "#4a4a4a";
            ctx.fillRect(cell.x, cell.y, cell.width, cell.height);
            // 碎片效果
            ctx.fillStyle = "#2a2a2a";
            ctx.fillRect(cell.x + 5, cell.y + 10, 8, 8);
            ctx.fillRect(cell.x + 15, cell.y + 20, 8, 8);
          } else if (cell.type === "flower") {
            // 壞掉的花
            ctx.fillStyle = "#654321";
            ctx.beginPath();
            ctx.arc(centerX, centerY, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#8b4513";
            ctx.lineWidth = 2;
            ctx.stroke();
          } else if (cell.type === "mailbox") {
            // 壞掉的信箱
            ctx.fillStyle = "#3a3a3a";
            ctx.fillRect(cell.x, cell.y, cell.width, cell.height);
            ctx.strokeStyle = "#ff0000";
            ctx.lineWidth = 2;
            ctx.strokeRect(cell.x, cell.y, cell.width, cell.height);
          } else if (cell.type === "tree") {
            // 壞掉的樹
            ctx.fillStyle = "#654321";
            ctx.fillRect(cell.x + 20, cell.y + 50, 10, 50);
            ctx.fillStyle = "#3a3a3a";
            ctx.beginPath();
            ctx.arc(centerX, cell.y + 30, 20, 0, Math.PI * 2);
            ctx.fill();
          } else if (cell.type === "roof") {
            // 破損的屋頂（深紫紅色）
            // 檢查是否是三角形山牆
            if (cell.id?.includes("left") || cell.id?.includes("right")) {
              // 三角形山牆（尖的）
              ctx.fillStyle = "#8b008b";
              ctx.beginPath();
              ctx.moveTo(cell.x, cell.y + cell.height);
              ctx.lineTo(cell.x + cell.width / 2, cell.y);
              ctx.lineTo(cell.x + cell.width, cell.y + cell.height);
              ctx.closePath();
              ctx.fill();
              ctx.strokeStyle = "#6a006a";
              ctx.lineWidth = 2;
              ctx.stroke();
              // 破洞
              ctx.fillStyle = "#1a1a1a";
              ctx.beginPath();
              ctx.arc(cell.x + cell.width / 2, cell.y + cell.height / 2, 5, 0, Math.PI * 2);
              ctx.fill();
              // 裂痕
              ctx.strokeStyle = "#ff0000";
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(cell.x + cell.width / 2, cell.y);
              ctx.lineTo(cell.x + cell.width / 2, cell.y + cell.height);
              ctx.stroke();
            } else {
              // 中央矩形屋頂
              ctx.fillStyle = "#8b008b";
              ctx.fillRect(cell.x, cell.y, cell.width, cell.height);
              ctx.strokeStyle = "#6a006a";
              ctx.lineWidth = 1;
              ctx.strokeRect(cell.x, cell.y, cell.width, cell.height);
              // 破洞
              ctx.fillStyle = "#1a1a1a";
              ctx.fillRect(cell.x + 5, cell.y + 5, 10, 10);
              // 裂痕
              ctx.strokeStyle = "#ff0000";
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(cell.x + 2, cell.y + 2);
              ctx.lineTo(cell.x + cell.width - 2, cell.y + cell.height - 2);
              ctx.stroke();
            }
          } else if (cell.type === "door") {
            // 壞掉的門（保持門的樣式，但顯示破損）
            // 門框（深棕色）
            ctx.fillStyle = "#8b4513";
            ctx.fillRect(cell.x - 5, cell.y - 5, cell.width + 10, cell.height + 10);
            // 門主體（紅棕色，但較暗）
            ctx.fillStyle = "#7a4220";
            ctx.fillRect(cell.x, cell.y, cell.width, cell.height);
            ctx.strokeStyle = "#654321";
            ctx.lineWidth = 2;
            ctx.strokeRect(cell.x, cell.y, cell.width, cell.height);
            
            // 門面板（參考圖片）
            const panelWidth = cell.width * 0.25;
            const panelHeight = cell.height * 0.15;
            
            // 頂部三個面板（橫向）
            for (let i = 0; i < 3; i++) {
              const panelX = cell.x + (i * (cell.width / 3)) + 5;
              const panelY = cell.y + 10;
              ctx.strokeStyle = "#654321";
              ctx.lineWidth = 2;
              ctx.strokeRect(panelX, panelY, panelWidth, panelHeight * 1.5);
            }
            
            // 中間寬面板
            ctx.strokeRect(cell.x + 10, cell.y + cell.height * 0.35, cell.width - 20, panelHeight);
            
            // 底部方形面板
            const bottomPanelSize = cell.width * 0.3;
            const bottomPanelX = cell.x + (cell.width - bottomPanelSize) / 2;
            const bottomPanelY = cell.y + cell.height * 0.6;
            ctx.strokeRect(bottomPanelX, bottomPanelY, bottomPanelSize, bottomPanelSize);
            
            // 門把手（銀色，左側）
            ctx.fillStyle = "#c0c0c0";
            ctx.beginPath();
            ctx.arc(cell.x + 15, cell.y + cell.height / 2, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#808080";
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // 破損效果：裂痕
            ctx.strokeStyle = "#ff0000";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cell.x + cell.width / 2, cell.y);
            ctx.lineTo(cell.x + cell.width / 2, cell.y + cell.height);
            ctx.stroke();
          } else if (cell.type === "fence") {
            // 壞掉的圍欄
            ctx.fillStyle = "#8b4513";
            ctx.fillRect(cell.x, cell.y, cell.width, cell.height);
            ctx.strokeStyle = "#654321";
            ctx.lineWidth = 2;
            ctx.strokeRect(cell.x, cell.y, cell.width, cell.height);
            // 斷裂效果
            ctx.fillStyle = "#1a1a1a";
            ctx.fillRect(cell.x + 10, cell.y, 5, cell.height);
          } else if (cell.type === "garage") {
            // 壞掉的車庫門
            ctx.fillStyle = "#3a3a3a";
            ctx.fillRect(cell.x, cell.y, cell.width, cell.height);
            ctx.strokeStyle = "#ff0000";
            ctx.lineWidth = 3;
            ctx.strokeRect(cell.x, cell.y, cell.width, cell.height);
            // 裂痕
            ctx.strokeStyle = "#ff0000";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cell.x, cell.y + cell.height / 2);
            ctx.lineTo(cell.x + cell.width, cell.y + cell.height / 2);
            ctx.stroke();
          }
          
          // 如果這是修補目標，顯示高亮
          if (cell.id === state.repairTargetCellId) {
            ctx.strokeStyle = "#ffff00";
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(cell.x - 5, cell.y - 5, cell.width + 10, cell.height + 10);
            ctx.setLineDash([]);
          }
        } else {
          // 繪製正常狀態
          if (cell.type === "window") {
            // 檢查是否是屋頂窗戶（三角形）
            if (cell.id?.includes("roof-window")) {
              // 三角形窗戶（在屋頂中央）
              ctx.fillStyle = "#4a90e2";
              ctx.beginPath();
              ctx.moveTo(cell.x + cell.width / 2, cell.y);
              ctx.lineTo(cell.x, cell.y + cell.height);
              ctx.lineTo(cell.x + cell.width, cell.y + cell.height);
              ctx.closePath();
              ctx.fill();
              ctx.strokeStyle = "#2a5a8a";
              ctx.lineWidth = 3;
              ctx.stroke();
              // 反光條紋
              ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
              ctx.beginPath();
              ctx.moveTo(cell.x + cell.width / 2, cell.y + 5);
              ctx.lineTo(cell.x + 5, cell.y + cell.height - 5);
              ctx.lineTo(cell.x + cell.width - 5, cell.y + cell.height - 5);
              ctx.closePath();
              ctx.fill();
            } else {
              // 正常矩形窗戶（淺藍色，帶白色反光條紋，深色邊框）
              ctx.fillStyle = "#87ceeb"; // 淺藍色
              ctx.fillRect(cell.x, cell.y, cell.width, cell.height);
              ctx.strokeStyle = "#2a5a8a"; // 深色邊框
              ctx.lineWidth = 3;
              ctx.strokeRect(cell.x, cell.y, cell.width, cell.height);
              // 窗框（十字）
              ctx.strokeStyle = "#ffffff";
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(cell.x + cell.width / 2, cell.y);
              ctx.lineTo(cell.x + cell.width / 2, cell.y + cell.height);
              ctx.moveTo(cell.x, cell.y + cell.height / 2);
              ctx.lineTo(cell.x + cell.width, cell.y + cell.height / 2);
              ctx.stroke();
              // 白色反光條紋（對角線）
              ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.moveTo(cell.x + 5, cell.y + 5);
              ctx.lineTo(cell.x + cell.width - 5, cell.y + cell.height - 5);
              ctx.stroke();
            }
          } else if (cell.type === "chimney") {
            // 正常煙囪（淺棕色/米色，符合圖片）
            ctx.fillStyle = "#d2b48c"; // 米色/淺棕色
            ctx.fillRect(cell.x, cell.y, cell.width, cell.height);
            ctx.strokeStyle = "#b8860b";
            ctx.lineWidth = 2;
            ctx.strokeRect(cell.x, cell.y, cell.width, cell.height);
            // 煙囪頂部（深灰色）
            ctx.fillStyle = "#696969";
            ctx.fillRect(cell.x, cell.y, cell.width, 8);
            // 煙
            ctx.fillStyle = "rgba(200, 200, 200, 0.6)";
            ctx.beginPath();
            ctx.arc(cell.x + cell.width / 2, cell.y - 10, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cell.x + cell.width / 2 + 5, cell.y - 20, 6, 0, Math.PI * 2);
            ctx.fill();
          } else if (cell.type === "flower") {
            // 檢查是否是灌木叢（較大的圓形）
            if (cell.id?.includes("shrub")) {
              // 圓形、蓬鬆的綠色灌木叢
              ctx.fillStyle = "#228b22";
              ctx.beginPath();
              ctx.arc(centerX, centerY, cell.width / 2, 0, Math.PI * 2);
              ctx.fill();
              // 添加蓬鬆效果（多個小圓圈）
              ctx.fillStyle = "#32cd32";
              for (let i = 0; i < 5; i++) {
                const angle = (i / 5) * Math.PI * 2;
                const offsetX = Math.cos(angle) * (cell.width / 4);
                const offsetY = Math.sin(angle) * (cell.height / 4);
                ctx.beginPath();
                ctx.arc(centerX + offsetX, centerY + offsetY, 8, 0, Math.PI * 2);
                ctx.fill();
              }
            } else {
              // 正常的花（花盆中的花）
              // 花盆（棕色矩形）
              ctx.fillStyle = "#8b4513";
              ctx.fillRect(cell.x, cell.y + cell.height - 15, cell.width, 15);
              // 花朵（粉色）
              ctx.fillStyle = "#ff69b4";
              ctx.beginPath();
              ctx.arc(centerX, cell.y + 15, 12, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = "#ff1493";
              ctx.beginPath();
              ctx.arc(centerX, cell.y + 15, 8, 0, Math.PI * 2);
              ctx.fill();
              // 葉子
              ctx.fillStyle = "#228b22";
              ctx.beginPath();
              ctx.ellipse(centerX - 8, cell.y + 20, 5, 8, 0.5, 0, Math.PI * 2);
              ctx.fill();
              ctx.beginPath();
              ctx.ellipse(centerX + 8, cell.y + 20, 5, 8, -0.5, 0, Math.PI * 2);
              ctx.fill();
              // 莖
              ctx.strokeStyle = "#228b22";
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.moveTo(centerX, cell.y + 27);
              ctx.lineTo(centerX, cell.y + cell.height - 15);
              ctx.stroke();
            }
          } else if (cell.type === "mailbox") {
            // 正常信箱（藍色立方體帶紅色旗子，符合圖片）
            // 藍色立方體
            ctx.fillStyle = "#4169e1";
            ctx.fillRect(cell.x, cell.y, cell.width, cell.height);
            ctx.strokeStyle = "#1e3a8a";
            ctx.lineWidth = 2;
            ctx.strokeRect(cell.x, cell.y, cell.width, cell.height);
            // 紅色三角形旗子（指向右側）
            ctx.fillStyle = "#ff0000";
            ctx.beginPath();
            ctx.moveTo(cell.x + cell.width, cell.y);
            ctx.lineTo(cell.x + cell.width + 15, cell.y + cell.height / 2);
            ctx.lineTo(cell.x + cell.width, cell.y + cell.height);
            ctx.closePath();
            ctx.fill();
            // 旗子邊框
            ctx.strokeStyle = "#cc0000";
            ctx.lineWidth = 1;
            ctx.stroke();
          } else if (cell.type === "tree") {
            // 正常的樹
            // 樹幹
            ctx.fillStyle = "#8b4513";
            ctx.fillRect(cell.x + 20, cell.y + 50, 10, 50);
            // 樹葉
            ctx.fillStyle = "#228b22";
            ctx.beginPath();
            ctx.arc(centerX, cell.y + 30, 25, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(centerX - 10, cell.y + 20, 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(centerX + 10, cell.y + 20, 20, 0, Math.PI * 2);
            ctx.fill();
          } else if (cell.type === "roof") {
            // 正常屋頂（深紫紅色，符合圖片）
            // 檢查是否是三角形山牆
            if (cell.id?.includes("left") || cell.id?.includes("right")) {
              // 三角形山牆（尖的）
              ctx.fillStyle = "#8b008b"; // 深紫紅色
              ctx.beginPath();
              ctx.moveTo(cell.x, cell.y + cell.height);
              ctx.moveTo(cell.x + cell.width / 2, cell.y);
              ctx.lineTo(cell.x + cell.width, cell.y + cell.height);
              ctx.lineTo(cell.x, cell.y + cell.height);
              ctx.closePath();
              ctx.fill();
              ctx.strokeStyle = "#6a006a";
              ctx.lineWidth = 2;
              ctx.stroke();
            } else {
              // 中央矩形屋頂
              ctx.fillStyle = "#8b008b"; // 深紫紅色
              ctx.fillRect(cell.x, cell.y, cell.width, cell.height);
              ctx.strokeStyle = "#6a006a";
              ctx.lineWidth = 1;
              ctx.strokeRect(cell.x, cell.y, cell.width, cell.height);
              // 瓦片效果
              ctx.strokeStyle = "#6a006a";
              ctx.lineWidth = 1;
              for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo(cell.x + (i * cell.width / 3), cell.y);
                ctx.lineTo(cell.x + (i * cell.width / 3), cell.y + cell.height);
                ctx.stroke();
              }
            }
          } else if (cell.type === "door") {
            // 正常門（紅棕色木門，有面板，參考圖片）
            // 門框（深棕色）
            ctx.fillStyle = "#8b4513";
            ctx.fillRect(cell.x - 5, cell.y - 5, cell.width + 10, cell.height + 10);
            // 門主體（紅棕色）
            ctx.fillStyle = "#a0522d";
            ctx.fillRect(cell.x, cell.y, cell.width, cell.height);
            ctx.strokeStyle = "#654321";
            ctx.lineWidth = 2;
            ctx.strokeRect(cell.x, cell.y, cell.width, cell.height);
            
            // 門面板（參考圖片）
            const panelWidth = cell.width * 0.25;
            const panelHeight = cell.height * 0.15;
            const panelSpacing = cell.height * 0.1;
            
            // 頂部三個面板（橫向）
            for (let i = 0; i < 3; i++) {
              const panelX = cell.x + (i * (cell.width / 3)) + 5;
              const panelY = cell.y + 10;
              ctx.strokeStyle = "#654321";
              ctx.lineWidth = 2;
              ctx.strokeRect(panelX, panelY, panelWidth, panelHeight * 1.5);
            }
            
            // 中間寬面板
            ctx.strokeRect(cell.x + 10, cell.y + cell.height * 0.35, cell.width - 20, panelHeight);
            
            // 底部方形面板
            const bottomPanelSize = cell.width * 0.3;
            const bottomPanelX = cell.x + (cell.width - bottomPanelSize) / 2;
            const bottomPanelY = cell.y + cell.height * 0.6;
            ctx.strokeRect(bottomPanelX, bottomPanelY, bottomPanelSize, bottomPanelSize);
            
            // 門把手（銀色，左側）
            ctx.fillStyle = "#c0c0c0";
            ctx.beginPath();
            ctx.arc(cell.x + 15, cell.y + cell.height / 2, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#808080";
            ctx.lineWidth = 1;
            ctx.stroke();
          } else if (cell.type === "fence") {
            // 正常圍欄
            ctx.fillStyle = "#8b4513";
            ctx.fillRect(cell.x, cell.y, cell.width, cell.height);
            ctx.strokeStyle = "#654321";
            ctx.lineWidth = 2;
            ctx.strokeRect(cell.x, cell.y, cell.width, cell.height);
            // 圍欄頂部
            ctx.fillStyle = "#654321";
            ctx.fillRect(cell.x, cell.y, cell.width, 5);
          } else if (cell.type === "garage") {
            // 正常車庫門（拱形開口，內有帶兩條水平線的矩形，符合圖片）
            // 拱形外框（深色）
            ctx.strokeStyle = "#2a2a2a";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(cell.x, cell.y + cell.height);
            ctx.lineTo(cell.x, cell.y + 20);
            ctx.arc(cell.x + cell.width / 2, cell.y + 20, cell.width / 2, Math.PI, 0, false);
            ctx.lineTo(cell.x + cell.width, cell.y + cell.height);
            ctx.stroke();
            // 內部矩形（帶兩條水平線）
            ctx.fillStyle = "#4a4a4a";
            ctx.fillRect(cell.x + 5, cell.y + 25, cell.width - 10, cell.height - 30);
            ctx.strokeStyle = "#1a1a1a";
            ctx.lineWidth = 2;
            // 兩條水平線
            ctx.beginPath();
            ctx.moveTo(cell.x + 5, cell.y + cell.height / 2 - 10);
            ctx.lineTo(cell.x + cell.width - 5, cell.y + cell.height / 2 - 10);
            ctx.moveTo(cell.x + 5, cell.y + cell.height / 2 + 10);
            ctx.lineTo(cell.x + cell.width - 5, cell.y + cell.height / 2 + 10);
            ctx.stroke();
          }
        }
      });
    }
    

    // 繪製玩家角色（可移動）
    const playerX = state.playerX || HOUSE_X - 60;
    const playerY = state.playerY || HOUSE_Y + HOUSE_HEIGHT / 2;
    
    // 檢查是否在移動
    const isMoving = keysRef.current.has("arrowleft") || keysRef.current.has("arrowright") || 
                     keysRef.current.has("arrowup") || keysRef.current.has("arrowdown") ||
                     keysRef.current.has("a") || keysRef.current.has("d") ||
                     keysRef.current.has("w") || keysRef.current.has("s");
    
    // 檢查是否在修補（靠近破損區域）
    const isRepairing = state.repairTargetCellId !== null;
    
    // 腳部擺動動畫（移動時）
    const legSwing = isMoving ? Math.sin(now / 100) * 8 : 0;
    
    // 手部揮動動畫（修補時）
    const armSwing = isRepairing ? Math.sin(now / 150) * 15 : 0;
    
    // 玩家身體
    ctx.fillStyle = "#0066ff";
    ctx.fillRect(playerX, playerY, PLAYER_SIZE, PLAYER_SIZE * 1.5);
    
    // 玩家頭部
    ctx.fillStyle = "#ffdbac";
    ctx.beginPath();
    ctx.arc(playerX + PLAYER_SIZE / 2, playerY, PLAYER_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // 玩家表情（根據是否剛修好東西決定）
    const justRepaired = state.perfectAnimation && state.perfectAnimation.show && 
                         (now - state.perfectAnimation.startTime) < 500;
    if (justRepaired) {
      // 笑臉（修好時）
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      // 眼睛（彎曲向上）
      ctx.beginPath();
      ctx.arc(playerX + PLAYER_SIZE / 2 - 5, playerY - 3, 3, 0, Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(playerX + PLAYER_SIZE / 2 + 5, playerY - 3, 3, 0, Math.PI);
      ctx.stroke();
      // 嘴巴（微笑）
      ctx.beginPath();
      ctx.arc(playerX + PLAYER_SIZE / 2, playerY + 5, 6, 0, Math.PI);
      ctx.stroke();
    } else {
      // 正常表情
      ctx.fillStyle = "#000000";
      // 眼睛
      ctx.beginPath();
      ctx.arc(playerX + PLAYER_SIZE / 2 - 5, playerY - 3, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(playerX + PLAYER_SIZE / 2 + 5, playerY - 3, 2, 0, Math.PI * 2);
      ctx.fill();
      // 嘴巴（直線）
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playerX + PLAYER_SIZE / 2 - 4, playerY + 5);
      ctx.lineTo(playerX + PLAYER_SIZE / 2 + 4, playerY + 5);
      ctx.stroke();
    }
    
    // 玩家手臂（左臂）
    ctx.fillStyle = "#0066ff";
    ctx.fillRect(playerX - 5, playerY + 15, 8, 20);
    // 玩家手臂（右臂，揮動動畫）
    const rightArmX = playerX + PLAYER_SIZE - 3;
    const rightArmY = playerY + 15 + armSwing;
    ctx.fillRect(rightArmX, rightArmY, 8, 20);
    
    // 玩家腳（左腳，擺動動畫）
    ctx.fillStyle = "#0066ff";
    ctx.fillRect(playerX + 5, playerY + PLAYER_SIZE * 1.5, 6, 15 + legSwing);
    // 玩家腳（右腳，擺動動畫）
    ctx.fillRect(playerX + PLAYER_SIZE - 11, playerY + PLAYER_SIZE * 1.5, 6, 15 - legSwing);
    
    // 工具（槌子，參考圖片）
    const hammerX = rightArmX + 8;
    const hammerY = rightArmY + 10;
    // 槌子頭部（淺灰色）
    ctx.fillStyle = "#d3d3d3";
    ctx.fillRect(hammerX, hammerY, 20, 8);
    // 槌子打擊面（深棕色）
    ctx.fillStyle = "#654321";
    ctx.fillRect(hammerX, hammerY, 6, 8);
    // 金色環
    ctx.fillStyle = "#ffd700";
    ctx.fillRect(hammerX + 20, hammerY - 2, 3, 12);
    // 木柄（橙棕色）
    ctx.fillStyle = "#cd853f";
    ctx.fillRect(hammerX + 23, hammerY + 2, 4, 25);

    // 繪製壞人角色（可移動）
    const villainX = state.villainX || HOUSE_X + HOUSE_WIDTH / 2;
    const villainY = state.villainY || HOUSE_Y - 30;
    
    // 檢查壞人是否在移動
    const villainDistance = Math.sqrt(
      Math.pow(villainX - (state.villainTargetX || villainX), 2) +
      Math.pow(villainY - (state.villainTargetY || villainY), 2)
    );
    const villainIsMoving = villainDistance > 5;
    
    // 檢查壞人是否在破壞
    const villainIsDamaging = state.lastDamageTime && (now - state.lastDamageTime) < 500;
    
    // 壞人腳部擺動動畫（移動時）
    const villainLegSwing = villainIsMoving ? Math.sin(now / 100) * 8 : 0;
    
    // 壞人手部揮動動畫（破壞時）
    const villainArmSwing = villainIsDamaging ? Math.sin(now / 150) * 20 : 0;
    
    // 壞人身體
    ctx.fillStyle = "#cc0000";
    ctx.fillRect(villainX - VILLAIN_SIZE / 2, villainY, VILLAIN_SIZE, VILLAIN_SIZE * 1.5);
    
    // 壞人頭部
    ctx.fillStyle = "#8b4513";
    ctx.beginPath();
    ctx.arc(villainX, villainY, VILLAIN_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // 壞人表情（生氣）
    ctx.fillStyle = "#000000";
    // 眉毛（向下，生氣）
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(villainX - 8, villainY - 8);
    ctx.lineTo(villainX - 3, villainY - 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(villainX + 3, villainY - 5);
    ctx.lineTo(villainX + 8, villainY - 8);
    ctx.stroke();
    // 眼睛（小圓點）
    ctx.beginPath();
    ctx.arc(villainX - 5, villainY - 2, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(villainX + 5, villainY - 2, 2, 0, Math.PI * 2);
    ctx.fill();
    // 嘴巴（向下，生氣）
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(villainX, villainY + 8, 5, Math.PI, 0, true);
    ctx.stroke();
    
    // 壞人手臂（左臂）
    ctx.fillStyle = "#cc0000";
    ctx.fillRect(villainX - VILLAIN_SIZE / 2 - 5, villainY + 15, 8, 20);
    // 壞人手臂（右臂，揮動動畫）
    const villainRightArmX = villainX + VILLAIN_SIZE / 2 - 3;
    const villainRightArmY = villainY + 15 + villainArmSwing;
    ctx.fillRect(villainRightArmX, villainRightArmY, 8, 20);
    
    // 壞人腳（左腳，擺動動畫）
    ctx.fillStyle = "#cc0000";
    ctx.fillRect(villainX - VILLAIN_SIZE / 2 + 5, villainY + VILLAIN_SIZE * 1.5, 6, 15 + villainLegSwing);
    // 壞人腳（右腳，擺動動畫）
    ctx.fillRect(villainX + VILLAIN_SIZE / 2 - 11, villainY + VILLAIN_SIZE * 1.5, 6, 15 - villainLegSwing);
    
    // 拳頭（敲打動畫）
    const hammerOffset = Math.sin(now / 200) * 10;
    ctx.fillStyle = "#ff6b6b";
    ctx.fillRect(villainRightArmX + 8 + hammerOffset, villainRightArmY + 5, 18, 18);
    
    // 繪製爆炸特效
    if (state.fixitExplosions) {
      state.fixitExplosions.forEach((explosion) => {
        const progress = 1 - (explosion.life / explosion.maxLife);
        const radius = explosion.radius * progress;
        const alpha = 1 - progress;
        
        // 外層爆炸（橙色）
        ctx.fillStyle = `rgba(255, 140, 0, ${alpha * 0.8})`;
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // 內層爆炸（紅色）
        ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
        
        // 火花效果
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          const sparkX = explosion.x + Math.cos(angle) * radius * 0.8;
          const sparkY = explosion.y + Math.sin(angle) * radius * 0.8;
          ctx.fillStyle = `rgba(255, 255, 0, ${alpha * 0.6})`;
          ctx.beginPath();
          ctx.arc(sparkX, sparkY, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // Perfect! 動畫
    if (state.perfectAnimation && state.perfectAnimation.show) {
      const elapsed = now - state.perfectAnimation.startTime;
      if (elapsed < state.perfectAnimation.duration) {
        const progress = elapsed / state.perfectAnimation.duration;
        const scale = progress < 0.3 ? progress / 0.3 : 1 - (progress - 0.3) / 0.7;
        const alpha = progress < 0.5 ? 1 : 1 - (progress - 0.5) / 0.5;
        
        ctx.save();
        ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        ctx.scale(scale, scale);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#ffd700";
        ctx.font = "bold 72px Arial";
        ctx.textAlign = "center";
        ctx.strokeStyle = "#ff6600";
        ctx.lineWidth = 4;
        ctx.strokeText("Perfect!", 0, 0);
        ctx.fillText("Perfect!", 0, 0);
        ctx.restore();
      } else {
        state.perfectAnimation.show = false;
      }
    }

    // HUD 區域（上方）
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, CANVAS_WIDTH, HUD_HEIGHT);
    
    // 標題
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px Arial";
    ctx.textAlign = "left";
    ctx.fillText("🔨 房屋修繕單字戰", 10, 30);
    
    // 建築耐久度
    ctx.fillStyle = "#333333";
    ctx.fillRect(10, 40, 200, 20);
    const hpPercent = state.buildingHp && state.maxBuildingHp ? state.buildingHp / state.maxBuildingHp : 1;
    ctx.fillStyle = hpPercent > 0.5 ? "#4caf50" : hpPercent > 0.25 ? "#ff9800" : "#f44336";
    ctx.fillRect(10, 40, 200 * hpPercent, 20);
    ctx.strokeStyle = "#ffffff";
    ctx.strokeRect(10, 40, 200, 20);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`建築耐久度: ${Math.floor(state.buildingHp || 0)}/${state.maxBuildingHp || 0}`, 15, 56);
    
    // 分數和題數
    ctx.fillStyle = "#ffff00";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "right";
    ctx.fillText(`分數: ${state.score}`, CANVAS_WIDTH - 10, 30);
    ctx.fillText(`答題: ${state.answeredCount || 0}/${state.totalQuestions || 0}`, CANVAS_WIDTH - 10, 50);
    ctx.fillText(`正確: ${state.correctCount || 0}`, CANVAS_WIDTH - 10, 70);
    
    // 操作提示
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "left";
    ctx.fillText("WASD 或方向鍵移動", 10, 90);
    ctx.fillText("靠近破損處點擊答題修補", 10, 110);
    
    // 如果靠近破損區域，顯示點擊提示
    if (state.repairTargetCellId && !state.isQuestionActive) {
      ctx.fillStyle = "#ffff00";
      ctx.font = "bold 16px Arial";
      ctx.textAlign = "center";
      ctx.fillText("點擊破損處開始修補！", CANVAS_WIDTH / 2, CANVAS_HEIGHT - STATUS_HEIGHT - 20);
    }

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
  }, []);

  const renderGame = useCallback((state: GameState) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 如果是小恐龍遊戲，使用專用渲染函數
    if (selectedGame === "dino-game") {
      renderDinoGame(state);
      return;
    }

    // 如果是殭屍射擊遊戲，使用專用渲染函數
    if (selectedGame === "zombie-shooter") {
      renderZombieShooter(state);
      return;
    }

    // 如果是切水果遊戲，使用專用渲染函數
    if (selectedGame === "fruit-slicer") {
      renderFruitSlicer(state);
      return;
    }

    // 如果是房屋修繕遊戲，使用專用渲染函數
    if (selectedGame === "fixit") {
      renderFixit(state);
      return;
    }

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
      const playerX = state.playerX || 0;
      const playerY = state.playerY || 0;
      ctx.beginPath();
      ctx.moveTo(playerX + PLAYER_WIDTH / 2, playerY);
      ctx.lineTo(playerX + PLAYER_WIDTH, playerY + PLAYER_HEIGHT);
      ctx.lineTo(playerX, playerY + PLAYER_HEIGHT);
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
        ctx.arc(playerX + PLAYER_WIDTH / 2, playerY + PLAYER_HEIGHT / 2, 35, 0, Math.PI * 2);
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

    // 掉落字母（不顯示正確提示）
    state.fallingLetters.forEach((letter) => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(letter.x, letter.y, 28, 28);
      ctx.strokeStyle = "#666666";
      ctx.strokeRect(letter.x, letter.y, 28, 28);
      ctx.fillStyle = "#333333";
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

    // 積分顯示
    ctx.fillStyle = "#ffff00";
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "right";
    const maxPoints = settings.maxPoints;
    const pointsDisplay = (state.points || 0).toFixed(1);
    ctx.fillText(`積分: ${pointsDisplay}/${maxPoints}`, CANVAS_WIDTH - 10, CANVAS_HEIGHT - 15);

    // 當前單字提示和進度
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
      `完成單字: ${state.wordsCompleted} / 10`,
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
  }, [selectedGame, renderDinoGame, renderZombieShooter, renderFruitSlicer, renderFixit]);

  useEffect(() => {
    if (!gameStarted || (selectedGame !== "plane-shooter" && selectedGame !== "dino-game" && selectedGame !== "zombie-shooter" && selectedGame !== "fruit-slicer" && selectedGame !== "fixit")) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
      if (e.key === "Escape") {
        gameStateRef.current.isPaused = !gameStateRef.current.isPaused;
      }
      if (e.key === " ") e.preventDefault();
      
      // 小恐龍遊戲：空格鍵或上鍵跳躍（支援二段跳）
      if (selectedGame === "dino-game" && (e.key === " " || e.key === "ArrowUp" || e.key === "w")) {
        const state = gameStateRef.current;
        const groundY = state.groundY || DINO_GROUND_Y;
        const jumpCount = state.jumpCount || 0;
        
        // 在地面上可以跳躍，或在空中可以二段跳
        if (state.dinoY === groundY && jumpCount === 0) {
          // 第一段跳
          state.dinoVelocity = DINO_JUMP_POWER;
          state.isJumping = true;
          state.jumpCount = 1;
        } else if (state.isJumping && jumpCount === 1 && (state.dinoVelocity || 0) < 0) {
          // 二段跳（在空中且向上時）
          state.dinoVelocity = DINO_JUMP_POWER * 0.8; // 二段跳稍弱
          state.jumpCount = 2;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };

    // 滑鼠移動事件（用於殭屍射擊遊戲）
    let handleMouseMove: ((e: MouseEvent) => void) | null = null;
    if (selectedGame === "zombie-shooter") {
      handleMouseMove = (e: MouseEvent) => {
        if (canvasRef.current) {
          const rect = canvasRef.current.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;
          gameStateRef.current.mouseX = mouseX;
          gameStateRef.current.mouseY = mouseY;
        }
      };
      window.addEventListener("mousemove", handleMouseMove);
    }

    // 切水果遊戲的滑鼠和觸控事件
    let handleFruitSlicerMouseDown: ((e: MouseEvent | TouchEvent) => void) | null = null;
    let handleFruitSlicerMouseMove: ((e: MouseEvent | TouchEvent) => void) | null = null;
    let handleFruitSlicerMouseUp: ((e: MouseEvent | TouchEvent) => void) | null = null;
    
    if (selectedGame === "fruit-slicer") {
      const getEventPos = (e: MouseEvent | TouchEvent): { x: number; y: number } | null => {
        if (!canvasRef.current) return null;
        const rect = canvasRef.current.getBoundingClientRect();
        if ("touches" in e && e.touches.length > 0) {
          return {
            x: e.touches[0].clientX - rect.left,
            y: e.touches[0].clientY - rect.top,
          };
        } else if ("clientX" in e) {
          return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          };
        }
        return null;
      };

      handleFruitSlicerMouseDown = (e: MouseEvent | TouchEvent) => {
        e.preventDefault();
        const pos = getEventPos(e);
        if (pos && pos.y > HUD_HEIGHT && pos.y < CANVAS_HEIGHT - STATUS_HEIGHT) {
          const state = gameStateRef.current;
          state.isSlicing = true;
          if (!state.sliceTrail) state.sliceTrail = { points: [] };
          state.sliceTrail.points = [{ x: pos.x, y: pos.y, time: Date.now() }];
        }
      };

      handleFruitSlicerMouseMove = (e: MouseEvent | TouchEvent) => {
        e.preventDefault();
        const pos = getEventPos(e);
        if (pos && gameStateRef.current.isSlicing && pos.y > HUD_HEIGHT && pos.y < CANVAS_HEIGHT - STATUS_HEIGHT) {
          const state = gameStateRef.current;
          if (state.sliceTrail) {
            state.sliceTrail.points.push({ x: pos.x, y: pos.y, time: Date.now() });
            // 只保留最近的路徑點
            const now = Date.now();
            state.sliceTrail.points = state.sliceTrail.points.filter(p => now - p.time < SLICE_TRAIL_DURATION);
          }
        }
      };

      handleFruitSlicerMouseUp = (e: MouseEvent | TouchEvent) => {
        e.preventDefault();
        gameStateRef.current.isSlicing = false;
      };

      // 滑鼠事件
      canvasRef.current?.addEventListener("mousedown", handleFruitSlicerMouseDown);
      canvasRef.current?.addEventListener("mousemove", handleFruitSlicerMouseMove);
      canvasRef.current?.addEventListener("mouseup", handleFruitSlicerMouseUp);
      canvasRef.current?.addEventListener("mouseleave", handleFruitSlicerMouseUp);
      
      // 觸控事件
      canvasRef.current?.addEventListener("touchstart", handleFruitSlicerMouseDown, { passive: false });
      canvasRef.current?.addEventListener("touchmove", handleFruitSlicerMouseMove, { passive: false });
      canvasRef.current?.addEventListener("touchend", handleFruitSlicerMouseUp, { passive: false });
      canvasRef.current?.addEventListener("touchcancel", handleFruitSlicerMouseUp, { passive: false });
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    
    // 房屋修繕遊戲的滑鼠點擊事件
    let handleFixitClick: ((e: MouseEvent) => void) | null = null;
    if (selectedGame === "fixit") {
      handleFixitClick = (e: MouseEvent) => {
        if (selectedGame !== "fixit" || !gameStarted) return;
        
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        
        const state = gameStateRef.current;
        
        // 如果已經有題目在顯示，不處理點擊
        if (state.isQuestionActive) return;
        
        // 檢查點擊是否在破損區域上
        if (state.buildingCells && state.repairTargetCellId) {
          const targetCell = state.buildingCells.find(c => c.id === state.repairTargetCellId);
          if (targetCell && targetCell.state === "broken") {
            // 檢查點擊位置是否在目標區域內
            if (clickX >= targetCell.x && clickX <= targetCell.x + targetCell.width &&
                clickY >= targetCell.y && clickY <= targetCell.y + targetCell.height) {
              // 生成題目
              const nextWord = selectNextWord(wordsRef.current);
              if (nextWord && wordsRef.current.length > 0) {
                const allWords = wordsRef.current;
                const choices: string[] = [nextWord.word.word];
                
                const availableWords = allWords
                  .map(w => w.word)
                  .filter(word => !choices.includes(word));
                
                let attempts = 0;
                const maxAttempts = 200;
                while (choices.length < 4 && availableWords.length > 0 && attempts < maxAttempts) {
                  const randomIndex = Math.floor(Math.random() * availableWords.length);
                  choices.push(availableWords[randomIndex]);
                  availableWords.splice(randomIndex, 1);
                  attempts++;
                }
                
                if (choices.length < 3 && allWords.length > 0) {
                  for (const word of allWords) {
                    if (!choices.includes(word.word) && choices.length < 3) {
                      choices.push(word.word);
                    }
                  }
                }
                
                if (choices.length < 3) {
                  while (choices.length < 3) {
                    choices.push(nextWord.word.word);
                  }
                }
                
                // 打亂選項順序
                for (let i = choices.length - 1; i > 0; i--) {
                  const j = Math.floor(Math.random() * (i + 1));
                  [choices[i], choices[j]] = [choices[j], choices[i]];
                }
                const correctIndex = choices.indexOf(nextWord.word.word);
                
                if (correctIndex >= 0) {
                  state.currentQuestion = {
                    word: nextWord.word.word,
                    spelling: nextWord.spelling,
                    explanation: nextWord.word.explanation || "請選擇正確的單字",
                    choices,
                    correctIndex,
                  };
                  state.isQuestionActive = true;
                  state.questionStartTime = Date.now();
                  setDisplayState({ ...state });
                }
              }
            }
          }
        }
      };
      canvasRef.current?.addEventListener("click", handleFixitClick);
    }

    const gameLoop = () => {
      const state = gameStateRef.current;
      if (state.isGameOver || state.isPaused) {
        renderGame(state);
        gameLoopRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      const now = Date.now();

      // 小恐龍遊戲邏輯
      if (selectedGame === "dino-game") {
        const groundY = state.groundY || DINO_GROUND_Y;
        let dinoY = state.dinoY || groundY;
        let dinoVelocity = state.dinoVelocity || 0;

        // 重力
        dinoVelocity += GRAVITY;
        dinoY += dinoVelocity;

        // 落地檢測
        if (dinoY >= groundY) {
          dinoY = groundY;
          dinoVelocity = 0;
          state.isJumping = false;
          state.jumpCount = 0; // 重置跳躍次數
        }

        state.dinoY = dinoY;
        state.dinoVelocity = dinoVelocity;

        // 生成仙人掌（最低高度和恐龍站的地方一樣，高度要能跳過）
        if (!state.lastCactusSpawn) state.lastCactusSpawn = now;
        if (now - state.lastCactusSpawn > CACTUS_SPAWN_INTERVAL) {
          if (!state.cacti) state.cacti = [];
          // 仙人掌底部在地面上（和恐龍站的地方一樣），高度要能跳過
          state.cacti.push({
            id: Date.now(),
            x: CANVAS_WIDTH,
            y: groundY - CACTUS_HEIGHT, // 底部在地面上
            width: CACTUS_WIDTH,
            height: CACTUS_HEIGHT,
            speed: state.gameSpeed || 3,
          });
          state.lastCactusSpawn = now;
        }

        // 生成飛行字母
        if (!state.lastLetterSpawn) state.lastLetterSpawn = now;
        if (now - state.lastLetterSpawn > LETTER_SPAWN_INTERVAL && state.correctLetters.length > 0) {
          if (!state.flyingLetters) state.flyingLetters = [];
          const nextIndex = state.collectedLetters.length;
          const isCorrect = Math.random() < 0.6;
          let letter: string;

          if (isCorrect && nextIndex < state.correctLetters.length) {
            letter = state.correctLetters[nextIndex];
          } else {
            const allLetters = state.correctLetters;
            letter = allLetters[Math.floor(Math.random() * allLetters.length)];
          }

          // 字母在恐龍能吃到的高度（避免與仙人掌重疊）
          // 仙人掌在地面上方20-80像素，字母在地面上方100-200像素
          const letterY = groundY - 100 - Math.random() * 100; // 在地面上方100-200像素
          state.flyingLetters.push({
            id: Date.now() + Math.random(),
            letter,
            x: CANVAS_WIDTH,
            y: letterY,
            width: LETTER_SIZE,
            height: LETTER_SIZE,
          });
          state.lastLetterSpawn = now;
        }

        // 更新仙人掌位置
        if (state.cacti) {
          state.cacti = state.cacti
            .map((cactus) => ({
              ...cactus,
              x: cactus.x - (state.gameSpeed || 5) * (state.isDashing && now < (state.dashEndTime || 0) ? 2 : 1),
            }))
            .filter((cactus) => cactus.x > -CACTUS_WIDTH);

          // 碰撞檢測：恐龍與仙人掌
          const dinoRect = {
            x: DINO_START_X,
            y: dinoY,
            width: DINO_WIDTH,
            height: DINO_HEIGHT,
          };

          const groundY = state.groundY || DINO_GROUND_Y;
          state.cacti.forEach((cactus) => {
            // 仙人掌底部在地面上，碰撞檢測
            const cactusRect = {
              x: cactus.x,
              y: groundY - cactus.height, // 底部在地面上
              width: cactus.width,
              height: cactus.height,
            };
            if (
              dinoRect.x < cactusRect.x + cactusRect.width &&
              dinoRect.x + dinoRect.width > cactusRect.x &&
              dinoRect.y < cactusRect.y + cactusRect.height &&
              dinoRect.y + dinoRect.height > cactusRect.y
            ) {
              // 碰撞發生
              if (!state.playerInvincible || now > (state.invincibleEndTime || 0)) {
                if (!state.isDashing || now > (state.dashEndTime || 0)) {
                  state.playerHealth -= 20;
                  state.playerInvincible = true;
                  state.invincibleEndTime = now + INVINCIBLE_DURATION;
                }
              }
            }
          });
        }

        // 更新飛行字母位置
        if (state.flyingLetters) {
          state.flyingLetters = state.flyingLetters
            .map((letter) => ({
              ...letter,
              x: letter.x - (state.gameSpeed || 5),
            }))
            .filter((letter) => letter.x > -LETTER_SIZE);

          // 收集字母檢測
          const dinoRect = {
            x: DINO_START_X,
            y: dinoY,
            width: DINO_WIDTH,
            height: DINO_HEIGHT,
          };

          state.flyingLetters = state.flyingLetters.filter((letter) => {
            if (
              dinoRect.x < letter.x + letter.width &&
              dinoRect.x + dinoRect.width > letter.x &&
              dinoRect.y < letter.y + letter.height &&
              dinoRect.y + dinoRect.height > letter.y
            ) {
              // 收集到字母
              const nextIndex = state.collectedLetters.length;
              if (nextIndex < state.correctLetters.length) {
                const expectedLetter = state.correctLetters[nextIndex];
                if (letter.letter === expectedLetter) {
                  state.collectedLetters.push(letter.letter);
                  state.score += 10;

                  // 完成單字
                  if (state.collectedLetters.length === state.correctLetters.length) {
                    state.wordsCompleted++;
                    state.score += 50;

                    // 一個單字1積分，最多20積分
                    const pointsToAdd = 1;
                    const maxPoints = 20;
                    if ((state.points || 0) + pointsToAdd <= maxPoints) {
                      state.points = (state.points || 0) + pointsToAdd;
                    } else {
                      state.points = maxPoints;
                    }

                    // 完成單字效果：三選一（復活、無敵、衝刺）
                    const effects = [
                      { type: "heal", message: "💚 獲得復活效果！恢復 30 HP" },
                      { type: "invincible", message: "🛡️ 獲得無敵效果！3 秒無敵時間" },
                      { type: "dash", message: "⚡ 獲得衝刺效果！2 秒衝刺加速" },
                    ];
                    const selectedEffect = effects[Math.floor(Math.random() * effects.length)];
                    
                    // 顯示效果提示（告知玩家獲得什麼效果）
                    state.effectMessage = selectedEffect.message;
                    state.effectMessageEndTime = now + 4000; // 4秒後消失，讓玩家有足夠時間看到
                    
                    if (selectedEffect.type === "heal") {
                      if (state.playerHealth < state.maxPlayerHealth) {
                        state.playerHealth = Math.min(state.maxPlayerHealth, state.playerHealth + 30);
                      }
                    } else if (selectedEffect.type === "invincible") {
                      state.playerInvincible = true;
                      state.invincibleEndTime = now + INVINCIBLE_DURATION;
                    } else if (selectedEffect.type === "dash") {
                      state.isDashing = true;
                      state.dashEndTime = now + DASH_DURATION;
                    }

                    // 選擇下一個單字
                    const nextWord = selectNextWord(wordsRef.current);
                    if (nextWord) {
                      state.currentWord = nextWord.word;
                      state.targetSpelling = nextWord.spelling;
                      state.correctLetters = nextWord.spelling.split("");
                      state.collectedLetters = [];
                    }
                  }
                }
              }
              return false; // 移除已收集的字母
            }
            return true;
          });
        }

        // 檢查無敵狀態
        if (state.playerInvincible && now > (state.invincibleEndTime || 0)) {
          state.playerInvincible = false;
        }

        // 檢查衝刺狀態
        if (state.isDashing && now > (state.dashEndTime || 0)) {
          state.isDashing = false;
        }

        // 清除過期的效果提示
        if (state.effectMessageEndTime && now > state.effectMessageEndTime) {
          state.effectMessage = undefined;
          state.effectMessageEndTime = undefined;
        }

        // 遊戲速度逐漸增加（無上限，但增長較慢）
        if (state.gameSpeed) {
          state.gameSpeed = state.gameSpeed + 0.0005; // 降低增長速度
        }

        // 檢查遊戲結束
        if (state.playerHealth <= 0) {
          state.isGameOver = true;
          // 保存積分
          if (state.points > 0) {
            savePoints(state.points);
          }
          setShowResult(true);
        }

        renderGame(state);
        setDisplayState({ ...state });
        gameLoopRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      // 殭屍射擊遊戲邏輯
      if (selectedGame === "zombie-shooter") {
        const settings = ZOMBIE_SHOOTER_DIFFICULTY[state.difficulty];
        
        // 玩家移動（上下左右移動）
        if (!state.playerX) state.playerX = 0;
        if (!state.playerY) state.playerY = 0;
        if (keysRef.current.has("arrowleft") || keysRef.current.has("a")) {
          state.playerX = Math.max(0, (state.playerX || 0) - PLAYER_SPEED);
        }
        if (keysRef.current.has("arrowright") || keysRef.current.has("d")) {
          state.playerX = Math.min(CANVAS_WIDTH - PLAYER_WIDTH, (state.playerX || 0) + PLAYER_SPEED);
        }
        if (keysRef.current.has("arrowup") || keysRef.current.has("w")) {
          state.playerY = Math.max(80, (state.playerY || 0) - PLAYER_SPEED); // 80是UI區域高度
        }
        if (keysRef.current.has("arrowdown") || keysRef.current.has("s")) {
          state.playerY = Math.min(CANVAS_HEIGHT - PLAYER_HEIGHT - 20, (state.playerY || 0) + PLAYER_SPEED); // 留20像素底部邊距
        }

        // 自動射擊（根據滑鼠方向）
        if (!state.autoShootCooldown) state.autoShootCooldown = 0;
        const shootCooldown = settings.playerShootCooldown;
        if (now - state.autoShootCooldown > shootCooldown) {
          state.autoShootCooldown = now;
          if (!state.playerBullets) state.playerBullets = [];
          
          const playerCenterX = (state.playerX || 0) + PLAYER_WIDTH / 2;
          const playerCenterY = (state.playerY || 0) + PLAYER_HEIGHT / 2;
          const mouseX = state.mouseX || CANVAS_WIDTH / 2;
          const mouseY = state.mouseY || playerCenterY;
          const angle = Math.atan2(mouseY - playerCenterY, mouseX - playerCenterX);
          
          const bulletWidth = state.weaponLevel && state.weaponLevel > 0 ? 8 : 6;
          const bulletHeight = state.weaponLevel && state.weaponLevel > 0 ? 8 : 6;
          const bulletDamage = state.weaponLevel && state.weaponLevel > 0 ? PLAYER_BULLET_DAMAGE * 2 : PLAYER_BULLET_DAMAGE;
          const bulletSpeed = PLAYER_BULLET_SPEED;
          
          // 根據武器等級發射不同數量的子彈
          if (state.weaponLevel && state.weaponLevel > 0) {
            // 升級武器：三發子彈（扇形）
            for (let i = -1; i <= 1; i++) {
              const spreadAngle = angle + i * 0.2;
              state.playerBullets.push({
                id: bulletIdRef.current++,
                x: playerCenterX,
                y: playerCenterY,
                damage: bulletDamage,
                isPlayer: true,
                width: bulletWidth,
                height: bulletHeight,
                speed: bulletSpeed,
                color: "#ff6600",
                type: "normal",
                targetX: Math.cos(spreadAngle) * bulletSpeed,
                targetY: Math.sin(spreadAngle) * bulletSpeed,
              });
            }
          } else {
            // 普通武器：單發子彈
            state.playerBullets.push({
              id: bulletIdRef.current++,
              x: playerCenterX,
              y: playerCenterY,
              damage: bulletDamage,
              isPlayer: true,
              width: bulletWidth,
              height: bulletHeight,
              speed: bulletSpeed,
              color: "#00ffff",
              type: "normal",
              targetX: Math.cos(angle) * bulletSpeed,
              targetY: Math.sin(angle) * bulletSpeed,
            });
          }
        }

        // 生成殭屍（從四面八方來）
        if (!state.lastZombieSpawn) state.lastZombieSpawn = now;
        const zombieSpawnRate = state.zombieSpawnRate || ZOMBIE_SPAWN_INTERVAL;
        if (now - state.lastZombieSpawn > zombieSpawnRate) {
          if (!state.zombies) state.zombies = [];
          const playerCenterX = (state.playerX || 0) + PLAYER_WIDTH / 2;
          const playerCenterY = (state.playerY || 0) + PLAYER_HEIGHT / 2;
          
          // 隨機選擇生成邊緣（0=上, 1=右, 2=下, 3=左）
          const side = Math.floor(Math.random() * 4);
          let zombieX = 0;
          let zombieY = 0;
          
          if (side === 0) {
            // 上方
            zombieX = Math.random() * CANVAS_WIDTH;
            zombieY = -ZOMBIE_HEIGHT;
          } else if (side === 1) {
            // 右方
            zombieX = CANVAS_WIDTH;
            zombieY = Math.random() * CANVAS_HEIGHT;
          } else if (side === 2) {
            // 下方
            zombieX = Math.random() * CANVAS_WIDTH;
            zombieY = CANVAS_HEIGHT;
          } else {
            // 左方
            zombieX = -ZOMBIE_WIDTH;
            zombieY = Math.random() * CANVAS_HEIGHT;
          }
          
          // 計算朝向玩家的角度
          const angle = Math.atan2(playerCenterY - zombieY, playerCenterX - zombieX);
          
          // 30% 機率生成快速紅色殭屍
          const isFast = Math.random() < 0.3;
          
          state.zombies.push({
            id: Date.now() + Math.random(),
            x: zombieX,
            y: zombieY + ZOMBIE_HEIGHT, // 調整Y座標（因為y是底部）
            width: ZOMBIE_WIDTH,
            height: ZOMBIE_HEIGHT,
            speed: isFast 
              ? FAST_ZOMBIE_SPEED + (state.wordsCompleted || 0) * 0.05
              : ZOMBIE_SPEED + (state.wordsCompleted || 0) * 0.05,
            health: isFast
              ? FAST_ZOMBIE_HEALTH + (state.wordsCompleted || 0) * 3
              : ZOMBIE_HEALTH + (state.wordsCompleted || 0) * 5,
            maxHealth: isFast
              ? FAST_ZOMBIE_HEALTH + (state.wordsCompleted || 0) * 3
              : ZOMBIE_HEALTH + (state.wordsCompleted || 0) * 5,
            attackCooldown: ZOMBIE_ATTACK_COOLDOWN,
            lastAttack: 0,
            angle: angle,
            type: isFast ? "fast" : "normal",
          });
          state.lastZombieSpawn = now;
        }

        // 生成字母（隨機位置出現）
        if (!state.lastLetterSpawn) state.lastLetterSpawn = now;
        const letterSpawnRate = state.letterSpawnRate || 2500; // 增加間隔
        if (now - state.lastLetterSpawn > letterSpawnRate && state.correctLetters.length > 0) {
          const nextIndex = state.collectedLetters.length;
          const isCorrect = Math.random() < 0.6;
          let letter: string;

          if (isCorrect && nextIndex < state.correctLetters.length) {
            letter = state.correctLetters[nextIndex];
          } else {
            const allLetters = state.correctLetters;
            letter = allLetters[Math.floor(Math.random() * allLetters.length)];
          }

          // 隨機位置生成字母（避免在玩家附近）
          let letterX = Math.random() * (CANVAS_WIDTH - LETTER_SIZE_ZOMBIE);
          let letterY = Math.random() * (CANVAS_HEIGHT - 100 - LETTER_SIZE_ZOMBIE) + 80; // 避開UI區域
          
          // 確保不在玩家太近的地方
          const playerCenterX = (state.playerX || 0) + PLAYER_WIDTH / 2;
          const playerCenterY = (state.playerY || 0) + PLAYER_HEIGHT / 2;
          const minDistance = 100;
          let attempts = 0;
          while (
            Math.sqrt(Math.pow(letterX - playerCenterX, 2) + Math.pow(letterY - playerCenterY, 2)) < minDistance &&
            attempts < 10
          ) {
            letterX = Math.random() * (CANVAS_WIDTH - LETTER_SIZE_ZOMBIE);
            letterY = Math.random() * (CANVAS_HEIGHT - 100 - LETTER_SIZE_ZOMBIE) + 80;
            attempts++;
          }

          state.fallingLetters.push({
            id: letterIdRef.current++,
            letter,
            x: letterX,
            y: letterY,
            speed: 0, // 字母不移動，固定位置
            spawnTime: now,
            expireTime: now + LETTER_EXPIRE_TIME, // 8秒後過期
          });
          state.lastLetterSpawn = now;
        }
        
        // 移除過期的字母
        state.fallingLetters = state.fallingLetters.filter((letter) => {
          if (letter.expireTime && now > letter.expireTime) {
            return false; // 移除過期的字母
          }
          return true;
        });

        // 更新玩家子彈（根據角度移動）
        if (state.playerBullets) {
          state.playerBullets = state.playerBullets
            .map((bullet) => ({
              ...bullet,
              x: bullet.x + (bullet.targetX || 0),
              y: bullet.y + (bullet.targetY || 0),
            }))
            .filter((bullet) => 
              bullet.x > -50 && 
              bullet.x < CANVAS_WIDTH + 50 && 
              bullet.y > -50 && 
              bullet.y < CANVAS_HEIGHT + 50
            );
        }

        // 更新殭屍（朝向玩家移動）
        if (state.zombies) {
          const playerCenterX = (state.playerX || 0) + PLAYER_WIDTH / 2;
          const playerCenterY = (state.playerY || 0) + PLAYER_HEIGHT / 2;
          
          state.zombies = state.zombies
            .map((zombie) => {
              // 重新計算角度（朝向玩家）
              const angle = Math.atan2(playerCenterY - (zombie.y - zombie.height / 2), playerCenterX - (zombie.x + zombie.width / 2));
              return {
                ...zombie,
                x: zombie.x + Math.cos(angle) * zombie.speed,
                y: zombie.y + Math.sin(angle) * zombie.speed,
                angle: angle,
              };
            })
            .filter((zombie) => {
              // 只移除完全離開畫布的殭屍
              return !(
                (zombie.x < -ZOMBIE_WIDTH * 2 && zombie.angle && Math.abs(zombie.angle) > Math.PI / 2) ||
                (zombie.x > CANVAS_WIDTH + ZOMBIE_WIDTH * 2 && zombie.angle && Math.abs(zombie.angle) < Math.PI / 2) ||
                (zombie.y < -ZOMBIE_HEIGHT * 2) ||
                (zombie.y > CANVAS_HEIGHT + ZOMBIE_HEIGHT * 2)
              );
            });

          // 殭屍攻擊玩家（使用已宣告的 playerCenterX 和 playerCenterY）
          state.zombies.forEach((zombie) => {
            const zombieY = zombie.y - zombie.height;
            const zombieCenterX = zombie.x + zombie.width / 2;
            const zombieCenterY = zombieY + zombie.height / 2;
            const distance = Math.sqrt(
              Math.pow(playerCenterX - zombieCenterX, 2) + Math.pow(playerCenterY - zombieCenterY, 2)
            );
            
            if (distance < (PLAYER_WIDTH + ZOMBIE_WIDTH) / 2) {
              if (now - zombie.lastAttack > zombie.attackCooldown) {
                if (!state.playerInvincible || now > (state.invincibleEndTime || 0)) {
                  state.playerHealth -= ZOMBIE_ATTACK_DAMAGE;
                  state.playerInvincible = true;
                  state.invincibleEndTime = now + 1000;
                }
                zombie.lastAttack = now;
              }
            }
          });
        }

        // 玩家子彈擊中殭屍
        if (state.playerBullets && state.zombies) {
          state.playerBullets = state.playerBullets.filter((bullet) => {
            let hit = false;
            state.zombies = state.zombies?.filter((zombie) => {
              const zombieY = zombie.y - zombie.height;
              const bulletCenterX = bullet.x + bullet.width / 2;
              const bulletCenterY = bullet.y + bullet.height / 2;
              const zombieCenterX = zombie.x + zombie.width / 2;
              const zombieCenterY = zombieY + zombie.height / 2;
              const distance = Math.sqrt(
                Math.pow(bulletCenterX - zombieCenterX, 2) + Math.pow(bulletCenterY - zombieCenterY, 2)
              );
              
              if (distance < (bullet.width + zombie.width) / 2) {
                zombie.health -= bullet.damage;
                hit = true;
                if (zombie.health <= 0) {
                  state.score += 10;
                  return false; // 移除死亡的殭屍
                }
              }
              return true;
            });
            return !hit; // 如果擊中，移除子彈
          });
        }

        // 字母不移動，保持固定位置
        // 玩家接觸字母收集
        const playerCenterX = (state.playerX || 0) + PLAYER_WIDTH / 2;
        const playerCenterY = (state.playerY || 0) + PLAYER_HEIGHT / 2;
        state.fallingLetters = state.fallingLetters.filter((letter) => {
          const letterCenterX = letter.x + LETTER_SIZE_ZOMBIE / 2;
          const letterCenterY = letter.y + LETTER_SIZE_ZOMBIE / 2;
          const distance = Math.sqrt(
            Math.pow(playerCenterX - letterCenterX, 2) + Math.pow(playerCenterY - letterCenterY, 2)
          );
          
          // 接觸收集（距離小於玩家和字母的半徑和）
          if (distance < (PLAYER_WIDTH / 2 + LETTER_SIZE_ZOMBIE / 2)) {
            const nextIndex = state.collectedLetters.length;
            if (nextIndex < state.correctLetters.length) {
              const expectedLetter = state.correctLetters[nextIndex];
              if (letter.letter === expectedLetter) {
                state.collectedLetters.push(letter.letter);
                state.score += 10;

                // 拼對一個字母：手榴彈範圍傷害
                if (!state.grenades) state.grenades = [];
                if (!state.explosions) state.explosions = [];
                
                // 在玩家前方生成手榴彈
                const grenadeX = (state.playerX || 0) + PLAYER_WIDTH + 50;
                const grenadeY = (state.playerY || 0) + PLAYER_HEIGHT / 2;
                state.grenades.push({
                  id: Date.now() + Math.random(),
                  x: grenadeX,
                  y: grenadeY,
                  radius: GRENADE_RADIUS,
                  explosionTime: now + 300, // 0.3秒後爆炸
                  damage: GRENADE_DAMAGE,
                });

                // 完成單字
                if (state.collectedLetters.length === state.correctLetters.length) {
                  state.wordsCompleted++;
                  state.score += 50;

                  // 完成單字：升級武器
                  if (!state.weaponLevel) state.weaponLevel = 0;
                  state.weaponLevel = Math.min(state.weaponLevel + 1, 2); // 最多2級

                  // 積分
                  const pointsToAdd = settings.pointsPerWord;
                  const maxPoints = settings.maxPoints;
                  if ((state.points || 0) + pointsToAdd <= maxPoints) {
                    state.points = Math.round(((state.points || 0) + pointsToAdd) * 10) / 10;
                  } else {
                    state.points = maxPoints;
                  }

                  // 完成單字：生成3隻殭屍（從不同方向）
                  if (!state.zombies) state.zombies = [];
                  const playerCenterX = (state.playerX || 0) + PLAYER_WIDTH / 2;
                  const playerCenterY = (state.playerY || 0) + PLAYER_HEIGHT / 2;
                  
                  // 生成3隻殭屍，從不同方向
                  const spawnSides = [0, 1, 2]; // 上、右、下
                  spawnSides.forEach((side, index) => {
                    if (!state.zombies) return; // 確保 zombies 存在
                    let zombieX = 0;
                    let zombieY = 0;
                    
                    if (side === 0) {
                      // 上方
                      zombieX = Math.random() * CANVAS_WIDTH;
                      zombieY = -ZOMBIE_HEIGHT;
                    } else if (side === 1) {
                      // 右方
                      zombieX = CANVAS_WIDTH;
                      zombieY = Math.random() * CANVAS_HEIGHT;
                    } else {
                      // 下方
                      zombieX = Math.random() * CANVAS_WIDTH;
                      zombieY = CANVAS_HEIGHT;
                    }
                    
                    // 計算朝向玩家的角度
                    const angle = Math.atan2(playerCenterY - zombieY, playerCenterX - zombieX);
                    
                    // 第一隻快速殭屍，其他兩隻普通殭屍
                    const isFast = index === 0;
                    
                    state.zombies.push({
                      id: Date.now() + Math.random() + index,
                      x: zombieX,
                      y: zombieY + ZOMBIE_HEIGHT,
                      width: ZOMBIE_WIDTH,
                      height: ZOMBIE_HEIGHT,
                      speed: isFast
                        ? FAST_ZOMBIE_SPEED + (state.wordsCompleted || 0) * 0.05
                        : ZOMBIE_SPEED + (state.wordsCompleted || 0) * 0.05,
                      health: isFast
                        ? FAST_ZOMBIE_HEALTH + (state.wordsCompleted || 0) * 3
                        : ZOMBIE_HEALTH + (state.wordsCompleted || 0) * 5,
                      maxHealth: isFast
                        ? FAST_ZOMBIE_HEALTH + (state.wordsCompleted || 0) * 3
                        : ZOMBIE_HEALTH + (state.wordsCompleted || 0) * 5,
                      attackCooldown: ZOMBIE_ATTACK_COOLDOWN,
                      lastAttack: 0,
                      angle: angle,
                      type: isFast ? "fast" : "normal",
                    });
                  });

                  // 選擇下一個單字
                  const nextWord = selectNextWord(wordsRef.current);
                  if (nextWord) {
                    state.currentWord = nextWord.word;
                    state.targetSpelling = nextWord.spelling;
                    state.correctLetters = nextWord.spelling.split("");
                    state.collectedLetters = [];
                  }
                }
              }
            }
            return false; // 移除已收集的字母
          }
          return true;
        });

        // 更新手榴彈和爆炸
        if (state.grenades) {
          state.grenades = state.grenades.filter((grenade) => {
            if (now >= grenade.explosionTime) {
              // 爆炸
              if (!state.explosions) state.explosions = [];
              state.explosions.push({
                id: Date.now() + Math.random(),
                x: grenade.x,
                y: grenade.y,
                radius: grenade.radius,
                maxRadius: grenade.radius,
                life: EXPLOSION_DURATION,
                maxLife: EXPLOSION_DURATION,
              });

              // 爆炸傷害殭屍
              if (state.zombies) {
                state.zombies = state.zombies.filter((zombie) => {
                  const zombieY = zombie.y - zombie.height;
                  const zombieCenterX = zombie.x + zombie.width / 2;
                  const zombieCenterY = zombieY + zombie.height / 2;
                  const dist = Math.sqrt(
                    Math.pow(grenade.x - zombieCenterX, 2) + Math.pow(grenade.y - zombieCenterY, 2)
                  );
                  if (dist < grenade.radius) {
                    zombie.health -= grenade.damage;
                    if (zombie.health <= 0) {
                      state.score += 20; // 爆炸擊殺額外分數
                      return false;
                    }
                  }
                  return true;
                });
              }

              return false; // 移除已爆炸的手榴彈
            }
            return true;
          });
        }

        // 更新爆炸效果
        if (state.explosions) {
          state.explosions = state.explosions
            .map((explosion) => ({
              ...explosion,
              life: explosion.life - 16, // 假設60fps
            }))
            .filter((explosion) => explosion.life > 0);
        }

        // 檢查無敵狀態
        if (state.playerInvincible && now > (state.invincibleEndTime || 0)) {
          state.playerInvincible = false;
        }

        // 檢查遊戲結束
        if (state.playerHealth <= 0) {
          state.isGameOver = true;
          state.isVictory = false;
          if (state.points > 0) {
            savePoints(state.points);
          }
          setShowResult(true);
        }

        renderGame(state);
        setDisplayState({ ...state });
        gameLoopRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      // 切水果遊戲邏輯
      if (selectedGame === "fruit-slicer") {
        const settings = FRUIT_SLICER_DIFFICULTY[state.difficulty];
        
        // 生成水果（拋物線運動）
        if (!state.lastFruitSpawn) state.lastFruitSpawn = now;
        const spawnInterval = FRUIT_SPAWN_INTERVAL / settings.letterSpeed; // 根據難度調整生成速度
        if (now - state.lastFruitSpawn > spawnInterval && state.correctLetters.length > 0) {
          if (!state.fruits) state.fruits = [];
          
          // 決定生成水果還是炸彈
          const isBomb = Math.random() < (BOMB_SPAWN_CHANCE * (state.difficulty === "normal" ? 1.5 : 1));
          
          if (isBomb) {
            // 生成炸彈
            const startX = Math.random() * (CANVAS_WIDTH - FRUIT_RADIUS * 2) + FRUIT_RADIUS;
            const vx = (Math.random() - 0.5) * 1.5; // 水平速度（減小，避免飛出畫面）
            // 調整初始向上速度，確保最高點在可見區域內，停留約3秒
            const baseVy = -(FRUIT_BASE_SPEED * settings.letterSpeed);
            const vy = baseVy + (Math.random() - 0.5) * 0.3; // 小幅隨機變化
            
            state.fruits.push({
              id: Date.now() + Math.random(),
              x: startX,
              y: CANVAS_HEIGHT - STATUS_HEIGHT, // 從底部生成
              radius: FRUIT_RADIUS,
              vx: vx,
              vy: vy,
              letter: null,
              type: "bomb",
              color: "#333333",
              isSliced: false,
            });
          } else {
            // 生成水果
            const nextIndex = state.collectedLetters.length;
            const isCorrect = Math.random() < 0.6;
            let letter: string;
            
            if (isCorrect && nextIndex < state.correctLetters.length) {
              letter = state.correctLetters[nextIndex];
            } else {
              // 從目標單字的所有字母中隨機選擇（干擾字母）
              const allLetters = state.correctLetters;
              letter = allLetters[Math.floor(Math.random() * allLetters.length)];
            }
            
            const startX = Math.random() * (CANVAS_WIDTH - FRUIT_RADIUS * 2) + FRUIT_RADIUS;
            const vx = (Math.random() - 0.5) * 1.5; // 水平速度（減小，避免飛出畫面）
            // 調整初始向上速度，確保最高點在可見區域內，停留約3秒
            // 使用固定的初始速度，確保3秒內完成拋物線且不飛出畫面
            const baseVy = -(FRUIT_BASE_SPEED * settings.letterSpeed);
            const vy = baseVy + (Math.random() - 0.5) * 0.3; // 小幅隨機變化
            
            // 隨機選擇水果類型
            const fruitTypes = [
              { type: "apple", color: "#ff4444", secondaryColor: "#ff8888" },
              { type: "orange", color: "#ff8800", secondaryColor: "#ffaa44" },
              { type: "strawberry", color: "#ff3366", secondaryColor: "#ff6699" },
              { type: "watermelon", color: "#00aa44", secondaryColor: "#00cc66" },
              { type: "banana", color: "#ffdd00", secondaryColor: "#ffee44" },
              { type: "grape", color: "#8844aa", secondaryColor: "#aa66cc" },
              { type: "pineapple", color: "#ffcc00", secondaryColor: "#ffdd44" },
              { type: "cherry", color: "#cc0000", secondaryColor: "#ff3366" },
            ];
            const fruitInfo = fruitTypes[Math.floor(Math.random() * fruitTypes.length)];
            
            state.fruits.push({
              id: Date.now() + Math.random(),
              x: startX,
              y: CANVAS_HEIGHT - STATUS_HEIGHT, // 從底部生成
              radius: FRUIT_RADIUS,
              vx: vx,
              vy: vy,
              letter: letter,
              type: "fruit",
              color: fruitInfo.color,
              fruitType: fruitInfo.type,
              isSliced: false,
            });
          }
          
          state.lastFruitSpawn = now;
        }
        
        // 更新水果位置（拋物線運動，更真實的物理）
        if (state.fruits) {
          state.fruits = state.fruits.map((fruit) => {
            if (fruit.isSliced) {
              // 已切開的水果仍然有重力，但速度減慢
              fruit.vy += GRAVITY_FRUIT * 0.5;
              fruit.y += fruit.vy * 0.5;
              return fruit;
            }
            
            // 更新位置（真實的拋物線運動）
            fruit.x += fruit.vx;
            fruit.y += fruit.vy;
            fruit.vy += GRAVITY_FRUIT; // 使用切水果遊戲的重力
            
            return fruit;
          }).filter((fruit) => {
            // 移除離開畫布或已切開超過1秒的水果
            if (fruit.isSliced && fruit.sliceTime) {
              return now - fruit.sliceTime < 1000; // 切開後1秒消失
            }
            // 確保水果在可見區域內（HUD下方到STATUS上方）
            const minY = HUD_HEIGHT - FRUIT_RADIUS; // 允許稍微超出HUD
            const maxY = CANVAS_HEIGHT - STATUS_HEIGHT + FRUIT_RADIUS; // 允許稍微超出STATUS
            return fruit.y >= minY && fruit.y <= maxY && 
                   fruit.x >= -FRUIT_RADIUS && fruit.x <= CANVAS_WIDTH + FRUIT_RADIUS;
          });
        }
        
        // 檢測切水果（滑鼠軌跡與水果碰撞）
        if (state.sliceTrail && state.sliceTrail.points.length > 1 && state.fruits) {
          const trailPoints = state.sliceTrail.points;
          
          state.fruits.forEach((fruit) => {
            if (fruit.isSliced) return; // 已切開的水果不再檢測
            
            const fruitY = fruit.y - HUD_HEIGHT;
            
            // 檢測切痕是否與水果相交
            for (let i = 0; i < trailPoints.length - 1; i++) {
              const p1 = trailPoints[i];
              const p2 = trailPoints[i + 1];
              
              // 計算線段到圓心的最短距離
              const dx = p2.x - p1.x;
              const dy = p2.y - p1.y;
              const length = Math.sqrt(dx * dx + dy * dy);
              
              if (length === 0) continue;
              
              const t = Math.max(0, Math.min(1, ((fruit.x - p1.x) * dx + (fruitY - p1.y) * dy) / (length * length)));
              const closestX = p1.x + t * dx;
              const closestY = p1.y + t * dy;
              const distance = Math.sqrt(Math.pow(fruit.x - closestX, 2) + Math.pow(fruitY - closestY, 2));
              
              if (distance < fruit.radius) {
                // 切到水果！
                fruit.isSliced = true;
                fruit.sliceTime = now;
                
                if (fruit.type === "bomb") {
                  // 切到炸彈
                  if (!state.playerInvincible || now > (state.invincibleEndTime || 0)) {
                    state.playerHealth -= BOMB_HP_LOSS;
                    // 畫面震動
                    if (!state.screenShake) state.screenShake = { intensity: 0, endTime: 0 };
                    state.screenShake.intensity = 20;
                    state.screenShake.endTime = now + 500;
                    // 畫面變紅效果（通過背景色實現）
                  }
                } else if (fruit.letter) {
                  // 切到帶字母的水果
                  const nextIndex = state.collectedLetters.length;
                  
                  if (nextIndex < state.correctLetters.length) {
                    const expectedLetter = state.correctLetters[nextIndex];
                    
                    if (fruit.letter === expectedLetter) {
                      // 正確字母！
                      state.collectedLetters.push(fruit.letter);
                      state.score += 10;
                      
                      // 完成單字
                      if (state.collectedLetters.length === state.correctLetters.length) {
                        state.wordsCompleted++;
                        state.score += 50;
                        
                        // 積分
                        const pointsToAdd = settings.pointsPerWord;
                        const maxPoints = settings.maxPoints;
                        if ((state.points || 0) + pointsToAdd <= maxPoints) {
                          state.points = Math.round(((state.points || 0) + pointsToAdd) * 10) / 10;
                        } else {
                          state.points = maxPoints;
                        }
                        
                        // Perfect! 動畫
                        if (!state.perfectAnimation) state.perfectAnimation = { show: false, startTime: 0, duration: PERFECT_ANIMATION_DURATION };
                        state.perfectAnimation.show = true;
                        state.perfectAnimation.startTime = now;
                        
                        // 無敵時間
                        state.playerInvincible = true;
                        state.invincibleEndTime = now + INVINCIBLE_TIME_ON_WORD_COMPLETE;
                        
                        // 回復 HP
                        state.playerHealth = Math.min(state.maxPlayerHealth, state.playerHealth + HP_HEAL_ON_WORD_COMPLETE);
                        
                        // 選擇下一個單字
                        const nextWord = selectNextWord(wordsRef.current);
                        if (nextWord) {
                          state.currentWord = nextWord.word;
                          state.targetSpelling = nextWord.spelling;
                          state.correctLetters = nextWord.spelling.split("");
                          state.collectedLetters = [];
                        }
                      }
                    } else {
                      // 錯誤字母
                      if (!state.playerInvincible || now > (state.invincibleEndTime || 0)) {
                        state.playerHealth -= WRONG_LETTER_HP_LOSS;
                      }
                    }
                  }
                }
                
                break; // 只檢測一次
              }
            }
          });
        }
        
        // 清理過期的切痕
        if (state.sliceTrail) {
          state.sliceTrail.points = state.sliceTrail.points.filter(p => now - p.time < SLICE_TRAIL_DURATION);
        }
        
        // 檢查無敵狀態
        if (state.playerInvincible && now > (state.invincibleEndTime || 0)) {
          state.playerInvincible = false;
        }
        
        // 檢查遊戲結束
        const targetCount = state.targetWordCount || 10;
        if (state.playerHealth <= 0 || state.wordsCompleted >= targetCount) {
          state.isGameOver = true;
          state.isVictory = state.wordsCompleted >= targetCount;
          if (state.points > 0) {
            savePoints(state.points);
          }
          setShowResult(true);
        }
        
        renderGame(state);
        setDisplayState({ ...state });
        gameLoopRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      // 房屋修繕遊戲邏輯
      if (selectedGame === "fixit") {
        const settings = FIXIT_DIFFICULTY[state.difficulty];
        
        // 玩家移動（WASD 或方向鍵）
        const playerX = state.playerX || HOUSE_X - 60;
        const playerY = state.playerY || HOUSE_Y + HOUSE_HEIGHT / 2;
        let newPlayerX = playerX;
        let newPlayerY = playerY;
        
        if (keysRef.current.has("arrowleft") || keysRef.current.has("a")) {
          newPlayerX = Math.max(0, playerX - PLAYER_SPEED_FIXIT);
        }
        if (keysRef.current.has("arrowright") || keysRef.current.has("d")) {
          newPlayerX = Math.min(CANVAS_WIDTH - PLAYER_SIZE, playerX + PLAYER_SPEED_FIXIT);
        }
        if (keysRef.current.has("arrowup") || keysRef.current.has("w")) {
          newPlayerY = Math.max(HUD_HEIGHT, playerY - PLAYER_SPEED_FIXIT);
        }
        if (keysRef.current.has("arrowdown") || keysRef.current.has("s")) {
          newPlayerY = Math.min(CANVAS_HEIGHT - STATUS_HEIGHT - 10, playerY + PLAYER_SPEED_FIXIT);
        }
        
        state.playerX = newPlayerX;
        state.playerY = newPlayerY;
        
        // 碰撞檢測：檢查玩家是否接觸到破損區域
        const playerCenterX = newPlayerX + PLAYER_SIZE / 2;
        const playerCenterY = newPlayerY + PLAYER_SIZE / 2;
        
        if (state.buildingCells && !state.isQuestionActive) {
          // 清除之前的修補目標
          state.buildingCells.forEach(cell => {
            cell.repairTarget = false;
          });
          
          // 檢查玩家是否靠近破損區域
          const brokenCells = state.buildingCells.filter(c => c.state === "broken");
          for (const cell of brokenCells) {
            const cellCenterX = cell.x + cell.width / 2;
            const cellCenterY = cell.y + cell.height / 2;
            const distance = Math.sqrt(
              Math.pow(playerCenterX - cellCenterX, 2) + 
              Math.pow(playerCenterY - cellCenterY, 2)
            );
            
            if (distance < COLLISION_DISTANCE) {
              // 玩家接觸到破損區域，設置為修補目標（但不自動生成題目，需要點擊）
              cell.repairTarget = true;
              state.repairTargetCellId = cell.id;
              // 不自動生成題目，等待滑鼠點擊
              break; // 只處理第一個接觸的破損區域
            }
          }
        }
        
        // 壞人移動邏輯
        const villainX = state.villainX || HOUSE_X + HOUSE_WIDTH / 2;
        const villainY = state.villainY || HOUSE_Y - 30;
        let newVillainX = villainX;
        let newVillainY = villainY;
        
        // 如果壞人已經到達目標位置，選擇新的目標
        const distanceToTarget = Math.sqrt(
          Math.pow(villainX - (state.villainTargetX || villainX), 2) +
          Math.pow(villainY - (state.villainTargetY || villainY), 2)
        );
        
        if (distanceToTarget < 5) {
          // 選擇新的目標位置（房子周圍的隨機位置）
          if (state.buildingCells && state.buildingCells.length > 0) {
            const randomCell = state.buildingCells[Math.floor(Math.random() * state.buildingCells.length)];
            state.villainTargetX = randomCell.x + randomCell.width / 2;
            state.villainTargetY = randomCell.y - 20; // 在元素上方
          }
        }
        
        // 移動壞人朝向目標
        const targetX = state.villainTargetX || villainX;
        const targetY = state.villainTargetY || villainY;
        const dx = targetX - villainX;
        const dy = targetY - villainY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
          newVillainX += (dx / distance) * VILLAIN_SPEED;
          newVillainY += (dy / distance) * VILLAIN_SPEED;
        }
        
        state.villainX = newVillainX;
        state.villainY = newVillainY;
        
        // 壞人破壞建築
        if (!state.lastDamageTime) state.lastDamageTime = now;
        const damageInterval = state.damageSpeed || BASE_DAMAGE_INTERVAL;
        if (now - state.lastDamageTime > damageInterval && state.buildingCells) {
          const normalCells = state.buildingCells.filter(c => c.state === "normal");
          
          if (normalCells.length > 0) {
            // 選擇壞人附近的元素進行破壞
            let targetCell = null;
            let minDistance = Infinity;
            
            for (const cell of normalCells) {
              const cellCenterX = cell.x + cell.width / 2;
              const cellCenterY = cell.y + cell.height / 2;
              const dist = Math.sqrt(
                Math.pow(newVillainX - cellCenterX, 2) +
                Math.pow(newVillainY - cellCenterY, 2)
              );
              
              if (dist < 100 && dist < minDistance) {
                minDistance = dist;
                targetCell = cell;
              }
            }
            
            // 如果沒有附近的元素，隨機選擇一個
            if (!targetCell) {
              targetCell = normalCells[Math.floor(Math.random() * normalCells.length)];
            }
            
            if (targetCell) {
              // 產生爆炸特效
              if (!state.fixitExplosions) state.fixitExplosions = [];
              const explosionX = targetCell.x + targetCell.width / 2;
              const explosionY = targetCell.y + targetCell.height / 2;
              state.fixitExplosions.push({
                id: `explosion-${Date.now()}-${Math.random()}`,
                x: explosionX,
                y: explosionY,
                radius: 40,
                life: EXPLOSION_DURATION,
                maxLife: EXPLOSION_DURATION,
                color: "#ff6600",
              });
              
              // 破壞元素
              targetCell.state = "broken";
              state.lastDamageTime = now;
              
              // 如果這個元素是當前修補目標，清除目標
              if (targetCell.id === state.repairTargetCellId) {
                state.repairTargetCellId = null;
              }
              
              // 更新建築耐久度
              if (state.buildingHp && state.maxBuildingHp) {
                state.buildingHp = Math.max(0, state.buildingHp - 1);
              }
            }
          }
        }
        
        // 更新爆炸特效
        if (state.fixitExplosions) {
          state.fixitExplosions = state.fixitExplosions
            .map(explosion => ({
              ...explosion,
              life: explosion.life - 16, // 假設60fps
            }))
            .filter(explosion => explosion.life > 0);
        }
        
        // 檢查破壞速度提升
        if (state.damageSpeedBoostEndTime && now < state.damageSpeedBoostEndTime) {
          state.damageSpeed = (state.baseDamageSpeed || BASE_DAMAGE_INTERVAL) * 0.7; // 破壞更快
        } else {
          state.damageSpeed = state.baseDamageSpeed || BASE_DAMAGE_INTERVAL;
          state.damageSpeedBoostEndTime = 0;
        }
        
        // 題目系統已改為點擊觸發，不再自動生成
        
        // 檢查遊戲結束
        if (state.buildingHp !== undefined && state.buildingHp <= 0) {
          state.isGameOver = true;
          state.isVictory = false;
          if (state.points > 0) {
            savePoints(state.points);
          }
          setShowResult(true);
        } else if (state.answeredCount !== undefined && state.totalQuestions !== undefined && 
                   state.answeredCount >= state.totalQuestions && state.buildingHp && state.buildingHp > 0) {
          state.isGameOver = true;
          state.isVictory = true;
          if (state.points > 0) {
            savePoints(state.points);
          }
          setShowResult(true);
        }
        
        renderGame(state);
        setDisplayState({ ...state });
        gameLoopRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      // 飛機大戰遊戲邏輯
      const settings = getDifficultySettings()[state.difficulty];

      // 玩家移動
      if (!state.playerX) state.playerX = 0;
      if (!state.playerY) state.playerY = 0;
      if (keysRef.current.has("arrowleft") || keysRef.current.has("a")) {
        state.playerX = Math.max(0, (state.playerX || 0) - PLAYER_SPEED);
      }
      if (keysRef.current.has("arrowright") || keysRef.current.has("d")) {
        state.playerX = Math.min(CANVAS_WIDTH - PLAYER_WIDTH, (state.playerX || 0) + PLAYER_SPEED);
      }
      if (keysRef.current.has("arrowup") || keysRef.current.has("w")) {
        state.playerY = Math.max(100, (state.playerY || 0) - PLAYER_SPEED);
      }
      if (keysRef.current.has("arrowdown") || keysRef.current.has("s")) {
        state.playerY = Math.min(CANVAS_HEIGHT - PLAYER_HEIGHT, (state.playerY || 0) + PLAYER_SPEED);
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
            const playerX = state.playerX || 0;
            const playerY = state.playerY || 0;
            state.bullets.push(
              {
                id: bulletIdRef.current++,
                x: playerX + PLAYER_WIDTH / 2 - 4,
                y: playerY,
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
                x: playerX + PLAYER_WIDTH / 2 - 4,
                y: playerY,
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
                x: playerX + PLAYER_WIDTH / 2 - 4,
                y: playerY,
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
            const playerX = state.playerX || 0;
            const playerY = state.playerY || 0;
            state.bullets.push({
              id: bulletIdRef.current++,
              x: playerX + PLAYER_WIDTH / 2 - 4,
              y: playerY,
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
      const bossTargetX = (state.playerX || 0) + PLAYER_WIDTH / 2 - BOSS_WIDTH / 2;
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
              const dx = (state.playerX || 0) + PLAYER_WIDTH / 2 - bullet.x;
              const dy = (state.playerY || 0) + PLAYER_HEIGHT / 2 - bullet.y;
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
          // 不再給分，只有完成單字才給分
          return false;
        }
        return true;
      });

      // 檢查無敵
      if (state.playerInvincible && now > state.invincibleEndTime) {
        state.playerInvincible = false;
      }

      // Boss 子彈擊中玩家
      const playerX = state.playerX || 0;
      const playerY = state.playerY || 0;
      state.bullets = state.bullets.filter((bullet) => {
        if (
          !bullet.isPlayer &&
          bullet.x < playerX + PLAYER_WIDTH &&
          bullet.x + bullet.width > playerX &&
          bullet.y < playerY + PLAYER_HEIGHT &&
          bullet.y + bullet.height > playerY
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
          letter.x < playerX + PLAYER_WIDTH &&
          letter.x + 28 > playerX &&
          letter.y < playerY + PLAYER_HEIGHT &&
          letter.y + 28 > playerY
        ) {
          const nextIndex = state.collectedLetters.length;
          if (nextIndex < state.correctLetters.length) {
            const expectedLetter = state.correctLetters[nextIndex];
            if (letter.letter === expectedLetter) {
              state.collectedLetters.push(letter.letter);

              // 只有完成單字才給分
              if (state.collectedLetters.length === state.correctLetters.length) {
                state.wordsCompleted++;
                
                // 根據難度給不同的積分
                const pointsToAdd = settings.pointsPerWord;
                const maxPoints = settings.maxPoints;
                if (state.points + pointsToAdd <= maxPoints) {
                  state.points = Math.round((state.points + pointsToAdd) * 10) / 10; // 保留一位小數
                } else {
                  state.points = maxPoints;
                }
                
                // 分數顯示（用於顯示）
                state.score += 50;

                const powerTypes: ("spread" | "damage" | "shield" | "rapid")[] = ["spread", "damage", "shield", "rapid"];
                const powerType = powerTypes[Math.floor(Math.random() * powerTypes.length)];
                state.activePowerUps.push({ type: powerType, endTime: now + 10000 });

                // 拼對10單字後boss血量歸零
                if (state.wordsCompleted >= 10) {
                  state.bossHealth = 0;
                }

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
        // 保存積分
        if (state.points > 0) {
          savePoints(state.points);
        }
        setShowResult(true);
      } else if (state.bossHealth <= 0) {
        state.isGameOver = true;
        state.isVictory = true;
        // 保存積分
        if (state.points > 0) {
          savePoints(state.points);
        }
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
      // 清理滑鼠點擊事件
      if (handleFixitClick) {
        canvasRef.current?.removeEventListener("click", handleFixitClick);
      }
      if (handleMouseMove) {
        window.removeEventListener("mousemove", handleMouseMove);
      }
      if (handleFruitSlicerMouseDown && handleFruitSlicerMouseMove && handleFruitSlicerMouseUp && canvasRef.current) {
        canvasRef.current.removeEventListener("mousedown", handleFruitSlicerMouseDown);
        canvasRef.current.removeEventListener("mousemove", handleFruitSlicerMouseMove);
        canvasRef.current.removeEventListener("mouseup", handleFruitSlicerMouseUp);
        canvasRef.current.removeEventListener("mouseleave", handleFruitSlicerMouseUp);
        canvasRef.current.removeEventListener("touchstart", handleFruitSlicerMouseDown);
        canvasRef.current.removeEventListener("touchmove", handleFruitSlicerMouseMove);
        canvasRef.current.removeEventListener("touchend", handleFruitSlicerMouseUp);
        canvasRef.current.removeEventListener("touchcancel", handleFruitSlicerMouseUp);
      }
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameStarted, selectedGame, renderGame]);

  const savePoints = async (points: number) => {
    try {
      await fetch("/api/student/points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pointsToAdd: points }),
      });
    } catch (error) {
      console.error("保存積分失敗:", error);
    }
  };

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
                  cursor: "pointer",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: 4,
                  },
                }}
                onClick={() => setSelectedGame(game.id as GameType)}
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
            {selectedGame === "dino-game" ? (
              <>
                <Typography variant="body2" color="text.secondary">
                  • 空白鍵、上鍵 或 W 鍵跳躍（可二段跳）
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • 跳起來收集字母拼出單字（字母在高處，需要跳起來吃）
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • 跳過地面上的仙人掌，撞到會扣血！
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • 單字和仙人掌不會重疊，可以安心收集字母
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • <b>完成單字可復活、無敵並獲得衝刺效果！</b>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • 完成單字可獲得 <b>1 積分</b>，一局最多 <b>20 積分</b>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • 遊戲速度會持續增加，無上限！
                </Typography>
              </>
            ) : selectedGame === "zombie-shooter" ? (
              <>
                <Typography variant="body2" color="text.secondary">
                  • WASD 或 方向鍵移動角色（上下左右）
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • <b>滑鼠移動控制射擊方向</b>，槍會自動持續射擊
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • <b>移動到字母附近接觸收集</b>，拼出單字（遊戲上方會顯示單字提示）
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • <b>拼對一個字母 → 手榴彈範圍傷害！</b>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • <b>完成整個單字 → 武器升級（三發扇形子彈）！</b>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • 殭屍會從四面八方出現並朝你移動，要小心！
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • 完成單字可獲得積分（簡單1積分/單字，普通1.5積分/單字，困難2積分/單字，地獄5積分/單字）
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • 一局最多可獲得積分：簡單 <b>10積分</b>，普通 <b>15積分</b>，困難 <b>20積分</b>，地獄 <b>50積分</b>
                </Typography>
              </>
            ) : selectedGame === "fruit-slicer" ? (
              <>
                <Typography variant="body2" color="text.secondary">
                  • <b>滑鼠拖曳或觸控滑動</b>來切水果
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • 水果從底部往上拋出，帶有字母
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • <b>切到正確字母 → 填入單字，切到錯誤字母 → 扣 HP</b>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • <b>切到炸彈 💣 → 扣大量 HP，畫面震動！</b>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • <b>完成單字 → Perfect! 動畫，無敵時間 3 秒，回復 HP！</b>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • 完成 <b>10 個單字</b>或 HP 歸零即結束
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • 完成單字可獲得積分（簡單1積分/單字，普通1.5積分/單字，困難2積分/單字，地獄5積分/單字）
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • 一局最多可獲得積分：簡單 <b>10積分</b>，普通 <b>15積分</b>，困難 <b>20積分</b>，地獄 <b>50積分</b>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • <b>普通模式：水果速度 +20%，炸彈出現機率提高</b>
                </Typography>
              </>
            ) : (
              <>
                <Typography variant="body2" color="text.secondary">
                  • WASD 或 方向鍵移動飛機
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • 空白鍵 或 J 鍵發射子彈
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • 收集字母拼出單字（遊戲中會顯示單字提示）
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • 完成單字獲得增強效果
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • <b>打敗 Boss 即可獲勝！</b>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • 完成單字可獲得積分（簡單1積分/單字，普通1.5積分/單字，困難2積分/單字，地獄5積分/單字）
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • 一局最多可獲得積分：簡單 <b>10積分</b>，普通 <b>15積分</b>，困難 <b>20積分</b>，地獄 <b>50積分</b>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • 完成 <b>10 個單字</b>後，Boss 血量自動歸零！
                </Typography>
              </>
            )}
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

          {selectedGame !== "dino-game" && selectedGame !== "fruit-slicer" && (
            <>
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
                {selectedGame === "zombie-shooter" ? (
                  <>
                    <Typography variant="body2" color="text.secondary">
                      玩家血量: {difficultySettings[selectedDifficulty].maxPlayerHealth}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      射擊速度:{" "}
                      {selectedDifficulty === "easy"
                        ? "慢"
                        : selectedDifficulty === "normal"
                          ? "普通"
                          : selectedDifficulty === "hard"
                            ? "快"
                            : "極快"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      字母生成速度:{" "}
                      {selectedDifficulty === "easy"
                        ? "快"
                        : selectedDifficulty === "normal"
                          ? "普通"
                          : selectedDifficulty === "hard"
                            ? "慢"
                            : "極慢"}
                    </Typography>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </Box>
            </>
          )}

          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={startGame}
            disabled={!selectedVocabId}
            sx={{
              py: 2,
              backgroundColor:
                selectedGame === "dino-game"
                  ? "#4caf50"
                  : selectedGame === "zombie-shooter"
                    ? "#8b4513"
                    : difficultySettings[selectedDifficulty].color,
              "&:hover": {
                backgroundColor:
                  selectedGame === "dino-game"
                    ? "#4caf50"
                    : selectedGame === "zombie-shooter"
                      ? "#8b4513"
                      : difficultySettings[selectedDifficulty].color,
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

      {/* 房屋修繕遊戲選擇題對話框 */}
      {selectedGame === "fixit" && displayState.isQuestionActive && displayState.currentQuestion && (
        <Dialog 
          open={displayState.isQuestionActive} 
          maxWidth="sm" 
          fullWidth
          disableEscapeKeyDown
          onClose={() => {}} // 不允許關閉
        >
          <DialogTitle sx={{ textAlign: "center", fontSize: 24 }}>
            🔨 單字選擇題
          </DialogTitle>
          <DialogContent>
            <Box sx={{ py: 2 }}>
              <Typography variant="h6" sx={{ mb: 2, textAlign: "center" }}>
                提示：{displayState.currentQuestion.explanation || "請選擇正確的單字"}
              </Typography>
              <Typography variant="body1" sx={{ mb: 3, textAlign: "center", color: "text.secondary" }}>
                請選擇正確的英文單字：
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {displayState.currentQuestion.choices.map((choice, index) => (
                  <Button
                    key={index}
                    variant="outlined"
                    fullWidth
                    size="large"
                    onClick={() => {
                      const state = gameStateRef.current;
                      if (!state.currentQuestion) return;
                      
                      const isCorrect = index === state.currentQuestion!.correctIndex;
                      state.answeredCount = (state.answeredCount || 0) + 1;
                      
                      if (isCorrect) {
                        // 答對：修補目標區域
                        state.correctCount = (state.correctCount || 0) + 1;
                        state.score += 100;
                        
                        // 修補目標格子
                        if (state.repairTargetCellId && state.buildingCells) {
                          const targetCell = state.buildingCells.find(c => c.id === state.repairTargetCellId);
                          if (targetCell && targetCell.state === "broken") {
                            targetCell.state = "normal";
                            targetCell.repairTarget = false;
                            
                            // 更新建築耐久度
                            if (state.buildingHp && state.maxBuildingHp) {
                              state.buildingHp = Math.min(state.maxBuildingHp, (state.buildingHp || 0) + 1);
                            }
                            
                            // 顯示 Perfect 動畫
                            if (!state.perfectAnimation) {
                              state.perfectAnimation = { show: false, startTime: 0, duration: PERFECT_ANIMATION_DURATION_FIXIT };
                            }
                            state.perfectAnimation.show = true;
                            state.perfectAnimation.startTime = Date.now();
                            
                            // 清除修補目標
                            state.repairTargetCellId = null;
                          }
                        }
                        
                        // 積分
                        const settings = FIXIT_DIFFICULTY[state.difficulty];
                        const pointsToAdd = settings.pointsPerWord;
                        const maxPoints = settings.maxPoints;
                        if ((state.points || 0) + pointsToAdd <= maxPoints) {
                          state.points = Math.round(((state.points || 0) + pointsToAdd) * 10) / 10;
                        } else {
                          state.points = maxPoints;
                        }
                      } else {
                        // 答錯：提升破壞速度
                        state.damageSpeedBoostEndTime = Date.now() + 5000;
                        state.score = Math.max(0, (state.score || 0) - 50);
                      }
                      
                      // 關閉題目
                      state.isQuestionActive = false;
                      state.currentQuestion = null;
                      state.questionStartTime = Date.now();
                      
                      setDisplayState({ ...state });
                    }}
                    sx={{
                      py: 2,
                      fontSize: 18,
                      fontWeight: "bold",
                    }}
                  >
                    {choice.toUpperCase()}
                  </Button>
                ))}
              </Box>
            </Box>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={showResult} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ textAlign: "center", fontSize: 28 }}>
          {displayState.isVictory ? "🎉 勝利！" : "💀 遊戲結束"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: "center", py: 2 }}>
            <Typography variant="h3" sx={{ color: "#ffcc00", mb: 2 }}>
              {displayState.points || 0} 積分
            </Typography>
            {(selectedGame === "plane-shooter" || selectedGame === "zombie-shooter" || selectedGame === "fruit-slicer" || selectedGame === "fixit") && (
              <Chip
                label={getDifficultySettings()[displayState.difficulty].name}
                sx={{
                  backgroundColor: getDifficultySettings()[displayState.difficulty].color,
                  color: "#fff",
                  mb: 2,
                }}
              />
            )}
            {selectedGame !== "fixit" && (
              <Typography variant="body1" sx={{ mb: 1 }}>
                完成單字: {displayState.wordsCompleted} 個
              </Typography>
            )}
            {selectedGame === "fixit" && (
              <Typography variant="body1" sx={{ mb: 1 }}>
                答對題數: {displayState.correctCount || 0} / {displayState.answeredCount || 0}
              </Typography>
            )}
            {displayState.wordsCompleted >= 10 && selectedGame !== "fruit-slicer" && (
              <Typography variant="body1" sx={{ color: "#4caf50", mb: 1 }}>
                🎉 完成10個單字，Boss爆炸！
              </Typography>
            )}
            {displayState.wordsCompleted >= 10 && selectedGame === "fruit-slicer" && (
              <Typography variant="body1" sx={{ color: "#4caf50", mb: 1 }}>
                🎉 完成10個單字，挑戰成功！
              </Typography>
            )}
            {displayState.isVictory && (
              <Typography variant="body1" sx={{ color: "#4caf50" }}>
                🏆 勝利！
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
