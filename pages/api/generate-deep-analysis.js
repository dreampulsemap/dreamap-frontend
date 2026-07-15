// ... (Dosyanın Üst Kısımları Aynı) ...

    // =========================================================================
    // HEDİYE KOZMİK RÜYA GÖRSELİ ÜRETİMİ (Flux Schnell Entegrasyonu)
    // =========================================================================
    let imageUrl = null
    let imagePrompt = null

    try {
      const topArchetype = analysis.archetypes?.[0] || 'Dreamer'
      const topSymbol = analysis.symbols?.[0]?.symbol || 'mystical elements'
      const shortContent = String(dream.content || '').replace(/\s+/g, ' ').trim().slice(0, 240)
      
      imagePrompt = `A breathtaking, ethereal dreamscape representing the ${topArchetype} archetype, with moody and atmospheric lighting, featuring ${topSymbol}, mystical surrealism style, dark cosmic tarot card aesthetic, deep indigo, fuchsia, and glowing gold accents, oil painting texture mixed with modern digital double-exposure, evocative of ${analysis.sentiment || 'mystery'}, high-art composition, hauntingly beautiful, cinematic, octane render, masterpiece, extremely detailed, inspired by Carl Jung's subconscious visual representations, based on: ${shortContent}`

      const replicateRes = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`, // <-- BURASI Bearer OLARAK DÜZELTİLDİ
          'Content-Type': 'application/json',
          'Prefer': 'wait=15'
        },
        body: JSON.stringify({
          input: {
            prompt: imagePrompt,
            aspect_ratio: "1:1",
            output_format: "webp",
            output_quality: 90,
            num_inference_steps: 4
          }
        })
      })

      const replicateData = await replicateRes.json().catch(() => null)

      if (replicateRes.ok && replicateData?.output?.[0]) {
        imageUrl = replicateData.output[0]
      } else {
        console.error('Replicate image generation failed:', replicateData || replicateRes.status)
      }
    } catch (imageError) {
      console.error('Replicate image generation error:', imageError)
    }

// ... (Dosyanın Alt Kısımları Aynı) ...