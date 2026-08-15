import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

// GUVENLIK DUZELTMESI: bu route daha once body'deki userId'ye guveniyordu -
// Authorization header hic kontrol edilmiyordu, yani HERKES
// baska bir kullanicinin ozel (private) ruyalarini bu userId'yi vererek okuyabiliyordu.
// Artik kimlik Bearer token'dan dogrulaniyor ve sadece kendi ruyalarin donuyor.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const user = await getAuthedUser(req)
  if (!user) return res.status(401).json({ error: 'unauthorized' })

  try {
    const { data, error } = await supabaseAdmin
      .from('dreams')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({ success: true, dreams: data || [] })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
