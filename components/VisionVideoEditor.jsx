import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useModalA11y } from '@/lib/useModalA11y'
import { uploadVisionVideo, getVisionVideoErrorMessage } from '@/lib/uploadVisionVideo'

// "Vizyon Videosu" — "Vizyon Slaytlarını Düzenle" (eski SlideEditor: çoklu
// görsel + başlık + süreden oluşan slayt gösterisi) editörünün yerini alan
// tam video editörü: klip ekleme/kırpma/bölme, filtreler, sürüklenebilir
// zamanlı metin, arka plan müziği, hız/ses ayarı, tarayıcı içi dışa aktarma
// (MediaRecorder). Sadece hedef sahibi açabilir (bkz. GoalDetailModal.jsx).
//
// Bağımsız bir HTML prototipinden (Klip Stüdyo) taşındı: canvas/video/audio
// motoru kasıtlı olarak React state'i değil düz JS kapanışları kullanıyor —
// bu React'te "widget'ı bir kere mount et, DOM'u kendi yönetsin" deseni.
// $(sel) her zaman root'a (bu component'in kendi DOM'una) scope'lu; document
// üzerinden hiçbir id çakışması riski yok. Timeline'daki klip/metin/müzik
// blokları vanilla DOM ile üretiliyor (React JSX değil) — bu yüzden CSS
// aşağıda `<style jsx global>` ile yazıldı (scoped `<style jsx>` sadece
// JSX'in render ettiği elemanlara otomatik class ekler, sonradan
// document.createElement ile eklenenlere eklemez). Sınıf isimleri (.vve-*)
// bilerek özgün, uygulamanın Tailwind utility class'larıyla asla çakışmaz.
//
// Tasarım dili DESIGN_SYSTEM.md §1.1'deki brand/semantic token'larından:
// brand-primary (fuchsia) = birincil aksiyon/dışa aktar, brand-secondary
// (cyan) = seçim/odak/oynatma çubuğu, semantic-danger (rose) = silme,
// semantic-success (emerald) = tamamlandı. Yazı tipleri tailwind.config.js
// ile aynı: sans = Plus Jakarta Sans, serif = Cormorant Garamond.

const PPS = 50
const RATIOS = { '9:16': [1080, 1920], '1:1': [1080, 1080], '16:9': [1920, 1080] }

const FILTERS = [
  { id: 'none', name: 'Orijinal', nameEn: 'Original', css: 'none' },
  { id: 'vivid', name: 'Canlı', nameEn: 'Vivid', css: 'saturate(1.5) contrast(1.15) brightness(1.03)' },
  { id: 'warm', name: 'Sıcak', nameEn: 'Warm', css: 'sepia(0.25) saturate(1.25) brightness(1.08) hue-rotate(-8deg)' },
  { id: 'cool', name: 'Soğuk', nameEn: 'Cool', css: 'saturate(1.15) brightness(1.02) hue-rotate(15deg) contrast(1.05)' },
  { id: 'bw', name: 'Siyah Beyaz', nameEn: 'B&W', css: 'grayscale(1) contrast(1.1)' },
  { id: 'vintage', name: 'Vintage', nameEn: 'Vintage', css: 'sepia(0.35) contrast(0.9) brightness(1.05) saturate(0.85)' },
  { id: 'contrast', name: 'Yüksek Kontrast', nameEn: 'High Contrast', css: 'contrast(1.4) saturate(1.1)' },
  { id: 'soft', name: 'Yumuşak', nameEn: 'Soft', css: 'contrast(0.85) brightness(1.1) saturate(0.9)' },
  { id: 'retro', name: 'Retro', nameEn: 'Retro', css: 'sepia(0.4) hue-rotate(-15deg) saturate(1.3) contrast(0.95)' },
  { id: 'matte', name: 'Mat', nameEn: 'Matte', css: 'contrast(0.8) brightness(1.08) saturate(0.75)' },
  { id: 'neon', name: 'Neon', nameEn: 'Neon', css: 'saturate(1.8) contrast(1.25) hue-rotate(-5deg)' },
  { id: 'night', name: 'Gece', nameEn: 'Night', css: 'brightness(0.85) contrast(1.2) saturate(0.9) hue-rotate(10deg)' },
]

// DESIGN_SYSTEM.md §5 "Slayt Metin Overlay Kuralları" ile aynı: sans/serif/mono
const CAPTION_FONTS = [
  { id: 'sans', css: "'Plus Jakarta Sans'" },
  { id: 'serif', css: "'Cormorant Garamond'" },
  { id: 'mono', css: "'JetBrains Mono'" },
]
// Aynı dokümandaki 6 preset renk
const CAPTION_COLORS = ['#ffffff', '#0a0a0f', '#f5c451', '#e879f9', '#22d3ee', '#fb7185']

