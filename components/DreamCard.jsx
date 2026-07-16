{/* MİKRO-İŞLEM (PARA BASMA) ALANI - SADECE RÜYA SAHİBİ GÖRÜR */}
          {isOwner && (
            <div className="flex flex-wrap gap-2 mb-4">
              {/* 1. BOOST (Kozmik Parlama) Butonu */}
              <button
                type="button"
                onClick={async () => {
                  if (premiumAuras < 3) return window.open('https://shop.lunosfer.com', '_blank');
                  if (confirm(currentLang === 'tr' ? 'Rüyanızı Keşfet ağında 24 saat parlatmak için 3 Aura harcamak istiyor musunuz?' : 'Spend 3 Auras to boost this dream to the Global Nexus?')) {
                    const { data: { session } } = await supabase.auth.getSession();
                    const res = await fetch('/api/boost-dream', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ dreamId: dream.id }) });
                    if (res.ok) { triggerToast('Rüyanız Kozmik Ağda Parlatıldı! 🌟'); setAnalysisOverride({...effectiveDream, is_boosted: true}); }
                  }
                }}
                className={`flex-1 min-w-[140px] px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${effectiveDream.is_boosted ? 'bg-amber-500/20 border-amber-400/50 text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.2)]' : 'bg-white/[0.02] border-white/10 text-white/70 hover:bg-white/5 hover:border-white/20'}`}
              >
                🌟 {effectiveDream.is_boosted ? (currentLang === 'tr' ? 'Şu An Parlıyor' : 'Currently Boosted') : (currentLang === 'tr' ? 'Keşfette Parlat · 3 Aura' : 'Boost Dream · 3 Auras')}
              </button>

              {/* 2. BOUNTY (İnsan Yorumu İçin Ödül Koyma) Butonu */}
              <button
                type="button"
                onClick={async () => {
                  const amount = prompt(currentLang === 'tr' ? 'Gerçek kahinlerin yorumlaması için bu rüyaya kaç Aura ödül koymak istersiniz? (Örn: 5)' : 'How many Auras do you want to offer as a bounty for human interpretation?');
                  if (!amount || isNaN(amount)) return;
                  if (premiumAuras < Number(amount)) return window.open('https://shop.lunosfer.com', '_blank');
                  
                  const { data: { session } } = await supabase.auth.getSession();
                  const res = await fetch('/api/add-bounty', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ dreamId: dream.id, bountyAmount: amount }) });
                  if (res.ok) { const data = await res.json(); triggerToast('Ödül başarıyla eklendi! 💰'); setAnalysisOverride({...effectiveDream, aura_bounty: data.newBounty}); }
                }}
                className="flex-1 min-w-[140px] px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/10 text-xs font-bold text-white/70 hover:bg-white/5 hover:border-emerald-500/50 hover:text-emerald-300 transition-all"
              >
                💰 {currentLang === 'tr' ? 'Yorum Ödülü Koy' : 'Add Bounty'}
              </button>
            </div>
          )}

          {/* EĞER RÜYADA BİR ÖDÜL VARSA HERKES BU GÖZ ALICI BANNERI GÖRÜR */}
          {effectiveDream.aura_bounty > 0 && (
            <div className="mb-4 w-full p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-teal-900/40 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)] animate-pulse flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold block mb-1">
                  {currentLang === 'tr' ? 'AURA AVI AKTİF' : 'AURA BOUNTY ACTIVE'}
                </span>
                <span className="text-sm font-medium text-emerald-100">
                  {currentLang === 'tr' ? 'Bu rüyayı yorumla ve ödülü kazan.' : 'Interpret this dream to win the bounty.'}
                </span>
              </div>
              <div className="text-2xl font-black text-emerald-300 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]">
                ✦ {effectiveDream.aura_bounty}
              </div>
            </div>
          )}