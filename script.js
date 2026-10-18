// ===== Walking guide =====
// Each section has:
//   data-stop  -> where she stands (% of screen width)
//   data-say   -> text in her speech bubble
//   data-audio -> Shouq's recorded voice for that section

const walker = document.getElementById("walker");
const bubble = document.getElementById("bubble");
const girl = document.getElementById("girl");
const sections = [...document.querySelectorAll(".section")];
const navLinks = [...document.querySelectorAll(".nav a")];
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const SPEED = 320; // pixels per second
let currentX = 16;
let activeSection = null;
let arriveTimer = null;
let muted = false;
let soundOn = false;
let lang = "en";

// ===== Language switch (English / Arabic) =====
// Every element with data-ar="..." has an Arabic version.
// The English text is saved in data-en the first time we switch.
const translatable = [...document.querySelectorAll("[data-ar]")];
const langButtons = [...document.querySelectorAll(".lang-btn")];

function bubbleText(section) {
  return lang === "ar" ? section.dataset.sayAr : section.dataset.say;
}

function setLang(newLang) {
  lang = newLang;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";

  translatable.forEach(el => {
    if (el.dataset.en === undefined) el.dataset.en = el.innerHTML;
    el.innerHTML = lang === "ar" ? el.dataset.ar : el.dataset.en;
  });

  // The button shows the language you can switch TO
  langButtons.forEach(b => (b.textContent = lang === "ar" ? "English" : "عربي"));

  if (activeSection) {
    bubble.textContent = bubbleText(activeSection);
    walkTo(activeSection); // walk to the mirrored spot
  }
  try { localStorage.setItem("cv-lang", lang); } catch (e) {}
}

langButtons.forEach(b =>
  b.addEventListener("click", () => setLang(lang === "ar" ? "en" : "ar"))
);

// ===== Voice (Shouq's own recordings) =====
const player = new Audio();
player.preload = "auto";
player.addEventListener("playing", () => walker.classList.add("talking"));
player.addEventListener("pause", () => walker.classList.remove("talking"));
player.addEventListener("ended", () => walker.classList.remove("talking"));

// Load every clip early so there is no delay when she arrives
sections.forEach(s => {
  if (s.dataset.audio) {
    const a = new Audio();
    a.preload = "auto";
    a.src = s.dataset.audio;
  }
});

function stopVoice() {
  player.pause();
  walker.classList.remove("talking");
}

function speak(section) {
  if (!soundOn || muted || !section.dataset.audio) return;
  stopVoice();
  player.src = section.dataset.audio;
  player.currentTime = 0;
  player.play().catch(() => {});
}

// ===== Walking =====
function stopToPixels(percent) {
  if (lang === "ar") percent = 100 - percent; // mirror her path in Arabic
  const maxX = window.innerWidth - walker.offsetWidth - 16;
  return Math.max(16, Math.min(maxX, (percent / 100) * window.innerWidth));
}

function say(section) {
  bubble.textContent = bubbleText(section);
  if (!muted) bubble.classList.add("show");
  speak(section);
}

function walkTo(section) {
  const targetX = stopToPixels(Number(section.dataset.stop || 10));
  const distance = Math.abs(targetX - currentX);
  const seconds = reduceMotion ? 0 : Math.max(0.4, distance / SPEED);

  // Speech bubble opens toward the middle of the screen
  walker.classList.toggle("bubble-left", targetX > window.innerWidth / 2);
  walker.classList.toggle("facing-left", targetX < currentX);

  bubble.classList.remove("show");
  clearTimeout(arriveTimer);
  stopVoice();

  if (distance < 4) {
    say(section);
    return;
  }

  walker.classList.add("walking");
  walker.style.setProperty("--walk-time", seconds + "s");
  walker.style.setProperty("--x", targetX + "px");
  currentX = targetX;

  arriveTimer = setTimeout(() => {
    walker.classList.remove("walking");
    say(section);
  }, seconds * 1000);
}

// Pick the section that crosses the middle of the screen
function findActiveSection() {
  const middle = window.innerHeight * 0.45;
  let found = sections[0];
  for (const s of sections) {
    if (s.getBoundingClientRect().top <= middle) found = s;
  }
  // At the very bottom of the page, the last section is active
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
    found = sections[sections.length - 1];
  }
  return found;
}

let ticking = false;
window.addEventListener("scroll", () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    const s = findActiveSection();
    if (s !== activeSection) {
      activeSection = s;
      walkTo(s);
      navLinks.forEach(a => a.classList.toggle("active", a.getAttribute("href") === "#" + s.id));
    }
  });
}, { passive: true });

window.addEventListener("resize", () => {
  if (!activeSection) return;
  currentX = stopToPixels(Number(activeSection.dataset.stop || 10));
  walker.style.setProperty("--walk-time", "0s");
  walker.style.setProperty("--x", currentX + "px");
});

// Tap the girl to mute / unmute her
girl.addEventListener("click", () => {
  muted = !muted;
  walker.classList.toggle("muted", muted);
  bubble.classList.toggle("show", !muted);
  if (muted) {
    stopVoice();
  } else {
    soundOn = true;
    speak(activeSection);
  }
});

// ===== Welcome screen =====
// Browsers only allow sound after the visitor clicks once.
const welcome = document.getElementById("welcome");
function enterSite(withSound) {
  soundOn = withSound;
  welcome.classList.add("hide");
  setTimeout(() => welcome.remove(), 600);
  say(activeSection);
}
document.getElementById("enter").addEventListener("click", () => enterSite(true));
document.getElementById("enter-silent").addEventListener("click", () => enterSite(false));

// Start position
activeSection = findActiveSection();
try {
  if (localStorage.getItem("cv-lang") === "ar") setLang("ar");
} catch (e) {}
currentX = stopToPixels(Number(activeSection.dataset.stop || 10));
walker.style.setProperty("--walk-time", "0s");
walker.style.setProperty("--x", currentX + "px");
walker.classList.toggle("bubble-left", currentX > window.innerWidth / 2);

// ===== Copy buttons =====
document.querySelectorAll(".copy").forEach(btn => {
  btn.addEventListener("click", () => {
    const text = btn.dataset.copy;
    const done = () => {
      btn.textContent = lang === "ar" ? "تم النسخ" : "Copied";
      setTimeout(() => (btn.textContent = lang === "ar" ? "نسخ" : "Copy"), 1500);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => selectValue(btn));
    } else {
      selectValue(btn);
    }
  });
});

function selectValue(btn) {
  const value = btn.parentElement.querySelector(".value");
  const range = document.createRange();
  range.selectNodeContents(value);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

// ===== Falling petals =====
if (!reduceMotion) {
  const colors = ["#FFB7CB", "#D9C6FF", "#FFD0BC", "#BFE3F7"];
  setInterval(() => {
    if (document.hidden) return;
    const p = document.createElement("div");
    p.className = "petal";
    p.style.left = Math.random() * window.innerWidth + "px";
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    p.style.setProperty("--drift", (Math.random() * 120 - 60) + "px");
    const d = 7 + Math.random() * 6;
    p.style.animationDuration = d + "s";
    document.body.appendChild(p);
    setTimeout(() => p.remove(), d * 1000);
  }, 1100);
}
