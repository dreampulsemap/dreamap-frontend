with open('input_file_1.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Let's perform the prompt modification
old_prompt_func = """function buildTeaserPrompt(params) {
  const content = params && params.content ? params.content : ''
  const lang = params && params.lang ? params.lang : 'en'

  return `
Analyze the following dream in a concise, emotionally resonant, curiosity-inducing way. Stay grounded and committed only to the exact dream text.

Return only valid JSON.
Do not wrap the answer in markdown.
Do not include any explanation outside JSON.

This is a short free dream analysis shown on a card preview.
It should feel psychologically meaningful, poetic, and slightly mysterious.
It should gently make the user want a deeper premium analysis.

Rules:
- summary must be at least 3 sentences
- keep it concise and beautiful
- avoid sounding clinical, generic, or repetitive
- suggest that there is a deeper unresolved pattern
- do not give the full answer away
- motiv must be one short poetic sentence
- archetypes should contain 1 to 3 items max, always written in English (e.g. "The Shadow", "The Wanderer")
- sentiment should be a short lowercase word like: hopeful, anxious, mysterious, tender, restless, heavy, luminous

Primary output language: ${lang}
This product ships in 8 languages. You MUST fill in "title", "summary" and "motiv"
for EVERY one of these language keys, with no blanks and no literal machine
translation, just natural idiomatic writing in each language: ${SUPPORTED_LANGS.join(', ')}.

Dream:
"""
${content}
"""

JSON shape (keep exactly these keys):
${JSON.stringify(
  {
    title: emptyLangMap(),
    summary: emptyLangMap(),
    motiv: emptyLangMap(),
    sentiment: '',
    archetypes: [],
  },
  null,
  2
)}
`
}"""

new_prompt_func = """function buildTeaserPrompt(params) {
  const content = params && params.content ? params.content : ''
  const lang = params && params.lang ? params.lang : 'en'

  return `
Analyze the following dream from a profound Jungian perspective. 

This is a free preview analysis, but it must provide a genuine, high-quality, and deeply resonant psychological insight (about 10-15% of a full reading). It must never feel like cheap marketing or empty clickbait. Instead, it should offer a real, substantive key to the dreamer's unconscious—revealing an authentic psychic dynamic (such as an archetypal tension, a shadow reflection, or an anima/animus movement) that triggers immediate psychological curiosity and intellectual excitement (dopamine).

Deliver an emotionally intelligent, intellectually rich, and poetic interpretation that leaves the dreamer with a profound realization, while naturally revealing that this is just the outer threshold of a much deeper, unresolved psychic pattern waiting to be explored in full.

Return only valid JSON.
Do not wrap the answer in markdown.
Do not include any explanation outside JSON.

Rules:
- summary must be at least 3-4 sentences of high-density Jungian insight. Provide genuine substance, identifying an actual unconscious tension or archetype.
- keep it beautiful, evocative, and psychologically substantive (avoid sounding clinical or generic).
- focus on triggering intellectual excitement and emotional resonance (curiosity-inducing).
- suggest that this threshold leads into a deeper, highly personal psychic territory that can be fully mapped in a premium analysis.
- motiv must be one short poetic, striking sentence.
- archetypes should contain 1 to 3 items max, always written in English (e.g. "The Shadow", "The Wanderer").
- sentiment should be a short lowercase word like: hopeful, anxious, mysterious, tender, restless, heavy, luminous.

Primary output language: ${lang}
This product ships in 8 languages. You MUST fill in "title", "summary" and "motiv"
for EVERY one of these language keys, with no blanks and no literal machine
translation, just natural idiomatic writing in each language: ${SUPPORTED_LANGS.join(', ')}.

Dream:
"""
${content}
"""

JSON shape (keep exactly these keys):
${JSON.stringify(
  {
    title: emptyLangMap(),
    summary: emptyLangMap(),
    motiv: emptyLangMap(),
    sentiment: '',
    archetypes: [],
  },
  null,
  2
)}
`
}"""

code = code.replace(old_prompt_func, new_prompt_func)

# Also update the system content inside generateWithOpenAI:
old_system_message = "'You are an expert dream interpretation assistant. Write short, emotionally intelligent, intriguing teaser analyses that make the user curious for a deeper reading. Always return valid JSON only, with every requested language key filled in.'"
new_system_message = "'You are an expert Jungian dream analyst. Write short, emotionally resonant, and psychologically rich analyses that offer genuine, high-quality insights while naturally inviting the dreamer to explore the deeper layers of their unconscious. Always return valid JSON only, with every requested language key filled in.'"

code = code.replace(old_system_message, new_system_message)

with open('input_file_1.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Updated prompt and system message successfully!")
