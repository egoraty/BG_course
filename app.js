const state = {
  lessonIndex: 0,
  courseMode: localStorage.getItem("bgCourseMode") === "interview" ? "interview" : "",
  progressMap: JSON.parse(localStorage.getItem("bgCourseProgressMap") || "{}"),
  progress: {},
  profile: JSON.parse(localStorage.getItem("bgCourseProfile") || "{}"),
  currentMockQuestionId: null
};

let ACTIVE_COURSE_DATA = COURSE_DATA;
let activePlayback = null;

const els = {
  lessonList: document.getElementById("lessonList"),
  appShell: document.getElementById("appShell"),
  courseChooser: document.getElementById("courseChooser"),
  chooseInterviewButton: document.getElementById("chooseInterviewButton"),
  backToChooserButton: document.getElementById("backToChooserButton"),
  courseModeLabel: document.getElementById("courseModeLabel"),
  topbarModeLabel: document.getElementById("topbarModeLabel"),
  lessonContent: document.getElementById("lessonContent"),
  pageTitle: document.getElementById("pageTitle"),
  progressPercent: document.getElementById("progressPercent"),
  progressBar: document.getElementById("progressBar"),
  progressText: document.getElementById("progressText"),
  introPanel: document.getElementById("introPanel"),
  prevLessonButton: document.getElementById("prevLessonButton"),
  nextLessonButton: document.getElementById("nextLessonButton"),
  startCourseButton: document.getElementById("startCourseButton"),
  playIntroButton: document.getElementById("playIntroButton"),
  skipIntroButton: document.getElementById("skipIntroButton"),
  resetProgressButton: document.getElementById("resetProgressButton"),
  profileForm: document.getElementById("profileForm"),
  personalAnswer: document.getElementById("personalAnswer"),
  speakPersonalButton: document.getElementById("speakPersonalButton"),
  copyPersonalButton: document.getElementById("copyPersonalButton"),
  dossierText: document.getElementById("dossierText"),
  parseDossierButton: document.getElementById("parseDossierButton"),
  fillDossierExampleButton: document.getElementById("fillDossierExampleButton"),
  toast: document.getElementById("toast")
};

const profileFields = {
  firstName: document.getElementById("profileFirstName"),
  surname: document.getElementById("profileSurname"),
  name: document.getElementById("profileName"),
  patronymic: document.getElementById("profilePatronymic"),
  gender: document.getElementById("profileGender"),
  birthDate: document.getElementById("profileBirthDate"),
  birthCity: document.getElementById("profileBirthCity"),
  birthCountry: document.getElementById("profileBirthCountry"),
  birthPlace: document.getElementById("profileBirthPlace"),
  residence: document.getElementById("profileResidence"),
  citizenship: document.getElementById("profileCitizenship"),
  job: document.getElementById("profileJob"),
  lineage: document.getElementById("profileLineage"),
  ancestor: document.getElementById("profileAncestor"),
  ancestorRelation: document.getElementById("profileAncestorRelation"),
  preferredCity: document.getElementById("profilePreferredCity"),
  favoriteSubject: document.getElementById("profileFavoriteSubject"),
  languages: document.getElementById("profileLanguages"),
  hobbies: document.getElementById("profileHobbies")
};

function saveProgress() {
  state.progressMap[state.courseMode] = state.progress;
  localStorage.setItem("bgCourseProgressMap", JSON.stringify(state.progressMap));
  localStorage.setItem("bgCourseProgress", JSON.stringify(state.progress));
}

function saveProfile() {
  localStorage.setItem("bgCourseProfile", JSON.stringify(state.profile));
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => els.toast.classList.remove("visible"), 2200);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeTranscriptDisplay(value) {
  return String(value || "")
    .replace(/тя нэ э ли/g, "тянээли")
    .replace(/ТЯ НЭ Э ЛИ/g, "ТЯНЭЭЛИ")
    .replace(/ия/g, "ья")
    .replace(/Ия/g, "Ья")
    .replace(/ИЯ/g, "ЬЯ")
    .replace(/б([ыЫ]\u0301?)лгарка/g, "б$1лгрка")
    .replace(/Б([Ыы]\u0301?)ЛГАРКА/g, "Б$1ЛГРКА");
}

function cleanTranscription(value) {
  const cleaned = String(value || "").replace(/[‐‑‒–—-]/g, " ").replace(/\s+/g, " ").trim();
  const letters = cleaned.match(/[A-Za-zА-Яа-яЁёЇїІіЄєҐґ]/g) || [];
  const lower = cleaned.match(/[a-zа-яёїієґ]/g) || [];
  if (letters.length > 1 && lower.length / letters.length < 0.15) {
    const normalized = cleaned.normalize("NFD");
    let result = "";
    for (let index = 0; index < normalized.length; index += 1) {
      const char = normalized[index];
      if (!/[A-Za-zА-Яа-яЁёЇїІіЄєҐґ]/.test(char)) {
        result += char;
        continue;
      }
      const isStressed = normalized[index + 1] === "\u0301";
      const lowerChar = char.toLocaleLowerCase("ru-RU");
      result += isStressed ? lowerChar.toLocaleUpperCase("ru-RU") : lowerChar;
    }
    return normalizeTranscriptDisplay(result.normalize("NFC"));
  }
  return normalizeTranscriptDisplay(cleaned);
}

const DOCUMENT_AUDIO_MAP = new Map([
  ["добре", "audio/course/добрЕ.mp3"],
  ["не", "audio/course/не.mp3"],
  ["пет", "audio/course/пет.mp3"],
  ["бъдеще", "audio/course/бЪдеще.mp3"]
]);

[
  ["рота", "рота.mp3"],
  ["морски", "морской.mp3"],
  ["не", "не.mp3"],
  ["пет", "пет.mp3"],
  ["неделя", "неделя.mp3"],
  ["лев", "лев.mp3"],
  ["щит", "щит.mp3"],
  ["бъдеще", "будущее.mp3"],
  ["щука", "щука.mp3"],
  ["за първи път", "в первый раз.mp3"],
  ["ъгъл", "угол.mp3"],
  ["петък", "пятница.mp3"],
  ["четвъртък", "четверг.mp3"],
  ["добър ден", "добрый день.mp3"],
  ["боксьор", "боксер.mp3"],
  ["сапьор", "сапер.mp3"],
  ["сервитьор", "официант.mp3"],
  ["жито", "пшеница.mp3"],
  ["жега", "жара.mp3"],
  ["шия", "шея.mp3"],
  ["шивач", "портной.mp3"],
  ["шивачка", "портниха.mp3"],
  ["цирк", "цирк.mp3"],
  ["лекция", "лекция.mp3"],
  ["франция", "франция.mp3"],
  ["гърция", "греция.mp3"],
  ["турция", "турция.mp3"],
  ["цели", "цели.mp3"],
  ["цял", "цял.mp3"],
  ["цял ден", "цял ден.mp3"],
  ["те", "ты.mp3"],
  ["отлично", "отлично.mp3"],
  ["чадър", "чадыр.mp3"],
  ["в българия", "в Болгарии.mp3"],
  ["във варна", "в Варне.mp3"]
].forEach(([key, file]) => {
  DOCUMENT_AUDIO_MAP.set(key, `audio/course/module-02/${file}`);
});

[
  ["добро утро", "добро утро.mp3"],
  ["добър ден", "добър ден.mp3"],
  ["добър вечер", "добър вечер.mp3"],
  ["здравейте", "здравейте.mp3"],
  ["здравей", "здравей.mp3"],
  ["здрасти", "здрасти.mp3"],
  ["много добре", "много добре.mp3"],
  ["как сте", "как сте.mp3"],
  ["благодаря", "благодаря.mp3"],
  ["много благодаря", "много благодаря.mp3"],
  ["благодаря много", "благодаря много.mp3"],
  ["довиждане", "довиждане.mp3"],
  ["приятен ден", "приятен ден.mp3"],
  ["хубав ден", "хубав ден.mp3"],
  ["чао", "чао.mp3"],
  ["моля", "моля.mp3"],
  ["няма защо", "няма защо.mp3"],
  ["разбира се", "разбира се.mp3"],
  ["също", "също.mp3"],
  ["сега", "сега.mp3"],
  ["тук", "тук.mp3"],
  ["там", "там.mp3"],
  ["приятно ми е", "приятно ми е.mp3"],
  ["също ми е приятно", "също ми е приятно.mp3"]
].forEach(([key, file]) => {
  DOCUMENT_AUDIO_MAP.set(key, `audio/course/module-03/${file}`);
});

