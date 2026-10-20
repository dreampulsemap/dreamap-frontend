// Extra depth for the English dream guides in dreamGuidesEn.js, keyed by slug.
// `faq`: long-tail questions drawn from each guide's keywords, for the page and
// FAQPage schema. `extra`: additional { h, p } / { h, ul } sections for guides
// whose body was thin. Same tone as the guides: psychological, hedged, never
// prophecy. Headings never repeat one already in that guide.

export const GUIDE_EXTRAS_EN = {
  'snake-dream-meaning': {
    faq: [
      { q: 'What does it mean when you dream about a black snake?', a: 'A black snake often points to something that feels hidden, unknown or heavy: a fear, a grief or an instinct you have not looked at closely yet. In Jungian terms black is the color of the unconscious and the shadow, so the snake may carry material that is only starting to surface. If it felt calm rather than threatening, you may be getting ready to face what it stands for.' },
      { q: 'What does it mean to kill a snake in a dream?', a: 'Killing a snake can reflect an effort to overcome a fear, end a draining situation or cut ties with someone you experience as toxic. It can also show a wish to shut down an instinct or feeling rather than understand it. Relief afterwards often points to a healthy boundary, while unease may hint that you are fighting a part of yourself.' },
      { q: 'Does it matter where the snake bites you in a dream?', a: 'Many people find the body part meaningful when they reflect on it. A bite on the hand can be linked to something you are doing or holding onto, on the leg or foot to your ability to move forward, and on the neck or face to how you speak or present yourself. These are prompts, not fixed rules; your own associations matter more.' },
      { q: 'Is it bad to dream about snakes?', a: 'Not in a psychological sense. Snake dreams are common and usually reflect change, tension or strong instinctive energy, not bad luck or a warning about the future. Even a frightening one can be useful, because it shows where something in you is asking for attention.' },
    ],
    extra: [
      { h: 'More scenarios', ul: ['A snake in your bed: instincts, intimacy or a worry that has come very close to your private life.', 'A white or pale snake: a transformation that feels gentler or more spiritual in tone.', 'A green snake: growth and new vitality, sometimes mixed with envy.', 'A snake coiled around you: feeling held tight by a situation, a relationship or your own habits.', 'A dead snake: an old threat or pattern that may have already lost its power.'] },
      { h: 'Why the snake is such a strong symbol', p: ['Snakes appear in myths, religions and medicine across many cultures, often as both danger and healer. Some researchers suggest humans are especially quick to notice snake-like shapes, which may help explain the charge this image carries even for people who rarely see one.', 'Jung was drawn to the ouroboros, a snake swallowing its own tail, which he read as an image of cycles, renewal and wholeness. In that light a snake dream can be one step in a longer process rather than a single event.'] },
    ],
  },

  'falling-dream-meaning': {
    faq: [
      { q: 'What does it mean to dream of falling off a cliff?', a: 'A cliff edge usually marks a point of no return: a decision, a risk or a change you fear will leave you without support. Falling from it can reflect anxiety that one wrong step will have big consequences. If you jumped rather than slipped, the dream may be more about a leap you have been considering.' },
      { q: 'Why do I keep dreaming about falling?', a: 'Recurring falling dreams often show up when stress is high or a situation in waking life still feels unstable. They tend to repeat until the underlying insecurity is noticed or eased. Writing down when they happen can reveal a pattern, for example before deadlines or after conflicts.' },
      { q: 'Why do I jerk awake when I dream of falling?', a: 'That sudden jolt is usually a hypnic jerk, an involuntary muscle twitch that happens as the body moves from wakefulness into sleep. The brain may weave a short falling image around the sensation. Hypnic jerks are common and generally harmless, and people often notice more of them after caffeine, stress or too little sleep.' },
      { q: 'Can you die if you hit the ground in a falling dream?', a: 'No, this is a popular myth. Many people dream of landing and simply wake up or keep dreaming. Hitting the ground can feel shocking, but symbolically it often means facing the outcome you were dreading and discovering that you survive it.' },
    ],
    extra: [
      { h: 'More scenarios', ul: ['Falling into water: dropping into deep feelings rather than hitting a hard reality.', 'Falling down stairs: a setback in a step-by-step process, like a career or a project.', 'Falling from your own bed or home: insecurity close to your private life.', 'Watching someone else fall: worry about that person, or about a quality they represent in you.', 'Falling while holding someone’s hand: shared risk, or fear of dragging someone down with you.', 'An elevator dropping: a sudden loss of status, progress or support you relied on.'] },
      { h: 'What science says', p: ['Falling is consistently among the most commonly reported themes in dream surveys across different countries, so having these dreams is very ordinary. The brief falling sensation many people feel just as they drift off usually belongs to the transition into sleep, while longer falling stories tend to be part of ordinary dreaming later in the night.'] },
    ],
  },

  'being-chased-dream-meaning': {
    faq: [
      { q: 'What does it mean to be chased by a monster in a dream?', a: 'A monster is often an exaggerated image of a fear, an emotion or a trait you find hard to accept. Because it is not a real person, it can stand for something abstract, like anxiety, guilt or anger, that has grown bigger in the dark. Asking what the monster looked like and what it seemed to want can make it feel less overwhelming.' },
      { q: 'Why can’t I run fast in my dreams?', a: 'The heavy, slow-motion feeling is one of the most familiar parts of chase dreams. One possible explanation is that during REM sleep most voluntary muscles are temporarily switched off, so the brain issues commands to run without the usual feedback from the body. Psychologically, the same image can mirror feeling stuck or powerless in a waking situation.' },
      { q: 'What does it mean to dream about being chased by a killer?', a: 'A dream killer usually represents something that feels threatening to your sense of self, such as a harsh inner critic, a draining situation or a change that seems to end an old identity. The intensity of the image reflects the strength of the emotion, not a real danger. It can help to ask what in your life feels as if it is taking something away from you.' },
      { q: 'Why do I keep having dreams about being chased?', a: 'Repeated chase dreams often mean the thing you are avoiding has not been addressed yet, so the mind keeps returning to it. Some researchers see threatening dreams as a kind of rehearsal for dealing with danger. If these dreams are frequent, make you afraid to fall asleep or weigh on your days, a sleep specialist or therapist can help.' },
    ],
    extra: [
      { h: 'More scenarios', ul: ['Chased by the police: guilt, fear of being caught out, or tension with rules and authority.', 'Chased by a crowd or zombies: feeling overwhelmed by many demands or by group pressure.', 'Chasing someone else: pursuing a goal, a person or a part of yourself that keeps slipping away.', 'Being caught: the confrontation you feared is happening, which is sometimes a relief.', 'Escaping by flying: finding a new perspective that lifts you above the problem.'] },
      { h: 'Facing the pursuer while awake', p: ['You do not have to wait for the next dream to turn around. Jung’s method of active imagination involves returning to a dream image while awake and letting a dialogue with it unfold, in your imagination or on paper.', 'A related approach, imagery rehearsal therapy, is used for recurring nightmares: you rewrite the ending of the dream while awake and mentally rehearse the new version for a few minutes each day.'] },
    ],
  },

  'teeth-falling-out-dream-meaning': {
    faq: [
      { q: 'What does it mean to dream about broken or chipped teeth?', a: 'A broken tooth often points to a crack in your confidence, or a fear that you said or did something that cannot be taken back. Because a chip is smaller than a lost tooth, it can reflect a minor embarrassment that feels bigger than it is. Think about whether a recent conversation left you feeling exposed.' },
      { q: 'Is dreaming of teeth falling out a sign of death?', a: 'Some folk traditions link tooth dreams to a death in the family, but there is no evidence that dreams predict such events. Psychologically, these dreams are far more often connected to stress, change, aging, or worries about appearance and communication. The feeling of the dream and what is happening in your life are better guides than any omen.' },
      { q: 'What does it mean to dream about pulling out your own tooth?', a: 'Pulling out a tooth yourself can suggest you are choosing to end something even though it hurts: a habit, a job or a relationship. It may also reflect a wish to get rid of a nagging problem quickly. If the dream felt like relief, it may point to a decision you already sense is right.' },
      { q: 'Why do I keep dreaming about my teeth falling out?', a: 'Recurring teeth dreams often come back during ongoing stress or when you feel judged. Some researchers have also explored whether physical sensations, such as clenching or grinding the teeth at night, may feed these dreams. If you often wake with a sore jaw, it is worth mentioning to a dentist.' },
    ],
    extra: [
      { h: 'More scenarios', ul: ['Loose teeth you keep touching: worry about something that feels unstable but has not changed yet.', 'Teeth falling out while you talk: fear of saying the wrong thing or not being taken seriously.', 'Spitting out a mouthful of teeth: feeling that too much is changing at once.', 'Rotten or decaying teeth: guilt, neglect or something in your life that needs care.', 'Front teeth falling out: concern about appearance and first impressions.', 'Someone else losing teeth: worry for that person, or noticing their vulnerability.'] },
      { h: 'Why these dreams are so universal', p: ['Teeth dreams are reported across many cultures and age groups, which suggests they draw on shared experiences: losing baby teeth, the social weight of a smile and the vulnerability of the mouth. Many dream researchers also point to continuity between dreams and waking life, the observation that dreams tend to carry the worries and emotions of the day into symbolic form.'] },
    ],
  },

  'water-dream-meaning': {
    faq: [
      { q: 'What does it mean to dream about dirty or murky water?', a: 'Murky water often reflects emotional confusion: feelings that are mixed, unclear or hard to see through. It can also point to a situation where you do not yet have the full picture. Rather than a bad sign, it is more an invitation to let things settle before you decide.' },
      { q: 'What does it mean to dream about a flood or rising water?', a: 'Rising water often mirrors feelings or pressures building faster than you can manage them, such as work stress, grief or tension in a relationship. Watching the water from a safe place can mean you are aware of the build-up, while being caught in it may suggest you already feel overwhelmed. It is a cue to find an outlet, not a forecast of disaster.' },
      { q: 'What does it mean when you dream of someone else drowning?', a: 'Dreaming that someone else is drowning often reflects worry about that person, or a sense that they are struggling emotionally. It can also represent a part of yourself that they symbolize and that feels submerged. Whether you tried to help, froze or watched from a distance can say a lot about your role in that relationship.' },
      { q: 'What does it mean to breathe underwater in a dream?', a: 'Breathing underwater usually suggests you are handling deep emotions better than you expected. In Jungian terms it can show a growing comfort with the unconscious: being able to stay with feelings instead of fleeing them. Many people describe these dreams as surprisingly peaceful.' },
    ],
    extra: [
      { h: 'More scenarios', ul: ['A leaking ceiling: emotions slowly seeping through defenses you thought were solid.', 'A swimming pool: feelings in a more controlled or social setting.', 'Rain: release, sadness or a sense of being cleansed.', 'A boat on rough water: trying to stay steady while events toss you around.', 'Frozen water or ice: feelings put on hold.', 'A waterfall: a strong rush of energy, change or release.'] },
      { h: 'Why water appears so often in dreams', p: ['Part of the answer is simple: the sleeping brain can weave bodily signals and sounds into dreams, so thirst, a full bladder or rain against the window may turn into dream water. Recent experiences, like a day at the beach, also tend to reappear.', 'Beyond that, water is one of the most natural images for feeling, because it moves, rises, calms and changes shape the way moods do.'] },
    ],
  },

  'flying-dream-meaning': {
    faq: [
      { q: 'Why can’t I fly high in my dreams?', a: 'Not being able to gain height often mirrors self-doubt, outside limits or a sense that something keeps pulling you back toward the ground. Power lines, ceilings or trees blocking the way can stand for concrete obstacles in a plan. It may also be worth asking whether part of you feels safer staying low.' },
      { q: 'Are flying dreams lucid dreams?', a: 'Not always. Many people fly in ordinary dreams without realizing they are dreaming. Flying is, however, one of the first things people try once they become lucid, and noticing an impossible ability like flight can sometimes trigger lucidity in the first place.' },
      { q: 'Is dreaming about flying a good sign?', a: 'Flying dreams are often joyful, but they are not signs or omens. Psychologically, a pleasant flight can reflect relief, confidence or creative freedom, while an anxious one may point to pressure around success. The emotion during the flight is the best clue.' },
      { q: 'What does it mean to dream of flying with someone?', a: 'Sharing a flight can reflect a relationship that feels uplifting, or a goal you are pursuing together. If you were carrying the other person, you may feel responsible for their well-being; if they were guiding you, they may represent support or a quality you admire.' },
    ],
    extra: [
      { h: 'More scenarios', ul: ['Hovering just above the ground: freedom that still feels cautious.', 'Flying over water: rising above emotions while staying close to them.', 'Flying over your hometown: seeing your roots from a new distance.', 'Flapping your arms to stay up: success that seems to require constant effort.', 'Unable to take off: a plan or desire that has not found its momentum yet.', 'Weaving between tall buildings: keeping your freedom while navigating other people’s expectations.', 'A rough landing: worry about coming back to reality after a high.'] },
      { h: 'Height, speed and landing', p: ['The details of a flying dream can be read like a map. Height often reflects how much distance you want from everyday worries, speed how urgently you want change, and steering how much you trust yourself in a new situation.', 'The landing matters too. A gentle touchdown can suggest bringing a new perspective into daily life, while never landing may hint at avoiding the ground for too long.'] },
    ],
  },

  'death-dream-meaning': {
    faq: [
      { q: 'Does dreaming about someone dying mean they will die?', a: 'No. Dreams do not predict deaths. Dreaming that someone dies usually reflects your attachment to them, a fear of losing them, or a change in your relationship such as distance, a move or a new stage in their life. Sometimes the person also symbolizes a quality in you that is fading or transforming.' },
      { q: 'What does it mean to dream about a parent dying?', a: 'This is a common and upsetting dream. It can reflect worries about a parent’s health or aging, but often it also mirrors your own growing independence: an old way of relating to them is ending. Many people have it during transitions like moving out, becoming a parent or taking on more responsibility.' },
      { q: 'What does it mean to dream of being killed?', a: 'Being killed in a dream often points to feeling overpowered, or to a part of your identity being forced to change. Notice who the attacker was, since they may represent a pressure, a relationship or an inner voice. As with other death dreams, it is about symbolic endings, not real danger.' },
      { q: 'Is it normal to dream about a loved one who has died?', a: 'Yes. Dreams of someone who has died are a very common part of grief and are often described as comforting, though they can also stir up pain. They may give space for unfinished words or a sense of continued connection. If they are frequent and distressing or disturb your sleep, a grief counselor or therapist can help.' },
    ],
    extra: [
      { h: 'More scenarios', ul: ['Watching yourself die from outside: observing a big change from a safe distance.', 'Dying and coming back to life: renewal after a hard period, or resilience you did not know you had.', 'A stranger dying: an unknown side of yourself, or an attitude you are outgrowing.', 'A pet dying: fear of loss, or the end of a more carefree phase.', 'Someone who has died coming back alive: longing, or an old issue returning for attention.'] },
      { h: 'When death dreams feel heavy', p: ['Death dreams can leave a strong emotional aftertaste, especially after a real loss or during an anxious period. It often helps to write the dream down, name the feeling it left you with and ask what in your life it might be connected to, instead of searching it for a hidden message. Treat it as a mirror of what you are going through, not a verdict on what will happen.'] },
    ],
  },

  'ex-dream-meaning': {
    faq: [
      { q: 'Why do I keep dreaming about my ex?', a: 'Recurring dreams about an ex often mean the relationship left something unresolved: a question, a hurt or a version of yourself you miss. They can return years later, especially during stress or major changes, because the mind reaches for familiar emotional templates. It does not necessarily mean you still want to be with them.' },
      { q: 'Does dreaming about your ex mean they are thinking about you?', a: 'There is no evidence that dreams reveal what another person is thinking. The ex in your dream is built from your own memories and feelings, so the dream says more about your inner world than about theirs. It can still be worth asking why they appeared now.' },
      { q: 'What does it mean to dream about your ex while in a relationship?', a: 'This is very common and is not a sign of disloyalty. It may reflect comparisons, a fear of repeating an old pattern, or a quality from the past relationship you would like more of now. Sometimes the ex simply stands for who you were before the current chapter began.' },
      { q: 'What does it mean to dream about kissing your ex?', a: 'A kiss often symbolizes reconnection or acceptance rather than literal desire. It may point to wanting back a feeling you had then, like passion, ease or being seen. If the kiss felt wrong, it may reflect a part of you making peace with the fact that the relationship is over.' },
    ],
    extra: [
      { h: 'More scenarios', ul: ['Your ex ignoring you: feeling unseen, or the relationship fading from your inner life.', 'Your ex apologizing: a wish for acknowledgment that may need to come from yourself.', 'Your ex cheating on you: old hurt or insecurity being stirred up.', 'Spending time with your ex’s family: missing a sense of belonging the relationship gave you.', 'Meeting your ex in an old place: returning to a period of your life, not only to the person.'] },
      { h: 'Why now?', p: ['Ex dreams often have an everyday trigger: a photo, a song, an anniversary, a new relationship reaching the stage where the old one went wrong, or simply a stressful week. Dream researchers describe a continuity between dreams and waking life, and ex dreams are a clear example of the mind picking up threads from the day.', 'Asking what happened in the days before the dream can quickly show what your ex is standing in for.'] },
    ],
  },

  'being-late-dream-meaning': {
    faq: [
      { q: 'What does it mean to dream about being late for work?', a: 'Being late for work in a dream often reflects pressure around performance, workload or how colleagues see you. It can also show a sense that you are not keeping up with expectations, including your own. If you felt oddly relaxed about it, part of you may be questioning how much the job really matters to you.' },
      { q: 'What does it mean to dream about missing the bus or train?', a: 'Public transport runs on a schedule you do not control, so missing it can mirror a fear of missing a window of opportunity or falling out of step with others. Watching it leave without you may reflect feeling left behind by friends or peers. Catching the next one is a reminder that many chances come around again.' },
      { q: 'Why do I dream about missing a flight before a real trip?', a: 'Dreams before travel often rehearse the exact worries you have about it: forgetting your passport, missing the gate or getting stuck in traffic. This kind of anticipatory anxiety is very common and usually says more about your mind preparing than about anything going wrong. Many people have similar dreams the night before an early alarm.' },
      { q: 'Why do I keep dreaming that I’m running late?', a: 'Recurring running-late dreams are typical of busy or overloaded periods. They may also point to a long-standing habit of measuring yourself by how much you get done. Noticing when they appear can show you where you are stretched too thin.' },
    ],
    extra: [
      { h: 'More scenarios', ul: ['Late for your own wedding: mixed feelings about a commitment or a big life step.', 'Endless packing before leaving: being held back by too many responsibilities or attachments.', 'Stuck in traffic: outside obstacles slowing down a plan.', 'Going to the wrong gate or platform: worry that you have chosen the wrong direction.', 'Someone else making you late: frustration with a person who seems to hold you back.', 'Oversleeping inside the dream: fear of missing something because you were not alert enough.'] },
      { h: 'Why time feels so strange in these dreams', p: ['Clocks, numbers and schedules often behave oddly in dreams: the time jumps, the display changes when you look again, or a short walk takes forever. Many lucid dreamers use checking a clock as a reality check for exactly this reason.', 'Psychologically, that slippery sense of time can mirror waking stress, when the day seems to run out faster than you can plan it.'] },
    ],
  },

  'exam-dream-meaning': {
    faq: [
      { q: 'What does it mean to dream about failing a test?', a: 'Failing a test in a dream usually reflects fear of not measuring up, often in an area that has nothing to do with school, like a new job, a relationship or a personal goal. It can also reveal a harsh inner critic. A failed dream exam rarely matches your real abilities; it shows how tested you feel.' },
      { q: 'Why do I still dream about school and exams years later?', a: 'School is often our first experience of being formally judged, so the mind tends to reuse it whenever we feel evaluated as adults. A performance review, a public talk or a family conflict can bring back the old classroom. The scene is borrowed from the past, but the pressure usually belongs to the present.' },
      { q: 'What does it mean to dream about an exam for a class you never attended?', a: 'This very common dream often reflects a feeling that you have taken on something you are not prepared for, or that you missed information others seem to have. It can also point to a responsibility you have been postponing. Asking which “class” you have been skipping in waking life can be revealing.' },
      { q: 'What does it mean to dream about cheating on an exam?', a: 'Cheating in a dream can point to impostor feelings, the worry that you got where you are without deserving it. It may also show a wish for a shortcut in a situation that feels too demanding. If you felt guilty in the dream, look at where you might be holding yourself to an impossibly high standard.' },
    ],
    extra: [
      { h: 'More scenarios', ul: ['Running out of time: pressure to deliver more than your schedule allows.', 'A pen that won’t write: struggling to show what you actually know or feel.', 'Questions in a language you can’t read: a situation whose rules seem unclear.', 'Retaking an exam you already passed: old self-doubt resurfacing under new pressure.', 'A teacher watching over you: an inner or outer authority whose approval matters to you.', 'Taking the exam at your workplace: work responsibilities feeling like a constant test.'] },
      { h: 'What science says', p: ['Dream researchers often describe a continuity between dreams and waking life: the worries of the day, such as deadlines and evaluations, tend to return at night in symbolic form. One influential idea, the threat simulation theory, suggests that dreams may let us rehearse stressful situations in a safe setting.', 'Seen this way, an exam dream may be less a failure than a dress rehearsal, giving the mind a chance to practice handling pressure.'] },
    ],
  },

  'house-dream-meaning': {
    faq: [
      { q: 'What does it mean to dream about your childhood home?', a: 'Returning to a childhood home often points to old patterns, memories or needs that are active again, for example in how you handle conflict or look for comfort. It tends to appear during transitions, when you instinctively look back to where you came from. Whether the house felt warm or eerie shows how you relate to that part of your past.' },
      { q: 'What does it mean to find a hidden room in a dream?', a: 'Discovering an unknown room is one of the more hopeful house dreams. It often suggests untapped potential, a new interest or a forgotten part of yourself that is ready to be explored. A dusty, neglected room may point to a talent or feeling you set aside long ago.' },
      { q: 'What does it mean to dream about a house you don’t recognize?', a: 'An unfamiliar house may represent a new version of yourself, a life stage you have not settled into yet, or a situation you are still learning to navigate. If you felt at home there, you may be adjusting well; if you felt lost, the change may still feel uncomfortable.' },
      { q: 'What does it mean to dream about someone breaking into your house?', a: 'A break-in often reflects a feeling that your boundaries, privacy or sense of safety are being violated. The intruder can be a person, a demand or an emotion pushing into your life uninvited. It may help to ask where you need firmer limits right now.' },
    ],
    extra: [
      { h: 'Rooms and what they can stand for', ul: ['Kitchen: nourishment, care and how you feed yourself emotionally.', 'Bedroom: intimacy, rest and the most private parts of your life.', 'Bathroom: release and cleansing, and privacy, especially if the door won’t lock.', 'Attic: memories, ideas and thoughts stored “up in your head”.', 'Living room: your social self and how you let others in.', 'Hallways and corridors: transition, waiting or searching for the right door.'] },
      { h: 'More scenarios', ul: ['A house with endless rooms: more possibilities in your life than you have explored.', 'A messy or dirty house: feeling overwhelmed, or neglecting your own needs.', 'Renovating a house: actively working on yourself or rebuilding after a change.', 'An abandoned house: a part of your life you have left behind or stopped tending.', 'A flooded house: emotions spilling into areas you thought were safe.'] },
    ],
  },

  'wedding-dream-meaning': {
    faq: [
      { q: 'What does it mean to dream about a wedding dress?', a: 'A wedding dress often stands for how you want to present yourself at the start of a new chapter. Trying it on may reflect testing out a commitment or a new role, while a dress that does not fit can point to doubts about whether that role suits you. A stained or torn dress may mirror worry that something will spoil an important moment.' },
      { q: 'What does it mean to dream about someone else’s wedding?', a: 'Attending another person’s wedding may reflect changes in your relationship with them, or your feelings about their new chapter, whether happiness, envy or fear of being left behind. It can also be about a union happening within you, symbolized through them.' },
      { q: 'Why do I dream about my wedding going wrong?', a: 'If you are planning a real wedding, stressful wedding dreams are very common and usually reflect the pressure of planning and the wish for everything to go well, not doubts about your partner. Outside of real plans, the dream can mirror worry that a commitment or project will not unfold as you hope.' },
      { q: 'What does it mean to dream about marrying someone else when you’re already married?', a: 'This dream rarely means you want to leave your partner. The other person often represents a quality you are drawn to or want to develop, such as playfulness, ambition or calm. It may also reflect a new commitment, like a job or creative project, that is taking up a lot of your emotional space.' },
    ],
    extra: [
      { h: 'More scenarios', ul: ['Your partner never shows up at the altar: fear of being let down, or of investing more than you receive.', 'Losing the ring: worry about losing something that holds a promise or meaning.', 'A wedding with no guests: a commitment that feels private, or a wish for more support.', 'Not being invited to a wedding: feeling excluded from a group or a change around you.', 'Marrying a friend or coworker: valuing a quality they have, rather than romantic interest.'] },
      { h: 'A threshold moment', p: ['Anthropologists describe weddings as rites of passage: rituals that mark the crossing from one stage of life into another. In dreams the same structure can appear whenever you stand at a threshold, such as a move, a new job or a decision you cannot undo.', 'That is why a wedding dream can feel significant even when marriage is the last thing on your mind. The useful question is less “Who am I marrying?” and more “What am I stepping into?”'] },
    ],
  },

  'money-dream-meaning': {
    faq: [
      { q: 'Does dreaming about money mean you will get rich?', a: 'No. Dreams do not forecast income or windfalls. Money in a dream usually reflects how you see your own worth, how secure you feel, or how energy and effort are flowing in your life. A dream full of cash may simply mirror a wish for more ease or recognition.' },
      { q: 'What does it mean to dream about winning the lottery?', a: 'A lottery win often reflects a wish for sudden relief, freedom or rescue from a draining situation. It can also show a hope that luck will solve something that may actually need a plan. If the win felt stressful, it may point to fear of change, even good change.' },
      { q: 'What does it mean to dream of someone giving you money?', a: 'Receiving money often symbolizes support, recognition or something of value being offered to you, such as time, love or advice. Who gives it matters: a parent may reflect care or dependence, a stranger an unexpected resource. If accepting it felt uncomfortable, you may find it hard to receive help.' },
      { q: 'What does it mean to dream about your money being stolen?', a: 'Stolen money can point to a sense that something valuable is being taken from you without permission: your time, energy, ideas or credit for your work. It may also reflect real financial worries. Noticing who the thief was can help identify where you feel drained.' },
    ],
    extra: [
      { h: 'More scenarios', ul: ['Coins rather than bills: small gains, or feeling that your efforts are undervalued.', 'Money falling from the sky: hope for an easy solution, or abundance you have not noticed.', 'Owing money: guilt, obligation or a feeling of not giving enough back.', 'Not having enough to pay: fear of falling short in a role or a relationship.', 'Burning money: wasted energy, or a wish to break free from material pressure.', 'Finding a lost wallet: rediscovering a part of your identity or self-worth.'] },
      { h: 'When the worry is real', p: ['Not every money dream needs a symbolic reading. If you are under real financial stress, it is natural for bills, prices and bank balances to appear at night, since dreams tend to pick up the concerns of the day. In that case the dream mainly shows how much the issue weighs on you, and practical steps during the day may ease the nights too.'] },
    ],
  },

  'pregnancy-dream-meaning': {
    faq: [
      { q: 'Does dreaming of being pregnant mean you are pregnant?', a: 'No. A dream cannot tell you whether you are pregnant; only a test or a health professional can. Pregnancy dreams often reflect hopes, fears or creative projects, and they also occur in people who are not trying to conceive. If you are genuinely wondering, the waking-life question is the one that deserves attention.' },
      { q: 'What does it mean when a man dreams of being pregnant?', a: 'For men, a pregnancy dream usually has the same symbolic core: something new is developing and asking for care. It might be a business idea, a creative project or a softer, more nurturing side of the personality. In Jungian terms it can also be linked to the anima, the inner feminine side.' },
      { q: 'What does it mean to dream about being pregnant with twins?', a: 'Twins can point to two projects or possibilities growing at once, or to a choice between two directions. They may also reflect a feeling that a new responsibility is twice as big as expected. Whether the twins felt like a gift or a burden is the key to the meaning.' },
      { q: 'What does it mean to dream of giving birth to something strange?', a: 'Dreams of giving birth to an animal, an object or an unfamiliar creature are more common than people think, especially during real pregnancies. They often express anxiety about the unknown, or a sense that what you are creating is still taking shape. They are not predictions about a real baby.' },
    ],
    extra: [
      { h: 'More scenarios', ul: ['Finding out you are pregnant: noticing an idea or desire that was already growing in you.', 'Hiding a pregnancy: keeping a plan or feeling to yourself until you feel ready.', 'Being pregnant for a very long time: a project that seems stuck before its “birth”.', 'Taking a pregnancy test: waiting for clarity on a decision or a new direction.', 'Pregnant by an ex: an old relationship still shaping something new in your life.', 'Losing a pregnancy in a dream: fear that a plan will not work out; during real pregnancies this is a common worry dream and does not predict anything.'] },
      { h: 'Dreams during an actual pregnancy', p: ['Many people report more vivid and more memorable dreams while pregnant. Hormonal changes, physical discomfort and waking more often at night, which makes dreams easier to remember, are likely part of the reason. Anxious dreams about the baby are common and usually reflect the protective worry that comes with preparing for a new life.', 'If dreams are disturbing your rest, it is worth mentioning them to your midwife or doctor.'] },
    ],
  },

  'lost-phone-dream-meaning': {
    faq: [
      { q: 'Why can’t I dial a number in my dream?', a: 'Precise tasks like reading, typing or dialing are often hard in dreams: numbers shift, buttons blur and the call never connects. Some lucid dreamers even use this as a clue that they are dreaming. Psychologically, the struggle can mirror a waking feeling of not getting through to someone or not being able to ask for what you need.' },
      { q: 'What does it mean to dream that your phone was stolen?', a: 'A stolen phone can reflect a sense that your privacy, time or attention is being taken by someone else. It may also point to worry about your reputation, since phones hold so much of our personal life. Think about whether anyone has recently crossed a boundary with you.' },
      { q: 'What does it mean to dream of dropping your phone in water?', a: 'Water often stands for emotion, so a phone sinking into it can suggest that feelings are getting in the way of clear communication. It may also reflect a wish to disconnect and let a strong emotion take priority over always being reachable.' },
      { q: 'What does it mean to dream of a call from someone you no longer talk to?', a: 'An unexpected call from an old friend, an ex or a relative may point to unfinished feelings, or to a quality of theirs you are missing now. It does not mean they are trying to reach you; the call comes from your own memories. The tone of the conversation hints at what still needs closure.' },
    ],
    extra: [
      { h: 'More scenarios', ul: ['Battery dying: running low on energy, or fearing you will be cut off at the worst moment.', 'Forgetting your passcode: being locked out of a part of your own life or identity.', 'Someone reading your messages: fear that private thoughts or secrets will be exposed.', 'Sending a message to the wrong person: worry about a misunderstanding or saying too much.', 'Finding your phone again: reconnecting with people or regaining a sense of control.'] },
      { h: 'Phones, sleep and the modern mind', p: ['Because phones fill so much of the day, it is not surprising that they turn up in dreams, often in the role keys and wallets used to play: small objects that hold access and identity. Researchers even use the informal term “nomophobia” for the anxiety some people feel when separated from their phone.', 'Scrolling late at night can also push back sleep and keep the mind busy with the same messages and worries, which may then resurface in dreams. A screen-free half hour before bed is a simple experiment worth trying.'] },
    ],
  },

  'naked-in-public-dream-meaning': {
    faq: [
      { q: 'What does it mean to dream about being naked at school or work?', a: 'Nakedness in a familiar setting like school or the office often reflects fear of being found out as unprepared or not good enough in that specific role. It can show up when you start a new job, take on a visible project or receive feedback. The setting tells you where you feel most exposed.' },
      { q: 'What does it mean to dream about being in your underwear in public?', a: 'Being partly dressed suggests you feel somewhat exposed but not completely: a small mistake was seen, or you shared more than you meant to. It can also reflect being caught between your private self and your public image.' },
      { q: 'What does it mean to dream about someone else being naked?', a: 'Seeing another person naked can mean you are seeing them more clearly, beyond their usual image, or that you sense their vulnerability. It is not necessarily sexual. Your reaction, whether embarrassment, compassion or indifference, says something about how you handle openness in others.' },
      { q: 'Is a dream about being naked a sexual dream?', a: 'Usually not. Most nudity dreams are about vulnerability, shame or authenticity rather than desire, which is why they tend to feel awkward rather than erotic. Freud did link them to childhood and sexuality, but many modern readings focus on exposure and self-image.' },
    ],
    extra: [
      { h: 'More scenarios', ul: ['Trying desperately to cover yourself: protecting a vulnerable spot you do not want others to see.', 'Naked at a party or wedding: feeling out of place in a social role or celebration.', 'People laughing at you: fear of ridicule, or a harsh inner critic.', 'Naked in nature or on a beach: freedom, simplicity and comfort with your body.', 'Naked in front of a partner who looks away: worry about being fully accepted as you are.', 'Someone taking your clothes: feeling that another person has stripped you of protection or dignity.'] },
      { h: 'Who is watching matters', p: ['The audience in a nudity dream is a useful clue. A crowd of strangers often points to general social anxiety, colleagues to concerns about competence, and family to older expectations about who you should be.', 'When no one is watching at all, the dream may be less about shame and more about meeting yourself without the usual layers.'] },
    ],
  },

  'lucid-dreaming-guide': {
    faq: [
      { q: 'Is lucid dreaming dangerous?', a: 'For most people lucid dreaming is considered safe, and many find it enjoyable or even helpful. The main risk is losing sleep, especially with techniques that involve waking during the night. Some people notice more false awakenings or episodes of sleep paralysis while practicing; if you have a sleep disorder or a mental health condition, talk to a professional first.' },
      { q: 'How long does it take to learn lucid dreaming?', a: 'There is no fixed timeline. Some people have a first lucid dream within a few weeks of practice, others need months, and a few have them naturally. Consistency with a dream journal and reality checks tends to matter more than any single technique.' },
      { q: 'Which reality check works best?', a: 'Popular checks include reading a line of text twice, looking at a clock, counting your fingers, or pinching your nose and trying to breathe through it. Text and numbers often change in dreams, and impossible things like breathing through a pinched nose may work there. The most effective check is the one you do often and with genuine curiosity.' },
      { q: 'How do I stay in a lucid dream without waking up?', a: 'Excitement is a common reason lucid dreams end quickly. Many practitioners suggest staying calm, focusing on a physical sensation in the dream such as rubbing your hands together, or looking closely at the ground or an object to stabilize the scene. With practice, lucid moments tend to last longer.' },
    ],
    extra: [
      { h: 'What science says', p: ['Lucid dreaming has been confirmed in sleep laboratories: trained dreamers agreed on a pattern of eye movements in advance and signaled it from inside a dream while their recordings showed REM sleep. Since then, researchers have studied lucid dreaming as a window into consciousness and as a possible tool for working with recurring nightmares.'] },
      { h: 'Common obstacles', ul: ['Low dream recall: without remembering dreams, lucidity is hard to notice, so the journal comes first.', 'Reality checks on autopilot: a check done without truly questioning your state rarely carries over into dreams.', 'Losing lucidity: you realize you are dreaming, then slip back into the plot and forget.', 'False awakenings: dreaming that you woke up, which is a good moment for another reality check.', 'Sleep paralysis during wake back to bed: it can be unsettling, but it is generally harmless and passes on its own.'] },
      { h: 'Questions to ask yourself', ul: ['What do I want from lucid dreaming: curiosity, creativity, or meeting a recurring dream with awareness?', 'How many dreams do I remember in a typical week?', 'Am I getting enough sleep to practice without feeling drained?'] },
    ],
  },
}
