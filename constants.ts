import { PrizeConfig, PrizeLevel, Participant } from './types';

export const INITIAL_PRIZES: PrizeConfig[] = [
  { id: 'p1', level: PrizeLevel.Grand, name: '特斯拉 Model 3', count: 1, color: '#FFD700', image: 'https://picsum.photos/200/200?random=1' },
  { id: 'p2', level: PrizeLevel.First, name: 'MacBook Pro M3', count: 3, color: '#C0C0C0', image: 'https://picsum.photos/200/200?random=2' },
  { id: 'p3', level: PrizeLevel.Second, name: 'iPhone 15 Pro', count: 5, color: '#CD7F32', image: 'https://picsum.photos/200/200?random=3' },
  { id: 'p4', level: PrizeLevel.Third, name: 'iPad Air', count: 10, color: '#4DA6FF', image: 'https://picsum.photos/200/200?random=4' },
];

const MOCK_NAMES = [
  "张伟", "王芳", "李娜", "刘强", "陈杰", "杨洋", "赵静", "黄勇", "周涛", "吴刚",
  "徐丽", "孙凯", "马超", "朱琳", "胡磊", "郭霞", "林峰", "何英", "高强", "罗燕",
  "郑波", "宋梅", "谢军", "韩雪", "唐明", "冯平", "于洋", "董洁", "萧云", "程龙",
  "沈伟", "姜丽", "谭勇", "苏珊", "卢伟", "叶婷", "彭飞", "侯亮", "田雨", "白雪"
];

const DEPARTMENTS = ['技术部', '销售部', '人事部', '市场部', '财务部', '运营部'];

export const MOCK_PARTICIPANTS: Participant[] = Array.from({ length: 150 }).map((_, i) => ({
  id: `u-${i}`,
  name: i < MOCK_NAMES.length ? MOCK_NAMES[i] : `员工 ${i + 1}`,
  department: DEPARTMENTS[Math.floor(Math.random() * DEPARTMENTS.length)]
}));

// A fast electronic beat for the loop
export const MUSIC_URL = "https://cdn.pixabay.com/audio/2022/03/15/audio_2484666d62.mp3"; 
// Win sound
export const WIN_SOUND_URL = "https://cdn.pixabay.com/audio/2021/08/04/audio_0625c153e1.mp3";