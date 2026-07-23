# Hikāya — Copy & Localization Pack

All customer-facing words for the monetization surfaces, plus a drop-in i18n strings file in your six languages (en, ar, fr, nl, es, de) and the full lifecycle email set. Written to be pasted straight into the components from `Hikaya-Implementation-Code.md`.

> **Translation note.** The six-language strings below are production-quality human-style translations, not machine word-for-word. Arabic is written for RTL and uses natural Modern Standard Arabic. Have a native speaker skim the Arabic and Dutch before launch (they're the two where nuance matters most for your audience), but they're ready to ship as-is.

---

## 1. Brand voice

Hikāya's voice is **warm, cinematic, and unhurried** — a storyteller, not a SaaS dashboard. Short sentences. Sensory verbs (hear, listen, unfold, voiced). Never salesy or pushy; the product's magic does the selling. One tagline, used everywhere:

> **English:** "Stories that speak — every character voiced."
> **Arabic:** «حكايات تنطق — لكل شخصية صوت.»

Avoid: "content," "users," "consume," "SKU," exclamation-mark hype. Prefer: "stories," "readers/listeners," "a full cast," "unfold."

---

## 2. Pricing page copy (English master)

- **Eyebrow:** HIKĀYA PLUS
- **Headline:** Every character voiced. Every story, unlocked.
- **Subhead:** Read along while a full cast brings each story to life — in six languages.
- **Toggle:** Annual · save 41%  /  Monthly
- **Price line:** $49/yr  ·  or $6.99/mo
- **Feature list:**
  - Unlimited full multi-voice audio
  - Listen offline & in the background
  - No ads, ever
  - Early access to new stories
  - Cinematic soundscapes
- **Primary CTA:** Start 7-day free trial
- **Reassurance:** Cancel anytime. No charge until day 7.
- **Secondary line:** Not ready? [Keep reading for free →]

**FAQ**
- *Is there a free plan?* Yes — read every story's text and listen to the opening chapter of anything, free forever.
- *What do I get with Plus?* The full voiced cast on every story, offline and background listening, no ads, early access, and soundscapes.
- *Can I cancel?* Anytime, in one click. You keep access until the end of your billing period.
- *Which languages?* The app is in Arabic, English, French, Dutch, Spanish, and German, with stories in several languages.
- *Can I buy just one story?* Yes — any story can be unlocked on its own if you'd rather not subscribe.

---

## 3. Paywall & capture microcopy (English master)

**Paywall modal (end of free preview)**
- Title: Keep listening to "{storyTitle}"
- Body: You've reached the end of the free preview. Unlock the full cast.
- Primary: Start free trial of Plus
- Secondary: Or unlock just this story · {price}

**Chapter-end email gate (guest)**
- Title: Want to hear how "{storyTitle}" ends?
- Body: Get the next chapter — and a new voiced story every week — in your inbox.
- CTA: Get weekly stories

**Exit-intent**
- Title: Before you go…
- Body: One voiced story a week. No spam.
- CTA: Send me stories

**Newsletter inline**
- Placeholder: you@email.com
- CTA: Get weekly stories
- Success: You're in. Check your inbox.

**Upgrade nudges (contextual)**
- On a locked download button: "Listening offline is a Plus feature."
- On hitting the monthly free-unlock limit: "You've used your free unlocks this month. Go unlimited with Plus."
- Supporter badge tooltip: "Supporter — thank you for backing Hikāya."

---

## 4. Drop-in i18n strings (all six languages)

Add under a `monetization` namespace in your existing i18n setup (`artifacts/hikaya/src/lib` / locale files). Keys are stable; only values are translated.

```json
{
  "en": {
    "monetization": {
      "plus": "Hikāya Plus",
      "pricing_headline": "Every character voiced. Every story, unlocked.",
      "pricing_subhead": "Read along while a full cast brings each story to life — in six languages.",
      "toggle_annual": "Annual · save 41%",
      "toggle_monthly": "Monthly",
      "feat_audio": "Unlimited full multi-voice audio",
      "feat_offline": "Listen offline & in the background",
      "feat_noads": "No ads, ever",
      "feat_early": "Early access to new stories",
      "feat_soundscapes": "Cinematic soundscapes",
      "cta_trial": "Start 7-day free trial",
      "reassure_cancel": "Cancel anytime. No charge until day 7.",
      "keep_free": "Keep reading for free",
      "paywall_title": "Keep listening to “{title}”",
      "paywall_body": "You've reached the end of the free preview. Unlock the full cast.",
      "paywall_buy_story": "Or unlock just this story · {price}",
      "gate_title": "Want to hear how “{title}” ends?",
      "gate_body": "Get the next chapter — and a new voiced story every week — in your inbox.",
      "newsletter_cta": "Get weekly stories",
      "newsletter_success": "You're in. Check your inbox.",
      "buy_story": "Unlock this story",
      "tip": "Support this story",
      "supporter": "Supporter"
    }
  },
  "ar": {
    "monetization": {
      "plus": "حكاية بلس",
      "pricing_headline": "كل شخصية بصوتها. كل حكاية، متاحة بالكامل.",
      "pricing_subhead": "اقرأ بينما يمنح طاقمٌ كامل كل حكاية حياةً — بست لغات.",
      "toggle_annual": "سنوي · وفّر ٤١٪",
      "toggle_monthly": "شهري",
      "feat_audio": "استماع صوتي كامل متعدّد الأصوات بلا حدود",
      "feat_offline": "استمع دون اتصال وفي الخلفية",
      "feat_noads": "بلا إعلانات، أبدًا",
      "feat_early": "وصول مبكر إلى الحكايات الجديدة",
      "feat_soundscapes": "أجواء صوتية سينمائية",
      "cta_trial": "ابدأ تجربة مجانية لـ ٧ أيام",
      "reassure_cancel": "ألغِ في أي وقت. لا رسوم حتى اليوم السابع.",
      "keep_free": "تابع القراءة مجانًا",
      "paywall_title": "تابع الاستماع إلى «{title}»",
      "paywall_body": "لقد وصلت إلى نهاية المعاينة المجانية. افتح الطاقم الكامل.",
      "paywall_buy_story": "أو افتح هذه الحكاية وحدها · {price}",
      "gate_title": "تريد أن تعرف كيف تنتهي «{title}»؟",
      "gate_body": "احصل على الفصل التالي — وحكاية جديدة بالأصوات كل أسبوع — في بريدك.",
      "newsletter_cta": "احصل على حكايات أسبوعية",
      "newsletter_success": "تم تسجيلك. تفقّد بريدك.",
      "buy_story": "افتح هذه الحكاية",
      "tip": "ادعم هذه الحكاية",
      "supporter": "داعم"
    }
  },
  "fr": {
    "monetization": {
      "plus": "Hikāya Plus",
      "pricing_headline": "Chaque personnage a sa voix. Chaque histoire, débloquée.",
      "pricing_subhead": "Lisez pendant qu'une distribution complète donne vie à chaque histoire — en six langues.",
      "toggle_annual": "Annuel · -41 %",
      "toggle_monthly": "Mensuel",
      "feat_audio": "Audio multi-voix intégral et illimité",
      "feat_offline": "Écoutez hors ligne et en arrière-plan",
      "feat_noads": "Sans publicité, jamais",
      "feat_early": "Accès anticipé aux nouvelles histoires",
      "feat_soundscapes": "Ambiances sonores cinématiques",
      "cta_trial": "Essai gratuit de 7 jours",
      "reassure_cancel": "Annulable à tout moment. Aucun débit avant le 7ᵉ jour.",
      "keep_free": "Continuer à lire gratuitement",
      "paywall_title": "Continuez à écouter « {title} »",
      "paywall_body": "Vous avez atteint la fin de l'aperçu gratuit. Débloquez la distribution complète.",
      "paywall_buy_story": "Ou débloquez seulement cette histoire · {price}",
      "gate_title": "Envie de savoir comment finit « {title} » ?",
      "gate_body": "Recevez le chapitre suivant — et une nouvelle histoire chaque semaine — par e-mail.",
      "newsletter_cta": "Recevoir des histoires chaque semaine",
      "newsletter_success": "C'est fait. Vérifiez votre boîte mail.",
      "buy_story": "Débloquer cette histoire",
      "tip": "Soutenir cette histoire",
      "supporter": "Soutien"
    }
  },
  "nl": {
    "monetization": {
      "plus": "Hikāya Plus",
      "pricing_headline": "Elk personage een stem. Elk verhaal, ontgrendeld.",
      "pricing_subhead": "Lees mee terwijl een volledige cast elk verhaal tot leven brengt — in zes talen.",
      "toggle_annual": "Jaarlijks · bespaar 41%",
      "toggle_monthly": "Maandelijks",
      "feat_audio": "Onbeperkt volledige audio met meerdere stemmen",
      "feat_offline": "Luister offline en op de achtergrond",
      "feat_noads": "Nooit reclame",
      "feat_early": "Vroege toegang tot nieuwe verhalen",
      "feat_soundscapes": "Filmische klanksferen",
      "cta_trial": "Start 7 dagen gratis",
      "reassure_cancel": "Altijd opzegbaar. Geen kosten vóór dag 7.",
      "keep_free": "Gratis verder lezen",
      "paywall_title": "Blijf luisteren naar “{title}”",
      "paywall_body": "Je bent aan het einde van de gratis preview. Ontgrendel de volledige cast.",
      "paywall_buy_story": "Of ontgrendel alleen dit verhaal · {price}",
      "gate_title": "Wil je weten hoe “{title}” eindigt?",
      "gate_body": "Ontvang het volgende hoofdstuk — en elke week een nieuw verhaal — in je inbox.",
      "newsletter_cta": "Wekelijkse verhalen ontvangen",
      "newsletter_success": "Gelukt. Controleer je inbox.",
      "buy_story": "Dit verhaal ontgrendelen",
      "tip": "Steun dit verhaal",
      "supporter": "Steuner"
    }
  },
  "es": {
    "monetization": {
      "plus": "Hikāya Plus",
      "pricing_headline": "Cada personaje con voz. Cada historia, desbloqueada.",
      "pricing_subhead": "Lee mientras un elenco completo da vida a cada historia — en seis idiomas.",
      "toggle_annual": "Anual · ahorra 41 %",
      "toggle_monthly": "Mensual",
      "feat_audio": "Audio completo con múltiples voces, ilimitado",
      "feat_offline": "Escucha sin conexión y en segundo plano",
      "feat_noads": "Sin anuncios, nunca",
      "feat_early": "Acceso anticipado a nuevas historias",
      "feat_soundscapes": "Ambientes sonoros cinematográficos",
      "cta_trial": "Prueba gratis de 7 días",
      "reassure_cancel": "Cancela cuando quieras. Sin cargo hasta el día 7.",
      "keep_free": "Seguir leyendo gratis",
      "paywall_title": "Sigue escuchando “{title}”",
      "paywall_body": "Has llegado al final de la vista previa gratuita. Desbloquea el elenco completo.",
      "paywall_buy_story": "O desbloquea solo esta historia · {price}",
      "gate_title": "¿Quieres saber cómo termina “{title}”?",
      "gate_body": "Recibe el siguiente capítulo — y una nueva historia cada semana — en tu correo.",
      "newsletter_cta": "Recibir historias cada semana",
      "newsletter_success": "Listo. Revisa tu correo.",
      "buy_story": "Desbloquear esta historia",
      "tip": "Apoyar esta historia",
      "supporter": "Mecenas"
    }
  },
  "de": {
    "monetization": {
      "plus": "Hikāya Plus",
      "pricing_headline": "Jede Figur mit eigener Stimme. Jede Geschichte, freigeschaltet.",
      "pricing_subhead": "Lies mit, während eine ganze Sprecher-Besetzung jede Geschichte zum Leben erweckt — in sechs Sprachen.",
      "toggle_annual": "Jährlich · 41 % sparen",
      "toggle_monthly": "Monatlich",
      "feat_audio": "Unbegrenztes, vollständiges Mehrstimmen-Audio",
      "feat_offline": "Offline und im Hintergrund hören",
      "feat_noads": "Niemals Werbung",
      "feat_early": "Früher Zugang zu neuen Geschichten",
      "feat_soundscapes": "Filmische Klangwelten",
      "cta_trial": "7 Tage kostenlos testen",
      "reassure_cancel": "Jederzeit kündbar. Keine Abbuchung vor Tag 7.",
      "keep_free": "Kostenlos weiterlesen",
      "paywall_title": "Hör weiter „{title}“",
      "paywall_body": "Du hast das Ende der kostenlosen Vorschau erreicht. Schalte die ganze Besetzung frei.",
      "paywall_buy_story": "Oder nur diese Geschichte freischalten · {price}",
      "gate_title": "Willst du wissen, wie „{title}“ endet?",
      "gate_body": "Erhalte das nächste Kapitel — und jede Woche eine neue Geschichte — per E-Mail.",
      "newsletter_cta": "Wöchentliche Geschichten erhalten",
      "newsletter_success": "Geschafft. Sieh in dein Postfach.",
      "buy_story": "Diese Geschichte freischalten",
      "tip": "Diese Geschichte unterstützen",
      "supporter": "Förderer"
    }
  }
}
```

---

## 5. Lifecycle emails

English master copy below. Subject lines are also given in all six languages so the ESP can send in the recipient's `locale` (from `email_subscribers.locale` / `users.locale`). Keep bodies short; one clear CTA each.

### 5.1 Welcome (on newsletter signup / first account)
- **Subject (en):** Welcome to Hikāya — your first voiced story inside
- Subjects: **ar** أهلًا بك في حكاية — أول حكاية بالأصوات بالداخل · **fr** Bienvenue chez Hikāya — votre première histoire à écouter · **nl** Welkom bij Hikāya — je eerste ingesproken verhaal · **es** Bienvenido a Hikāya — tu primera historia con voz · **de** Willkommen bei Hikāya — deine erste vertonte Geschichte
- **Body:** You're in. Hikāya turns stories into audio dramas — every character voiced by a different voice, in six languages. Start with one of our favourites, free: **[Listen to {featuredStory} →]**. Every week we'll send you one new voiced story. — The Hikāya team

### 5.2 Magic-link sign-in
- **Subject (en):** Your Hikāya sign-in link
- **Body:** Tap to sign in — this link works once and expires in 15 minutes. **[Sign in →]** If you didn't request this, you can ignore it.

### 5.3 Purchase / unlock receipt
- **Subject (en):** You've unlocked "{storyTitle}" 🎧
- **Body:** Thanks for your purchase. "{storyTitle}" is now unlocked in full — every voice, every chapter. **[Start listening →]** Receipt: {amount} · {date}. Manage your account anytime in [Profile].

### 5.4 Trial ending (2 days before)
- **Subject (en):** Your Hikāya Plus trial ends in 2 days
- **Body:** Hope you're enjoying the full cast. Your free trial ends {date}, after which Plus is {price}. Nothing to do to continue — or [manage your plan] whenever you like. Either way, the free library is always yours.

### 5.5 Win-back (after cancel/lapse)
- **Subject (en):** The voices are still here when you're ready
- **Body:** Your Plus access has ended, but your shelf and progress are saved. We've added {n} new voiced stories since you left. Come back for 40% off your first month: **[Reactivate Plus →]**

### 5.6 Weekly new-story broadcast
- **Subject (en):** This week's voiced story: {storyTitle}
- **Body:** A new full-cast story just landed — {oneLineHook}. **[Listen to the first chapter free →]** Prefer to read? It's all there too. See you inside.

**Localized subject lines for the weekly (template):** ar حكاية هذا الأسبوع بالأصوات: {storyTitle} · fr L'histoire de la semaine : {storyTitle} · nl Het verhaal van deze week: {storyTitle} · es La historia de esta semana: {storyTitle} · de Die Geschichte der Woche: {storyTitle}

---

## 6. App-store / social one-liners (for launch & sharing)

- **One-liner:** Hikāya turns stories into full-cast audio dramas you can read and hear at once — in six languages.
- **Tweet/loop caption:** Every character, a different voice. This is what reading could sound like. 🎧 [link]
- **Meta description (SEO, per story):** "Read and listen to {storyTitle} on Hikāya — a full-cast audio drama in {language}. Free opening chapter."
