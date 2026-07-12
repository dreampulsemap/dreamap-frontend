export const SUPPORTED_LANGS = ['tr', 'en', 'es', 'fr', 'de', 'pt', 'ru', 'ja']

export function normalizeLang(lang) {
  if (!lang || typeof lang !== 'string') return 'en'
  const short = lang.toLowerCase().split('-')[0]
  return SUPPORTED_LANGS.includes(short) ? short : 'en'
}

export function pickLocalized(value, lang = 'en', fallback = 'en') {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    return value?.[lang] || value?.[fallback] || value?.en || value?.tr || ''
  }
  return ''
}

export function safeArray(value) {
  return Array.isArray(value) ? value : []
}

export const DREAM_UI_DICTIONARY = {
  tr: {
    home: 'Ana Sayfa',
    summary: 'Genel Yorum',
    persona: 'Persona Profili',
    archetypalStyle: 'Arketipsel Stil',
    publicSelf: 'Dışarıya Gösterilen Benlik',
    hiddenSelf: 'Gizli Benlik',
    strengths: 'Güçlü Yönler',
    shadowSides: 'Gölge Yönler',
    coreFears: 'Temel Korkular',
    emotionalNeeds: 'Duygusal İhtiyaçlar',
    shadow: 'Gölge Analizi',
    shadowFocus: 'Gölge Odağı',
    coreConflict: 'Temel Çatışma',
    symbols: 'Sembolik Okuma',
    transformation: 'Dönüşüm Yolu',
    questions: 'Düşündürmesi Gereken Sorular',
    fallbackSentiment: 'Confusion',
  },
  en: {
    home: 'Home',
    summary: 'General Reading',
    persona: 'Persona Profile',
    archetypalStyle: 'Archetypal Style',
    publicSelf: 'Public Self',
    hiddenSelf: 'Hidden Self',
    strengths: 'Strengths',
    shadowSides: 'Shadow Sides',
    coreFears: 'Core Fears',
    emotionalNeeds: 'Emotional Needs',
    shadow: 'Shadow Analysis',
    shadowFocus: 'Shadow Focus',
    coreConflict: 'Core Conflict',
    symbols: 'Symbolic Reading',
    transformation: 'Path of Transformation',
    questions: 'Reflection Questions',
    fallbackSentiment: 'Confusion',
  },
  es: {
    home: 'Inicio',
    summary: 'Lectura General',
    persona: 'Perfil de la Persona',
    archetypalStyle: 'Estilo Arquetípico',
    publicSelf: 'Yo Público',
    hiddenSelf: 'Yo Oculto',
    strengths: 'Fortalezas',
    shadowSides: 'Lados Sombríos',
    coreFears: 'Miedos Centrales',
    emotionalNeeds: 'Necesidades Emocionales',
    shadow: 'Análisis de la Sombra',
    shadowFocus: 'Foco de la Sombra',
    coreConflict: 'Conflicto Central',
    symbols: 'Lectura Simbólica',
    transformation: 'Camino de Transformación',
    questions: 'Preguntas de Reflexión',
    fallbackSentiment: 'Confusion',
  },
  fr: {
    home: 'Accueil',
    summary: 'Lecture Générale',
    persona: 'Profil de la Persona',
    archetypalStyle: 'Style Archétypal',
    publicSelf: 'Moi Public',
    hiddenSelf: 'Moi Caché',
    strengths: 'Forces',
    shadowSides: "Aspects d'Ombre",
    coreFears: 'Peurs Fondamentales',
    emotionalNeeds: 'Besoins Émotionnels',
    shadow: "Analyse de l'Ombre",
    shadowFocus: "Foyer de l'Ombre",
    coreConflict: 'Conflit Central',
    symbols: 'Lecture Symbolique',
    transformation: 'Chemin de Transformation',
    questions: 'Questions de Réflexion',
    fallbackSentiment: 'Confusion',
  },
  de: {
    home: 'Startseite',
    summary: 'Allgemeine Deutung',
    persona: 'Persona-Profil',
    archetypalStyle: 'Archetypischer Stil',
    publicSelf: 'Öffentliches Selbst',
    hiddenSelf: 'Verborgenes Selbst',
    strengths: 'Stärken',
    shadowSides: 'Schattenseiten',
    coreFears: 'Grundängste',
    emotionalNeeds: 'Emotionale Bedürfnisse',
    shadow: 'Schattenanalyse',
    shadowFocus: 'Schattenfokus',
    coreConflict: 'Zentraler Konflikt',
    symbols: 'Symbolische Lesung',
    transformation: 'Weg der Transformation',
    questions: 'Reflexionsfragen',
    fallbackSentiment: 'Confusion',
  },
  pt: {
    home: 'Início',
    summary: 'Leitura Geral',
    persona: 'Perfil da Persona',
    archetypalStyle: 'Estilo Arquetípico',
    publicSelf: 'Eu Público',
    hiddenSelf: 'Eu Oculto',
    strengths: 'Forças',
    shadowSides: 'Lados Sombrios',
    coreFears: 'Medos Centrais',
    emotionalNeeds: 'Necessidades Emocionais',
    shadow: 'Análise da Sombra',
    shadowFocus: 'Foco da Sombra',
    coreConflict: 'Conflito Central',
    symbols: 'Leitura Simbólica',
    transformation: 'Caminho de Transformação',
    questions: 'Perguntas de Reflexão',
    fallbackSentiment: 'Confusion',
  },
  ru: {
    home: 'Главная',
    summary: 'Общее Толкование',
    persona: 'Профиль Персоны',
    archetypalStyle: 'Архетипический Стиль',
    publicSelf: 'Публичное Я',
    hiddenSelf: 'Скрытое Я',
    strengths: 'Сильные Стороны',
    shadowSides: 'Теневые Стороны',
    coreFears: 'Базовые Страхи',
    emotionalNeeds: 'Эмоциональные Потребности',
    shadow: 'Анализ Тени',
    shadowFocus: 'Фокус Тени',
    coreConflict: 'Главный Конфликт',
    symbols: 'Символическое Чтение',
    transformation: 'Путь Трансформации',
    questions: 'Вопросы для Размышления',
    fallbackSentiment: 'Confusion',
  },
  ja: {
    home: 'ホーム',
    summary: '全体的な読解',
    persona: 'ペルソナ・プロフィール',
    archetypalStyle: '元型的スタイル',
    publicSelf: '外に見せる自己',
    hiddenSelf: '隠された自己',
    strengths: '強み',
    shadowSides: 'シャドウの側面',
    coreFears: '中核的な恐れ',
    emotionalNeeds: '感情的ニーズ',
    shadow: 'シャドウ分析',
    shadowFocus: 'シャドウの焦点',
    coreConflict: '中心的葛藤',
    symbols: '象徴的読解',
    transformation: '変容への道',
    questions: '内省のための問い',
    fallbackSentiment: 'Confusion',
  },
}

export function getDreamUiText(lang) {
  const normalized = normalizeLang(lang)
  return DREAM_UI_DICTIONARY[normalized] || DREAM_UI_DICTIONARY.en
}