const STOP_WORDS = new Set([
  'about', 'after', 'again', 'also', 'and', 'are', 'because', 'been', 'being',
  'could', 'from', 'have', 'into', 'just', 'like', 'more', 'myself', 'over',
  'really', 'some', 'that', 'them', 'then', 'there', 'they', 'this', 'when',
  'where', 'which', 'with', 'your', 'you', 'what', 'while', 'would', 'will',
]);

const MOOD_LINES = {
  chaotic: ['the plot has officially left the group chat', 'my brain just opened 37 tabs'],
  relatable: ['me pretending this was part of the plan', 'same energy, different day'],
  confident: ['watch me make this everyone else’s problem', 'main character mode: activated'],
  tired: ['my last brain cell is on a coffee break', 'currently buffering in real life'],
};

const TONE_PREFIX = {
  Funny: 'The situation:',
  Sarcastic: 'Oh perfect, because',
  'Dark humour': 'The universe really said:',
  'Gen-Z slang': 'POV:',
  Relatable: 'Me, every single time:',
  Savage: 'Respectfully,',
};

function cleanInput(value) {
  return value.trim().replace(/\s+/g, ' ').slice(0, 180);
}

export function generateCaptions({ topic, mood = 'chaotic' }) {
  const cleanTopic = cleanInput(topic);
  const moodLines = MOOD_LINES[mood] ?? MOOD_LINES.chaotic;
  return [
    `Me: “I’ll handle ${cleanTopic} calmly.” Also me: ${moodLines[0]}.`,
    `Nobody: absolutely nobody. My brain about ${cleanTopic}: ${moodLines[1]}.`,
    `The ${cleanTopic} cinematic universe has a new main character.`,
    `Task failed successfully: ${cleanTopic}, but make it a personality trait.`,
  ];
}

export function rewriteCaption({ caption, tone }) {
  const cleanCaption = cleanInput(caption);
  const prefix = TONE_PREFIX[tone] ?? TONE_PREFIX.Funny;
  const variants = {
    Funny: `${prefix} ${cleanCaption} and somehow I’m still surprised.`,
    Sarcastic: `${prefix} ${cleanCaption}. What could possibly go wrong?`,
    'Dark humour': `${prefix} ${cleanCaption}. My optimism has left the building.`,
    'Gen-Z slang': `${prefix} ${cleanCaption} is giving side quest energy.`,
    Relatable: `${prefix} ${cleanCaption} — tell me I’m not the only one.`,
    Savage: `${prefix.toLowerCase()} ${cleanCaption}. That’s the whole review.`,
  };
  return variants[tone] ?? variants.Funny;
}

export function makeTags(text) {
  const tokens = cleanInput(text)
    .toLowerCase()
    .match(/[a-z0-9]+/g) ?? [];
  const tags = [...new Set(tokens.filter((word) => word.length > 2 && !STOP_WORDS.has(word)))];
  return tags.slice(0, 6);
}

const CATEGORY_WORDS = {
  Work: ['work', 'meeting', 'email', 'boss', 'deadline', 'office'],
  School: ['school', 'class', 'exam', 'study', 'homework', 'teacher'],
  Tech: ['code', 'bug', 'computer', 'phone', 'wifi', 'app'],
  Everyday: ['life', 'day', 'sleep', 'food', 'coffee', 'weekend'],
};

export function suggestMemes({ topic, mood = 'chaotic' }) {
  const words = cleanInput(topic).toLowerCase();
  const categories = Object.entries(CATEGORY_WORDS)
    .map(([category, terms]) => ({
      category,
      score: terms.reduce((total, term) => total + Number(words.includes(term)), 0),
    }))
    .sort((a, b) => b.score - a.score);
  const category = categories[0]?.score ? categories[0].category : 'Everyday';
  return {
    category,
    tags: makeTags(`${topic} ${category} ${mood}`),
    captions: generateCaptions({ topic, mood }).slice(0, 3),
  };
}

export function searchSimilarMemes(memes, query) {
  const queryWords = makeTags(query);
  if (!queryWords.length) return [];

  return memes
    .map((meme) => {
      const haystack = `${meme.title} ${meme.caption} ${(meme.tags ?? []).join(' ')}`.toLowerCase();
      const score = queryWords.reduce((sum, word) => sum + (haystack.includes(word) ? 1 : 0), 0);
      return { meme, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map(({ meme }) => meme);
}

