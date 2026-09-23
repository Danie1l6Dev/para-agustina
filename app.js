/* ==========================================================================
   Para Agustina — lógica de la app
   Todo el contenido sale de window.PAGE_DATA (ver data.js).
   ========================================================================== */
(function(){
  "use strict";

  var DATA = window.PAGE_DATA;
  var reduceMotion = false;
  try{ reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){}

  var app = document.getElementById('app');
  var fxLayer = document.getElementById('fxLayer');

  // El jardín ya no guarda nada (siempre arranca cerrado). Lo único que se
  // guarda es el contador de la flor final. Para reiniciarlo, abrí el link
  // con "?reset=1" una vez (por ejemplo .../index.html?reset=1).
  try{
    if(location.search.indexOf('reset=1') !== -1){
      localStorage.removeItem('pa_garden_v1');
      localStorage.removeItem('pa_tap_count');
    }
  }catch(e){}

  /* ---------------------------------------------------------------------
     Helpers generales
     --------------------------------------------------------------------- */
  function getPath(obj, path){
    return path.split('.').reduce(function(o,k){ return (o && o[k] !== undefined) ? o[k] : undefined; }, obj);
  }

  function applyDataFields(){
    document.querySelectorAll('[data-field]').forEach(function(el){
      var val = getPath(DATA, el.getAttribute('data-field'));
      if(val !== undefined) el.textContent = val;
    });
  }

  function burst(el, count, spread){
    if(!app || !fxLayer) return;
    count = count || 6;
    spread = spread || 1;
    var appRect = app.getBoundingClientRect();
    var r = el.getBoundingClientRect();
    var x = r.left + r.width/2 - appRect.left;
    var y = r.top + r.height/2 - appRect.top;
    for(var i=0;i<count;i++){
      var p = document.createElement('span');
      p.className = 'fx-petal';
      var angle = Math.random()*Math.PI*2;
      var dist = (36 + Math.random()*44) * spread;
      var delay = Math.random()*120;
      p.style.left = x + 'px';
      p.style.top = y + 'px';
      p.style.animationDelay = delay + 'ms';
      p.style.setProperty('--dx', (Math.cos(angle)*dist) + 'px');
      p.style.setProperty('--dy', (Math.sin(angle)*dist + 34*spread) + 'px');
      p.style.setProperty('--rot', (Math.random()*360) + 'deg');
      if(spread > 1){ p.style.width = '13px'; p.style.height = '18px'; }
      fxLayer.appendChild(p);
      (function(node, life){ setTimeout(function(){ node.remove(); }, life); })(p, 950 + delay);
    }
    el.classList.remove('pulse');
    void el.offsetWidth;
    el.classList.add('pulse');
  }

  function fmtTime(sec){
    sec = Math.max(0, Math.floor(sec));
    var m = Math.floor(sec/60);
    var s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function countUp(el, target, formatter){
    if(reduceMotion || !('requestAnimationFrame' in window)){
      el.textContent = formatter(target);
      return;
    }
    var start = null;
    var duration = 1100;
    function step(ts){
      if(start === null) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = formatter(Math.round(target * eased));
      if(progress < 1) requestAnimationFrame(step);
      else el.textContent = formatter(target);
    }
    requestAnimationFrame(step);
  }

  function onVisibleOnce(el, cb){
    if(!('IntersectionObserver' in window)){ cb(); return; }
    var obs = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){ cb(); obs.disconnect(); }
      });
    }, { threshold: .5 });
    obs.observe(el);
  }

  /* ---------------------------------------------------------------------
     Navegación entre pantallas
     --------------------------------------------------------------------- */
  var screens = Array.prototype.slice.call(document.querySelectorAll('.screen'));
  var dots = Array.prototype.slice.call(document.querySelectorAll('.dot'));

  function goTo(id){
    var el = document.getElementById(id);
    if(el) el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }

  function goToNextScreen(fromEl){
    var screen = fromEl.closest('.screen');
    var idx = screens.indexOf(screen);
    if(idx > -1 && idx < screens.length - 1) goTo(screens[idx+1].id);
  }

  dots.forEach(function(d){
    d.addEventListener('click', function(){ goTo(d.getAttribute('data-target')); });
  });

  document.querySelectorAll('[data-next]').forEach(function(btn){
    btn.addEventListener('click', function(){ goToNextScreen(btn); });
  });

  if('IntersectionObserver' in window){
    var screenObs = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          var idx = screens.indexOf(entry.target);
          dots.forEach(function(d,i){ d.classList.toggle('active', i === idx); });
        }
      });
    }, { threshold: .5 });
    screens.forEach(function(s){ screenObs.observe(s); });
  }

  var enterBtn = document.getElementById('enterBtn');
  if(enterBtn) enterBtn.addEventListener('click', function(){ goTo('screen-1'); });

  /* ---------------------------------------------------------------------
     Flores del ramo (portada) — florecen solas, se tocan
     --------------------------------------------------------------------- */
  document.querySelectorAll('.flower-btn').forEach(function(el){
    el.addEventListener('click', function(){ burst(el); });
    el.addEventListener('keydown', function(e){
      if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); burst(el); }
    });
  });

  /* ---------------------------------------------------------------------
     Pantalla 1 — Jardín
     --------------------------------------------------------------------- */
  function renderGarden(){
    var grid = document.getElementById('gardenGrid');
    if(!grid) return;
    grid.innerHTML = '';
    DATA.garden.forEach(function(text, i){
      var btn = document.createElement('button');
      btn.className = 'garden-flower';
      btn.setAttribute('data-index', i);
      btn.setAttribute('aria-label', 'Abrir flor ' + (i+1));
      btn.innerHTML =
        '<svg viewBox="0 0 40 50">' +
          '<g class="bud"><ellipse cx="20" cy="26" rx="9" ry="14"/><path d="M20,40 L20,48" stroke="var(--green)" stroke-width="3" stroke-linecap="round"/></g>' +
          '<g class="bloom"><g transform="translate(20,20) scale(1.35)"><use href="#flowerCore"/></g><path d="M20,29 L20,48" stroke="var(--green)" stroke-width="3" stroke-linecap="round"/></g>' +
        '</svg>' +
        '<span class="num">' + (i+1) + '</span>';
      btn.addEventListener('click', function(){ onGardenTap(i, btn); });
      grid.appendChild(btn);
    });
  }

  function onGardenTap(i, btn){
    btn.classList.add('opened');
    var msgBox = document.getElementById('gardenMessage');
    msgBox.innerHTML = '';
    var p = document.createElement('p');
    p.textContent = DATA.garden[i];
    if(p.textContent.indexOf('[EDITAR]') === 0) p.classList.add('placeholder-text');
    msgBox.appendChild(p);
  }

  renderGarden();

  /* ---------------------------------------------------------------------
     Pantalla 4 — Carta
     --------------------------------------------------------------------- */
  function renderLetter(){
    var L = DATA.letter;
    document.getElementById('envelopeLabel').textContent = L.envelopeCta;
    document.getElementById('bulbCaption').textContent = L.bulbOff;
    document.getElementById('letterGreeting').textContent = L.greeting;
    var body = document.getElementById('letterBody');
    body.innerHTML = '';
    L.paragraphs.forEach(function(t){
      var p = document.createElement('p');
      p.className = 'body-p';
      p.textContent = t;
      body.appendChild(p);
    });
    document.getElementById('letterSignOff').textContent = L.signOff;
    document.getElementById('letterSignature').textContent = L.signature;
  }
  renderLetter();

  var envelopeBtn = document.getElementById('envelopeBtn');
  if(envelopeBtn){
    envelopeBtn.addEventListener('click', function(){
      this.classList.add('opened');
      var self = this;
      setTimeout(function(){
        self.setAttribute('tabindex','-1');
        var card = document.getElementById('letterCard');
        card.classList.add('show');
        card.addEventListener('transitionend', function handler(e){
          if(e.propertyName === 'max-height'){
            card.style.overflow = 'visible';
            card.removeEventListener('transitionend', handler);
          }
        });
      }, 220);
    });
  }

  var bulbBtn = document.getElementById('bulbBtn');
  var bulbCaption = document.getElementById('bulbCaption');
  var lit = false;
  if(bulbBtn){
    bulbBtn.addEventListener('click', function(){
      lit = !lit;
      bulbBtn.classList.toggle('lit', lit);
      bulbBtn.setAttribute('aria-pressed', String(lit));
      bulbCaption.textContent = lit ? DATA.letter.bulbOn : DATA.letter.bulbOff;
      if(lit && !reduceMotion){
        bulbBtn.classList.remove('flicker');
        void bulbBtn.offsetWidth;
        bulbBtn.classList.add('flicker');
      }
    });
  }

  /* ---------------------------------------------------------------------
     Pantalla 2 — Flor de pétalos
     --------------------------------------------------------------------- */
  var petalRevealed = DATA.petals.items.map(function(){ return false; });

  function buildBigFlower(){
    var svg = document.getElementById('bigFlowerSvg');
    var items = DATA.petals.items;
    var n = items.length;
    var html = '';
    items.forEach(function(_, i){
      var angle = i * (360 / n);
      html += '<g transform="rotate(' + angle + ')">' +
                '<g class="petal-btn" tabindex="0" role="button" aria-label="Pétalo ' + (i+1) + '" data-index="' + i + '">' +
                  '<path class="petal-shape" d="M0,0 C-16,-14 -18,-50 0,-62 C18,-50 16,-14 0,0 Z"/>' +
                '</g>' +
              '</g>';
    });
    html += '<circle class="petal-center" r="20"/>';
    svg.innerHTML = html;
    svg.querySelectorAll('.petal-btn').forEach(function(g){
      var idx = parseInt(g.getAttribute('data-index'), 10);
      g.addEventListener('click', function(){ onPetalTap(idx, g); });
      g.addEventListener('keydown', function(e){
        if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); onPetalTap(idx, g); }
      });
    });
  }

  function updatePetalProgress(){
    var total = DATA.petals.items.length;
    var count = petalRevealed.filter(Boolean).length;
    document.getElementById('petalProgress').textContent = count + ' / ' + total + ' ' + DATA.petals.progress;
  }

  function onPetalTap(i, el){
    el.classList.add('revealed');
    var msgBox = document.getElementById('petalMessage');
    msgBox.innerHTML = '';
    var p = document.createElement('p');
    p.textContent = DATA.petals.items[i];
    msgBox.appendChild(p);
    if(!petalRevealed[i]){
      petalRevealed[i] = true;
      updatePetalProgress();
    }
  }

  document.getElementById('petalsTitle').textContent = DATA.petals.title;
  document.getElementById('petalsHint').textContent = DATA.petals.hint;
  buildBigFlower();
  updatePetalProgress();

  /* ---------------------------------------------------------------------
     Pantalla 3 — Música
     Arranca sola al tocar "entrar" en la portada y sigue sonando de fondo
     sin importar por qué pantalla vaya (no se pausa al scrollear).
     --------------------------------------------------------------------- */
  var song = DATA.song;
  document.getElementById('songIntro').textContent = song.intro;
  document.getElementById('songTitle').textContent = song.title;
  document.getElementById('songArtist').textContent = song.artist;

  var audioEl = document.getElementById('audioEl');
  var playBtn = document.getElementById('playBtn');
  var iconPlay = document.getElementById('iconPlay');
  var iconPause = document.getElementById('iconPause');
  var progressFill = document.getElementById('progressFill');
  var progressTrack = document.getElementById('progressTrack');
  var timeCurrent = document.getElementById('timeCurrent');
  var timeTotal = document.getElementById('timeTotal');
  var songNote = document.getElementById('songNote');
  var miniPlayBtn = document.getElementById('miniPlayBtn');
  var miniIconPlay = document.getElementById('miniIconPlay');
  var miniIconPause = document.getElementById('miniIconPause');
  var lyricsPanel = document.getElementById('lyricsPanel');

  var useRealAudio = !!song.audioSrc;
  var simSeconds = 0;
  var simTimer = null;
  var simPlaying = false;
  var lastLyricIndex = -2;

  // Arma la lista de versos con su tiempo a partir de un solo bloque de
  // texto pegado en data.js (song.lyricsRaw), una línea por renglón.
  // Si existe song.lyricsTimes (tiempos exactos capturados con la
  // herramienta calibrar-letra.html) se usan esos, uno por línea, en el
  // mismo orden. Si no, se estima con lyricsInterval/stanzaPause.
  var songLyrics = (function(){
    var rawLines = (song.lyricsRaw || '').split('\n');
    var nonBlank = rawLines.map(function(s){ return s.trim(); }).filter(function(s){ return s.length > 0; });

    if(song.lyricsTimes && song.lyricsTimes.length === nonBlank.length){
      var offset = song.lyricsOffset || 0;
      return nonBlank.map(function(line, i){ return { t: Math.max(0, song.lyricsTimes[i] - offset), line: line }; });
    }

    var t = song.lyricsStart || 0;
    var out = [];
    rawLines.forEach(function(rawLine){
      var line = rawLine.trim();
      if(!line){
        t += (song.stanzaPause || 0);
        return;
      }
      out.push({ t: t, line: line });
      t += (song.lyricsInterval || 3.5);
    });
    return out;
  })();

  function updateLyrics(t){
    if(!lyricsPanel || !songLyrics.length) return;
    var idx = -1;
    for(var i=0;i<songLyrics.length;i++){
      if(t >= songLyrics[i].t) idx = i; else break;
    }
    if(idx === lastLyricIndex) return;
    lastLyricIndex = idx;
    var text = idx >= 0 ? songLyrics[idx].line : '';
    if(!text){ lyricsPanel.classList.remove('show'); return; }
    lyricsPanel.textContent = text;
    lyricsPanel.classList.add('show');
  }

  function setPlayingUI(isPlaying){
    iconPlay.style.display = isPlaying ? 'none' : '';
    iconPause.style.display = isPlaying ? '' : 'none';
    playBtn.setAttribute('aria-label', isPlaying ? 'Pausar' : 'Reproducir');
    if(miniPlayBtn){
      miniPlayBtn.hidden = false;
      miniIconPlay.style.display = isPlaying ? 'none' : '';
      miniIconPause.style.display = isPlaying ? '' : 'none';
      miniPlayBtn.setAttribute('aria-label', isPlaying ? 'Pausar música' : 'Reproducir música');
    }
  }

  if(useRealAudio){
    audioEl.src = song.audioSrc;
    audioEl.loop = true;
    songNote.textContent = '';
    timeTotal.textContent = '0:00';
    audioEl.addEventListener('loadedmetadata', function(){
      timeTotal.textContent = fmtTime(audioEl.duration);
    });
    audioEl.addEventListener('timeupdate', function(){
      var pct = audioEl.duration ? (audioEl.currentTime / audioEl.duration * 100) : 0;
      progressFill.style.width = pct + '%';
      timeCurrent.textContent = fmtTime(audioEl.currentTime);
      updateLyrics(audioEl.currentTime);
    });
  } else {
    timeTotal.textContent = fmtTime(song.durationSeconds);
    songNote.textContent = 'Vista previa — falta el audio real.';
  }

  function simTick(){
    simSeconds += 0.25;
    if(simSeconds >= song.durationSeconds){ simSeconds = 0; lastLyricIndex = -2; } // loop
    progressFill.style.width = (simSeconds / song.durationSeconds * 100) + '%';
    timeCurrent.textContent = fmtTime(simSeconds);
    updateLyrics(simSeconds);
  }

  function playMusic(){
    if(useRealAudio){
      audioEl.play().catch(function(){});
      setPlayingUI(true);
    } else {
      if(simTimer) return;
      simPlaying = true;
      setPlayingUI(true);
      simTimer = setInterval(simTick, 250);
    }
  }
  function pauseMusic(){
    if(useRealAudio){
      audioEl.pause();
    } else {
      simPlaying = false;
      if(simTimer){ clearInterval(simTimer); simTimer = null; }
    }
    setPlayingUI(false);
  }
  function isMusicPlaying(){
    return useRealAudio ? !audioEl.paused : simPlaying;
  }

  if(playBtn){
    playBtn.addEventListener('click', function(){
      if(isMusicPlaying()){
        pauseMusic();
      } else {
        playMusic();
        goToNextScreen(playBtn);
      }
    });
  }

  if(miniPlayBtn){
    miniPlayBtn.addEventListener('click', function(){
      if(isMusicPlaying()) pauseMusic(); else playMusic();
    });
  }

  if(progressTrack){
    progressTrack.addEventListener('click', function(e){
      var rect = progressTrack.getBoundingClientRect();
      var frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      if(useRealAudio && audioEl.duration){
        audioEl.currentTime = frac * audioEl.duration;
      } else if(!useRealAudio){
        simSeconds = frac * song.durationSeconds;
        progressFill.style.width = (frac * 100) + '%';
        timeCurrent.textContent = fmtTime(simSeconds);
      }
    });
  }

  if(enterBtn) enterBtn.addEventListener('click', playMusic);

  /* ---------------------------------------------------------------------
     Pantalla 5 — Cierre (última)
     El contador de la flor es exponencial (1, 2, 4, 8, 16…) y a partir de
     "infinitoAt" toques se queda mostrando "∞" para siempre.
     --------------------------------------------------------------------- */
  var C = DATA.closing;
  document.getElementById('closingTapLabel').textContent = C.tapLabel;
  document.getElementById('fromCity').textContent = C.fromCity;
  document.getElementById('toCity').textContent = C.toCity;
  document.getElementById('teaserText').textContent = C.teaser;
  document.getElementById('namesText').textContent = C.names;

  // No se guarda entre recargas — cada vez que se abra la página arranca en 0.
  var tapCount = 0;
  var tapCountNum = document.getElementById('tapCountNum');

  function tapDisplayValue(n){
    if(n <= 0) return 0;
    if(n >= C.infinitoAt) return '∞';
    return Math.pow(2, n - 1);
  }
  var wasInfinite = false;
  if(tapCountNum) tapCountNum.textContent = tapDisplayValue(tapCount);

  var tapFlower = document.getElementById('tapFlower');
  if(tapFlower){
    tapFlower.addEventListener('click', function(){
      tapCount++;
      var nowInfinite = tapCount >= C.infinitoAt;
      var justBecameInfinite = nowInfinite && !wasInfinite;
      wasInfinite = nowInfinite;

      tapCountNum.textContent = tapDisplayValue(tapCount);

      if(!reduceMotion){
        tapCountNum.classList.remove('bump', 'infinity-pop');
        void tapCountNum.offsetWidth;
        tapCountNum.classList.add(justBecameInfinite ? 'infinity-pop' : 'bump');
      }

      if(justBecameInfinite){
        burst(tapFlower, 42, 3.4);
        if(!reduceMotion){
          tapFlower.classList.remove('flower-flash');
          void tapFlower.offsetWidth;
          tapFlower.classList.add('flower-flash');
          tapCountNum.addEventListener('animationend', function onDone(e){
            if(e.animationName !== 'infinityPop') return;
            tapCountNum.removeEventListener('animationend', onDone);
            goToNextScreen(tapFlower);
          });
        } else {
          goToNextScreen(tapFlower);
        }
      } else {
        burst(tapFlower);
      }
    });
  }

  var kmEl = document.getElementById('kmCount');
  if(kmEl){
    kmEl.textContent = C.km.toLocaleString('es-AR') + ' km';
    onVisibleOnce(document.getElementById('screen-5'), function(){
      countUp(kmEl, C.km, function(v){ return v.toLocaleString('es-AR') + ' km'; });
    });
  }

  /* ---------------------------------------------------------------------
     Campos genéricos (portada, etc.)
     --------------------------------------------------------------------- */
  applyDataFields();

})();
