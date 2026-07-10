export default function UserDreamList({
  dreams,
  onEdit,
  onRemoveFromFeed,
  onDelete,
}) {
  return (
    <div className="space-y-4">
      {dreams.length === 0 ? (
        <div className="bg-white rounded-2xl shadow p-6 text-gray-500">
          Henüz rüya eklenmemiş.
        </div>
      ) : (
        dreams.map((dream) => (
          <div key={dream.id} className="bg-white rounded-2xl shadow p-5">
            <p className="text-gray-900 whitespace-pre-wrap">{dream.content}</p>

            {dream.location_name && (
              <p className="text-sm text-gray-500 mt-2">{dream.location_name}</p>
            )}

            {dream.ai_summary_tr && (
              <div className="mt-4 p-3 bg-indigo-50 rounded-xl">
                <p className="text-sm text-indigo-900">{dream.ai_summary_tr}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={() => onEdit(dream)}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white"
              >
                Düzenle
              </button>

              <button
                onClick={() => onRemoveFromFeed(dream)}
                className="px-4 py-2 rounded-lg bg-yellow-500 text-white"
              >
                Feed’den kaldır
              </button>

              <button
                onClick={() => onDelete(dream)}
                className="px-4 py-2 rounded-lg bg-red-600 text-white"
              >
                Sil
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}