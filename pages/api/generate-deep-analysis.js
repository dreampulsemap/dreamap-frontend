function buildShape() {
  return {
    title: '',
    summary: '',
    motiv: '',
    sentiment: '',
    archetypes: [],
    shadow_focus: '',
    core_conflict: '',
    individuation_path: '',
    symbolic_reading: '',
    reflection_questions: [
      "Deep penetrating psychological question 1",
      "Deep penetrating psychological question 2",
      "Deep penetrating psychological question 3"
    ], // <-- 3. JSON Şablonu AI için netleştirildi! Artık boş bırakmayacak.
    persona_profile: {
      name: '',
      tagline: '',
      archetypal_style: '',
      public_self: '',
      hidden_self: '',
      strengths: [],
      shadow_sides: [],
      core_fears: [],
      emotional_needs: [],
    },
    symbols: [
      {
        symbol: '',
        meaning: '',
        emotional_charge: '',
        intensity: 0,
        color: '',
      },
    ],
    emotions: [
      { emotion: '', score: 0 },
    ],
  }
}