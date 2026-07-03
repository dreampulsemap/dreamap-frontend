export default function handler(req, res) {
  res.status(200).json({ 
    message: "API çalışıyor!", 
    timestamp: new Date().toISOString() 
  });
}