[
  ["аз съм", "аз съм.mp3"],
  ["ти си", "ти си.mp3"],
  ["той / тя / то е", "той тя то е.mp3"],
  ["ние сме", "ние сме.mp3"],
  ["вие сте", "вие сте.mp3"],
  ["те са", "те са.mp3"],
  ["аз съм българин", "аз съм българин.mp3"],
  ["аз съм българка", "аз съм българка.mp3"],
  ["той е руснак", "той е руснак.mp3"],
  ["тя е рускиня", "тя е рускиня.mp3"],
  ["ние сме студенти", "ние сме студенти.mp3"],
  ["вие сте доктори", "вие сте доктори.mp3"],
  ["те са в българия", "те са в българия.mp3"],
  ["то е добро", "то е добро.mp3"],
  ["ти си в град", "ти си в град.mp3"],
  ["българин", "българин.mp3"],
  ["българка", "българка.mp3"],
  ["българи", "българи.mp3"],
  ["българки", "българки.mp3"],
  ["руснак", "руснак.mp3"],
  ["рускиня", "рускиня.mp3"],
  ["руснаци", "руснаци.mp3"],
  ["рускини", "рускини.mp3"],
  ["сръбкиня", "сръбкиня.mp3"],
  ["сърби", "сърби.mp3"],
  ["сръбкини", "сръбкини.mp3"]
].forEach(([key, file]) => {
  DOCUMENT_AUDIO_MAP.set(key, `audio/course/module-04/${file}`);
});

[
  ["аз не съм", "аз не съм.mp3"],
  ["ти не си", "ти не си.mp3"],
  ["той/тя не е", "той тя не е.mp3"],
  ["ние не сме", "ние не сме.mp3"],
  ["вие не сте", "вие не сте.mp3"],
  ["те не са", "те не са.mp3"],
  ["аз не съм студент", "аз не съм студент.mp3"],
  ["ти не си сърбин", "ти не си сърбин.mp3"],
  ["ние не сме от софия", "ние не сме от софия.mp3"],
  ["те не са в българия", "те не са в българия.mp3"],
  ["той студент ли е", "той студент ли е.mp3"],
  ["тя българка ли е", "тя българка ли е.mp3"],
  ["те сега в българия ли са", "те сега в българия ли са.mp3"],
  ["вие от софия ли сте", "вие от софия ли сте.mp3"],
  ["тя не е ли българка", "тя не е ли българка.mp3"],
  ["той не е ли студент", "Мужской-Профессиональный213-2026-07-01-02-06-той-нээли-студэнт.mp3"],
  ["те не са ли сега в българия", "те не са ли сега в българия.mp3"]
].forEach(([key, file]) => {
  DOCUMENT_AUDIO_MAP.set(key, `audio/course/module-05/${file}`);
});

[
  ["откъде", "откъде.mp3"],
  ["къде", "къде.mp3"],
  ["кога", "кога.mp3"],
  ["какъв", "какъв.mp3"],
  ["какво", "какво.mp3"],
  ["народност", "народност.mp3"],
  ["гражданство", "гражданство.mp3"],
  ["по бащина линия", "по бащина линия.mp3"],
  ["по майчина линия", "по майчина линия.mp3"],
  ["български корени", "български корени.mp3"],
  ["баща ми", "баща ми.mp3"],
  ["дядо ми", "дядо ми.mp3"],
  ["прадядо ми", "прадядо ми.mp3"],
  ["роден съм", "роден съм.mp3"],
  ["родена съм", "родена съм.mp3"],
  ["в настоящия момент", "в настоящия момент.mp3"],
  ["с какво се занимавате", "с какво се занимавате.mp3"],
  ["вие откъде сте", "вие откъде сте.mp3"],
  ["аз съм от от град", "аз съм от държава от град град.mp3"],
  ["какъв град е варна", "какъв град е варна.mp3"],
  ["варна е красив и спокоен морски град", "варна е красив и спокоен морски град.mp3"],
  ["е също много красив град", "градът е също много красив град.mp3"]
].forEach(([key, file]) => {
  DOCUMENT_AUDIO_MAP.set(key, `audio/course/module-06/${file}`);
});

[
  ["нула", "нула.mp3"],
  ["едно", "едно.mp3"],
  ["две", "две.mp3"],
  ["три", "три.mp3"],
  ["четири", "четири.mp3"],
  ["пет", "пет.mp3"],
  ["шест", "шест.mp3"],
  ["седем", "седем.mp3"],
  ["осем", "осем.mp3"],
  ["девет", "девет.mp3"],
  ["десет", "десет.mp3"],
  ["единадесет / единайсет", "единадесет единайсет.mp3"],
  ["дванадесет / дванайсет", "дванадесет дванайсет.mp3"],
  ["тринадесет / тринайсет", "тринадесет тринайсет.mp3"],
  ["четиринадесет / четиринайсет", "четиринадесет четиринайсет.mp3"],
  ["петнадесет / петнайсет", "петнадесет петнайсет.mp3"],
  ["шестнадесет / шестнайсет", "шестнадесет шестнайсет.mp3"],
  ["седемнадесет / седемнайсет", "седемнадесет седемнайсет.mp3"],
  ["деветнадесет / деветнайсет", "деветнадесет деветнайсет.mp3"],
  ["двадесет / двайсет", "двадесет двайсет.mp3"],
  ["двайсет и едно", "двайсет и едно.mp3"],
  ["тридесет / трийсет", "тридесет трийсет.mp3"],
  ["четиридесет", "четиридесет.mp3"],
  ["петдесет", "петдесет.mp3"],
  ["шестдесет", "шестдесет.mp3"],
  ["седемдесет", "седемдесет.mp3"],
  ["осемдесет", "осемдесет.mp3"],
  ["деветдесет", "деветдесет.mp3"],
  ["сто", "сто.mp3"],
  ["двеста", "двеста.mp3"],
  ["триста", "триста.mp3"],
  ["четиристотин", "четиристотин.mp3"],
  ["петстотин", "петстотин.mp3"],
  ["шестстотин", "шестстотин.mp3"],
  ["седемстотин", "седемстотин.mp3"],
  ["осемстотин", "осемстотин.mp3"],
  ["деветстотин", "деветстотин.mp3"],
  ["хиляда", "хиляда.mp3"],
  ["две хиляди", "две хиляди.mp3"],
  ["първи / първа", "първи първа.mp3"],
  ["втори / втора", "втори втора.mp3"],
  ["трети / трета", "трети трета.mp3"],
  ["четвърти / четвърта", "четвърти четвърта.mp3"],
  ["пети / пета", "пети пета.mp3"],
  ["шести / шеста", "шести шеста.mp3"],
  ["седми / седма", "седми седма.mp3"],
  ["осми / осма", "осми осма.mp3"],
  ["девети / девета", "девети девета.mp3"],
  ["десети / десета", "десети десета.mp3"],
  ["дванадесети / дванайсети", "дванадесети дванайсети.mp3"],
  ["петнадесети / петнайсети", "петнадесети петнайсети.mp3"],
  ["двайсет и втори", "двайсет и втори.mp3"],
  ["двайсет и четвърти", "двайсет и четвърти.mp3"],
  ["януари", "януари.mp3"],
  ["февруари", "февруари.mp3"],
  ["март", "март.mp3"],
  ["април", "април.mp3"],
  ["май", "май.mp3"],
  ["юни", "юни.mp3"],
  ["юли", "юли.mp3"],
  ["август", "август.mp3"],
  ["септември", "септември.mp3"],
  ["октомври", "октомври.mp3"],
  ["ноември", "ноември.mp3"],
  ["декември", "декември.mp3"],
  ["записан съм за десет часа", "записан съм за десет часа.mp3"],
  ["записана съм за десет часа", "записана съм за десет часа.mp3"]
].forEach(([key, file]) => {
  DOCUMENT_AUDIO_MAP.set(key, `audio/course/module-07/${file}`);
});

