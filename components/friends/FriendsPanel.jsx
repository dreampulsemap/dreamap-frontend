export default function FriendsPanel({
  friends,
  pendingRequests,
  searchQuery,
  setSearchQuery,
  searchResults,
  onSearch,
  onSendRequest,
  onRespondRequest,
}) {
  return (
    <div className="bg-white rounded-2xl shadow p-6 mt-6">
      <h2 className="text-xl font-semibold mb-4">Arkadaşlar</h2>

      <div className="flex gap-2 mb-4">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Kullanıcı ara"
          className="flex-1 border rounded-lg px-4 py-2"
        />
        <button
          onClick={onSearch}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white"
        >
          Ara
        </button>
      </div>

      {searchResults.length > 0 && (
        <div className="mb-6 space-y-2">
          <h3 className="font-medium">Arama sonuçları</h3>
          {searchResults.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between border rounded-lg p-3"
            >
              <div>
                <p className="font-medium">
                  {user.display_name || user.username}
                </p>
                {user.username && (
                  <p className="text-sm text-gray-500">@{user.username}</p>
                )}
              </div>

              <button
                onClick={() => onSendRequest(user.id)}
                className="px-3 py-2 rounded-lg bg-green-600 text-white"
              >
                İstek gönder
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mb-6">
        <h3 className="font-medium mb-2">Bekleyen istekler</h3>
        {pendingRequests.length === 0 ? (
          <p className="text-gray-500">Bekleyen istek yok.</p>
        ) : (
          pendingRequests.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between border rounded-lg p-3 mb-2"
            >
              <p>{item.user_profiles?.username || 'Kullanıcı'}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => onRespondRequest(item.id, 'accepted')}
                  className="px-3 py-2 rounded-lg bg-blue-600 text-white"
                >
                  Kabul et
                </button>
                <button
                  onClick={() => onRespondRequest(item.id, 'rejected')}
                  className="px-3 py-2 rounded-lg bg-red-600 text-white"
                >
                  Reddet
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div>
        <h3 className="font-medium mb-2">Arkadaş listesi</h3>
        {friends.length === 0 ? (
          <p className="text-gray-500">Henüz arkadaş yok.</p>
        ) : (
          friends.map((item) => (
            <div key={item.id} className="border rounded-lg p-3 mb-2">
              <p>
                {item.user_profiles?.username ||
                  item.friend_profiles?.username ||
                  'Kullanıcı'}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}