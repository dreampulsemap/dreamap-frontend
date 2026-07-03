export default async function handler(req, res) {
  // Basit test yanıtı
  return res.status(200).json({ 
    success: true, 
    message: "Prophet API çalışıyor!",
    timestamp: new Date().toISOString(),
    test: true
  });
}
