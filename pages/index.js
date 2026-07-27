import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { useTranslation } from 'react-i18next'
import { getTranslation } from '@/lib/translations'
import { getDreamCardText } from '@/lib/dreamCardTranslations'
import { getVisionBoardText } from '@/lib/visionBoardTranslations'
import Hero from '@/components/Hero'
import Navbar from '@/components/Navbar'
import DreamCard from '@/components/DreamCard'
import GoalCard from '@/components/GoalCard'
import GoalDetailModal from '@/components/GoalDetailModal'
import CreateGoalModal from '@/components/CreateGoalModal'
import TextSkeleton from '@/components/TextSkeleton'

const BATCH_SIZE = 12
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

class FriendshipCache {
  constructor() {
    this.data = null
    this.timestamp = 0
  }

  isValid() {
    return Date.now() - this.timestamp < CACHE_DURATION
  }

  set(data) {
    this.data = data
    this.timestamp = Date.now()
  }

  get() {
    return this.isValid() ? this.data : null
  }

  clear() {
    this.data = null
    this.timestamp = 0
  }
}

const friendshipCache = new FriendshipCache()

export default function HomePage() {
  const { i18n } = useTranslation()
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState(null)
  const [dreams, setDreams] = useState([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [homeTab, setHomeTab] = useState('vision')
  const [goals, setGoals] = useState([])
  const [goalsLoading, setGoalsLoading] = useState(true)
  const [goalsLoaded, setGoalsLoaded] = useState(false)
  const [activeGoal, setActiveGoal] = useState(null)
  const [showCreateGoal, setShowCreateGoal] = useState(false)

  const observerRef = useRef(null)

  useEffect(() => {
    setMounted(true)
    try {
      const savedTab = window.sessionStorage.getItem('dreamap_home_tab')
      if (savedTab === 'vision' || savedTab === 'dreams') {
        setHomeTab(savedTab)
      }
    } catch (_) {}
  }, [])

  useEffect(() => {
    if (!mounted) return
    try {
      window.sessionStorage.setItem('dreamap_home_tab', homeTab)
    } catch (_) {}
  }, [homeTab, mounted])

  const currentLang = mounted ? (i18n.language || 'en').split('-')[0] : 'en'
  const lang = currentLang
  const tVision = getVisionBoardText(lang)
  const tCard = getDreamCardText(lang)

  // Cached friend resolution - single query with caching
  const loadFriendIds = useCallback(async (userId) => {
    const cached = friendshipCache.get()
    if (cached) return cached

    try {
      const { data: friendships, error } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .eq('status', 'accepted')
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`)

      if (error) throw error

      const friendIds = friendships
        ? friendships.map(f => f.user_id === userId ? f.friend_id : f.user_id)
        : []

      const allowedIds = [userId, ...friendIds]
      friendshipCache.set(allowedIds)
      return allowedIds
    } catch (err) {
      console.error('loadFriendIds error:', err)
      return [userId]
    }
  }, [])

  const loadGoals = useCallback(async (currentUser) => {
    setGoalsLoading(true)
    try {
      if (currentUser?.id) {
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch('/api/goals/list?mode=friends', {
          headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
        })
        const json = await res.json()
        if (res.ok) setGoals(json.goals || [])
      } else {
        const res = await fetch('/api/goals/list?mode=feed')
        const json = await res.json()
        if (res.ok) setGoals(json.goals || [])
      }
    } catch (err) {
      console.error('Goals load error:', err)
    } finally {
      setGoalsLoading(false)
      setGoalsLoaded(true)
    }
  }, [])

  // Check user and load goals in single effect
  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
      loadGoals(session?.user || null)
    }
    checkUser()
  }, [loadGoals])

  // Optimized feed loading with cached friendships
  const loadFeedData = useCallback(async (pageNum = 0, append = false) => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      const from = pageNum * BATCH_SIZE
      const to = from + BATCH_SIZE - 1

      let query = supabase.from('dreams').select(
        'id,user_id,content,title,created_at,likes_count,in_feed,visibility,ai_archetypes,ai_sentiment'
      ).eq('in_feed', true)

      if (currentUser?.id) {
        const allowedUserIds = await loadFriendIds(currentUser.id)
        query = query.in('user_id', allowedUserIds)
      }

      const { data: dreamsData, error: dreamsError } = await query
        .order('created_at', { ascending: false })
        .range(from, to)

      if (dreamsError) throw dreamsError

      const fetched = Array.isArray(dreamsData) ? dreamsData : []
      if (append) {
        setDreams((prev) => [...prev, ...fetched])
      } else {
        setDreams(fetched)
      }

      setPage(pageNum)
      setHasMore(fetched.length >= BATCH_SIZE)
    } catch (err) {
      console.error('Feed load error:', err)
    } finally {
      setLoading(false)
    }
  }, [loadFriendIds])

  useEffect(() => {
    loadFeedData(0, false)
  }, [loadFeedData])

  const loadMoreDreams = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    await loadFeedData(page + 1, true)
    setLoadingMore(false)
  }, [page, hasMore, loadingMore, loadFeedData])

  const lastElementRef = useCallback(
    (node) => {
      if (loading || !hasMore) return
      if (observerRef.current) observerRef.current.disconnect()
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !loadingMore) {
          loadMoreDreams()
        }
      })
      if (node) observerRef.current.observe(node)
    },
    [loading, hasMore, loadingMore, loadMoreDreams]
  )

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      {homeTab === 'vision' ? (
        <div className="pt-20 px-4">
          {!mounted ? (
            <div className="space-y-6">
              <TextSkeleton />
              <TextSkeleton />
            </div>
          ) : (
            <>
              {!user && <Hero />}
              {goalsLoading && <TextSkeleton />}
              {goalsLoaded && goals.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {goals.map((goal) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      onSelect={() => setActiveGoal(goal)}
                    />
                  ))}
                </div>
              )}
              {showCreateGoal && (
                <CreateGoalModal
                  onClose={() => setShowCreateGoal(false)}
                  onSuccess={() => {
                    setShowCreateGoal(false)
                    loadGoals(user)
                  }}
                />
              )}
              {activeGoal && (
                <GoalDetailModal
                  goal={activeGoal}
                  onClose={() => setActiveGoal(null)}
                />
              )}
            </>
          )}
        </div>
      ) : (
        <div className="pt-20 px-4">
          {loading ? (
            <div className="space-y-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <TextSkeleton key={i} />
              ))}
            </div>
          ) : dreams.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">{getTranslation('common.noDreams', lang)}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dreams.map((dream, idx) => (
                <div key={dream.id} ref={idx === dreams.length - 1 ? lastElementRef : null}>
                  <DreamCard
                    dream={dream}
                    currentUserId={user?.id}
                  />
                </div>
              ))}
            </div>
          )}
          {loadingMore && <TextSkeleton />}
        </div>
      )}
    </div>
  )
}
