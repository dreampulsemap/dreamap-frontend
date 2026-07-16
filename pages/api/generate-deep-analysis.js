// ... üstteki importlar aynı ...

// Model tanımlama kısmını şu şekilde güncelleyin:
const model = genAI.getGenerativeModel({ 
  model: "gemini-1.5-flash" 
});

// generateContent çağırma ve JSON alma kısmını şu şekilde güncelleyin:
const result = await model.generateContent(prompt);
const response = await result.response;
const text = response.text();
const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
const analysis = JSON.parse(cleanJson);

// ... geri kalan bakiye ve görsel işlemleri aynı ...