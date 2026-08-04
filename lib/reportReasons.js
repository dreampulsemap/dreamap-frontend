// "Bildir" sheet'i için paylaşılan sebep listesi — VisionVideoPlayer ve
// SlidesViewer'daki üç nokta menüsü ortak kullanıyor, tek yerden
// yönetilsin diye. value alanı /api/goals/report.js'teki VALID_REASONS
// ile birebir eşleşmeli.
export const REPORT_REASONS = [
  { value: 'spam', tr: 'Spam', en: 'Spam' },
  { value: 'inappropriate', tr: 'Uygunsuz içerik', en: 'Inappropriate content' },
  { value: 'harassment', tr: 'Taciz veya zorbalık', en: 'Harassment or bullying' },
  { value: 'misinformation', tr: 'Yanlış bilgi', en: 'False information' },
  { value: 'hate_speech', tr: 'Nefret söylemi', en: 'Hate speech' },
  { value: 'other', tr: 'Diğer', en: 'Other' },
]
