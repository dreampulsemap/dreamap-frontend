import { requireAdmin } from '@/lib/adminAuth'

// AdminAuthGate mount olduğunda cookie'nin hâlâ geçerli olup olmadığını
// kontrol etmek için çağırır.
export default function handler(req, res) {
  if (!requireAdmin(req, res)) return
  return res.status(200).json({ ok: true })
}