export default function VisionVideoEditor({ goal, lang = 'en', onClose, onChanged }) {
  const rootRef = useRef(null)
  const hiddenMediaRef = useRef(null)
  useModalA11y(rootRef, onClose)

  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const onChangedRef = useRef(onChanged)
  onChangedRef.current = onChanged

  useEffect(() => {
    const root = rootRef.current
    const hiddenMedia = hiddenMediaRef.current
    if (!root || !hiddenMedia) return undefined

    const tr = lang === 'tr'
    const tt = (trText, enText) => (tr ? trText : enText)

    /* ============ STATE ============ */
    const state = {
      clips: [], texts: [], music: null,
      selectedClipId: null, selectedTextId: null,
      playhead: 0, isPlaying: false, isExporting: false,
      totalDuration: 0, activeTab: 'filters', ratio: '9:16', activeClipId: null,
    }
    let uidCounter = 1
    function uid(prefix) { return prefix + (uidCounter++) }

    /* ============ DOM (root'a scope'lu — document'e asla düşmüyor) ============ */
    function $(sel) { return root.querySelector(sel) }
    const stage = $('#vve-stage')
    const ctx = stage.getContext('2d')
    const viewfinder = $('#vve-viewfinder')
    const emptyState = $('#vve-emptyState')
    const playBtn = $('#vve-playBtn')
    const curTimeEl = $('#vve-curTime')
    const totalTimeEl = $('#vve-totalTime')
    const timelineScroll = $('#vve-timelineScroll')
    const rulerEl = $('#vve-ruler')
    const clipTrack = $('#vve-clipTrack')
    const textTrack = $('#vve-textTrack')
    const musicTrackEl = $('#vve-musicTrackEl')
    const playheadLine = $('#vve-playheadLine')
    const fileInput = $('#vve-fileInput')
    const musicInput = $('#vve-musicInput')
    const addClipBtn = $('#vve-addClipBtn')
    const splitBtn = $('#vve-splitBtn')
    const deleteClipBtn = $('#vve-deleteClipBtn')
    const exportBtn = $('#vve-exportBtn')
    const exportOverlay = $('#vve-exportOverlay')
    const exportStatus = $('#vve-exportStatus')
    const progressFill = $('#vve-progressFill')
    const exportDone = $('#vve-exportDone')
    const downloadLink = $('#vve-downloadLink')
    const closeExportBtn = $('#vve-closeExportBtn')
    const toastEl = $('#vve-toast')
    const emptyAddBtn = $('#vve-emptyAddBtn')
    const clipBlockEls = new Map()

    let toastTimer = null
    function toast(msg) {
      toastEl.textContent = msg
      toastEl.classList.add('show')
      clearTimeout(toastTimer)
      toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200)
    }
    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
    }
    function formatTime(s) {
      s = Math.max(0, s || 0)
      const m = Math.floor(s / 60)
      const sec = Math.floor(s % 60)
      return m + ':' + String(sec).padStart(2, '0')
    }

    /* ============ AUDIO GRAPH ============ */
    let audioCtx = null, streamDest = null
    const clipAudioNodes = new Map()
    let musicNodes = null

    function ensureAudioContext() {
      if (audioCtx) { if (audioCtx.state === 'suspended') audioCtx.resume(); return }
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)()
        streamDest = audioCtx.createMediaStreamDestination()
      } catch (e) { console.warn('AudioContext oluşturulamadı', e) }
    }
    function connectClipAudio(clip) {
      if (!audioCtx) return
      try {
        const source = audioCtx.createMediaElementSource(clip.videoEl)
        const gain = audioCtx.createGain()
        gain.gain.value = clip.muted ? 0 : clip.volume
        source.connect(gain)
        gain.connect(audioCtx.destination)
        gain.connect(streamDest)
        clipAudioNodes.set(clip.id, { source, gain })
      } catch (e) { console.warn('Klip ses bağlantısı kurulamadı', e) }
    }
    function connectMusicAudio() {
      if (!audioCtx || !state.music) return
      try {
        const source = audioCtx.createMediaElementSource(state.music.audioEl)
        const gain = audioCtx.createGain()
        gain.gain.value = state.music.volume
        source.connect(gain)
        gain.connect(audioCtx.destination)
        gain.connect(streamDest)
        musicNodes = { source, gain }
      } catch (e) { console.warn('Müzik ses bağlantısı kurulamadı', e) }
    }

    /* ============ CLIP MANAGEMENT ============ */
    function handleFiles(fileList) {
      const files = Array.prototype.filter.call(fileList || [], (f) => f.type.indexOf('video/') === 0)
      if (!files.length) return
      ensureAudioContext()
      files.forEach(addClipFromFile)
    }

    function addClipFromFile(file) {
      const url = URL.createObjectURL(file)
      const videoEl = document.createElement('video')
      videoEl.src = url
      videoEl.preload = 'auto'
      videoEl.playsInline = true
      videoEl.crossOrigin = 'anonymous'
      videoEl.style.display = 'none'
      hiddenMedia.appendChild(videoEl)

      const clip = {
        id: uid('clip'), name: file.name.replace(/\.[^/.]+$/, ''),
        url, videoEl,
        duration: 0, trimStart: 0, trimEnd: 0,
        speed: 1, volume: 1, muted: false, filter: 'none',
        timelineStart: 0, timelineDuration: 0, thumbnail: null,
      }

      videoEl.addEventListener('loadedmetadata', () => {
        clip.duration = videoEl.duration || 0
        clip.trimEnd = clip.duration
        connectClipAudio(clip)
        recalcTimeline()
        renderAll()
        generateThumbnail(clip)
        if (!state.selectedClipId) selectClip(clip.id)
        seekGlobal(state.playhead)
      })
      videoEl.addEventListener('ended', () => {
        if (state.isPlaying && state.activeClipId === clip.id) advanceToNext(clip)
      })
      videoEl.addEventListener('error', () => {
        toast(tt(`"${clip.name}" yüklenemedi`, `Could not load "${clip.name}"`))
      })

      state.clips.push(clip)
      renderAll()
    }

    function generateThumbnail(clip) {
      const v = clip.videoEl
      const tc = document.createElement('canvas')
      tc.width = 64; tc.height = 114
      const tctx = tc.getContext('2d')
      function onSeeked() {
        try { drawCover(tctx, v, 64, 114); clip.thumbnail = tc.toDataURL('image/jpeg', 0.6); renderTimelineUI() }
        catch (e) { /* thumbnail is best-effort */ }
        v.removeEventListener('seeked', onSeeked)
      }
      v.addEventListener('seeked', onSeeked)
      try { v.currentTime = Math.min(0.15, (v.duration || 0.3)) } catch (e) { /* ignore */ }
    }

    function removeClip(id) {
      const idx = state.clips.findIndex((c) => c.id === id)
      if (idx === -1) return
      const clip = state.clips[idx]
      try { clip.videoEl.pause() } catch (e) { /* ignore */ }
      const nodes = clipAudioNodes.get(clip.id)
      if (nodes) { try { nodes.source.disconnect(); nodes.gain.disconnect() } catch (e) { /* ignore */ } clipAudioNodes.delete(clip.id) }
      clip.videoEl.remove()
      state.clips.splice(idx, 1)
      const stillUsed = state.clips.some((c) => c.url === clip.url)
      if (!stillUsed) URL.revokeObjectURL(clip.url)
      if (state.selectedClipId === id) state.selectedClipId = state.clips.length ? state.clips[0].id : null
      if (state.activeClipId === id) state.activeClipId = null
      recalcTimeline()
      renderAll()
    }

    function selectClip(id) {
      state.selectedClipId = id
      state.selectedTextId = null
      renderAll()
    }

    function moveClip(id, dir) {
      const idx = state.clips.findIndex((c) => c.id === id)
      const newIdx = idx + dir
      if (idx === -1 || newIdx < 0 || newIdx >= state.clips.length) return
      const tmp = state.clips[idx]
      state.clips[idx] = state.clips[newIdx]
      state.clips[newIdx] = tmp
      recalcTimeline()
      renderAll()
    }

    function recalcTimeline() {
      let t = 0
      state.clips.forEach((c) => {
        c.timelineStart = t
        const trimmed = Math.max(0, c.trimEnd - c.trimStart)
        c.timelineDuration = trimmed / c.speed
        t += c.timelineDuration
      })
      state.totalDuration = t
      if (state.playhead > t) state.playhead = t
      splitBtn.disabled = !getActiveClipAt(state.playhead)
      deleteClipBtn.disabled = !state.selectedClipId
      playBtn.disabled = state.clips.length === 0
      exportBtn.disabled = state.clips.length === 0
    }

    function getActiveClipAt(t) {
      for (let i = 0; i < state.clips.length; i++) {
        const c = state.clips[i]
        if (t >= c.timelineStart && t < c.timelineStart + c.timelineDuration) return c
      }
      if (state.clips.length && t >= state.totalDuration) return state.clips[state.clips.length - 1]
      return null
    }

    /* ============ SPLIT ============ */
    function splitAtPlayhead() {
      const clip = getActiveClipAt(state.playhead)
      if (!clip) { toast(tt('Bölünecek klip yok', 'No clip to split')); return }
      const localTime = clip.trimStart + (state.playhead - clip.timelineStart) * clip.speed
      if (localTime <= clip.trimStart + 0.15 || localTime >= clip.trimEnd - 0.15) {
        toast(tt('Kliplerin başına/sonuna çok yakın', 'Too close to the clip start/end'))
        return
      }
      const idx = state.clips.indexOf(clip)
      const videoEl2 = document.createElement('video')
      videoEl2.src = clip.url
      videoEl2.preload = 'auto'; videoEl2.playsInline = true; videoEl2.crossOrigin = 'anonymous'
      videoEl2.style.display = 'none'
      hiddenMedia.appendChild(videoEl2)

      const clip2 = {
        id: uid('clip'), name: clip.name + ' (2)',
        url: clip.url, videoEl: videoEl2,
        duration: clip.duration, trimStart: localTime, trimEnd: clip.trimEnd,
        speed: clip.speed, volume: clip.volume, muted: clip.muted, filter: clip.filter,
        timelineStart: 0, timelineDuration: 0, thumbnail: clip.thumbnail,
      }
      videoEl2.addEventListener('loadedmetadata', () => {
        connectClipAudio(clip2)
        recalcTimeline(); renderAll()
      })
      videoEl2.addEventListener('ended', () => {
        if (state.isPlaying && state.activeClipId === clip2.id) advanceToNext(clip2)
      })

      clip.trimEnd = localTime
      state.clips.splice(idx + 1, 0, clip2)
      recalcTimeline()
      renderAll()
      toast(tt('Klip bölündü', 'Clip split'))
    }

    /* ============ PLAYBACK ENGINE ============ */
    function pauseAllVideos() {
      state.clips.forEach((c) => { try { c.videoEl.pause() } catch (e) { /* ignore */ } })
      if (state.music) { try { state.music.audioEl.pause() } catch (e) { /* ignore */ } }
    }

    function play() {
      if (!state.clips.length) return
      ensureAudioContext()
      if (state.playhead >= state.totalDuration - 0.02) state.playhead = 0
      const clip = getActiveClipAt(state.playhead)
      if (!clip) return
      state.activeClipId = clip.id
      const localTime = clip.trimStart + (state.playhead - clip.timelineStart) * clip.speed
      try { clip.videoEl.currentTime = localTime } catch (e) { /* ignore */ }
      clip.videoEl.playbackRate = clip.speed
      clip.videoEl.play().catch((e) => console.warn('play() hata', e))
      if (state.music) {
        try { state.music.audioEl.currentTime = Math.min(state.playhead, state.music.audioEl.duration || 0) } catch (e) { /* ignore */ }
        state.music.audioEl.play().catch(() => {})
      }
      state.isPlaying = true
      playBtn.textContent = '❚❚'
    }

    function pause() {
      pauseAllVideos()
      state.isPlaying = false
      playBtn.textContent = '▶'
    }

    function togglePlay() {
      if (state.isExporting) return
      if (state.isPlaying) pause(); else play()
    }

    let endResolve = null
    function waitUntilEnd() { return new Promise((res) => { endResolve = res }) }

    function endPlayback() {
      pauseAllVideos()
      state.isPlaying = false
      playBtn.textContent = '▶'
      if (endResolve) { const r = endResolve; endResolve = null; r() }
    }

    function advanceToNext(currentClip) {
      const idx = state.clips.indexOf(currentClip)
      const next = state.clips[idx + 1]
      try { currentClip.videoEl.pause() } catch (e) { /* ignore */ }
      if (!next) { state.playhead = state.totalDuration; endPlayback(); renderTimelineUI(); return }
      state.activeClipId = next.id
      try { next.videoEl.currentTime = next.trimStart } catch (e) { /* ignore */ }
      next.videoEl.playbackRate = next.speed
      next.videoEl.play().catch(() => {})
    }

    function seekGlobal(t) {
      t = Math.max(0, Math.min(state.totalDuration, t))
      state.playhead = t
      const clip = getActiveClipAt(t)
      if (!clip) { updateTimeUI(); updatePlayheadPosition(); return }
      if (clip.id !== state.activeClipId || !state.isPlaying) {
        pauseAllVideos()
        state.activeClipId = clip.id
        const localTime = clip.trimStart + (t - clip.timelineStart) * clip.speed
        try { clip.videoEl.currentTime = Math.min(localTime, Math.max(0, clip.duration - 0.01)) } catch (e) { /* ignore */ }
      }
      if (state.music) {
        try { state.music.audioEl.currentTime = Math.min(t, state.music.audioEl.duration || 0) } catch (e) { /* ignore */ }
      }
      updateTimeUI()
      updatePlayheadPosition()
    }

    /* ============ RENDER ENGINE ============ */
    function drawCover(c, video, cw, ch) {
      const vw = video.videoWidth, vh = video.videoHeight
      if (!vw || !vh) { c.fillStyle = '#000'; c.fillRect(0, 0, cw, ch); return }
      const vr = vw / vh, cr = cw / ch
      let sx, sy, sw, sh
      if (vr > cr) { sh = vh; sw = vh * cr; sx = (vw - sw) / 2; sy = 0 }
      else { sw = vw; sh = sw / cr; sx = 0; sy = (vh - sh) / 2 }
      c.drawImage(video, sx, sy, sw, sh, 0, 0, cw, ch)
    }

    function drawTexts(currentTime) {
      ctx.filter = 'none'
      state.texts.forEach((tx) => {
        if (currentTime < tx.startTime || currentTime > tx.endTime) { tx._bbox = null; return }
        let alpha = 1
        const fadeDur = 0.35
        if (tx.anim === 'fade' || tx.anim === 'slide') {
          if (currentTime - tx.startTime < fadeDur) alpha = (currentTime - tx.startTime) / fadeDur
          else if (tx.endTime - currentTime < fadeDur) alpha = (tx.endTime - currentTime) / fadeDur
        }
        alpha = Math.max(0, Math.min(1, alpha))
        let dy = 0
        if (tx.anim === 'slide') {
          const p = Math.min(1, (currentTime - tx.startTime) / fadeDur)
          dy = (1 - p) * 30
        }
        ctx.save()
        ctx.globalAlpha = alpha
        const fontSize = tx.fontSize
        const fontCss = (CAPTION_FONTS.find((f) => f.id === tx.font) || CAPTION_FONTS[0]).css
        ctx.font = `${tx.bold ? '700' : '500'} ${fontSize}px ${fontCss}, sans-serif`
        ctx.textAlign = tx.align
        ctx.textBaseline = 'middle'
        const px = tx.x * stage.width
        const py = tx.y * stage.height + dy
        const metrics = ctx.measureText(tx.text)
        const w = metrics.width
        const h = fontSize * 1.3
        let boxX = px
        if (tx.align === 'center') boxX = px - w / 2
        else if (tx.align === 'right') boxX = px - w
        if (tx.bg) {
          ctx.fillStyle = 'rgba(4,6,14,0.5)'
          ctx.fillRect(boxX - 10, py - h / 2 - 4, w + 20, h + 8)
        }
        ctx.fillStyle = tx.color
        // DESIGN_SYSTEM.md §5: her zaman textShadow, hangi görselin üstüne
        // gelirse gelsin okunabilirlik garantisi
        ctx.shadowColor = 'rgba(0,0,0,0.5)'
        ctx.shadowBlur = tx.bg ? 0 : 6
        ctx.shadowOffsetY = tx.bg ? 0 : 1
        ctx.fillText(tx.text, px, py)
        ctx.restore()
        tx._bbox = { x: boxX - 10, y: py - h / 2 - 4, w: w + 20, h: h + 8 }
      })
    }

    function drawFrame() {
      if (!stage.width || !stage.height) return
      ctx.clearRect(0, 0, stage.width, stage.height)
      const clip = getActiveClipAt(state.playhead) || state.clips[state.clips.length - 1]
      if (clip && clip.videoEl.readyState >= 2) {
        const f = FILTERS.find((x) => x.id === clip.filter) || FILTERS[0]
        ctx.filter = f.css
        drawCover(ctx, clip.videoEl, stage.width, stage.height)
        ctx.filter = 'none'
      } else {
        ctx.fillStyle = '#04060E'
        ctx.fillRect(0, 0, stage.width, stage.height)
      }
      drawTexts(state.playhead)
    }

    let rafId = null
    function tick() {
      if (state.isPlaying) {
        const clip = state.clips.find((c) => c.id === state.activeClipId)
        if (clip) {
          const localT = clip.videoEl.currentTime
          if (localT >= clip.trimEnd - 0.04) {
            advanceToNext(clip)
          } else {
            state.playhead = clip.timelineStart + (localT - clip.trimStart) / clip.speed
          }
        }
        updateTimeUI()
        updatePlayheadPosition()
      }
      drawFrame()
      rafId = requestAnimationFrame(tick)
    }

    function updateTimeUI() {
      curTimeEl.textContent = formatTime(state.playhead)
      totalTimeEl.textContent = formatTime(state.totalDuration)
    }
    function updatePlayheadPosition() {
      playheadLine.style.left = (state.playhead * PPS) + 'px'
    }

    /* ============ CANVAS SIZING ============ */
    function resizeStage() {
      const rp = RATIOS[state.ratio]
      stage.width = rp[0]; stage.height = rp[1]
      const wrapEl = viewfinder.parentElement
      const wrapW = wrapEl.clientWidth - 28
      const wrapH = wrapEl.clientHeight - 90
      let scale = Math.min(wrapW / rp[0], wrapH / rp[1], 1)
      if (scale <= 0 || !isFinite(scale)) scale = 0.3
      stage.style.width = (rp[0] * scale) + 'px'
      stage.style.height = (rp[1] * scale) + 'px'
    }
    window.addEventListener('resize', resizeStage)

    /* ============ TEXT OVERLAYS ============ */
    function addTextOverlay() {
      const t = {
        id: uid('txt'), text: tt('Yeni Metin', 'New Text'), x: 0.5, y: 0.5,
        fontSize: Math.round(stage.height * 0.06) || 64, color: '#ffffff', font: 'sans',
        startTime: state.playhead, endTime: Math.min(state.totalDuration || 3, state.playhead + 3),
        anim: 'fade', bold: true, align: 'center', bg: false, _bbox: null,
      }
      if (t.endTime <= t.startTime) t.endTime = t.startTime + 1
      state.texts.push(t)
      state.selectedTextId = t.id
      renderAll()
    }
    function deleteText(id) {
      state.texts = state.texts.filter((t) => t.id !== id)
      if (state.selectedTextId === id) state.selectedTextId = null
      renderAll()
    }

    let draggingText = null
    const dragOffset = { x: 0, y: 0 }
    function onStagePointerDown(e) {
      const rect = stage.getBoundingClientRect()
      const scaleX = stage.width / rect.width, scaleY = stage.height / rect.height
      const mx = (e.clientX - rect.left) * scaleX, my = (e.clientY - rect.top) * scaleY
      for (let i = state.texts.length - 1; i >= 0; i--) {
        const tx = state.texts[i]
        if (!tx._bbox) continue
        if (mx >= tx._bbox.x && mx <= tx._bbox.x + tx._bbox.w && my >= tx._bbox.y && my <= tx._bbox.y + tx._bbox.h) {
          draggingText = tx
          state.selectedTextId = tx.id
          dragOffset.x = mx - tx.x * stage.width
          dragOffset.y = my - tx.y * stage.height
          try { stage.setPointerCapture(e.pointerId) } catch (err) { /* ignore */ }
          renderTextPane()
          renderTimelineUI()
          break
        }
      }
    }
    function onStagePointerMove(e) {
      if (!draggingText) return
      const rect = stage.getBoundingClientRect()
      const scaleX = stage.width / rect.width, scaleY = stage.height / rect.height
      const mx = (e.clientX - rect.left) * scaleX, my = (e.clientY - rect.top) * scaleY
      draggingText.x = Math.max(0, Math.min(1, (mx - dragOffset.x) / stage.width))
      draggingText.y = Math.max(0, Math.min(1, (my - dragOffset.y) / stage.height))
    }
    function onWindowPointerUp() { draggingText = null }
    stage.addEventListener('pointerdown', onStagePointerDown)
    stage.addEventListener('pointermove', onStagePointerMove)
    window.addEventListener('pointerup', onWindowPointerUp)

    /* ============ MUSIC ============ */
    function handleMusicFile(file) {
      if (!file) return
      ensureAudioContext()
      if (state.music) { URL.revokeObjectURL(state.music.url); state.music.audioEl.remove(); musicNodes = null }
      const url = URL.createObjectURL(file)
      const audioEl = document.createElement('audio')
      audioEl.src = url; audioEl.preload = 'auto'; audioEl.style.display = 'none'
      hiddenMedia.appendChild(audioEl)
      state.music = { url, audioEl, name: file.name, volume: 0.8 }
      audioEl.addEventListener('loadedmetadata', () => {
        connectMusicAudio()
        renderAll()
      })
    }
    function removeMusic() {
      if (!state.music) return
      try { state.music.audioEl.pause() } catch (e) { /* ignore */ }
      URL.revokeObjectURL(state.music.url)
      state.music.audioEl.remove()
      state.music = null
      musicNodes = null
      renderAll()
    }

    /* ============ TIMELINE UI ============ */
    function trackWidth() { return Math.max(state.totalDuration * PPS, 5 * PPS) }

    function renderRuler() {
      rulerEl.innerHTML = ''
      const total = Math.max(state.totalDuration, 5)
      rulerEl.style.width = trackWidth() + 'px'
      const step = total > 60 ? 10 : (total > 20 ? 5 : 1)
      for (let s = 0; s <= total; s += step) {
        const tickEl = document.createElement('div')
        tickEl.className = 'vve-tick'
        tickEl.style.left = (s * PPS) + 'px'
        rulerEl.appendChild(tickEl)
        const label = document.createElement('div')
        label.className = 'vve-tick-label'
        label.style.left = (s * PPS) + 'px'
        label.textContent = formatTime(s)
        rulerEl.appendChild(label)
      }
    }

    function setupTrimDrag(handle, clip, side) {
      handle.addEventListener('pointerdown', (e) => {
        e.stopPropagation()
        try { handle.setPointerCapture(e.pointerId) } catch (err) { /* ignore */ }
        const startX = e.clientX
        const startTrimStart = clip.trimStart, startTrimEnd = clip.trimEnd
        function onMove(ev) {
          const dx = (ev.clientX - startX) / PPS * clip.speed
          if (side === 'start') {
            let nv = startTrimStart + dx
            nv = Math.max(0, Math.min(nv, clip.trimEnd - 0.2))
            clip.trimStart = nv
          } else {
            let nv2 = startTrimEnd + dx
            nv2 = Math.min(clip.duration, Math.max(nv2, clip.trimStart + 0.2))
            clip.trimEnd = nv2
          }
          recalcTimeline()
          repositionClipBlocksLight()
        }
        function onUp() {
          try { handle.releasePointerCapture(e.pointerId) } catch (err) { /* ignore */ }
          document.removeEventListener('pointermove', onMove)
          document.removeEventListener('pointerup', onUp)
          renderTimelineUI()
          seekGlobal(state.playhead)
        }
        document.addEventListener('pointermove', onMove)
        document.addEventListener('pointerup', onUp)
      })
    }

    function repositionClipBlocksLight() {
      state.clips.forEach((c) => {
        const el = clipBlockEls.get(c.id)
        if (el) {
          el.style.left = (c.timelineStart * PPS) + 'px'
          el.style.width = Math.max(4, c.timelineDuration * PPS) + 'px'
        }
      })
      const w = trackWidth() + 'px'
      clipTrack.style.width = w; rulerEl.style.width = w; textTrack.style.width = w; musicTrackEl.style.width = w
      updatePlayheadPosition()
    }

    function renderClipTrack() {
      clipTrack.innerHTML = ''
      clipBlockEls.clear()
      clipTrack.style.width = trackWidth() + 'px'
      state.clips.forEach((clip) => {
        const block = document.createElement('div')
        block.className = 'vve-clip-block' + (clip.id === state.selectedClipId ? ' selected' : '')
        block.style.left = (clip.timelineStart * PPS) + 'px'
        block.style.width = Math.max(4, clip.timelineDuration * PPS) + 'px'
        if (clip.thumbnail) block.style.backgroundImage = `url(${clip.thumbnail})`
        const label = document.createElement('div')
        label.className = 'vve-clip-label'
        label.textContent = clip.name
        block.appendChild(label)

        const leftHandle = document.createElement('div')
        leftHandle.className = 'vve-trim-handle left'
        const rightHandle = document.createElement('div')
        rightHandle.className = 'vve-trim-handle right'
        block.appendChild(leftHandle)
        block.appendChild(rightHandle)

        block.addEventListener('pointerdown', (ev) => {
          if (ev.target === leftHandle || ev.target === rightHandle) return
          selectClip(clip.id)
        })

        setupTrimDrag(leftHandle, clip, 'start')
        setupTrimDrag(rightHandle, clip, 'end')

        clipTrack.appendChild(block)
        clipBlockEls.set(clip.id, block)
      })
    }

    function renderTextTrack() {
      textTrack.innerHTML = ''
      textTrack.style.width = trackWidth() + 'px'
      state.texts.forEach((tx) => {
        const block = document.createElement('div')
        block.className = 'vve-text-block' + (tx.id === state.selectedTextId ? ' selected' : '')
        block.style.left = (tx.startTime * PPS) + 'px'
        block.style.width = Math.max(4, (tx.endTime - tx.startTime) * PPS) + 'px'
        block.textContent = tx.text
        block.addEventListener('pointerdown', (ev) => {
          ev.stopPropagation()
          state.selectedTextId = tx.id
          setActiveTab('text')
          renderAll()
        })
        textTrack.appendChild(block)
      })
    }

    function renderMusicTrack() {
      musicTrackEl.innerHTML = ''
      musicTrackEl.style.width = trackWidth() + 'px'
      if (!state.music) return
      const block = document.createElement('div')
      block.className = 'vve-music-block'
      const dur = state.music.audioEl.duration || state.totalDuration || 1
      const w = Math.min(dur, state.totalDuration || dur) * PPS
      block.style.width = Math.max(4, w) + 'px'
      block.textContent = '\uD83C\uDFB5 ' + state.music.name
      musicTrackEl.appendChild(block)
    }

    function renderTimelineUI() {
      renderRuler()
      renderClipTrack()
      renderTextTrack()
      renderMusicTrack()
      updatePlayheadPosition()
      splitBtn.disabled = !getActiveClipAt(state.playhead)
      deleteClipBtn.disabled = !state.selectedClipId
    }

    function onTimelineScrollPointerDown(e) {
      if (e.target.classList.contains('vve-trim-handle')) return
      const rect = timelineScroll.getBoundingClientRect()
      const x = e.clientX - rect.left + timelineScroll.scrollLeft
      seekGlobal(x / PPS)
    }
    timelineScroll.addEventListener('pointerdown', onTimelineScrollPointerDown)

    /* ============ SIDE PANEL ============ */
    function setActiveTab(tabName) {
      state.activeTab = tabName
      root.querySelectorAll('.vve-tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === tabName))
      root.querySelectorAll('.vve-tab-pane').forEach((p) => p.classList.toggle('active', p.dataset.pane === tabName))
    }

    function renderSidePanel() {
      renderFiltersPane()
      renderTextPane()
      renderMusicPane()
      renderAdjustPane()
    }

    function renderFiltersPane() {
      const pane = $('#vve-paneFilters')
      const clip = state.clips.find((c) => c.id === state.selectedClipId)
      if (!clip) {
        pane.innerHTML = `<p class="vve-hint">${tt('Filtre uygulamak için önce zaman çizelgesinden bir klip seç.', 'Select a clip on the timeline first to apply a filter.')}</p>`
        return
      }
      let html = `<p class="vve-hint">${tt('Seçili klip', 'Selected clip')}: <strong>${escapeHtml(clip.name)}</strong></p><div class="vve-filter-grid">`
      FILTERS.forEach((f) => {
        html += `<button class="vve-filter-chip ${clip.filter === f.id ? 'active' : ''}" data-filter="${f.id}">${tt(f.name, f.nameEn)}</button>`
      })
      html += '</div>'
      pane.innerHTML = html
      pane.querySelectorAll('.vve-filter-chip').forEach((btn) => {
        btn.addEventListener('click', () => {
          clip.filter = btn.dataset.filter
          renderFiltersPane()
        })
      })
    }

    function renderTextPane() {
      const pane = $('#vve-paneText')
      const tx = state.texts.find((t) => t.id === state.selectedTextId)
      let html = `<button class="vve-btn-primary" id="vve-addTextBtn2">+ ${tt('Metin Ekle', 'Add Text')}</button>`
      if (tx) {
        html += `
          <div class="vve-field"><label>${tt('Metin', 'Text')}</label><textarea id="vve-txContent">${escapeHtml(tx.text)}</textarea></div>
          <div class="vve-field"><label>${tt('Renk', 'Color')}</label>
            <div class="vve-swatch-row">${CAPTION_COLORS.map((c) => `<button class="vve-swatch ${tx.color === c ? 'active' : ''}" data-color="${c}" style="background:${c}"></button>`).join('')}
              <input type="color" id="vve-txColor" value="${tx.color}">
            </div>
          </div>
          <div class="vve-field"><label>${tt('Boyut', 'Size')} <span id="vve-txSizeLabel">${tx.fontSize}px</span></label><input type="range" id="vve-txSize" min="20" max="180" value="${tx.fontSize}"></div>
          <div class="vve-field"><label>${tt('Yazı Tipi', 'Font')}</label>
            <div class="vve-select-row">
              <button class="vve-btn-small ${tx.font === 'sans' ? 'active' : ''}" data-font="sans">${tt('Sans', 'Sans')}</button>
              <button class="vve-btn-small ${tx.font === 'serif' ? 'active' : ''}" data-font="serif" style="font-family:'Cormorant Garamond',serif;">${tt('Serif', 'Serif')}</button>
              <button class="vve-btn-small ${tx.font === 'mono' ? 'active' : ''}" data-font="mono" style="font-family:'JetBrains Mono',monospace;">${tt('Mono', 'Mono')}</button>
            </div>
          </div>
          <div class="vve-field"><label>${tt('Hizalama', 'Align')}</label><div class="vve-select-row">
            <button class="vve-btn-small ${tx.align === 'left' ? 'active' : ''}" data-align="left">${tt('Sol', 'Left')}</button>
            <button class="vve-btn-small ${tx.align === 'center' ? 'active' : ''}" data-align="center">${tt('Orta', 'Center')}</button>
            <button class="vve-btn-small ${tx.align === 'right' ? 'active' : ''}" data-align="right">${tt('Sağ', 'Right')}</button>
          </div></div>
          <div class="vve-field"><label>${tt('Animasyon', 'Animation')}</label><select id="vve-txAnim">
            <option value="none" ${tx.anim === 'none' ? 'selected' : ''}>${tt('Yok', 'None')}</option>
            <option value="fade" ${tx.anim === 'fade' ? 'selected' : ''}>${tt('Belirme', 'Fade')}</option>
            <option value="slide" ${tx.anim === 'slide' ? 'selected' : ''}>${tt('Kayma', 'Slide')}</option>
          </select></div>
          <div class="vve-field"><label>${tt('Başlangıç', 'Start')} <span id="vve-txStartLabel">${formatTime(tx.startTime)}</span></label><input type="range" id="vve-txStart" min="0" max="${Math.max(state.totalDuration, 0.1)}" step="0.1" value="${tx.startTime}"></div>
          <div class="vve-field"><label>${tt('Bitiş', 'End')} <span id="vve-txEndLabel">${formatTime(tx.endTime)}</span></label><input type="range" id="vve-txEnd" min="0" max="${Math.max(state.totalDuration, 0.1)}" step="0.1" value="${tx.endTime}"></div>
          <div class="vve-btn-row">
            <button class="vve-btn-small" id="vve-txBold">${tx.bold ? tt('Kalın ✓', 'Bold ✓') : tt('Kalın', 'Bold')}</button>
            <button class="vve-btn-small" id="vve-txBg">${tx.bg ? tt('Arka Plan ✓', 'Background ✓') : tt('Arka Plan', 'Background')}</button>
            <button class="vve-btn-small danger" id="vve-txDelete">${tt('Metni Sil', 'Delete Text')}</button>
          </div>
        `
      } else {
        html += `<p class="vve-hint">${tt('Metin eklemek için yukarıdaki düğmeye bas, sonra ekranda sürükleyerek konumlandır. Emoji de yazabilirsin 🎬✨', 'Tap the button above to add text, then drag it on the screen to position it. Emoji work too 🎬✨')}</p>`
      }
      pane.innerHTML = html
      $('#vve-addTextBtn2').addEventListener('click', addTextOverlay)
      if (tx) {
        $('#vve-txContent').addEventListener('input', (e) => { tx.text = e.target.value; renderTimelineUI() })
        $('#vve-txColor').addEventListener('input', (e) => { tx.color = e.target.value; renderTextPane() })
        pane.querySelectorAll('.vve-swatch').forEach((btn) => {
          btn.addEventListener('click', () => { tx.color = btn.dataset.color; renderTextPane() })
        })
        $('#vve-txSize').addEventListener('input', (e) => { tx.fontSize = +e.target.value; $('#vve-txSizeLabel').textContent = tx.fontSize + 'px' })
        pane.querySelectorAll('[data-font]').forEach((btn) => {
          btn.addEventListener('click', () => { tx.font = btn.dataset.font; renderTextPane() })
        })
        $('#vve-txAnim').addEventListener('change', (e) => { tx.anim = e.target.value })
        $('#vve-txStart').addEventListener('input', (e) => {
          let v = +e.target.value; v = Math.min(v, tx.endTime - 0.1); e.target.value = v
          tx.startTime = v; $('#vve-txStartLabel').textContent = formatTime(v); renderTimelineUI()
        })
        $('#vve-txEnd').addEventListener('input', (e) => {
          let v = +e.target.value; v = Math.max(v, tx.startTime + 0.1); e.target.value = v
          tx.endTime = v; $('#vve-txEndLabel').textContent = formatTime(v); renderTimelineUI()
        })
        $('#vve-txBold').addEventListener('click', () => { tx.bold = !tx.bold; renderTextPane() })
        $('#vve-txBg').addEventListener('click', () => { tx.bg = !tx.bg; renderTextPane() })
        $('#vve-txDelete').addEventListener('click', () => deleteText(tx.id))
        pane.querySelectorAll('[data-align]').forEach((btn) => {
          btn.addEventListener('click', () => { tx.align = btn.dataset.align; renderTextPane() })
        })
      }
    }

    function renderMusicPane() {
      const pane = $('#vve-paneMusic')
      if (!state.music) {
        pane.innerHTML = `<button class="vve-btn-primary" id="vve-addMusicBtn">+ ${tt('Müzik Ekle', 'Add Music')}</button><p class="vve-hint">${tt('Videonun altına çalacak bir ses dosyası yükle.', 'Upload an audio file to play under your video.')}</p>`
        $('#vve-addMusicBtn').addEventListener('click', () => { ensureAudioContext(); musicInput.click() })
        return
      }
      pane.innerHTML = `
        <p class="vve-hint">🎵 <strong>${escapeHtml(state.music.name)}</strong></p>
        <div class="vve-field"><label>${tt('Ses Düzeyi', 'Volume')} <span id="vve-musicVolLabel">${Math.round(state.music.volume * 100)}%</span></label>
        <input type="range" id="vve-musicVol" min="0" max="1" step="0.01" value="${state.music.volume}"></div>
        <button class="vve-btn-small danger" id="vve-removeMusicBtn">${tt('Müziği Kaldır', 'Remove Music')}</button>
      `
      $('#vve-musicVol').addEventListener('input', (e) => {
        state.music.volume = +e.target.value
        if (musicNodes) musicNodes.gain.gain.value = state.music.volume
        $('#vve-musicVolLabel').textContent = Math.round(state.music.volume * 100) + '%'
      })
      $('#vve-removeMusicBtn').addEventListener('click', removeMusic)
    }

    function renderAdjustPane() {
      const pane = $('#vve-paneAdjust')
      const clip = state.clips.find((c) => c.id === state.selectedClipId)
      if (!clip) {
        pane.innerHTML = `<p class="vve-hint">${tt('Hız ve ses ayarları için zaman çizelgesinden bir klip seç.', 'Select a clip on the timeline for speed and volume settings.')}</p>`
        return
      }
      pane.innerHTML = `
        <p class="vve-hint">${tt('Seçili klip', 'Selected clip')}: <strong>${escapeHtml(clip.name)}</strong></p>
        <div class="vve-field"><label>${tt('Hız', 'Speed')} <span id="vve-clipSpeedLabel">${clip.speed.toFixed(2)}x</span></label>
        <input type="range" id="vve-clipSpeed" min="0.5" max="2" step="0.05" value="${clip.speed}"></div>
        <div class="vve-field"><label>${tt('Orijinal Ses', 'Original Audio')} <span id="vve-clipVolLabel">${Math.round(clip.volume * 100)}%</span></label>
        <input type="range" id="vve-clipVol" min="0" max="1" step="0.01" value="${clip.volume}"></div>
        <div class="vve-btn-row">
          <button class="vve-btn-small ${clip.muted ? 'active' : ''}" id="vve-clipMute">${clip.muted ? tt('Sessiz ✓', 'Muted ✓') : tt('Sesi Kapat', 'Mute')}</button>
        </div>
        <div class="vve-btn-row">
          <button class="vve-btn-small" id="vve-clipMoveLeft">◀ ${tt('Sola Taşı', 'Move Left')}</button>
          <button class="vve-btn-small" id="vve-clipMoveRight">${tt('Sağa Taşı', 'Move Right')} ▶</button>
        </div>
        <button class="vve-btn-small danger" id="vve-clipDelete2">${tt('Klibi Sil', 'Delete Clip')}</button>
      `
      $('#vve-clipSpeed').addEventListener('input', (e) => {
        clip.speed = +e.target.value
        $('#vve-clipSpeedLabel').textContent = clip.speed.toFixed(2) + 'x'
        recalcTimeline(); renderTimelineUI()
      })
      $('#vve-clipVol').addEventListener('input', (e) => {
        clip.volume = +e.target.value
        const nodes = clipAudioNodes.get(clip.id)
        if (nodes) nodes.gain.gain.value = clip.muted ? 0 : clip.volume
        $('#vve-clipVolLabel').textContent = Math.round(clip.volume * 100) + '%'
      })
      $('#vve-clipMute').addEventListener('click', () => {
        clip.muted = !clip.muted
        const nodes = clipAudioNodes.get(clip.id)
        if (nodes) nodes.gain.gain.value = clip.muted ? 0 : clip.volume
        renderAdjustPane()
      })
      $('#vve-clipMoveLeft').addEventListener('click', () => moveClip(clip.id, -1))
      $('#vve-clipMoveRight').addEventListener('click', () => moveClip(clip.id, 1))
      $('#vve-clipDelete2').addEventListener('click', () => removeClip(clip.id))
    }

    /* ============ GLOBAL RENDER ============ */
    function renderAll() {
      emptyState.style.display = state.clips.length ? 'none' : 'flex'
      resizeStage()
      recalcTimeline()
      renderTimelineUI()
      renderSidePanel()
    }

    /* ============ SAVE (export → upload → API) ============ */
    async function saveVisionVideo(blob, ext) {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('not_authenticated')
      const { url } = await uploadVisionVideo({ blob, userId: session.user.id, goalId: goal.id, ext })
      const res = await fetch('/api/goals/save-vision-video', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalId: goal.id, videoUrl: url }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'save_failed')
      return url
    }

    /* ============ EXPORT ============ */
    async function exportVideo() {
      if (!state.clips.length) { toast(tt('Önce bir video ekle', 'Add a video first')); return }
      if (!stage.captureStream || !window.MediaRecorder) {
        toast(tt('Tarayıcın video dışa aktarmayı desteklemiyor', "Your browser doesn't support video export"))
        return
      }
      ensureAudioContext()
      if (!streamDest) { toast(tt('Ses motoru başlatılamadı', 'Could not start the audio engine')); return }

      state.isExporting = true
      playBtn.disabled = true
      exportOverlay.classList.add('show')
      exportDone.hidden = true
      exportStatus.textContent = tt('Hazırlanıyor…', 'Preparing…')
      progressFill.style.width = '0%'
      progressFill.classList.remove('success')

      let progressTimer = null
      try {
        pause()
        seekGlobal(0)
        await new Promise((r) => setTimeout(r, 150))

        const candidates = [
          'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
          'video/mp4',
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp8,opus',
          'video/webm',
        ]
        const mimeType = candidates.find((c) => MediaRecorder.isTypeSupported(c))
        if (!mimeType) {
          exportStatus.textContent = tt('Desteklenen bir video formatı bulunamadı.', 'No supported video format was found.')
          exportDone.hidden = false
          return
        }

        const canvasStream = stage.captureStream(30)
        const combined = new MediaStream(
          canvasStream.getVideoTracks().concat(streamDest.stream.getAudioTracks())
        )

        const recorder = new MediaRecorder(combined, { mimeType, videoBitsPerSecond: 9000000 })
        const chunks = []
        recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data) }
        const stopped = new Promise((resolve) => { recorder.onstop = resolve })

        recorder.start(200)
        exportStatus.textContent = tt('Kaydediliyor…', 'Recording…')
        play()

        const totalMs = Math.max(state.totalDuration * 1000, 100)
        const startedAt = performance.now()
        progressTimer = setInterval(() => {
          const pct = Math.min(45, ((performance.now() - startedAt) / totalMs) * 45)
          progressFill.style.width = pct + '%'
        }, 150)

        await waitUntilEnd()
        clearInterval(progressTimer); progressTimer = null
        recorder.stop()
        await stopped

        const ext = mimeType.indexOf('mp4') !== -1 ? 'mp4' : 'webm'
        const blob = new Blob(chunks, { type: ext === 'mp4' ? 'video/mp4' : 'video/webm' })

        exportStatus.textContent = tt('Vizyon panosuna kaydediliyor…', 'Saving to your vision board…')
        progressFill.style.width = '65%'

        const savedUrl = await saveVisionVideo(blob, ext)

        progressFill.style.width = '100%'
        progressFill.classList.add('success')
        exportStatus.textContent = tt('Kaydedildi! Vizyon videon hazır.', 'Saved! Your vision video is ready.')

        // Cihaza da indirme seçeneği (opsiyonel, ikincil)
        const localUrl = URL.createObjectURL(blob)
        downloadLink.href = localUrl
        downloadLink.download = `vizyon-videosu.${ext}`
        downloadLink.style.display = ''
        exportDone.hidden = false

        onChangedRef.current?.(savedUrl)
      } catch (err) {
        console.error(err)
        exportStatus.textContent = getVisionVideoErrorMessage(err, lang)
        downloadLink.style.display = 'none'
        exportDone.hidden = false
      } finally {
        if (progressTimer) clearInterval(progressTimer)
        state.isExporting = false
        recalcTimeline()
      }
    }

    /* ============ EVENTS ============ */
    function onAddClipClick() { ensureAudioContext(); fileInput.click() }
    function onFileInputChange(e) { handleFiles(e.target.files); fileInput.value = '' }
    function onMusicInputChange(e) { handleMusicFile(e.target.files[0]); musicInput.value = '' }
    function onDeleteClipClick() { if (state.selectedClipId) removeClip(state.selectedClipId) }
    function onCloseExportClick() { exportOverlay.classList.remove('show') }
    function onViewfinderDragOver(e) { e.preventDefault() }
    function onViewfinderDrop(e) { e.preventDefault(); handleFiles(e.dataTransfer.files) }
    function onKeyDown(e) {
      if (e.code === 'Space' && !state.isExporting && ['TEXTAREA', 'INPUT'].indexOf(document.activeElement.tagName) === -1) {
        e.preventDefault()
        togglePlay()
      }
    }

    addClipBtn.addEventListener('click', onAddClipClick)
    emptyAddBtn.addEventListener('click', onAddClipClick)
    fileInput.addEventListener('change', onFileInputChange)
    musicInput.addEventListener('change', onMusicInputChange)
    playBtn.addEventListener('click', togglePlay)
    splitBtn.addEventListener('click', splitAtPlayhead)
    deleteClipBtn.addEventListener('click', onDeleteClipClick)
    exportBtn.addEventListener('click', exportVideo)
    closeExportBtn.addEventListener('click', onCloseExportClick)

    const ratioBtns = root.querySelectorAll('.vve-ratio-btn')
    function onRatioBtnClick(btn) {
      state.ratio = btn.dataset.ratio
      ratioBtns.forEach((b) => b.classList.toggle('active', b === btn))
      resizeStage()
    }
    ratioBtns.forEach((btn) => btn.addEventListener('click', () => onRatioBtnClick(btn)))

    const tabBtns = root.querySelectorAll('.vve-tab-btn')
    tabBtns.forEach((btn) => btn.addEventListener('click', () => setActiveTab(btn.dataset.tab)))

    viewfinder.addEventListener('dragover', onViewfinderDragOver)
    viewfinder.addEventListener('drop', onViewfinderDrop)
    document.addEventListener('keydown', onKeyDown)

    /* ============ INIT ============ */
    recalcTimeline()
    renderAll()
    rafId = requestAnimationFrame(tick)

    /* ============ CLEANUP ============ */
    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resizeStage)
      window.removeEventListener('pointerup', onWindowPointerUp)
      document.removeEventListener('keydown', onKeyDown)
      pauseAllVideos()
      state.clips.forEach((c) => { try { URL.revokeObjectURL(c.url) } catch (e) { /* ignore */ } })
      if (state.music) { try { URL.revokeObjectURL(state.music.url) } catch (e) { /* ignore */ } }
      if (audioCtx) { try { audioCtx.close() } catch (e) { /* ignore */ } }
      clearTimeout(toastTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const tr = lang === 'tr'

  return (
    <div className="vve-root" ref={rootRef} role="dialog" aria-modal="true" aria-label={tr ? 'Vizyon Videosu Editörü' : 'Vision Video Editor'}>
      <div ref={hiddenMediaRef} style={{ display: 'none' }} />

      <header className="vve-topbar">
        <button className="vve-icon-btn" onClick={onClose} aria-label={tr ? 'Kapat' : 'Close'}>
          <X size={18} />
        </button>
        <div className="vve-brand">
          {tr ? 'Vizyon Videosu' : 'Vision Video'}
          <small>{goal?.title || ''}</small>
        </div>
        <button id="vve-exportBtn" className="vve-btn-export" disabled>{tr ? 'Kaydet' : 'Save'}</button>
      </header>

      <div className="vve-main-area">
        <div className="vve-preview-wrap">
          <div className="vve-viewfinder" id="vve-viewfinder">
            <canvas id="vve-stage" />
            <div className="vve-corner tl" /><div className="vve-corner tr" /><div className="vve-corner bl" /><div className="vve-corner br" />
            <div className="vve-empty-state" id="vve-emptyState">
              <p>{tr ? 'Başlamak için bir video ekle ya da buraya sürükle' : 'Add a video to get started, or drop it here'}</p>
              <button id="vve-emptyAddBtn" className="vve-btn-primary">+ {tr ? 'Video Ekle' : 'Add Video'}</button>
            </div>
          </div>
          <div className="vve-transport">
            <button id="vve-playBtn" className="vve-play-btn" disabled>▶</button>
            <span className="vve-time-display"><span id="vve-curTime">0:00</span> / <span id="vve-totalTime">0:00</span></span>
            <div className="vve-aspect-toggle">
              <button data-ratio="9:16" className="vve-ratio-btn active">9:16</button>
              <button data-ratio="1:1" className="vve-ratio-btn">1:1</button>
              <button data-ratio="16:9" className="vve-ratio-btn">16:9</button>
            </div>
          </div>
        </div>

        <aside className="vve-side-panel">
          <div className="vve-tabs">
            <button className="vve-tab-btn active" data-tab="filters">{tr ? 'Filtreler' : 'Filters'}</button>
            <button className="vve-tab-btn" data-tab="text">{tr ? 'Metin' : 'Text'}</button>
            <button className="vve-tab-btn" data-tab="music">{tr ? 'Müzik' : 'Music'}</button>
            <button className="vve-tab-btn" data-tab="adjust">{tr ? 'Ayarla' : 'Adjust'}</button>
          </div>
          <div className="vve-tab-content">
            <div className="vve-tab-pane active" data-pane="filters" id="vve-paneFilters" />
            <div className="vve-tab-pane" data-pane="text" id="vve-paneText" />
            <div className="vve-tab-pane" data-pane="music" id="vve-paneMusic" />
            <div className="vve-tab-pane" data-pane="adjust" id="vve-paneAdjust" />
          </div>
        </aside>
      </div>

      <div className="vve-timeline-panel">
        <div className="vve-timeline-toolbar">
          <button id="vve-addClipBtn" className="vve-tool-btn">+ {tr ? 'Video' : 'Video'}</button>
          <button id="vve-splitBtn" className="vve-tool-btn" disabled>{tr ? 'Böl' : 'Split'}</button>
          <button id="vve-deleteClipBtn" className="vve-tool-btn danger" disabled>{tr ? 'Sil' : 'Delete'}</button>
          <span className="vve-spacer" />
          <span className="vve-zoom-label">{tr ? 'Zaman Çizelgesi' : 'Timeline'}</span>
        </div>
        <div className="vve-timeline-scroll" id="vve-timelineScroll">
          <div className="vve-ruler" id="vve-ruler" />
          <div className="vve-track vve-clip-track" id="vve-clipTrack" />
          <div className="vve-track vve-text-track" id="vve-textTrack" />
          <div className="vve-track vve-music-track" id="vve-musicTrackEl" />
          <div className="vve-playhead" id="vve-playheadLine" />
        </div>
      </div>

      <input type="file" id="vve-fileInput" accept="video/*" multiple hidden />
      <input type="file" id="vve-musicInput" accept="audio/*" hidden />

      <div className="vve-export-overlay" id="vve-exportOverlay">
        <div className="vve-export-card">
          <div className="vve-spinner" />
          <p id="vve-exportStatus">{tr ? 'Hazırlanıyor…' : 'Preparing…'}</p>
          <div className="vve-progress-bar"><div className="vve-progress-fill" id="vve-progressFill" /></div>
          <div id="vve-exportDone" className="vve-export-done" hidden>
            <a id="vve-downloadLink" className="vve-btn-secondary" download="vizyon-videosu.webm">{tr ? 'Cihaza da indir' : 'Also download'}</a>
            <button id="vve-closeExportBtn" className="vve-btn-primary">{tr ? 'Kapat' : 'Close'}</button>
          </div>
        </div>
      </div>

      <div className="vve-toast" id="vve-toast" />

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Cormorant+Garamond:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

        .vve-root {
          --vve-bg: #04060E;
          --vve-panel: #090D1A;
          --vve-panel-2: #121826;
          --vve-border: rgba(255,255,255,0.09);
          --vve-text: #F2EFEA;
          --vve-text-dim: #94a3b8;
          --vve-accent: #d946ef;
          --vve-accent-2: #22d3ee;
          --vve-on-accent: #ffffff;
          --vve-on-accent-2: #04060E;
          --vve-danger: #f43f5e;
          --vve-success: #10b981;
          position: fixed; inset: 0; z-index: 200;
          display: flex; flex-direction: column;
          height: 100vh; height: 100dvh;
          background: var(--vve-bg); color: var(--vve-text);
          font-family: 'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif;
          overflow: hidden; overscroll-behavior: none;
        }
        .vve-root *{ box-sizing: border-box; }
        .vve-root button, .vve-root input, .vve-root select, .vve-root textarea { font-family: inherit; }

        .vve-topbar{ flex:0 0 auto; display:flex; align-items:center; justify-content:space-between; gap:10px; padding:12px 16px; border-bottom:1px solid var(--vve-border); background:var(--vve-panel); }
        .vve-icon-btn{ background:transparent; border:1px solid var(--vve-border); color:var(--vve-text-dim); width:34px; height:34px; border-radius:8px; display:flex; align-items:center; justify-content:center; cursor:pointer; flex:0 0 auto; }
        .vve-brand{ font-family:'Cormorant Garamond', serif; font-weight:600; font-size:19px; text-align:center; flex:1 1 auto; line-height:1.15; color:var(--vve-text); }
        .vve-brand small{ display:block; font-family:'Plus Jakarta Sans', sans-serif; font-weight:400; font-size:10.5px; color:var(--vve-text-dim); letter-spacing:0.02em; margin-top:1px; }
        .vve-btn-export{ background:var(--vve-accent); color:var(--vve-on-accent); border:none; font-weight:700; padding:9px 16px; border-radius:9999px; font-size:13.5px; cursor:pointer; flex:0 0 auto; }
        .vve-btn-export:disabled{ opacity:0.4; cursor:not-allowed; }

        .vve-main-area{ flex:1 1 auto; display:flex; flex-direction:column; min-height:0; }
        @media(min-width:900px){ .vve-main-area{ flex-direction:row; } }

        .vve-preview-wrap{ flex:1 1 auto; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:0; background:#000; position:relative; padding:14px; gap:10px; }
        .vve-viewfinder{ position:relative; max-height:100%; max-width:100%; display:flex; align-items:center; justify-content:center; }
        #vve-stage{ max-height:100%; max-width:100%; background:#000; border-radius:6px; display:block; touch-action:none; }
        .vve-corner{ position:absolute; width:22px; height:22px; border:2px solid var(--vve-accent-2); opacity:0.85; pointer-events:none; }
        .vve-corner.tl{ top:-2px; left:-2px; border-right:none; border-bottom:none; }
        .vve-corner.tr{ top:-2px; right:-2px; border-left:none; border-bottom:none; }
        .vve-corner.bl{ bottom:-2px; left:-2px; border-right:none; border-top:none; }
        .vve-corner.br{ bottom:-2px; right:-2px; border-left:none; border-top:none; }

        .vve-empty-state{ position:absolute; inset:0; display:flex; flex-direction:column; gap:14px; align-items:center; justify-content:center; text-align:center; padding:20px; }
        .vve-empty-state p{ color:var(--vve-text-dim); font-size:14px; max-width:220px; }

        .vve-transport{ display:flex; align-items:center; gap:14px; width:100%; max-width:420px; flex-wrap:wrap; justify-content:center; }
        .vve-play-btn{ width:40px; height:40px; border-radius:50%; background:var(--vve-panel-2); border:1px solid var(--vve-border); color:var(--vve-text); font-size:15px; cursor:pointer; display:flex; align-items:center; justify-content:center; }
        .vve-play-btn:disabled{ opacity:0.35; }
        .vve-time-display{ font-variant-numeric:tabular-nums; font-size:12.5px; color:var(--vve-text-dim); }
        .vve-aspect-toggle{ display:flex; gap:4px; background:var(--vve-panel-2); padding:3px; border-radius:8px; }
        .vve-ratio-btn{ background:transparent; border:none; color:var(--vve-text-dim); font-size:11px; padding:5px 8px; border-radius:6px; cursor:pointer; }
        .vve-ratio-btn.active{ background:var(--vve-accent-2); color:var(--vve-on-accent-2); font-weight:700; }

        .vve-side-panel{ flex:0 0 auto; background:var(--vve-panel); border-top:1px solid var(--vve-border); display:flex; flex-direction:column; }
        @media(min-width:900px){ .vve-side-panel{ flex:0 0 300px; border-top:none; border-left:1px solid var(--vve-border); height:100%; } }
        .vve-tabs{ display:flex; border-bottom:1px solid var(--vve-border); }
        .vve-tab-btn{ flex:1; background:transparent; border:none; color:var(--vve-text-dim); padding:11px 6px; font-size:12.5px; font-weight:600; cursor:pointer; border-bottom:2px solid transparent; }
        .vve-tab-btn.active{ color:var(--vve-text); border-bottom-color:var(--vve-accent); }
        .vve-tab-content{ flex:1; overflow-y:auto; padding:14px; min-height:150px; max-height:220px; }
        @media(min-width:900px){ .vve-tab-content{ max-height:none; } }
        .vve-tab-pane{ display:none; flex-direction:column; gap:12px; }
        .vve-tab-pane.active{ display:flex; }

        .vve-filter-grid{ display:flex; flex-wrap:wrap; gap:8px; }
        .vve-filter-chip{ background:var(--vve-panel-2); border:1px solid var(--vve-border); color:var(--vve-text); padding:8px 12px; border-radius:9999px; font-size:12.5px; cursor:pointer; }
        .vve-filter-chip.active{ background:var(--vve-accent-2); color:var(--vve-on-accent-2); border-color:var(--vve-accent-2); font-weight:700; }
        .vve-hint{ color:var(--vve-text-dim); font-size:11.5px; line-height:1.5; }

        .vve-field{ display:flex; flex-direction:column; gap:6px; }
        .vve-field label{ font-size:11.5px; color:var(--vve-text-dim); display:flex; justify-content:space-between; }
        .vve-root input[type=range]{ width:100%; accent-color:var(--vve-accent-2); }
        .vve-root input[type=text], .vve-root input[type=color], .vve-root select, .vve-root textarea{
          background:var(--vve-panel-2); border:1px solid var(--vve-border); color:var(--vve-text);
          padding:8px 10px; border-radius:8px; font-size:13px; width:100%;
        }
        .vve-root input[type=color]{ padding:4px; height:32px; width:40px; cursor:pointer; flex:0 0 auto; }
        .vve-root textarea{ resize:vertical; min-height:50px; }
        .vve-swatch-row{ display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
        .vve-swatch{ width:24px; height:24px; border-radius:50%; border:2px solid transparent; cursor:pointer; padding:0; }
        .vve-swatch.active{ border-color:var(--vve-accent-2); }
        .vve-btn-primary{ background:var(--vve-accent); color:var(--vve-on-accent); border:none; padding:10px 16px; border-radius:8px; font-weight:700; font-size:13.5px; cursor:pointer; }
        .vve-btn-secondary{ background:transparent; color:var(--vve-text); border:1px solid var(--vve-border); padding:10px 16px; border-radius:8px; font-size:13.5px; cursor:pointer; text-decoration:none; display:inline-flex; align-items:center; justify-content:center; }
        .vve-btn-row{ display:flex; gap:8px; flex-wrap:wrap; }
        .vve-btn-small{ background:var(--vve-panel-2); border:1px solid var(--vve-border); color:var(--vve-text); padding:7px 10px; border-radius:7px; font-size:12px; cursor:pointer; }
        .vve-btn-small.danger{ color:var(--vve-danger); border-color:rgba(244,63,94,0.4); }
        .vve-btn-small.active{ background:var(--vve-accent-2); color:var(--vve-on-accent-2); border-color:var(--vve-accent-2); font-weight:700; }
        .vve-select-row{ display:flex; gap:8px; }

        .vve-timeline-panel{ flex:0 0 auto; background:var(--vve-panel); border-top:1px solid var(--vve-border); }
        .vve-timeline-toolbar{ display:flex; align-items:center; gap:8px; padding:8px 12px; border-bottom:1px solid var(--vve-border); }
        .vve-tool-btn{ background:var(--vve-panel-2); border:1px solid var(--vve-border); color:var(--vve-text); padding:7px 12px; border-radius:7px; font-size:12.5px; cursor:pointer; }
        .vve-tool-btn:disabled{ opacity:0.35; cursor:not-allowed; }
        .vve-tool-btn.danger{ color:var(--vve-danger); }
        .vve-spacer{ flex:1; }
        .vve-zoom-label{ color:var(--vve-text-dim); font-size:11px; }

        .vve-timeline-scroll{ position:relative; overflow-x:auto; overflow-y:hidden; padding:8px 12px 12px; height:170px; }
        .vve-ruler{ height:16px; position:relative; border-bottom:1px solid var(--vve-border); margin-bottom:6px; min-width:100%; }
        .vve-tick{ position:absolute; bottom:0; width:1px; height:8px; background:var(--vve-text-dim); }
        .vve-tick-label{ position:absolute; bottom:9px; font-size:9px; color:var(--vve-text-dim); transform:translateX(2px); white-space:nowrap; }

        .vve-track{ position:relative; height:44px; margin-bottom:6px; min-width:100%; }
        .vve-clip-track{ height:52px; }
        .vve-clip-block{ position:absolute; top:0; height:100%; border-radius:6px; overflow:hidden; background:var(--vve-panel-2) center/cover no-repeat; border:2px solid transparent; cursor:pointer; display:flex; align-items:flex-end; }
        .vve-clip-block.selected{ border-color:var(--vve-accent-2); }
        .vve-clip-label{ background:linear-gradient(transparent, rgba(0,0,0,0.75)); width:100%; padding:3px 6px; font-size:10px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .vve-trim-handle{ position:absolute; top:0; bottom:0; width:14px; background:rgba(34,211,238,0.9); cursor:ew-resize; touch-action:none; display:none; }
        .vve-trim-handle.left{ left:0; border-radius:6px 0 0 6px; }
        .vve-trim-handle.right{ right:0; border-radius:0 6px 6px 0; }
        .vve-clip-block.selected .vve-trim-handle{ display:block; }

        .vve-text-track{ height:26px; }
        .vve-text-block{ position:absolute; top:0; height:100%; background:rgba(34,211,238,0.22); border:1px solid var(--vve-accent-2); border-radius:5px; font-size:10px; color:var(--vve-text); padding:3px 6px; overflow:hidden; white-space:nowrap; cursor:pointer; }
        .vve-text-block.selected{ background:rgba(34,211,238,0.5); }

        .vve-music-track{ height:30px; }
        .vve-music-block{ position:absolute; top:0; left:0; height:100%; background:rgba(217,70,239,0.18); border:1px solid var(--vve-accent); border-radius:5px; font-size:10px; padding:5px 8px; color:var(--vve-text); white-space:nowrap; overflow:hidden; }

        .vve-playhead{ position:absolute; top:0; bottom:0; width:2px; background:var(--vve-accent); pointer-events:none; z-index:5; }
        .vve-playhead::before{ content:''; position:absolute; top:-4px; left:50%; transform:translateX(-50%); width:0; height:0; border-left:5px solid transparent; border-right:5px solid transparent; border-top:6px solid var(--vve-accent); }

        .vve-export-overlay{ position:fixed; inset:0; background:rgba(4,6,14,0.92); display:none; align-items:center; justify-content:center; z-index:210; padding:20px; }
        .vve-export-overlay.show{ display:flex; }
        .vve-export-card{ background:var(--vve-panel); border:1px solid var(--vve-border); border-radius:16px; padding:28px; width:100%; max-width:320px; text-align:center; display:flex; flex-direction:column; gap:14px; align-items:center; }
        .vve-spinner{ width:34px; height:34px; border:3px solid var(--vve-panel-2); border-top-color:var(--vve-accent); border-radius:50%; animation:vve-spin 0.8s linear infinite; }
        @keyframes vve-spin{ to{ transform:rotate(360deg); } }
        .vve-progress-bar{ width:100%; height:6px; background:var(--vve-panel-2); border-radius:3px; overflow:hidden; }
        .vve-progress-fill{ height:100%; width:0%; background:var(--vve-accent-2); transition:width 0.2s; }
        .vve-progress-fill.success{ background:var(--vve-success); }
        .vve-export-done{ display:flex; gap:8px; }

        .vve-toast{ position:fixed; bottom:20px; left:50%; transform:translateX(-50%) translateY(20px); background:var(--vve-panel-2); border:1px solid var(--vve-border); color:var(--vve-text); padding:10px 18px; border-radius:9999px; font-size:13px; opacity:0; pointer-events:none; transition:all 0.25s; z-index:220; max-width:85vw; text-align:center; }
        .vve-toast.show{ opacity:1; transform:translateX(-50%) translateY(0); }

        .vve-root ::-webkit-scrollbar{ height:6px; width:6px; }
        .vve-root ::-webkit-scrollbar-thumb{ background:var(--vve-border); border-radius:3px; }
      `}</style>
    </div>
  )
}
