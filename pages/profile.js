import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Navbar from '../components/Navbar'
import useCurrentUser from '../hooks/useCurrentUser'
import { auth } from '../lib/supabase'
import ProfileHeader from '../components/profile/ProfileHeader'
import UserDreamList from '../components/dreams/UserDreamList'
import FriendsPanel from '../components/friends/FriendsPanel'
import DreamEditModal from '../components/dreams/DreamEditModal'
import {
  getUserDreams,
  removeDreamFromFeed,
  deleteDreamPermanently,
  updateDream,
} from '../services/dreamService'
import {
  getFriends,
  searchUsers,
  sendFriendRequest,
  respondToFriendRequest,
} from '../services/friendService'

export default function ProfilePage() {
  const router = useRouter()
  const { user, loading } = useCurrentUser('/auth')

  const [profile, setProfile] = useState(null)
  const [dreams, setDreams] = useState([])
  const [friends, setFriends] = useState([])
  const [pendingRequests, setPendingRequests] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [editingDream, setEditingDream] = useState(null)
  const [saving, setSaving] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    async function loadPage() {
      try {
        const profileData = await auth.getProfile(user.id)
        const userDreams = await getUserDreams(user.id)
        const friendData = await getFriends(user.id)

        setProfile(profileData)
        setDreams(userDreams)
        setFriends(friendData.friends)
        setPendingRequests(friendData.pending)
      } catch (error) {
        console.error('Profil yükleme hatası:', error)
      } finally {
        setPageLoading(false)
      }
    }

    loadPage()
  }, [user])

  async function reloadDreams() {
    if (!user) return
    const userDreams = await getUserDreams(user.id)
    setDreams(userDreams)
  }

  async function reloadFriends() {
    if (!user) return
    const friendData = await getFriends(user.id)
    setFriends(friendData.friends)
    setPendingRequests(friendData.pending)
  }

  async function handleLogout() {
    await auth.signOut()
    router.push('/')
  }

  async function handleRemoveFromFeed(dream) {
    if (!user) return
    if (!confirm("Feed'den kaldırılsın mı?")) return

    try {
      await removeDreamFromFeed(dream.id, user.id)
      await reloadDreams()
    } catch (error) {
      alert(error.message)
    }
  }

  async function handleDelete(dream) {
    if (!user) return
    if (!confirm('Rüya tamamen silinsin mi?')) return

    try {
      await deleteDreamPermanently(dream.id, user.id)
      await reloadDreams()
    } catch (error) {
      alert(error.message)
    }
  }

  async function handleSaveEdit(updates) {
    if (!user || !editingDream) return

    setSaving(true)
    try {
      await updateDream(editingDream.id, user.id, updates)
      setEditingDream(null)
      await reloadDreams()
    } catch (error) {
      alert(error.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleSearch() {
    if (!user || !searchQuery.trim()) return

    try {
      const users = await searchUsers(searchQuery, user.id)
      setSearchResults(users)
    } catch (error) {
      alert(error.message)
    }
  }

  async function handleSendRequest(friendId) {
    if (!user) return

    try {
      await sendFriendRequest(user.id, friendId)
      await handleSearch()
    } catch (error) {
      alert(error.message)
    }
  }

  async function handleRespondRequest(friendshipId, action) {
    if (!user) return

    try {
      await respondToFriendRequest(friendshipId, user.id, action)
      await reloadFriends()
    } catch (error) {
      alert(error.message)
    }
  }

  if (loading || pageLoading) {
    return <div className="p-8">Yükleniyor...</div>
  }

  if (!user) return null

  return (
    <>
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex justify-end mb-4">
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg bg-gray-800 text-white"
          >
            Çıkış yap
          </button>
        </div>

        <ProfileHeader user={user} profile={profile} />

        <UserDreamList
          dreams={dreams}
          onEdit={setEditingDream}
          onRemoveFromFeed={handleRemoveFromFeed}
          onDelete={handleDelete}
        />

        <FriendsPanel
          friends={friends}
          pendingRequests={pendingRequests}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchResults={searchResults}
          onSearch={handleSearch}
          onSendRequest={handleSendRequest}
          onRespondRequest={handleRespondRequest}
        />
      </main>

      <DreamEditModal
        dream={editingDream}
        onClose={() => setEditingDream(null)}
        onSave={handleSaveEdit}
        saving={saving}
      />
    </>
  )
}