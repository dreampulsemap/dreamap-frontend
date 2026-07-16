// DreamCard'ın return kısmını şu şekilde güncelleyin:

  return (
    <>
      <article className="glass-card p-6">
        {/* ... Rüya kartı içeriği aynı kalacak ... */}
        
        {/* Butonlar: */}
        <button
          onClick={handlePremiumButtonClick} // Burası modalı tetikler
          disabled={premiumGenerating}
          className="w-full bg-fuchsia-600 p-4 rounded-xl text-white font-bold mb-3"
        >
          {premiumAnalysis ? t.exploreCards : (isOwner ? t.getDeepAnalysis : t.giftDeepAnalysis)}
        </button>

        {!premiumAnalysis && !effectiveDream.ai_image_url && (
            <button
                onClick={handleGenerateImageOnly}
                disabled={generatingImage}
                className="w-full bg-cyan-600 p-4 rounded-xl text-white font-bold mb-3"
            >
                {generatingImage ? t.generatingImage : t.generateImage}
            </button>
        )}
      </article>

      {/* SADECE TEK BİR MODAL KONTROLÜ - ÜST ÜSTE BİNMEZ */}
      {showConfirmModal && (
        <DeepAnalysisConfirmationModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)} // Sadece bunu kapatır
          auras={premiumAuras}
          onConfirm={handlePremiumAnalysisExecute}
          lang={currentLang}
          gumroadUrl={GUMROAD_PRODUCT_URL}
          isGift={!isOwner}
        />
      )}

      {showAnalysisModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90" onClick={() => setShowAnalysisModal(false)}>
           {/* Carousel Modal içeriği */}
           <DeepAnalysisCarouselModal 
             isOpen={showAnalysisModal} 
             onClose={() => setShowAnalysisModal(false)} 
             // ... diğer proplar
           />
        </div>
      )}
    </>
  )