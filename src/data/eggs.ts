export type EggRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'mythic';

export interface EggItem {
  id: string;
  nameTh: string;
  nameEn: string;
  emoji: string;
  rarity: EggRarity;
  chancePct: string;
  weight: number; // relative drop weight (sum = 100)
  bonusStars: number;
  colorHex: number;
  badgeBg: string;
  badgeText: string;
  borderGlow: string;
  rarityLabelTh: string;
}

export const EGG_ITEMS: EggItem[] = [
  // ================= COMMON (55% total) =================
  {
    id: 'egg-chick',
    nameTh: 'ลูกเจี๊ยบแสงจันทร์',
    nameEn: 'Moon Chick',
    emoji: '🐣',
    rarity: 'common',
    chancePct: '15%',
    weight: 15,
    bonusStars: 5,
    colorHex: 0x94a3b8,
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-700',
    borderGlow: 'border-slate-200',
    rarityLabelTh: 'ทั่วไป (Common)',
  },
  {
    id: 'egg-frog',
    nameTh: 'กบน้อยมรกต',
    nameEn: 'Emerald Frog',
    emoji: '🐸',
    rarity: 'common',
    chancePct: '14%',
    weight: 14,
    bonusStars: 5,
    colorHex: 0x94a3b8,
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-700',
    borderGlow: 'border-slate-200',
    rarityLabelTh: 'ทั่วไป (Common)',
  },
  {
    id: 'egg-bunny',
    nameTh: 'กระต่ายปุยเมฆ',
    nameEn: 'Cloud Bunny',
    emoji: '🐰',
    rarity: 'common',
    chancePct: '13%',
    weight: 13,
    bonusStars: 6,
    colorHex: 0x94a3b8,
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-700',
    borderGlow: 'border-slate-200',
    rarityLabelTh: 'ทั่วไป (Common)',
  },
  {
    id: 'egg-turtle',
    nameTh: 'เต่าน้อยเกราะเพชร',
    nameEn: 'Crystal Turtle',
    emoji: '🐢',
    rarity: 'common',
    chancePct: '13%',
    weight: 13,
    bonusStars: 6,
    colorHex: 0x94a3b8,
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-700',
    borderGlow: 'border-slate-200',
    rarityLabelTh: 'ทั่วไป (Common)',
  },

  // ================= UNCOMMON (27% total) =================
  {
    id: 'egg-penguin',
    nameTh: 'เพนกวินเหมันต์',
    nameEn: 'Frost Penguin',
    emoji: '🐧',
    rarity: 'uncommon',
    chancePct: '9%',
    weight: 9,
    bonusStars: 15,
    colorHex: 0x38bdf8,
    badgeBg: 'bg-sky-100',
    badgeText: 'text-sky-800',
    borderGlow: 'border-sky-300',
    rarityLabelTh: 'พิเศษ (Uncommon)',
  },
  {
    id: 'egg-dolphin',
    nameTh: 'โลมาคลื่นสวรรค์',
    nameEn: 'Sky Dolphin',
    emoji: '🐬',
    rarity: 'uncommon',
    chancePct: '9%',
    weight: 9,
    bonusStars: 15,
    colorHex: 0x38bdf8,
    badgeBg: 'bg-sky-100',
    badgeText: 'text-sky-800',
    borderGlow: 'border-sky-300',
    rarityLabelTh: 'พิเศษ (Uncommon)',
  },
  {
    id: 'egg-panda',
    nameTh: 'แพนด้าไผ่ทอง',
    nameEn: 'Golden Bamboo Panda',
    emoji: '🐼',
    rarity: 'uncommon',
    chancePct: '9%',
    weight: 9,
    bonusStars: 18,
    colorHex: 0x38bdf8,
    badgeBg: 'bg-sky-100',
    badgeText: 'text-sky-800',
    borderGlow: 'border-sky-300',
    rarityLabelTh: 'พิเศษ (Uncommon)',
  },

  // ================= RARE (12% total) =================
  {
    id: 'egg-fox',
    nameTh: 'จิ้งจอกเพลิงอัคคี',
    nameEn: 'Blaze Fox',
    emoji: '🦊',
    rarity: 'rare',
    chancePct: '4%',
    weight: 4,
    bonusStars: 35,
    colorHex: 0xa855f7,
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-800',
    borderGlow: 'border-purple-400',
    rarityLabelTh: 'หายาก (Rare ✨)',
  },
  {
    id: 'egg-owl',
    nameTh: 'นกฮูกปราชญ์ดารา',
    nameEn: 'Astral Owl',
    emoji: '🦉',
    rarity: 'rare',
    chancePct: '4%',
    weight: 4,
    bonusStars: 35,
    colorHex: 0xa855f7,
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-800',
    borderGlow: 'border-purple-400',
    rarityLabelTh: 'หายาก (Rare ✨)',
  },
  {
    id: 'egg-lion',
    nameTh: 'สิงโตเกราะทองคำ',
    nameEn: 'Golden Lion',
    emoji: '🦁',
    rarity: 'rare',
    chancePct: '4%',
    weight: 4,
    bonusStars: 40,
    colorHex: 0xa855f7,
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-800',
    borderGlow: 'border-purple-400',
    rarityLabelTh: 'หายาก (Rare ✨)',
  },

  // ================= EPIC / SSR (5% total) =================
  {
    id: 'egg-unicorn',
    nameTh: 'ยูนิคอร์นสายรุ้งสวรรค์',
    nameEn: 'Celestial Unicorn',
    emoji: '🦄',
    rarity: 'epic',
    chancePct: '2.5%',
    weight: 2.5,
    bonusStars: 80,
    colorHex: 0xf59e0b,
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-900',
    borderGlow: 'border-amber-400',
    rarityLabelTh: 'ระดับสูง (Epic 🌟)',
  },
  {
    id: 'egg-trex',
    nameTh: 'ไดโนเสาร์ทีเร็กซ์ทองคำ',
    nameEn: 'Cyber T-Rex',
    emoji: '🦖',
    rarity: 'epic',
    chancePct: '2.5%',
    weight: 2.5,
    bonusStars: 90,
    colorHex: 0xf59e0b,
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-900',
    borderGlow: 'border-amber-400',
    rarityLabelTh: 'ระดับสูง (Epic 🌟)',
  },

  // ================= MYTHIC / SECRET RARE (1% total — น้อยคนถึงจะได้!) =================
  {
    id: 'egg-dragon',
    nameTh: 'มังกรจักรวาล 3D (ตำนานลับ)',
    nameEn: 'Cosmic Mythic Dragon',
    emoji: '🐉',
    rarity: 'mythic',
    chancePct: '0.6%',
    weight: 0.6,
    bonusStars: 250,
    colorHex: 0xf43f5e,
    badgeBg: 'bg-gradient-to-r from-rose-500 via-amber-500 to-indigo-600',
    badgeText: 'text-white',
    borderGlow: 'border-rose-500',
    rarityLabelTh: 'ตำนานลับ 1% (Mythic 🌈)',
  },
  {
    id: 'egg-phoenix',
    nameTh: 'พญาอินทรีสุริยะเทพ (ตำนานลับ)',
    nameEn: 'Solar Phoenix King',
    emoji: '🦅',
    rarity: 'mythic',
    chancePct: '0.4%',
    weight: 0.4,
    bonusStars: 300,
    colorHex: 0xf43f5e,
    badgeBg: 'bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600',
    badgeText: 'text-white',
    borderGlow: 'border-amber-500',
    rarityLabelTh: 'ตำนานลับ 1% (Mythic 🌈)',
  },
];

export function rollMysteryEgg(): EggItem {
  const totalWeight = EGG_ITEMS.reduce((sum, item) => sum + item.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const item of EGG_ITEMS) {
    rand -= item.weight;
    if (rand <= 0) {
      return item;
    }
  }
  return EGG_ITEMS[0];
}
