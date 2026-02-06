import { Cpu, BookOpen, Smile, Sparkles } from 'lucide-react';

export const SCORE_CATEGORIES = [
  {
    key: 'technical',
    label: 'Technical',
    shortLabel: 'T',
    icon: Cpu,
    description: 'Animation quality, art style, sound design, voice acting, and overall production value.',
    weightKey: 'weight_technical',
    prefKey: 'pref_weight_technical',
    scoreKey: 'score_technical',
  },
  {
    key: 'storytelling',
    label: 'Storytelling',
    shortLabel: 'S',
    icon: BookOpen,
    description: 'Plot structure, character development, pacing, dialogue, and narrative depth.',
    weightKey: 'weight_storytelling',
    prefKey: 'pref_weight_storytelling',
    scoreKey: 'score_storytelling',
  },
  {
    key: 'enjoyment',
    label: 'Enjoyment',
    shortLabel: 'E',
    icon: Smile,
    description: 'Personal enjoyment, rewatchability, emotional impact, and entertainment value.',
    weightKey: 'weight_enjoyment',
    prefKey: 'pref_weight_enjoyment',
    scoreKey: 'score_enjoyment',
  },
  {
    key: 'xfactor',
    label: 'X-Factor',
    shortLabel: 'X',
    icon: Sparkles,
    description: 'Uniqueness, cultural impact, innovation, and that special something that sets it apart.',
    weightKey: 'weight_xfactor',
    prefKey: 'pref_weight_xfactor',
    scoreKey: 'score_xfactor',
  },
];
