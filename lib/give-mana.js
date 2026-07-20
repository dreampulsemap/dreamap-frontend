import { supabaseAdmin, getAuthedUser, canViewGoal } from '@/lib/supabaseAdmin'

const DEFAULT_AMOUNT = 1
const MAX_AMOUNT_PER_ACTION = 5 // tek seferde verilebilecek üst sınır (spam koruması)

export default async function handler(req, res) {
  if (req.method === 'DELETE') {
    try {
      const user = await getAuthedUser(req)
      if (!user) return res.status(401).json({ error: 'unauthorized' })

      const { goalId } = req.body || {}
      if (!goalId) return res.status(400).json({ error: 'goalId_required' })

      const { error: deleteError } = await supabaseAdmin
        .from('goal_reactions')
        .delete()
        .eq('sender_id', user.id)
        .eq('goal_id', goalId)

      if (deleteError) throw deleteError

      // Not: geri alma işleminde lunos_points/mana_balance'ı simetrik olarak
      // geri iade ETMİYORUZ (kötüye kullanım riski: ver-geri al-ver döngüsüyle
      // sınırsız puan üretimi). believers_count trigger ile otomatik düşüyor.
      return res.status(200).json({ success: true })
    } catch (error) {
      console.error('goals/give-mana DELETE error:', error)
      return res.status(500).json({ error: error.message || 'internal_error' })
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { goalId, amount = DEFAULT_AMOUNT } = req.body || {}
    if (!goalId) return res.status(400).json({ error: 'goalId_required' })

    const cleanAmount = Math.min(Math.max(parseInt(amount, 10) || DEFAULT_AMOUNT, 1), MAX_AMOUNT_PER_ACTION)

    // Kendi hedefine mana veremezsin + hedefi görebilmen lazım (private/friends
    // ID'sini tahmin edip görünmeyen bir hedefe mana vermeni engelliyoruz)
    const { allowed, goal } = await canViewGoal(goalId, user.id)
    if (!goal) return res.status(404).json({ error: 'goal_not_found' })
    if (!allowed) return res.status(403).json({ error: 'not_visible' })
    if (goal.user_id === user.id) return res.status(400).json({ error: 'cannot_react_to_own_goal' })
    if (goal.status !== 'active') return res.status(400).json({ error: 'goal_not_active' })

    // Bakiye kontrolü — trigger bakiyeyi 0'da sınırlıyor (greatest(...,0)) ama
    // burada önceden reddetmezsek kullanıcı "mana verdim ama hiçbir şey olmadı"
    // hissi yaşar. Net bir hata dönmek daha doğru.
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('mana_balance')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) return res.status(404).json({ error: 'profile_not_found' })
    if (Number(profile.mana_balance || 0) < cleanAmount) {
      return res.status(402).json({ error: 'insufficient_mana', balance: profile.mana_balance })
    }

    const { data: reaction, error: insertError } = await supabaseAdmin
      .from('goal_reactions')
      .insert({ sender_id: user.id, goal_id: goalId, amount: cleanAmount })
      .select('*')
      .single()

    if (insertError) {
      if (insertError.code === '23505') {
        return res.status(400).json({ error: 'already_reacted' })
      }
      throw insertError
    }

    // Trigger (handle_goal_reaction) believers_count / mana_balance / lunos_points'i
    // zaten güncelledi — güncel bakiyeyi geri döndürmek için tekrar okuyoruz.
    const { data: updatedProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('mana_balance')
      .eq('id', user.id)
      .single()

    return res.status(200).json({
      reaction,
      manaBalance: updatedProfile?.mana_balance ?? null,
    })
  } catch (error) {
    console.error('goals/give-mana error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
