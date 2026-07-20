export const visionBoardTranslations = {
  en: {
    pageTitle: 'Vision Board',
    pageSubtitle: 'The goals your conscious mind is chasing.',
    createGoalBtn: 'New Vision',
    feedTab: 'Discover',
    myGoalsTab: 'My Goals',

    createModalTitle: 'Plant a New Vision',
    titleLabel: 'What do you want?',
    titlePlaceholder: 'e.g. Launch my own studio',
    descriptionLabel: 'Describe it (optional)',
    descriptionPlaceholder: 'Why does this matter to you?',
    targetDateLabel: 'Target date (optional)',
    visibilityLabel: 'Who can see this?',
    visibilityPublic: 'Everyone',
    visibilityFriends: 'Friends only',
    visibilityPrivate: 'Only me',
    roadmapLabel: 'Roadmap (optional)',
    roadmapPlaceholder: 'Add a step and press Enter',
    createSubmitBtn: 'Plant Vision',
    creating: 'Planting...',

    believers: 'believers',
    comments: 'comments',
    completion: 'Complete',
    giveMana: 'Give Mana',
    manaGiven: 'Mana Given',
    ownGoalBadge: 'Your Vision',
    insufficientMana: "You're out of Mana for today. It refills daily.",
    cannotReactOwn: "You can't send Mana to your own vision.",

    statusActive: 'In Progress',
    statusCompleted: 'Achieved',
    statusAbandoned: 'Released',

    roadmapSectionTitle: 'Roadmap',
    addStepPlaceholder: 'Add a new step...',
    noSteps: 'No roadmap steps yet.',

    markCompleteBtn: 'Mark as Achieved',
    releaseGoalBtn: 'Release this Goal',
    completeModalTitle: 'Celebrate this Victory 🎉',
    completeModalDesc: 'Tell your story — how did it feel to get here?',
    releaseModalTitle: 'It’s okay to let go 🕊️',
    releaseModalDesc: "No shame in releasing a goal that no longer fits. What did you learn?",
    storyPlaceholder: 'Share your story (optional)...',
    confirmBtn: 'Confirm',
    cancelBtn: 'Cancel',

    victoryWallTitle: 'The Victory Wall',
    phoenixWallTitle: 'The Phoenix Wall',

    emptyFeed: 'No visions here yet. Be the first to plant one.',
    emptyMyGoals: "You haven't planted a vision yet.",

    deleteGoalBtn: 'Delete',
    deleteConfirm: 'Delete this vision permanently?',

    loginRequired: 'Log in to give Mana or plant a vision.',
  },
  tr: {
    pageTitle: 'Vizyon Panosu',
    pageSubtitle: 'Bilinçli zihninin peşinden koştuğu hedefler.',
    createGoalBtn: 'Yeni Vizyon',
    feedTab: 'Keşfet',
    myGoalsTab: 'Hedeflerim',

    createModalTitle: 'Yeni Bir Vizyon Ek',
    titleLabel: 'Ne istiyorsun?',
    titlePlaceholder: 'ör. Kendi stüdyomu kurmak',
    descriptionLabel: 'Anlat (opsiyonel)',
    descriptionPlaceholder: 'Bu senin için neden önemli?',
    targetDateLabel: 'Hedef tarih (opsiyonel)',
    visibilityLabel: 'Kimler görebilsin?',
    visibilityPublic: 'Herkes',
    visibilityFriends: 'Sadece arkadaşlar',
    visibilityPrivate: 'Sadece ben',
    roadmapLabel: 'Yol Haritası (opsiyonel)',
    roadmapPlaceholder: 'Bir adım ekle ve Enter’a bas',
    createSubmitBtn: 'Vizyonu Ek',
    creating: 'Ekiliyor...',

    believers: 'inanan',
    comments: 'yorum',
    completion: 'Tamamlandı',
    giveMana: 'Mana Ver',
    manaGiven: 'Mana Verildi',
    ownGoalBadge: 'Senin Vizyonun',
    insufficientMana: 'Bugünlük Mana\'n bitti. Her gün yenilenir.',
    cannotReactOwn: 'Kendi vizyonuna Mana gönderemezsin.',

    statusActive: 'Devam Ediyor',
    statusCompleted: 'Gerçekleşti',
    statusAbandoned: 'Bırakıldı',

    roadmapSectionTitle: 'Yol Haritası',
    addStepPlaceholder: 'Yeni bir adım ekle...',
    noSteps: 'Henüz yol haritası adımı yok.',

    markCompleteBtn: 'Gerçekleşti Olarak İşaretle',
    releaseGoalBtn: 'Bu Hedeften Vazgeç',
    completeModalTitle: 'Bu Zaferi Kutla 🎉',
    completeModalDesc: 'Hikayeni anlat — buraya gelmek nasıl hissettirdi?',
    releaseModalTitle: 'Bırakmak da bir güçtür 🕊️',
    releaseModalDesc: 'Artık sana uymayan bir hedeften vazgeçmek utanılacak bir şey değil. Ne öğrendin?',
    storyPlaceholder: 'Hikayeni paylaş (opsiyonel)...',
    confirmBtn: 'Onayla',
    cancelBtn: 'Vazgeç',

    victoryWallTitle: 'Zafer Duvarı',
    phoenixWallTitle: 'Anka Duvarı',

    emptyFeed: 'Henüz bir vizyon yok. İlk eken sen ol.',
    emptyMyGoals: 'Henüz bir vizyon ekmedin.',

    deleteGoalBtn: 'Sil',
    deleteConfirm: 'Bu vizyon kalıcı olarak silinsin mi?',

    loginRequired: 'Mana vermek veya vizyon ekmek için giriş yap.',
  },
}

export function getVisionBoardText(lang = 'en') {
  const normalized = String(lang).toLowerCase().split('-')[0]
  return visionBoardTranslations[normalized] || visionBoardTranslations.en
}