[
  ["имам", "имам.mp3"],
  ["нямам", "нямам.mp3"],
  ["плувам", "плувам.mp3"],
  ["купувам", "купувам.mp3"],
  ["продавам", "продавам.mp3"],
  ["кандидатствам", "кандидатствам.mp3"],
  ["планирам", "планирам.mp3"],
  ["живея", "живея.mp3"],
  ["уча", "уча.mp3"],
  ["говоря", "говоря.mp3"],
  ["аз имам", "аз имам.mp3"],
  ["ти имаш", "ти имаш.mp3"],
  ["той/тя има", "той тя има.mp3"],
  ["ние имаме", "ние имаме.mp3"],
  ["вие имате", "вие имате.mp3"],
  ["те имат", "те имат.mp3"],
  ["аз нямам", "аз нямам.mp3"],
  ["ти нямаш", "ти нямаш.mp3"],
  ["той/тя няма", "той тя няма.mp3"],
  ["ние нямаме", "ние нямаме.mp3"],
  ["вие нямате", "вие нямате.mp3"],
  ["те нямат", "те нямат.mp3"],
  ["аз нямам време", "аз нямам време.mp3"],
  ["аз имам български корени", "аз имам български корени.mp3"],
  ["имам намерение да живея в българия", "имам намерение да живея в българия.mp3"],
  ["уча български език", "уча български език.mp3"],
  ["искам да живея в българия", "искам да живея в българия.mp3"],
  ["искам да изуча езика", "искам да изуча езика.mp3"],
  ["планирам да придобия недвижим имот", "планирам да придобия недвижим имот.mp3"],
  ["мога да отговарям на български", "мога да отговарям на български.mp3"]
].forEach(([key, file]) => {
  DOCUMENT_AUDIO_MAP.set(key, `audio/course/module-08/${file}`);
});

