export default function ProfileHeader({ user, profile }) {
  return (
    <div className="bg-white rounded-2xl shadow p-6 mb-6">
      <h1 className="text-2xl font-bold mb-2">Profilim</h1>
      <p className="text-gray-700">{user?.email}</p>
      {profile?.display_name && (
        <p className="text-gray-500 mt-1">{profile.display_name}</p>
      )}
      {profile?.username && (
        <p className="text-gray-500">@{profile.username}</p>
      )}
    </div>
  )
}