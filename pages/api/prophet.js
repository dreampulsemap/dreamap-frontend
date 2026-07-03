export default function handler(req, res) {
  return res.status(200).json({ 
    success: true, 
    message: "Prophet API works!",
    time: new Date().toISOString()
  });
}
