/**
 * Sıralama Etkisi ile Çerçeveleme (Anchoring):
 * En gelişmiş/tamamlanmış kartı her zaman 0. indekse koyar.
 * Kullanıcı her girdiğinde "burada ilerleme kaydediyorum" hissini pekiştirir.
 */
export function applyAnchoringSort(goals = []) {
  if (!goals || goals.length === 0) return []

  const sorted = [...goals]
  let bestIndex = 0
  let maxProgress = -1

  for (let i = 0; i < sorted.length; i++) {
    const progress = sorted[i].completion_percentage || 0
    if (progress > maxProgress && sorted[i].status === 'active') {
      maxProgress = progress
      bestIndex = i
    }
  }

  if (bestIndex > 0 && maxProgress > 0) {
    const [anchoredCard] = sorted.splice(bestIndex, 1)
    sorted.unshift(anchoredCard)
  }

  return sorted
}