function normalizeAudioKey(value) {
  return String(value || "")
    .normalize("NFC")
    .replace(/\[[^\]]+\]/g, "")
    .replace(/[„“"«».,!?;:()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("bg-BG");
}

function getDocumentAudio(phrase) {
  return DOCUMENT_AUDIO_MAP.get(normalizeAudioKey(phrase?.bg));
}

function renderAudioIconButton({ speak, audio = "", label = "Слушать аудио", extraClass = "" }) {
  return `
    <button class="inline-audio-button ${extraClass}" type="button" data-audio="${escapeHtml(audio)}" data-speak="${escapeHtml(speak)}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">
      <span class="visually-hidden">${escapeHtml(label)}</span>
    </button>
  `;
}

function renderInlineAudioButton(phrase, extraClass = "") {
  const audio = getDocumentAudio(phrase);
  return renderAudioIconButton({
    speak: phrase.bg,
    audio: audio || "",
    label: "Слушать аудио",
    extraClass
  });
}

function getQuestion(id) {
  return ACTIVE_COURSE_DATA.questions.find((question) => question.id === id);
}

function setCourseMode(_mode = "interview", options = {}) {
  const mode = "interview";
  state.courseMode = mode;
  ACTIVE_COURSE_DATA = COURSE_DATA;
  state.progress = state.progressMap[mode] || {};
  state.lessonIndex = Math.max(0, Math.min(options.lessonIndex || 0, ACTIVE_COURSE_DATA.lessons.length - 1));
  localStorage.setItem("bgCourseMode", mode);
  els.courseChooser?.classList.add("is-hidden");
  els.appShell?.classList.remove("is-hidden");
  document.body.classList.remove("general-mode");
  document.body.classList.add("interview-mode");
  if (els.courseModeLabel) els.courseModeLabel.textContent = "Курс подготовки";
  if (els.topbarModeLabel) els.topbarModeLabel.textContent = "Подготовка к собеседованию";
  if (els.introPanel) els.introPanel.style.display = "none";
  render();
}

function showCourseChooser() {
  els.courseChooser?.classList.remove("is-hidden");
  els.appShell?.classList.add("is-hidden");
  localStorage.removeItem("bgCourseMode");
}

function buildTemplateValues() {
  const p = state.profile;
  const relation = p.ancestorRelation || relationFromLineage(p.lineage);
  const relationFemale = ["баба", "майка", "прабаба"].includes(relation);
  const legacyNameParts = String(p.name || "").split(/\s+/).filter(Boolean);
  const firstName = p.firstName || legacyNameParts[0] || "Егор";
  const surname = p.surname || legacyNameParts.slice(1).join(" ") || "Романов";
  const patronymic = p.patronymic || "";
  const fullNameBg = [firstName, patronymic, surname].filter(Boolean).join(" ");
  const birthDate = formatBirthDateBg(p.birthDate);
  const birthPlace = buildBirthPlace(p);
  const birthCity = p.birthCity || p.birthPlace || "Кишинев";
  const birthCountry = p.birthCountry || "Молдова";
  const citizenship = normalizeCitizenship(p.citizenship || "молдовско");

  return {
    firstName,
    surname,
    patronymic,
    fullNameBg,
    fullNameRu: fullNameBg,
    fullNamePronunciation: fullNameBg,
    birthDateBg: birthDate.bg,
    birthDateTr: birthDate.tr,
    birthDateRu: birthDate.ru,
    birthPlace,
    birthCity,
    birthCountry,
    residence: p.residence || birthPlace || "Молдова, Кишинев",
    citizenship,
    lineageBg: lineageText(p.lineage),
    lineageRu: lineageTextRu(p.lineage),
    ancestor: p.ancestor || "Мария Петрова",
    ancestorRelation: relation,
    ancestorRelationCap: relation.charAt(0).toUpperCase() + relation.slice(1),
    ancestorPronoun: relationFemale ? "Тя" : "Той",
    ancestorNationality: relationFemale ? "българка" : "българин",
    preferredCity: p.preferredCity || "София",
    job: normalizeRuWordsToBg(p.job || "уча и се подготвям за интервюто"),
    favoriteSubject: normalizeRuWordsToBg(p.favoriteSubject || "история"),
    languages: normalizeRuWordsToBg(p.languages || "руски, английски и малко български"),
    hobbies: normalizeRuWordsToBg(p.hobbies || "спорт и пътувания")
  };
}

function fillTemplate(template) {
  const values = buildTemplateValues();
  return String(template || "").replace(/\{(\w+)\}/g, (_, key) => values[key] || "");
}

function answerFor(question) {
  const isMale = state.profile.gender === "male";
  const answerTemplate = isMale ? question.answerTemplateMale : question.answerTemplateFemale;
  const accentTemplate = isMale ? question.answerAccentMale : question.answerAccentFemale;
  if (answerTemplate) {
    const answerRuTemplate = isMale
      ? question.answerRuTemplateMale || question.answerRuTemplate
      : question.answerRuTemplateFemale || question.answerRuTemplate;
    return {
      answer: fillTemplate(answerTemplate),
      accent: fillTemplate(accentTemplate || answerTemplate),
      answerRu: fillTemplate(answerRuTemplate || question.answerRu || "")
    };
  }
  return {
    answer: isMale ? question.answerMale : question.answerFemale,
    accent: isMale ? question.answerAccentMale : question.answerAccentFemale,
    answerRu: question.answerRu || ""
  };
}

function setLesson(index) {
  clearActivePlayback();
  state.lessonIndex = Math.max(0, Math.min(ACTIVE_COURSE_DATA.lessons.length - 1, index));
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateProgress() {
  const doneCount = ACTIVE_COURSE_DATA.lessons.filter((lesson) => state.progress[lesson.id]).length;
  const percent = Math.round((doneCount / ACTIVE_COURSE_DATA.lessons.length) * 100);
  els.progressPercent.textContent = `${percent}%`;
  els.progressBar.style.width = `${percent}%`;
  els.progressText.textContent =
    doneCount === 0
      ? "Начните со вступления."
      : `Пройдено ${doneCount} из ${ACTIVE_COURSE_DATA.lessons.length} разделов.`;
}

function renderLessonNav() {
  els.lessonList.innerHTML = ACTIVE_COURSE_DATA.lessons
    .map((lesson, index) => {
      const isActive = index === state.lessonIndex;
      const isDone = Boolean(state.progress[lesson.id]);
      return `
        <button class="lesson-nav-item ${isActive ? "active" : ""} ${isDone ? "done" : ""}" type="button" data-lesson-index="${index}">
          <span>
            <span class="lesson-name">${escapeHtml(lesson.title)}</span>
          </span>
          <span class="status-dot" aria-hidden="true"></span>
        </button>
      `;
    })
    .join("");
}

function renderPhraseCard(phrase) {
  const pronunciationHtml = phrase.pronunciation
    ? `<div class="pronunciation">${escapeHtml(phrase.pronunciation)}</div>`
    : "";
  const audioHintHtml = phrase.audio
    ? `<span class="audio-hint">${escapeHtml(phrase.audio)}</span>`
    : "";
  return `
    <div class="phrase-card">
      <div class="phrase-card-top">
        <div class="phrase-main">
          <div class="bg-text">${escapeHtml(phrase.bg)}</div>
          <div class="accent-text">${escapeHtml(cleanTranscription(phrase.accent))}</div>
          ${pronunciationHtml}
          <div class="translation">${escapeHtml(phrase.ru)}</div>
        </div>
        ${renderAudioIconButton({ speak: phrase.bg, audio: phrase.audio, label: "Слушать фразу", extraClass: "phrase-audio-button" })}
      </div>
      ${audioHintHtml ? `<div class="audio-actions">${audioHintHtml}</div>` : ""}
    </div>
  `;
}

function renderQuestionCard(question) {
  const answer = answerFor(question);
  const neutralHtml = question.neutralAnswer
    ? `
      <div class="template-box">
        <p class="label">Нейтральный шаблон</p>
        <div class="bg-text">${escapeHtml(question.neutralAnswer)}</div>
        <div class="accent-text">${escapeHtml(cleanTranscription(question.neutralAccent))}</div>
      </div>
    `
    : "";
  return `
    <div class="question-card">
      <div class="question-main">
        <div class="translation">${escapeHtml(question.ru)}</div>
        <div class="bg-text">${escapeHtml(question.question)}</div>
        <div class="accent-text">${escapeHtml(cleanTranscription(question.questionAccent))}</div>
        <div class="bg-text">${escapeHtml(answer.answer)}</div>
        <div class="accent-text">${escapeHtml(cleanTranscription(answer.accent))}</div>
        ${answer.answerRu ? `<div class="translation">${escapeHtml(answer.answerRu)}</div>` : ""}
        ${neutralHtml}
      </div>
      <div class="audio-actions">
        ${renderAudioIconButton({ speak: question.question, audio: question.audio, label: "Слушать вопрос", extraClass: "question-audio-button" })}
        ${renderAudioIconButton({ speak: answer.answer, label: "Слушать ответ", extraClass: "question-audio-button" })}
      </div>
    </div>
  `;
}

function renderPronunciationRule(rule) {
  const examples = (rule.examples || [])
    .map(
      ([word, accent, pronunciation]) => `
        <div class="rule-example">
          <strong>${escapeHtml(word)}</strong>
          <span>${escapeHtml(accent)}</span>
          <span>${escapeHtml(pronunciation)}</span>
        </div>
      `
    )
    .join("");

  return `
    <div class="rule-card">
      <h5>${escapeHtml(rule.title)}</h5>
      <p><strong>Зачем:</strong> ${escapeHtml(rule.need)}</p>
      <p><strong>Правило:</strong> ${escapeHtml(rule.rule)}</p>
      <div class="rule-examples">${examples}</div>
    </div>
  `;
}

function renderLessonTable(table) {
  const headers = table.headers || [];
  const rows = table.rows || [];
  return `
    <div class="table-card">
      <h5>${escapeHtml(table.title)}</h5>
      <div class="responsive-table">
        <table>
          <thead>
            <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) => `
                  <tr>
                    ${row.map((cell, index) => `<td class="${index === 2 ? "accent-cell" : ""}">${escapeHtml(index === 2 ? cleanTranscription(cell) : cell)}</td>`).join("")}
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function splitTranslation(line) {
  const value = String(line || "").trim();
  const match = value.match(/^Перевод:\s*(.+)$/i);
  return match ? match[1].trim() : "";
}

function parseDocumentPhrase(line, nextLine) {
  const value = String(line || "").trim();
  const inlineMatch = value.match(/^(.*?)\s*(?:\[болг\])?\s*—\s*«([^»]+)»\.?\s*Перевод:\s*(.+)$/i);
  if (inlineMatch) {
    return {
      bg: inlineMatch[1].trim(),
      tr: cleanTranscription(inlineMatch[2].trim()),
      ru: inlineMatch[3].trim(),
      consumedNext: false
    };
  }
  const match = value.match(/^(.*?)\s*(?:\[болг\])?\s*—\s*«([^»]+)»\.?$/);
  if (!match) return null;
  return {
    bg: match[1].trim(),
    tr: cleanTranscription(match[2].trim()),
    ru: splitTranslation(nextLine),
    consumedNext: Boolean(splitTranslation(nextLine))
  };
}

function isLongDocumentPhrase(phrase) {
  return phrase.bg.length > 58 || /^(Въпрос|Вопрос|Отговор|Ответ|Кандидат|Служител):/i.test(phrase.bg);
}

function renderStructuredPhrase(phrase) {
  return `
    <div class="structured-phrase">
      <div class="structured-phrase-top">
        <div class="bg-text">${escapeHtml(phrase.bg)}</div>
        ${renderInlineAudioButton(phrase, "structured-audio-button")}
      </div>
      <div class="structured-label">Транскрипция:</div>
      <div class="accent-text">${escapeHtml(phrase.tr)}</div>
      ${phrase.ru ? `<div class="structured-label">Перевод:</div><div class="translation">${escapeHtml(phrase.ru)}</div>` : ""}
    </div>
  `;
}

function renderDocumentTable(rows) {
  const labels = ["Болгарский", "Транскрипция", "Перевод", "Аудио"];
  return `
    <div class="doc-table-wrap">
      <table class="doc-table">
        <thead>
          <tr>
            <th>Болгарский</th>
            <th>Транскрипция</th>
            <th>Перевод</th>
            <th class="doc-audio-heading">Аудио</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row) => `
                <tr>
                  <td data-label="${labels[0]}">
                    <span class="doc-table-word">${escapeHtml(row.bg)}</span>
                  </td>
                  <td class="accent-text" data-label="${labels[1]}">${escapeHtml(row.tr)}</td>
                  <td data-label="${labels[2]}">${escapeHtml(row.ru)}</td>
                  <td class="doc-table-audio-cell" data-label="${labels[3]}">${renderInlineAudioButton(row, "table-audio-button")}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderCompactDocumentPhrase(phrase) {
  return `
    <p class="doc-line doc-phrase">
      <span class="doc-phrase-text">${escapeHtml(phrase.bg)} [болг] — «${escapeHtml(phrase.tr)}»</span>
      ${renderInlineAudioButton(phrase)}
    </p>
  `;
}

function renderDocumentLine(line) {
  const value = String(line || "").trim();
  const className = [
    /^(\d+(\.\d+)?\.|[A-ZА]\.\d+\.)/.test(value) ? "doc-subtitle" : "",
    /^(Перевод|Произношение|Пояснение|Правило|Важно|Источник|Цель|Контент|Формат|Кандидат|Служител|Вопрос|Ответ)/i.test(value) ? "doc-note" : "",
    /[а-яА-ЯA-Za-zЪъ][^—]+—\s*«/.test(value) ? "doc-phrase" : "",
    /^[☐□]/.test(value) ? "doc-check" : ""
  ]
    .filter(Boolean)
    .join(" ");
  if (normalizeAudioKey(value).startsWith("частица ли ставится после слова")) {
    return `
      <p class="doc-line doc-line-audio ${className}">
        <span>${escapeHtml(value)}</span>
        ${renderAudioIconButton({
          speak: value,
          audio: "audio/course/module-05/rule-li.mp3",
          label: "Слушать правило",
          extraClass: "line-audio-button"
        })}
      </p>
    `;
  }
  if (/^5\.3\./.test(value)) {
    return `
      <p class="doc-line ${className}">${escapeHtml(value)}</p>
      <p class="doc-line doc-note">Важно: сочетание „Тя не е ли“ в живой речи часто читается слитно: «тянээли». В курсе эта фраза дана слитно, чтобы произношение совпадало с аудио.</p>
    `;
  }
  return `<p class="doc-line ${className}">${escapeHtml(value)}</p>`;
}

function renderDocumentChunk(chunk) {
  const output = [];
  for (let i = 0; i < chunk.length; i += 1) {
    const phrase = parseDocumentPhrase(chunk[i], chunk[i + 1]);

    if (phrase && isLongDocumentPhrase(phrase)) {
      output.push(renderStructuredPhrase(phrase));
      if (phrase.consumedNext) i += 1;
      continue;
    }

    if (phrase && phrase.ru && !isLongDocumentPhrase(phrase)) {
      const rows = [phrase];
      let cursor = i + (phrase.consumedNext ? 2 : 1);
      while (cursor < chunk.length) {
        const nextPhrase = parseDocumentPhrase(chunk[cursor], chunk[cursor + 1]);
        if (!nextPhrase || !nextPhrase.ru || isLongDocumentPhrase(nextPhrase)) break;
        rows.push(nextPhrase);
        cursor += nextPhrase.consumedNext ? 2 : 1;
      }

      if (rows.length >= 3) {
        output.push(renderDocumentTable(rows));
        i = cursor - 1;
        continue;
      }

      output.push(renderCompactDocumentPhrase(phrase));
      if (phrase.ru) output.push(renderDocumentLine(`Перевод: ${phrase.ru}`));
      if (phrase.consumedNext) i += 1;
      continue;
    }

    if (phrase && !isLongDocumentPhrase(phrase)) {
      output.push(renderCompactDocumentPhrase(phrase));
      if (phrase.ru) output.push(renderDocumentLine(`Перевод: ${phrase.ru}`));
      if (phrase.consumedNext) i += 1;
      continue;
    }

    output.push(renderDocumentLine(chunk[i]));
  }

  return output.join("");
}

function renderDocumentBlocks(lesson) {
  if (!lesson.documentLines?.length) return "";
  const chunks = [];
  let current = [];
  lesson.documentLines.forEach((line) => {
    if (/^(\d+(\.\d+)?\.|[A-ZА]\.\d+\.)/.test(line) && current.length) {
      chunks.push(current);
      current = [];
    }
    current.push(line);
  });
  if (current.length) chunks.push(current);

  return `
    <section class="lesson-section interview-focus document-section">
      <h4>Материал полного курса</h4>
      <div class="document-grid">
        ${chunks
          .map(
            (chunk) => `
              <div class="document-card">
                ${renderDocumentChunk(chunk)}
              </div>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderMockInterview() {
  const current =
    getQuestion(state.currentMockQuestionId) ||
    ACTIVE_COURSE_DATA.questions[Math.floor(Math.random() * ACTIVE_COURSE_DATA.questions.length)];
  state.currentMockQuestionId = current.id;
  const answer = answerFor(current);

  return `
    <section class="lesson-section">
      <h4>Случайный вопрос</h4>
      <div class="interview-box">
        <div>
          <div class="translation">${escapeHtml(current.ru)}</div>
          <div class="interview-question">${escapeHtml(current.question)}</div>
          <div class="accent-text">${escapeHtml(cleanTranscription(current.questionAccent))}</div>
        </div>
        <div class="audio-actions">
          ${renderAudioIconButton({ speak: current.question, audio: current.audio, label: "Слушать вопрос", extraClass: "question-audio-button" })}
          <button class="chip-button" type="button" id="showMockAnswerButton">Показать ответ</button>
          <button class="chip-button" type="button" id="nextMockQuestionButton">Следующий вопрос</button>
        </div>
        <div class="answer-reveal" id="mockAnswer">
          <div class="bg-text">${escapeHtml(answer.answer)}</div>
          <div class="accent-text">${escapeHtml(cleanTranscription(answer.accent))}</div>
          ${answer.answerRu ? `<div class="translation">${escapeHtml(answer.answerRu)}</div>` : ""}
          <div class="audio-actions">
            ${renderAudioIconButton({ speak: answer.answer, label: "Слушать ответ", extraClass: "question-audio-button" })}
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderLessonContent() {
  const lesson = ACTIVE_COURSE_DATA.lessons[state.lessonIndex];
  const lessonQuestions = lesson.allQuestions
    ? ACTIVE_COURSE_DATA.questions
    : (lesson.questions || []).map(getQuestion).filter(Boolean);

  els.pageTitle.textContent = lesson.title;
  els.introPanel.style.display = "none";

  const goalsHtml = "";

  const theoryHtml = lesson.theory?.length
    ? `
      <section class="lesson-section interview-focus">
        <h4>Коротко</h4>
        ${lesson.theory.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}
      </section>
    `
    : "";

  const phrasesHtml = lesson.phrases?.length
    ? `
      <section class="lesson-section">
        <h4>Фразы с произношением</h4>
        <div class="phrase-grid">${lesson.phrases.map(renderPhraseCard).join("")}</div>
      </section>
    `
    : "";

  const pronunciationRulesHtml = lesson.pronunciationRules?.length
    ? `
      <section class="lesson-section interview-focus">
        <h4>Самое нужное для произношения</h4>
        <div class="rule-grid">${lesson.pronunciationRules.map(renderPronunciationRule).join("")}</div>
      </section>
    `
    : "";

  const tablesHtml = lesson.tables?.length
    ? `
      <section class="lesson-section">
        <h4>Таблицы</h4>
        <div class="table-grid">${lesson.tables.map(renderLessonTable).join("")}</div>
      </section>
    `
    : "";

  const sourcesHtml = lesson.id === "pronunciation" && ACTIVE_COURSE_DATA.sources?.length
    ? `
      <section class="lesson-section">
        <h4>Источники для проверки</h4>
        <ul class="clean-list">
          ${ACTIVE_COURSE_DATA.sources.map((source) => `<li><a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.title)}</a></li>`).join("")}
        </ul>
      </section>
    `
    : "";

  const questionsHtml = lessonQuestions.length
    ? `
      <section class="lesson-section interview-focus">
        <h4>Вопросы собеседования</h4>
        <div class="question-grid">${lessonQuestions.map(renderQuestionCard).join("")}</div>
      </section>
    `
    : "";

  const drillsHtml = lesson.drills?.length
    ? `
      <section class="lesson-section">
        <h4>Практика</h4>
        <div class="phrase-grid">
          ${lesson.drills.map((drill, index) => `
            <div class="drill-card">
              <div class="drill-row"><strong>Задание ${index + 1}</strong><span>3 повтора</span></div>
              <div>${escapeHtml(drill)}</div>
            </div>
          `).join("")}
        </div>
      </section>
    `
    : "";

  const mockHtml = lesson.mock ? renderMockInterview() : "";
  const documentHtml = renderDocumentBlocks(lesson);
  const doneLabel = state.progress[lesson.id] ? "Отмечено пройденным" : "Отметить пройденным";
  const summaryHtml = lesson.summary ? `<p class="lesson-summary">${escapeHtml(lesson.summary)}</p>` : "";

  els.lessonContent.innerHTML = `
    <div class="lesson-header">
      <div>
        <p class="eyebrow">Материал курса</p>
        <h3>${escapeHtml(lesson.title)}</h3>
        ${summaryHtml}
      </div>
      <div class="lesson-actions">
        <button class="primary-button mark-done-button ${state.progress[lesson.id] ? "is-done" : ""}" type="button" id="markDoneButton">${doneLabel}</button>
      </div>
    </div>
    ${goalsHtml}
    ${theoryHtml}
    ${pronunciationRulesHtml}
    ${tablesHtml}
    ${phrasesHtml}
    ${questionsHtml}
    ${drillsHtml}
    ${sourcesHtml}
    ${mockHtml}
    ${documentHtml}
  `;
}

const dayOrdinals = {
  1: ["първи", "ПЫРВИ", "первое"],
  2: ["втори", "ВТОРИ", "второе"],
  3: ["трети", "ТРЭТИ", "третье"],
  4: ["четвърти", "ЧЭТВЫРТИ", "четвертое"],
  5: ["пети", "ПЭТИ", "пятое"],
  6: ["шести", "ШЭСТИ", "шестое"],
  7: ["седми", "СЭДМИ", "седьмое"],
  8: ["осми", "ОСМИ", "восьмое"],
  9: ["девети", "ДЭВЭТИ", "девятое"],
  10: ["десети", "ДЭСЭТИ", "десятое"],
  11: ["единадесети", "ЭДИНАДЭСЭТИ", "одиннадцатое"],
  12: ["дванадесети", "ДВАНАДЭСЭТИ", "двенадцатое"],
  13: ["тринадесети", "ТРИНАДЭСЭТИ", "тринадцатое"],
  14: ["четиринадесети", "ЧЭТИРИНАДЭСЭТИ", "четырнадцатое"],
  15: ["петнадесети", "ПЭТНАДЭСЭТИ", "пятнадцатое"],
  16: ["шестнадесети", "ШЭСТНАДЭСЭТИ", "шестнадцатое"],
  17: ["седемнадесети", "СЭДЭМНАДЭСЭТИ", "семнадцатое"],
  18: ["осемнадесети", "ОСЭМНАДЭСЭТИ", "восемнадцатое"],
  19: ["деветнадесети", "ДЭВЭТНАДЭСЭТИ", "девятнадцатое"],
  20: ["двадесети", "ДВАДЭСЭТИ", "двадцатое"],
  21: ["двадесет и първи", "ДВАДЭСЭТ И ПЫРВИ", "двадцать первое"],
  22: ["двадесет и втори", "ДВАДЭСЭТ И ВТОРИ", "двадцать второе"],
  23: ["двадесет и трети", "ДВАДЭСЭТ И ТРЭТИ", "двадцать третье"],
  24: ["двадесет и четвърти", "ДВАДЭСЭТ И ЧЭТВЫРТИ", "двадцать четвертое"],
  25: ["двадесет и пети", "ДВАДЭСЭТ И ПЭТИ", "двадцать пятое"],
  26: ["двадесет и шести", "ДВАДЭСЭТ И ШЭСТИ", "двадцать шестое"],
  27: ["двадесет и седми", "ДВАДЭСЭТ И СЭДМИ", "двадцать седьмое"],
  28: ["двадесет и осми", "ДВАДЭСЭТ И ОСМИ", "двадцать восьмое"],
  29: ["двадесет и девети", "ДВАДЭСЭТ И ДЭВЭТИ", "двадцать девятое"],
  30: ["тридесети", "ТРИДЭСЭТИ", "тридцатое"],
  31: ["тридесет и първи", "ТРИДЭСЭТ И ПЫРВИ", "тридцать первое"]
};

const monthForms = [
  ["януари", "ЯНУАРИ", "января"],
  ["февруари", "ФЭВРУАРИ", "февраля"],
  ["март", "МАРТ", "марта"],
  ["април", "АПРИЛ", "апреля"],
  ["май", "МАЙ", "мая"],
  ["юни", "ЮНИ", "июня"],
  ["юли", "ЮЛИ", "июля"],
  ["август", "АВГУСТ", "августа"],
  ["септември", "СЭПТЭМВРИ", "сентября"],
  ["октомври", "ОКТОМВРИ", "октября"],
  ["ноември", "НОЭМВРИ", "ноября"],
  ["декември", "ДЭКЭМВРИ", "декабря"]
];

const feminineOrdinals = {
  0: ["нулева", "НУЛЭВА"],
  1: ["първа", "ПЫРВА"],
  2: ["втора", "ВТОРА"],
  3: ["трета", "ТРЭТА"],
  4: ["четвърта", "ЧЭТВЫРТА"],
  5: ["пета", "ПЭТА"],
  6: ["шеста", "ШЭСТА"],
  7: ["седма", "СЭДМА"],
  8: ["осма", "ОСМА"],
  9: ["девета", "ДЭВЭТА"],
  10: ["десета", "ДЭСЭТА"],
  11: ["единадесета", "ЭДИНАДЭСЭТА"],
  12: ["дванадесета", "ДВАНАДЭСЭТА"],
  13: ["тринадесета", "ТРИНАДЭСЭТА"],
  14: ["четиринадесета", "ЧЭТИРИНАДЭСЭТА"],
  15: ["петнадесета", "ПЭТНАДЭСЭТА"],
  16: ["шестнадесета", "ШЭСТНАДЭСЭТА"],
  17: ["седемнадесета", "СЭДЭМНАДЭСЭТА"],
  18: ["осемнадесета", "ОСЭМНАДЭСЭТА"],
  19: ["деветнадесета", "ДЭВЭТНАДЭСЭТА"],
  20: ["двадесета", "ДВАДЭСЭТА"],
  30: ["тридесета", "ТРИДЭСЭТА"],
  40: ["четиридесета", "ЧЭТИРИДЭСЭТА"],
  50: ["петдесета", "ПЭТДЭСЭТА"],
  60: ["шестдесета", "ШЭСТДЭСЭТА"],
  70: ["седемдесета", "СЭДЭМДЭСЭТА"],
  80: ["осемдесета", "ОСЭМДЭСЭТА"],
  90: ["деветдесета", "ДЭВЭТДЭСЭТА"]
};

function yearEndingWords(value) {
  if (feminineOrdinals[value]) return feminineOrdinals[value];
  const tens = Math.floor(value / 10) * 10;
  const ones = value % 10;
  if (feminineOrdinals[tens] && feminineOrdinals[ones]) {
    return [
      `${feminineOrdinals[tens][0].replace(/а$/, "")} и ${feminineOrdinals[ones][0]}`,
      `${feminineOrdinals[tens][1].replace(/А$/, "")} И ${feminineOrdinals[ones][1]}`
    ];
  }
  return [String(value), String(value)];
}

function yearToBg(year) {
  const yy = year % 100;
  if (year >= 1900 && year <= 1999) {
    if (yy === 0) return ["хиляда деветстотна година", "ХИЛЯДА ДЭВЭТСТОТНА ГОДИНА"];
    const ending = yearEndingWords(yy);
    const connector = yy < 20 || yy % 10 === 0 ? "и " : "";
    return [
      `хиляда деветстотин ${connector}${ending[0]} година`,
      `ХИЛЯДА ДЭВЭТСТОТИН ${connector ? "И " : ""}${ending[1]} ГОДИНА`
    ];
  }
  if (year >= 2000 && year <= 2099) {
    if (yy === 0) return ["две хиляди година", "ДВЭ ХИЛЯДИ ГОДИНА"];
    const ending = yearEndingWords(yy);
    const connector = yy < 20 || yy % 10 === 0 ? "и " : "";
    return [
      `две хиляди ${connector}${ending[0]} година`,
      `ДВЭ ХИЛЯДИ ${connector ? "И " : ""}${ending[1]} ГОДИНА`
    ];
  }
  return [`${year} година`, `${year} ГОДИНА`];
}

function formatBirthDateBg(dateValue) {
  if (!dateValue) return { bg: "датата ми на раждане", tr: "ДАТАТА МИ НА РАЖДАНЭ", ru: "мою дату рождения" };
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return { bg: "датата ми на раждане", tr: "ДАТАТА МИ НА РАЖДАНЭ", ru: "мою дату рождения" };
  const day = dayOrdinals[date.getDate()] || [String(date.getDate()), String(date.getDate()), String(date.getDate())];
  const month = monthForms[date.getMonth()];
  const year = yearToBg(date.getFullYear());
  return {
    bg: `${day[0]} ${month[0]} ${year[0]}`,
    tr: `${day[1]} ${month[1]} ${year[1]}`,
    ru: `${date.getDate()} ${month[2]} ${date.getFullYear()} года`
  };
}

function buildBirthPlace(profile) {
  if (profile.birthCity && profile.birthCountry) return `${profile.birthCity}, ${profile.birthCountry}`;
  if (profile.birthCity) return `град ${profile.birthCity}`;
  return profile.birthPlace || "Кишинев, Молдова";
}

function relationFromLineage(lineage) {
  const map = {
    greatGrandmother: "прабаба",
    greatGrandfather: "прадядо",
    grandmother: "баба",
    grandfather: "дядо",
    mother: "майка",
    father: "баща"
  };
  return map[lineage] || "баба";
}

function lineageText(lineage) {
  const map = {
    greatGrandMother: "по линия на моята прабаба",
    greatGrandmother: "по линия на моята прабаба",
    greatGrandFather: "по линия на моя прадядо",
    greatGrandfather: "по линия на моя прадядо",
    grandmother: "по линия на моята баба",
    grandfather: "по линия на моя дядо",
    mother: "по линия на моята майка",
    father: "по линия на моя баща"
  };
  return map[lineage] || map.grandmother;
}

function lineageTextRu(lineage) {
  const map = {
    greatGrandmother: "по линии моей прабабушки",
    greatGrandfather: "по линии моего прадедушки",
    grandmother: "по линии моей бабушки",
    grandfather: "по линии моего дедушки",
    mother: "по линии моей мамы",
    father: "по линии моего папы"
  };
  return map[lineage] || map.grandmother;
}

function lineageFromText(text) {
  if (/прабабушк|прабаба/i.test(text)) return "greatGrandmother";
  if (/прадедушк|прадед|прадядо/i.test(text)) return "greatGrandfather";
  if (/бабушк|баба/i.test(text)) return "grandmother";
  if (/дедушк|дядо|деда/i.test(text)) return "grandfather";
  if (/мам|матер|майк/i.test(text)) return "mother";
  if (/пап|отц|бащ/i.test(text)) return "father";
  return state.profile.lineage || "grandmother";
}

function normalizeCitizenship(value) {
  const clean = (value || "").trim().toLowerCase();
  if (!clean) return "";
  if (/укра/i.test(clean)) return "украинско";
  if (/молд/i.test(clean)) return "молдовско";
  if (/рус|рос/i.test(clean)) return "руско";
  if (/белар/i.test(clean)) return "беларуско";
  return clean;
}

function normalizeRuWordsToBg(value) {
  return String(value || "")
    .replace(/русский|русского|русском|русские/gi, "руски")
    .replace(/английский|английского|английском|английские/gi, "английски")
    .replace(/болгарский|болгарского|болгарском|болгарские/gi, "български")
    .replace(/немного|чуть-чуть|чуть чуть/gi, "малко")
    .replace(/путешествия|путешествовать|поездки/gi, "пътувания")
    .replace(/чтение|читать/gi, "четене")
    .replace(/книги/gi, "книги")
    .replace(/музыка|музыку/gi, "музика")
    .replace(/история/gi, "история")
    .replace(/география/gi, "география")
    .replace(/математика/gi, "математика")
    .replace(/литература/gi, "литература")
    .replace(/информатика/gi, "информатика")
    .replace(/\s+/g, " ")
    .trim();
}

function toIsoDate(value) {
  const match = String(value || "").match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (!match) return "";
  const day = match[1].padStart(2, "0");
  const month = match[2].padStart(2, "0");
  return `${match[3]}-${month}-${day}`;
}

function pickMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim().replace(/[.;]+$/, "");
  }
  return "";
}

function parseDossier(text) {
  const source = String(text || "").replace(/\s+/g, " ").trim();
  if (!source) return {};

  const parsed = {};
  const lower = source.toLowerCase();

  if (/женщина|женский|родилась|кандидатка/i.test(source)) parsed.gender = "female";
  if (/мужчина|мужской|родился|кандидат\b/i.test(source)) parsed.gender = "male";

  const explicitName = pickMatch(source, [
    /(?:фио|имя и фамилия|зовут|казвам се)\s*[:\-]?\s*([А-ЯA-ZЁЇІЄҐ][^.;]+)/i,
    /(?:меня зовут)\s+([А-ЯA-ZЁЇІЄҐ][^.;]+)/i
  ]);
  if (explicitName) {
    const nameParts = explicitName.replace(/[,]+/g, " ").split(/\s+/).filter(Boolean);
    if (nameParts.length >= 3) {
      parsed.firstName = nameParts[0];
      parsed.patronymic = nameParts.slice(1, -1).join(" ");
      parsed.surname = nameParts[nameParts.length - 1];
      parsed.name = `${parsed.firstName} ${parsed.surname}`;
    } else {
      parsed.name = explicitName;
      parsed.firstName = nameParts[0] || "";
      parsed.surname = nameParts[1] || "";
    }
  }

  const firstName = pickMatch(source, [/(?:имя)\s*[:\-]?\s*([А-ЯA-ZЁЇІЄҐ][А-Яа-яA-Za-zЁёЇїІіЄєҐґ-]+)/i]);
  if (firstName) parsed.firstName = firstName;

  const surname = pickMatch(source, [/(?:фамилия)\s*[:\-]?\s*([А-ЯA-ZЁЇІЄҐ][А-Яа-яA-Za-zЁёЇїІіЄєҐґ-]+)/i]);
  if (surname) parsed.surname = surname;

  const patronymic = pickMatch(source, [/(?:отчество)\s*[:\-]?\s*([А-ЯA-ZЁЇІЄҐ][А-Яа-яA-Za-zЁёЇїІіЄєҐґ-]+)/i]);
  if (patronymic) parsed.patronymic = patronymic;

  const date = toIsoDate(source);
  if (date) parsed.birthDate = date;

  const birthPlace = pickMatch(source, [
    /родил[а-я]*\s+\d{1,2}[./-]\d{1,2}[./-]\d{4}\s+(?:года\s+)?(?:в|во)\s+(?:городе\s+|г\.\s*)?([^.;]+)/i,
    /место рождения\s*[:\-]\s*([^.;]+)/i
  ]);
  if (birthPlace) parsed.birthPlace = birthPlace;

  const birthCity = pickMatch(source, [
    /(?:город рождения|родил[а-я]*\s+(?:в|во)\s+(?:городе\s+|г\.\s*)?)\s*[:\-]?\s*([А-ЯA-ZЁЇІЄҐ][^,.;]+)/i
  ]);
  if (birthCity) parsed.birthCity = birthCity;

  const birthCountry = pickMatch(source, [
    /(?:страна рождения)\s*[:\-]\s*([^.;]+)/i,
    /родил[а-я]*[^.;,]+,\s*([А-ЯA-ZЁЇІЄҐ][^.;]+)/i
  ]);
  if (birthCountry) parsed.birthCountry = birthCountry;

  const residence = pickMatch(source, [
    /(?:сейчас\s+)?живу\s+(?:в|во)\s+([^.;]+)/i,
    /проживаю\s+(?:в|во)\s+([^.;]+)/i,
    /город откуда приехал\s*[:\-]\s*([^.;]+)/i
  ]);
  if (residence) parsed.residence = residence;

  const citizenship = pickMatch(source, [
    /гражданство\s*[:\-]\s*([^.;]+)/i,
    /имею\s+([^.;]+?)\s+гражданство/i
  ]);
  if (citizenship) parsed.citizenship = normalizeCitizenship(citizenship);

  if (/по линии|корн|происхожд/i.test(source)) {
    parsed.lineage = lineageFromText(source);
    parsed.ancestorRelation = relationFromLineage(parsed.lineage);
  }

  const ancestor = pickMatch(source, [
    /по линии\s+(?:моей\s+|моего\s+)?(?:бабушки|дедушки|мамы|папы|отца|матери)\s+([А-ЯA-ZЁЇІЄҐ][^,.;]+)/i,
    /(?:бабушка|дедушка|мама|папа|отец|мать)\s+([А-ЯA-ZЁЇІЄҐ][^,.;]+)/i
  ]);
  if (ancestor) parsed.ancestor = ancestor;

  const job = pickMatch(source, [
    /работаю\s+(?:как|в качестве)?\s*([^.;]+)/i,
    /профессия\s*[:\-]\s*([^.;]+)/i,
    /должность\s*[:\-]\s*([^.;]+)/i,
    /(?:учусь|уча)\s+(?:в|во)\s+([^.;]+)/i
  ]);
  if (job) parsed.job = /университет|школ|колледж|лицей|академ/i.test(job) ? `уча в ${job}` : (job.startsWith("работ") ? job : `работя като ${job}`);

  const favoriteSubject = pickMatch(source, [
    /(?:любимый предмет|предмет)\s*[:\-]\s*([^.;]+)/i
  ]);
  if (favoriteSubject) parsed.favoriteSubject = favoriteSubject;

  const preferredCity = pickMatch(source, [
    /хочу\s+жить\s+(?:в|во)\s+([^.;]+)/i,
    /планирую\s+жить\s+(?:в|во)\s+([^.;]+)/i,
    /интересует\s+город\s+([^.;]+)/i
  ]);
  if (preferredCity) parsed.preferredCity = preferredCity;

  const languages = pickMatch(source, [
    /(?:знаю|языки)\s*[:\-]?\s*([^.;]+)/i
  ]);
  if (languages) parsed.languages = normalizeRuWordsToBg(languages);

  const hobbies = pickMatch(source, [
    /хобби\s*[:\-]\s*([^.;]+)/i,
    /увлечения\s*[:\-]\s*([^.;]+)/i
  ]);
  if (hobbies) parsed.hobbies = normalizeRuWordsToBg(hobbies);

  return parsed;
}

function buildPersonalAnswer() {
  const v = buildTemplateValues();
  const born = state.profile.gender === "male" ? "Роден съм" : "Родена съм";
  return [
    `Казвам се ${v.fullNameBg}.`,
    `${born} на ${v.birthDateBg} в ${v.birthPlace}.`,
    `Имам български произход ${v.lineageBg}.`,
    `В момента ${v.job}. В свободното си време обичам ${v.hobbies}.`,
    `Говоря ${v.languages}. Любимият ми предмет е ${v.favoriteSubject}.`,
    "Искам да получа българско гражданство, защото имам български корени, уважавам българската култура и искам да запазя връзката със страната на моите предци.",
    "Ако не разбера въпроса, ще помоля да го повторят по-бавно."
  ];
}

function renderPersonalAnswer() {
  const lines = buildPersonalAnswer();
  els.personalAnswer.innerHTML = `
    <div>
      <p class="label">Шаблон</p>
      ${lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
    </div>
    <div>
      <p class="label">Задача</p>
      <p>Выучить эту схему и заменить только свои реальные данные.</p>
    </div>
  `;
}

function loadProfileForm() {
  const defaults = {
    firstName: "",
    surname: "",
    name: "",
    patronymic: "",
    gender: "male",
    birthDate: "",
    birthCity: "",
    birthCountry: "",
    birthPlace: "",
    residence: "",
    citizenship: "",
    job: "",
    lineage: "greatGrandmother",
    ancestor: "",
    ancestorRelation: "",
    preferredCity: "",
    favoriteSubject: "",
    languages: "",
    hobbies: ""
  };
  state.profile = { ...defaults, ...state.profile };
  Object.entries(profileFields).forEach(([key, field]) => {
    if (field) field.value = state.profile[key] || "";
  });
}

function syncProfileForm() {
  Object.entries(profileFields).forEach(([key, field]) => {
    if (field) field.value = state.profile[key] || "";
  });
  saveProfile();
  renderPersonalAnswer();
}

function setAudioButtonPlaying(button, isPlaying) {
  if (!button) return;
  button.classList.toggle("is-playing", isPlaying);
  button.setAttribute("aria-label", isPlaying ? "Остановить аудио" : "Слушать аудио");
  button.setAttribute("title", isPlaying ? "Остановить аудио" : "Слушать аудио");
}

function clearActivePlayback({ stop = true } = {}) {
  if (!activePlayback) return;
  const { audio, utterance, button } = activePlayback;
  if (stop && audio) {
    audio.pause();
    audio.currentTime = 0;
  }
  if (stop && utterance && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  setAudioButtonPlaying(button, false);
  activePlayback = null;
}

function speak(text, rate = 0.82, button = null) {
  if (!("speechSynthesis" in window)) {
    showToast("В этом браузере нет синтеза речи.");
    return;
  }
  clearActivePlayback();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "bg-BG";
  utterance.rate = rate;
  activePlayback = { utterance, button };
  setAudioButtonPlaying(button, true);
  utterance.addEventListener("end", () => clearActivePlayback({ stop: false }));
  utterance.addEventListener("error", () => clearActivePlayback({ stop: false }));
  window.speechSynthesis.speak(utterance);
}

function playAudioOrSpeak(path, text, rate = 0.82, button = null) {
  if (activePlayback?.button === button) {
    clearActivePlayback();
    return;
  }

  if (!path) {
    speak(text, rate, button);
    return;
  }

  clearActivePlayback();
  const audio = new Audio(path);
  audio.playbackRate = rate < 0.8 ? 0.85 : 1;
  activePlayback = { audio, button };
  setAudioButtonPlaying(button, true);
  audio.addEventListener("ended", () => clearActivePlayback({ stop: false }), { once: true });
  audio.addEventListener("error", () => clearActivePlayback({ stop: false }), { once: true });
  audio.play().catch(() => {
    clearActivePlayback({ stop: false });
    showToast("Аудиофайл не найден, включаю озвучку браузера.");
    speak(text, rate, button);
  });
}

function render() {
  renderLessonNav();
  renderLessonContent();
  renderPersonalAnswer();
  updateProgress();
  els.prevLessonButton.disabled = state.lessonIndex === 0;
  els.nextLessonButton.disabled = state.lessonIndex === ACTIVE_COURSE_DATA.lessons.length - 1;
  document.querySelectorAll(".profile-card").forEach((card) => {
    card.style.display = "";
  });
}

els.lessonList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-lesson-index]");
  if (button) setLesson(Number(button.dataset.lessonIndex));
});

els.lessonContent.addEventListener("click", (event) => {
  const speakButton = event.target.closest("[data-speak]");
  const slowButton = event.target.closest("[data-speak-slow]");

  if (speakButton) {
    playAudioOrSpeak(speakButton.dataset.audio, speakButton.dataset.speak, 0.82, speakButton);
  }

  if (slowButton) {
    speak(slowButton.dataset.speakSlow, 0.62);
  }

  if (event.target.id === "markDoneButton") {
    const lesson = ACTIVE_COURSE_DATA.lessons[state.lessonIndex];
    state.progress[lesson.id] = !state.progress[lesson.id];
    saveProgress();
    render();
  }

  if (event.target.id === "showMockAnswerButton") {
    document.getElementById("mockAnswer")?.classList.toggle("visible");
  }

  if (event.target.id === "nextMockQuestionButton") {
    const available = ACTIVE_COURSE_DATA.questions.filter((question) => question.id !== state.currentMockQuestionId);
    state.currentMockQuestionId = available[Math.floor(Math.random() * available.length)].id;
    renderLessonContent();
  }
});

els.prevLessonButton.addEventListener("click", () => setLesson(state.lessonIndex - 1));
els.nextLessonButton.addEventListener("click", () => setLesson(state.lessonIndex + 1));
els.chooseInterviewButton?.addEventListener("click", () => setCourseMode("interview"));
els.backToChooserButton?.addEventListener("click", showCourseChooser);

els.startCourseButton.addEventListener("click", () => setLesson(1));
els.skipIntroButton.addEventListener("click", () => setLesson(1));
els.playIntroButton.addEventListener("click", () => playAudioOrSpeak(ACTIVE_COURSE_DATA.introAudioPath, ACTIVE_COURSE_DATA.introText, 0.82, els.playIntroButton));

els.resetProgressButton.addEventListener("click", () => {
  state.progress = {};
  saveProgress();
  render();
  showToast("Прогресс сброшен.");
});

if (els.profileForm) {
  els.profileForm.addEventListener("input", () => {
    Object.entries(profileFields).forEach(([key, field]) => {
      if (field) state.profile[key] = field.value;
    });
    saveProfile();
    renderPersonalAnswer();
  });
}

if (els.fillDossierExampleButton && els.dossierText) {
  els.fillDossierExampleButton.addEventListener("click", () => {
    els.dossierText.value = ACTIVE_COURSE_DATA.dossierExample || "";
  });
}

if (els.parseDossierButton && els.dossierText) {
  els.parseDossierButton.addEventListener("click", () => {
    const parsed = parseDossier(els.dossierText.value);
    state.profile = { ...state.profile, ...parsed };
    if (parsed.lineage && !parsed.ancestorRelation) {
      state.profile.ancestorRelation = relationFromLineage(parsed.lineage);
    }
    syncProfileForm();
    render();
    showToast(Object.keys(parsed).length ? "Досье разобрано и подставлено." : "Не нашел данных. Добавьте маркеры: ФИО, родился, гражданство, линия.");
  });
}

els.speakPersonalButton.addEventListener("click", () => {
  speak(buildPersonalAnswer().join(" "), 0.78);
});

els.copyPersonalButton.addEventListener("click", async () => {
  await navigator.clipboard.writeText(buildPersonalAnswer().join("\n"));
  showToast("Личный рассказ скопирован.");
});

loadProfileForm();
setCourseMode("interview");
