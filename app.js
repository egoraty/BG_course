const state = {
  lessonIndex: Number.parseInt(localStorage.getItem("bgCourseLessonIndex") || "0", 10) || 0,
  courseMode: localStorage.getItem("bgCourseMode") === "interview" ? "interview" : "",
  progressMap: JSON.parse(localStorage.getItem("bgCourseProgressMap") || "{}"),
  progress: {},
  profile: JSON.parse(localStorage.getItem("bgCourseProfile") || "{}"),
  currentMockQuestionId: null
};

let ACTIVE_COURSE_DATA = COURSE_DATA;
let activePlayback = null;
let currentUser = null;
const LESSON_POSITION_KEY = "bgCourseLessonIndex";
const LESSON_SCROLL_PREFIX = "bgCourseLessonScroll:";

const SUPABASE_URL = "https://powheluxxtvibrtukzux.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd2hlbHV4eHR2aWJydHVrenV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNjQ5NDQsImV4cCI6MjA5ODc0MDk0NH0.z4Zruq6dSraDKVppTpQvgeM1C0aTKyYy_owZ0JCRf90";
const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true
  }
});

const els = {
  authScreen: document.getElementById("authScreen"),
  authForm: document.getElementById("authForm"),
  authEmail: document.getElementById("authEmail"),
  authPassword: document.getElementById("authPassword"),
  authSubmitButton: document.getElementById("authSubmitButton"),
  authMessage: document.getElementById("authMessage"),
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
  signOutButton: document.getElementById("signOutButton"),
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

function stripStressMarks(value) {
  return String(value || "").normalize("NFD").replace(/\u0301/g, "").normalize("NFC");
}

const TEMPLATE_HINTS = {
  "име": "Петър / Анна",
  "имя": "Петър / Анна",
  "бащино име": "Алексеевич / Сергеевна",
  "отчество": "Алексеевич / Сергеевна",
  "фамилия": "Иванов / Смирнова",
  "дата": "дванадесети март хиляда деветстотин осемдесет и четвърта година / пети септември две хиляди и втора година",
  "държава": "Русия / Беларус",
  "страна": "Русия / Беларус",
  "град": "Москва / Минск",
  "място": "Москва / Минск",
  "адрес": "град Москва, улица Тверская, номер петнадесет, апартамент двадесет и четири / град Минск, проспект Независимости, номер четиридесет и пет, апартамент осемнадесет",
  "улица": "Тверская / проспект Независимости",
  "номер": "петнадесет / четиридесет и пет",
  "телефон": "плюс седем деветстотин шестнадесет двеста тридесет и четири петдесет и шест седемдесет и осем",
  "имейл": "ivanov@example.com / smirnova@example.com",
  "професия": "инженер / студентка",
  "хоби": "спорт и пътувания / книги и музика",
  "роднина": "прабаба Мария Петрова / прадядо Георги Иванов",
  "линия": "по майчина линия / по бащина линия"
};

function normalizeTemplateKey(value) {
  return stripStressMarks(String(value || ""))
    .toLocaleLowerCase("bg-BG")
    .replace(/\s+/g, " ")
    .trim();
}

function replaceTemplateHints(value) {
  return String(value || "").replace(/\[([^\]]+)\]/g, (match, key) => {
    const hint = TEMPLATE_HINTS[normalizeTemplateKey(key)];
    return hint ? `[${hint}]` : match;
  });
}

function normalizeBulgarianStressCaps(value) {
  return String(value || "").replace(/[\p{Script=Cyrillic}]+/gu, (word) => {
    const letters = [...word];
    const hasLower = letters.some((char) => char === char.toLocaleLowerCase("bg-BG") && char !== char.toLocaleUpperCase("bg-BG"));
    const hasUpper = letters.some((char, index) => index > 0 && char === char.toLocaleUpperCase("bg-BG") && char !== char.toLocaleLowerCase("bg-BG"));
    if (!hasLower || !hasUpper) return word;
    return letters
      .map((char, index) => {
        const isLetter = char.toLocaleLowerCase("bg-BG") !== char.toLocaleUpperCase("bg-BG");
        if (!isLetter) return char;
        if (index === 0 && char === char.toLocaleUpperCase("bg-BG")) return char;
        return char.toLocaleLowerCase("bg-BG");
      })
      .join("");
  });
}

const BG_TEXT_REPLACEMENTS = [
  [/\b12 юли 1991 година\b/g, "дванадесети юли хиляда деветстотин деветдесет и първа година"],
  [/\b12 юли 1991 г\./g, "дванадесети юли хиляда деветстотин деветдесет и първа година"],
  [/\b3 март 1878 година\b/g, "трети март хиляда осемстотин седемдесет и осма година"],
  [/\b3 март\b/g, "трети март"],
  [/\b24 май\b/g, "двадесет и четвърти май"],
  [/\b6 май\b/g, "шести май"],
  [/\b2 юни\b/g, "втори юни"],
  [/\b6 септември\b/g, "шести септември"],
  [/\b22 септември 1908 година\b/g, "двадесет и втори септември хиляда деветстотин и осма година"],
  [/\b1 ноември\b/g, "първи ноември"],
  [/\b1 януари 2007 година\b/g, "първи януари две хиляди и седма година"],
  [/\b29 март 2004 година\b/g, "двадесет и девети март две хиляди и четвърта година"],
  [/\b1 януари 2026 година\b/g, "първи януари две хиляди двадесет и шеста година"],
  [/\b1885 година\b/g, "хиляда осемстотин осемдесет и пета година"],
  [/\b1878 година\b/g, "хиляда осемстотин седемдесет и осма година"],
  [/\b1984 година\b/g, "хиляда деветстотин осемдесет и четвърта година"],
  [/\b2002 година\b/g, "две хиляди и втора година"],
  [/\b1991 година\b/g, "хиляда деветстотин деветдесет и първа година"],
  [/\b1908 година\b/g, "хиляда деветстотин и осма година"],
  [/\b2004 година\b/g, "две хиляди и четвърта година"],
  [/\b2007 година\b/g, "две хиляди и седма година"],
  [/\b2026 година\b/g, "две хиляди двадесет и шеста година"],
  [/\b57 въпроса\b/g, "петдесет и седем въпроса"]
];

const RU_TEXT_REPLACEMENTS = [
  [
    /В болгарском слове ударная гласная может быть выделена прописной буквой: добрЕ, кАзвам, бЪлгарски\. В русской транскрипции используется знак ударения: ДОБРЭ́, КА́ЗВАМ, БЫ́ЛГАРСКИ\./g,
    "В болгарской строке слова пишутся обычным начертанием: добре, казвам, български. В русской транскрипции ударную букву показываем прописной: ДОБРЭ, КАЗВАМ, БЫЛГАРСКИ."
  ],
  [/Ударная гласная в транскрипции отмечена знаком ударения\./g, "Ударная буква в русской транскрипции выделяется прописной."],
  [/\b12 июля 1991 года\b/g, "двенадцатого июля тысяча девятьсот девяносто первого года"],
  [/\b3 марта 1878 года\b/g, "третьего марта тысяча восемьсот семьдесят восьмого года"],
  [/\b3 марта\b/g, "третьего марта"],
  [/\b24 мая\b/g, "двадцать четвертого мая"],
  [/\b6 мая\b/g, "шестого мая"],
  [/\b2 июня\b/g, "второго июня"],
  [/\b6 сентября\b/g, "шестого сентября"],
  [/\b22 сентября 1908 года\b/g, "двадцать второго сентября тысяча девятьсот восьмого года"],
  [/\b1 ноября\b/g, "первого ноября"],
  [/\b1 января 2007 года\b/g, "первого января две тысячи седьмого года"],
  [/\b29 марта 2004 года\b/g, "двадцать девятого марта две тысячи четвертого года"],
  [/\b1 января 2026 года\b/g, "первого января две тысячи двадцать шестого года"],
  [/\b1885 года\b/g, "тысяча восемьсот восемьдесят пятого года"],
  [/\b1878 года\b/g, "тысяча восемьсот семьдесят восьмого года"],
  [/\b12 марта 1984 года\b/g, "двенадцатого марта тысяча девятьсот восемьдесят четвертого года"],
  [/\b5 сентября 2002 года\b/g, "пятого сентября две тысячи второго года"],
  [/\b1984 года\b/g, "тысяча девятьсот восемьдесят четвертого года"],
  [/\b2002 года\b/g, "две тысячи второго года"],
  [/\b1991 года\b/g, "тысяча девятьсот девяносто первого года"],
  [/\b1908 года\b/g, "тысяча девятьсот восьмого года"],
  [/\b2004 года\b/g, "две тысячи четвертого года"],
  [/\b2007 года\b/g, "две тысячи седьмого года"],
  [/\b2026 года\b/g, "две тысячи двадцать шестого года"],
  [/\b57 вопросов\b/g, "пятидесяти семи вопросов"]
];

function applyTextReplacements(value, replacements) {
  return replacements.reduce((result, [pattern, replacement]) => result.replace(pattern, replacement), String(value || ""));
}

const BG_UNITS = ["нула", "едно", "две", "три", "четири", "пет", "шест", "седем", "осем", "девет"];
const BG_TEENS = {
  10: "десет",
  11: "единадесет",
  12: "дванадесет",
  13: "тринадесет",
  14: "четиринадесет",
  15: "петнадесет",
  16: "шестнадесет",
  17: "седемнадесет",
  18: "осемнадесет",
  19: "деветнадесет"
};
const BG_TENS = {
  20: "двадесет",
  30: "тридесет",
  40: "четиридесет",
  50: "петдесет",
  60: "шестдесет",
  70: "седемдесет",
  80: "осемдесет",
  90: "деветдесет"
};
const BG_HUNDREDS = {
  100: "сто",
  200: "двеста",
  300: "триста",
  400: "четиристотин",
  500: "петстотин",
  600: "шестстотин",
  700: "седемстотин",
  800: "осемстотин",
  900: "деветстотин"
};
const BG_ORDINALS = {
  1: "първи",
  2: "втори",
  3: "трети",
  4: "четвърти",
  5: "пети",
  6: "шести",
  7: "седми",
  8: "осми",
  9: "девети",
  10: "десети",
  11: "единадесети",
  12: "дванадесети",
  13: "тринадесети",
  14: "четиринадесети",
  15: "петнадесети",
  16: "шестнадесети",
  17: "седемнадесети",
  18: "осемнадесети",
  19: "деветнадесети",
  20: "двадесети",
  21: "двадесет и първи",
  22: "двадесет и втори",
  23: "двадесет и трети",
  24: "двадесет и четвърти",
  25: "двадесет и пети",
  26: "двадесет и шести",
  27: "двадесет и седми",
  28: "двадесет и осми",
  29: "двадесет и девети",
  30: "тридесети",
  31: "тридесет и първи"
};

const RU_UNITS = ["ноль", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
const RU_TEENS = {
  10: "десять",
  11: "одиннадцать",
  12: "двенадцать",
  13: "тринадцать",
  14: "четырнадцать",
  15: "пятнадцать",
  16: "шестнадцать",
  17: "семнадцать",
  18: "восемнадцать",
  19: "девятнадцать"
};
const RU_TENS = {
  20: "двадцать",
  30: "тридцать",
  40: "сорок",
  50: "пятьдесят",
  60: "шестьдесят",
  70: "семьдесят",
  80: "восемьдесят",
  90: "девяносто"
};
const RU_HUNDREDS = {
  100: "сто",
  200: "двести",
  300: "триста",
  400: "четыреста",
  500: "пятьсот",
  600: "шестьсот",
  700: "семьсот",
  800: "восемьсот",
  900: "девятьсот"
};
const RU_ORDINALS = {
  masculine: {
    1: "первый",
    2: "второй",
    3: "третий",
    4: "четвертый",
    5: "пятый",
    6: "шестой",
    7: "седьмой",
    8: "восьмой",
    9: "девятый",
    10: "десятый",
    11: "одиннадцатый",
    12: "двенадцатый",
    13: "тринадцатый",
    14: "четырнадцатый",
    15: "пятнадцатый",
    16: "шестнадцатый",
    17: "семнадцатый",
    18: "восемнадцатый",
    19: "девятнадцатый",
    20: "двадцатый",
    21: "двадцать первый",
    22: "двадцать второй",
    23: "двадцать третий",
    24: "двадцать четвертый",
    25: "двадцать пятый",
    26: "двадцать шестой",
    27: "двадцать седьмой",
    28: "двадцать восьмой",
    29: "двадцать девятый",
    30: "тридцатый",
    31: "тридцать первый"
  },
  feminine: {
    1: "первая",
    2: "вторая",
    3: "третья",
    4: "четвертая",
    5: "пятая",
    6: "шестая",
    7: "седьмая",
    8: "восьмая",
    9: "девятая",
    10: "десятая",
    11: "одиннадцатая",
    12: "двенадцатая",
    13: "тринадцатая",
    14: "четырнадцатая",
    15: "пятнадцатая",
    16: "шестнадцатая",
    17: "семнадцатая",
    18: "восемнадцатая",
    19: "девятнадцатая",
    20: "двадцатая",
    21: "двадцать первая",
    22: "двадцать вторая",
    23: "двадцать третья",
    24: "двадцать четвертая",
    25: "двадцать пятая",
    26: "двадцать шестая",
    27: "двадцать седьмая",
    28: "двадцать восьмая",
    29: "двадцать девятая",
    30: "тридцатая",
    31: "тридцать первая"
  },
  genitive: {
    1: "первого",
    2: "второго",
    3: "третьего",
    4: "четвертого",
    5: "пятого",
    6: "шестого",
    7: "седьмого",
    8: "восьмого",
    9: "девятого",
    10: "десятого",
    11: "одиннадцатого",
    12: "двенадцатого",
    13: "тринадцатого",
    14: "четырнадцатого",
    15: "пятнадцатого",
    16: "шестнадцатого",
    17: "семнадцатого",
    18: "восемнадцатого",
    19: "девятнадцатого",
    20: "двадцатого",
    21: "двадцать первого",
    22: "двадцать второго",
    23: "двадцать третьего",
    24: "двадцать четвертого",
    25: "двадцать пятого",
    26: "двадцать шестого",
    27: "двадцать седьмого",
    28: "двадцать восьмого",
    29: "двадцать девятого",
    30: "тридцатого",
    31: "тридцать первого"
  }
};

const TR_UNITS = ["нУла", "еднО", "две", "три", "чЕтири", "пет", "шест", "сЕдем", "Осем", "дЕвет"];
const TR_TEENS = {
  10: "дЕсет",
  11: "единАдесет",
  12: "дванАдесет",
  13: "тринАдесет",
  14: "четиринАдесет",
  15: "петнАдесет",
  16: "шестнАдесет",
  17: "седемнАдесет",
  18: "осемнАдесет",
  19: "деветнАдесет"
};
const TR_TENS = {
  20: "двАдесет",
  30: "трИдесет",
  40: "четиридЕсет",
  50: "петдЕсет",
  60: "шестдЕсет",
  70: "седемдЕсет",
  80: "осемдЕсет",
  90: "деветдЕсет"
};
const TR_HUNDREDS = {
  100: "сто",
  200: "двЕста",
  300: "трИста",
  400: "четиристОтин",
  500: "петстОтин",
  600: "шестстОтин",
  700: "седемстОтин",
  800: "осемстОтин",
  900: "деветстОтин"
};
const BG_MONTHS_BY_NUMBER = {
  1: "януари",
  2: "февруари",
  3: "март",
  4: "април",
  5: "май",
  6: "юни",
  7: "юли",
  8: "август",
  9: "септември",
  10: "октомври",
  11: "ноември",
  12: "декември"
};
const RU_MONTHS_BY_NUMBER = {
  1: "января",
  2: "февраля",
  3: "марта",
  4: "апреля",
  5: "мая",
  6: "июня",
  7: "июля",
  8: "августа",
  9: "сентября",
  10: "октября",
  11: "ноября",
  12: "декабря"
};
const TR_MONTHS_BY_NUMBER = {
  1: "януАри",
  2: "февруАри",
  3: "март",
  4: "апрИл",
  5: "май",
  6: "Юни",
  7: "Юли",
  8: "Август",
  9: "септЕмври",
  10: "октОмври",
  11: "ноЕмври",
  12: "декЕмври"
};

function convertUnder100(number, units, teens, tens) {
  if (number < 10) return units[number];
  if (number < 20) return teens[number];
  const ten = Math.floor(number / 10) * 10;
  const unit = number % 10;
  return unit ? `${tens[ten]} и ${units[unit]}` : tens[ten];
}

function convertUnder1000(number, units, teens, tens, hundreds) {
  if (number < 100) return convertUnder100(number, units, teens, tens);
  const hundred = Math.floor(number / 100) * 100;
  const rest = number % 100;
  if (!rest) return hundreds[hundred];
  const connector = rest < 20 || rest % 10 === 0 ? " и " : " ";
  return `${hundreds[hundred]}${connector}${convertUnder100(rest, units, teens, tens)}`;
}

function bgNumberToWords(number) {
  const n = Number(number);
  if (!Number.isFinite(n)) return String(number);
  if (n < 1000) return convertUnder1000(n, BG_UNITS, BG_TEENS, BG_TENS, BG_HUNDREDS);
  if (n < 1000000) {
    const thousands = Math.floor(n / 1000);
    const rest = n % 1000;
    const prefix = thousands === 1 ? "хиляда" : `${bgNumberToWords(thousands)} хиляди`;
    if (!rest) return prefix;
    return `${prefix}${rest < 100 ? " и " : " "}${bgNumberToWords(rest)}`;
  }
  return String(number);
}

function ruNumberToWords(number) {
  const n = Number(number);
  if (!Number.isFinite(n)) return String(number);
  if (n < 1000) return convertUnder1000(n, RU_UNITS, RU_TEENS, RU_TENS, RU_HUNDREDS);
  if (n < 1000000) {
    const thousands = Math.floor(n / 1000);
    const rest = n % 1000;
    const prefix = thousands === 1 ? "тысяча" : `${ruNumberToWords(thousands)} тысячи`;
    if (!rest) return prefix;
    return `${prefix} ${ruNumberToWords(rest)}`;
  }
  return String(number);
}

function trNumberToWords(number) {
  const n = Number(number);
  if (!Number.isFinite(n)) return String(number);
  if (n < 1000) return convertUnder1000(n, TR_UNITS, TR_TEENS, TR_TENS, TR_HUNDREDS);
  if (n < 1000000) {
    const thousands = Math.floor(n / 1000);
    const rest = n % 1000;
    const prefix = thousands === 1 ? "хилЯда" : `${trNumberToWords(thousands)} хилЯди`;
    if (!rest) return prefix;
    return `${prefix}${rest < 100 ? " и " : " "}${trNumberToWords(rest)}`;
  }
  return String(number);
}

function shouldSkipNumberReplacement(text, offset, length) {
  const prev = text[offset - 1] || "";
  const next = text[offset + length] || "";
  if (next === "." || prev === ".") return true;
  return /[A-Za-zА-Яа-я_@/]/.test(prev) || /[A-Za-zА-Яа-я_@/]/.test(next);
}

function replacePlainNumbers(text, converter) {
  return String(text || "").replace(/\d{1,6}/g, (match, offset, source) => {
    if (shouldSkipNumberReplacement(source, offset, match.length)) return match;
    return converter(Number(match));
  });
}

function expandNumbersInBulgarian(value) {
  return String(value || "")
    .replace(/\b(\d{1,2})[./](\d{1,2})[./](\d{4})\b/g, (_, day, month, year) => {
      const dayWord = BG_ORDINALS[Number(day)] || bgNumberToWords(day);
      const monthWord = BG_MONTHS_BY_NUMBER[Number(month)] || bgNumberToWords(month);
      return `${dayWord} ${monthWord} ${bgNumberToWords(year)} година`;
    })
    .replace(/\b(\d{1,2})-(?:ви|ри|ти)\b/g, (_, number) => BG_ORDINALS[Number(number)] || bgNumberToWords(number))
    .replace(/\b(\d{1,2})-(?:й|я|го)\b/g, (_, number) => BG_ORDINALS[Number(number)] || bgNumberToWords(number))
    .replace(/\b(\d{1,2})\s*-\s*(?:и|ти)\b/g, (_, number) => BG_ORDINALS[Number(number)] || bgNumberToWords(number))
    .replace(/\b(\d{1,2})\/(\d{1,2})\b/g, (_, first, second) => `${bgNumberToWords(first)} / ${bgNumberToWords(second)}`)
    .replace(/\b\d{1,6}\b/g, (match, offset, source) => {
      if (shouldSkipNumberReplacement(source, offset, match.length)) return match;
      return bgNumberToWords(Number(match));
    });
}

function expandNumbersInRussian(value) {
  return String(value || "")
    .replace(/\b(\d{1,2})[./](\d{1,2})[./](\d{4})\b/g, (_, day, month, year) => {
      const dayWord = RU_ORDINALS.genitive[Number(day)] || ruNumberToWords(day);
      const monthWord = RU_MONTHS_BY_NUMBER[Number(month)] || ruNumberToWords(month);
      return `${dayWord} ${monthWord} ${ruNumberToWords(year)} года`;
    })
    .replace(/\b(\d{1,2})-й\b/g, (_, number) => RU_ORDINALS.masculine[Number(number)] || ruNumberToWords(number))
    .replace(/\b(\d{1,2})-я\b/g, (_, number) => RU_ORDINALS.feminine[Number(number)] || ruNumberToWords(number))
    .replace(/\b(\d{1,2})-го\b/g, (_, number) => RU_ORDINALS.genitive[Number(number)] || ruNumberToWords(number))
    .replace(/\b(\d{1,2})\/(\d{1,2})\b/g, (_, first, second) => `${ruNumberToWords(first)} / ${ruNumberToWords(second)}`)
    .replace(/\b\d{1,6}\b/g, (match, offset, source) => {
      if (shouldSkipNumberReplacement(source, offset, match.length)) return match;
      return ruNumberToWords(Number(match));
    });
}

function expandNumbersInTranscript(value) {
  return String(value || "")
    .replace(/\b(\d{1,2})[./](\d{1,2})[./](\d{4})\b/g, (_, day, month, year) => {
      const dayWord = trNumberToWords(day);
      const monthWord = TR_MONTHS_BY_NUMBER[Number(month)] || trNumberToWords(month);
      return `${dayWord} ${monthWord} ${trNumberToWords(year)} годИна`;
    })
    .replace(/\b(\d{1,2})-(?:й|я|го|ви|ри|ти)\b/g, (_, number) => trNumberToWords(number))
    .replace(/\b(\d{1,2})\/(\d{1,2})\b/g, (_, first, second) => `${trNumberToWords(first)} / ${trNumberToWords(second)}`)
    .replace(/\b\d{1,6}\b/g, (match, offset, source) => {
      if (shouldSkipNumberReplacement(source, offset, match.length)) return match;
      return trNumberToWords(Number(match));
    });
}

function formatBulgarianText(value) {
  return expandNumbersInBulgarian(stripStressMarks(normalizeBulgarianStressCaps(applyTextReplacements(replaceTemplateHints(value), BG_TEXT_REPLACEMENTS))));
}

function formatTranslationText(value) {
  return expandNumbersInRussian(applyTextReplacements(replaceTemplateHints(value), RU_TEXT_REPLACEMENTS))
    .replace(/Я из \[Русия \/ Беларус\]\./g, "Я из России / Я из Беларуси.");
}

function formatTranscriptText(value) {
  return expandNumbersInTranscript(stripStressMarks(replaceTemplateHints(value)));
}

function formatCourseLine(value) {
  return formatBulgarianText(applyTextReplacements(value, RU_TEXT_REPLACEMENTS));
}

function normalizeTranscriptDisplay(value) {
  return stripStressMarks(String(value || "")
    .replace(/тя нэ э ли/g, "тянээли")
    .replace(/ТЯ НЭ Э ЛИ/g, "ТЯНЭЭЛИ")
    .replace(/ия/g, "ья")
    .replace(/Ия/g, "Ья")
    .replace(/ИЯ/g, "ЬЯ")
    .replace(/б([ыЫ]\u0301?)лгарка/g, "б$1лгрка")
    .replace(/Б([Ыы]\u0301?)ЛГАРКА/g, "Б$1ЛГРКА"));
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
  ["добре", "audio/course/module-01/добре.mp3"],
  ["не", "audio/course/module-01/не.mp3"],
  ["пет", "audio/course/module-01/пет.mp3"],
  ["бъдеще", "audio/course/module-01/бъдеще.mp3"]
]);
const DOCUMENT_AUDIO_BY_MODULE = new Map();

[
  ["добре", "audio/course/module-01/добре.mp3"],
  ["не", "audio/course/module-01/не.mp3"],
  ["пет", "audio/course/module-01/пет.mp3"],
  ["бъдеще", "audio/course/module-01/бъдеще.mp3"]
].forEach(([key, audioPath]) => {
  DOCUMENT_AUDIO_BY_MODULE.set(`1:${normalizeAudioKey(key)}`, audioPath);
});

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
  const audioPath = `audio/course/module-02/${file}`;
  DOCUMENT_AUDIO_MAP.set(key, audioPath);
  DOCUMENT_AUDIO_BY_MODULE.set(`2:${normalizeAudioKey(key)}`, audioPath);
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
  const audioPath = `audio/course/module-03/${file}`;
  DOCUMENT_AUDIO_MAP.set(key, audioPath);
  DOCUMENT_AUDIO_BY_MODULE.set(`3:${normalizeAudioKey(key)}`, audioPath);
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
  ["сърбин", "сърбин.mp3"],
  ["сръбкиня", "сръбкиня.mp3"],
  ["сърби", "сърби.mp3"],
  ["сръбкини", "сръбкини.mp3"]
].forEach(([key, file]) => {
  const audioPath = `audio/course/module-04/${file}`;
  DOCUMENT_AUDIO_MAP.set(key, audioPath);
  DOCUMENT_AUDIO_BY_MODULE.set(`4:${normalizeAudioKey(key)}`, audioPath);
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
  const audioPath = `audio/course/module-05/${file}`;
  DOCUMENT_AUDIO_MAP.set(key, audioPath);
  DOCUMENT_AUDIO_BY_MODULE.set(`5:${normalizeAudioKey(key)}`, audioPath);
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
  const audioPath = `audio/course/module-06/${file}`;
  DOCUMENT_AUDIO_MAP.set(key, audioPath);
  DOCUMENT_AUDIO_BY_MODULE.set(`6:${normalizeAudioKey(key)}`, audioPath);
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
  const audioPath = `audio/course/module-07/${file}`;
  DOCUMENT_AUDIO_MAP.set(key, audioPath);
  DOCUMENT_AUDIO_BY_MODULE.set(`7:${normalizeAudioKey(key)}`, audioPath);
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
  const audioPath = `audio/course/module-08/${file}`;
  DOCUMENT_AUDIO_MAP.set(key, audioPath);
  DOCUMENT_AUDIO_BY_MODULE.set(`8:${normalizeAudioKey(key)}`, audioPath);
});

[
  ["добро утро, госпожо / господине", "dobro-utro-gospozho-gospodine.mp3"],
  ["добър ден, госпожо / господине", "dobar-den-gospozho-gospodine.mp3"],
  ["казвам се", "kazvam-se.mp3"],
  ["записан съм / записана съм за", "zapisan-sam-za-deset-chasa.mp3"],
  ["заповядайте", "zapovyadaite.mp3"],
  ["почакайте малко", "pochakaite-malko.mp3"],
  ["почакайте пет минути", "pochakaite-pet-minuti.mp3"],
  ["ние ще ви извикаме", "nie-shte-vi-izvikame.mp3"],
  ["дайте оригиналните документи и преводите, моля", "daite-originalnite-dokumenti-i-prevodite.mp3"],
  ["ето, моля", "eto-molya.mp3"],
  ["вземете, моля", "vzemete-molya.mp3"],
  ["самостоятелно ли учите български език или с преподавател", "samostoyatelno-li-uchite-ili-s-prepodavatel.mp3"],
  ["с преподавател", "s-prepodavatel.mp3"],
  ["самостоятелно", "samostoyatelno.mp3"],
  ["започваме интервюто", "zapochvame-intervyuto.mp3"],
  ["готови ли сте", "gotovi-li-ste.mp3"],
  ["да, готов съм / готова съм", "da-gotov-sam-gotova-sam.mp3"],
  ["ще ви задаваме въпроси на български език", "shte-vi-zadavame-vaprosi-na-balgarski.mp3"],
  ["желателно е да отговаряте също на български", "zhelatelno-e-da-otgovaryate-na-balgarski.mp3"],
  ["извинявам се, не ви чух добре", "izvinyavam-se-ne-vi-chuh-dobre.mp3"],
  ["повторете въпроса, моля", "povtorete-vaprosa-molya.mp3"],
  ["говорете по-бавно, моля", "govorete-po-bavno-molya.mp3"],
  ["не разбирам думата", "ne-razbiram-dumata.mp3"],
  ["може ли да обясните", "mozhe-li-da-obyasnite.mp3"],
  ["трябва да платите евро", "tryabva-da-platite-evro.mp3"],
  ["подпишете се тук, моля", "podpishete-se-tuk-molya.mp3"],
  ["къде да се подпиша", "kade-da-se-podpisha.mp3"],
  ["тук и на другата страница също", "tuk-i-na-drugata-stranica-sashto.mp3"],
  ["вие добре говорите български", "vie-dobre-govorite-balgarski.mp3"],
  ["благодаря. говоря само малко, но се старая и уча езика", "blagodarya-govorya-samo-malko.mp3"],
  ["запишете трите си имена", "zapishete-trite-si-imena.mp3"],
  ["довиждане. приятен ден", "dovizhdane-priyaten-den.mp3"],
  ["подобно. / на вас също", "podobno-na-vas-sashto.mp3"]
].forEach(([key, file]) => {
  const audioPath = `audio/course/module-11/${file}`;
  DOCUMENT_AUDIO_MAP.set(normalizeAudioKey(key), audioPath);
  DOCUMENT_AUDIO_BY_MODULE.set(`11:${normalizeAudioKey(key)}`, audioPath);
});

[
  ["домати", "domati.mp3"],
  ["краставици", "krastavici.mp3"],
  ["магданоз", "magdanoz.mp3"],
  ["олио", "olio.mp3"],
  ["пипер", "piper.mp3"],
  ["сирене", "sirene.mp3"],
  ["зехтин", "zehtin.mp3"],
  ["лук", "luk.mp3"],
  ["сол", "sol.mp3"],
  ["тънки кори", "tanki-kori.mp3"],
  ["кисело мляко", "kiselo-mlyako.mp3"],
  ["яйца", "yaytsa.mp3"],
  ["айрян", "ayryan.mp3"],
  ["сода", "soda.mp3"],
  ["копър", "kopar.mp3"],
  ["орехи", "orehi.mp3"],
  ["малко чесън", "malko-chesan.mp3"],
  ["сол на вкус", "sol-na-vkus.mp3"]
].forEach(([key, file]) => {
  const audioPath = `audio/course/module-12/${file}`;
  DOCUMENT_AUDIO_MAP.set(normalizeAudioKey(key), audioPath);
  DOCUMENT_AUDIO_BY_MODULE.set(`12:${normalizeAudioKey(key)}`, audioPath);
});

[
  ["добър ден", "audio/course/module-03/добър ден.mp3"],
  ["казвам се", "audio/course/module-14/kazvam-se-petar-anna.mp3"],
  ["аз съм от", "audio/course/module-14/az-sam-ot-rusia-belarus.mp3"],
  ["уча български език", "audio/course/module-08/уча български език.mp3"],
  ["да, разбира се", "audio/course/module-14/da-razbira-se.mp3"],
  ["не, нямам", "audio/course/module-14/ne-nyamam.mp3"],
  ["повторете въпроса, моля", "audio/course/module-11/povtorete-vaprosa-molya.mp3"],
  ["говорете по-бавно, моля", "audio/course/module-11/govorete-po-bavno-molya.mp3"],
  ["благодаря много", "audio/course/module-03/благодаря много.mp3"],
  ["довиждане. приятен ден", "audio/course/module-14/dovizhdane-priyaten-den.mp3"]
].forEach(([key, audioPath]) => {
  DOCUMENT_AUDIO_MAP.set(normalizeAudioKey(key), audioPath);
  DOCUMENT_AUDIO_BY_MODULE.set(`14:${normalizeAudioKey(key)}`, audioPath);
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

function getLessonModuleNumber(lesson = ACTIVE_COURSE_DATA.lessons[state.lessonIndex]) {
  const match = String(lesson?.title || "").match(/\d+/);
  return match ? Number(match[0]) : null;
}

function getDocumentAudio(phrase, moduleNumber = getLessonModuleNumber()) {
  const key = normalizeAudioKey(phrase?.bg);
  const moduleAudio = moduleNumber ? DOCUMENT_AUDIO_BY_MODULE.get(`${moduleNumber}:${key}`) : "";
  return moduleAudio || DOCUMENT_AUDIO_MAP.get(key);
}

function renderAudioIconButton({ speak, audio = "", label = "Слушать аудио", extraClass = "" }) {
  return `
    <button class="inline-audio-button ${extraClass}" type="button" data-audio="${escapeHtml(audio)}" data-speak="${escapeHtml(speak)}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">
      <span class="visually-hidden">${escapeHtml(label)}</span>
    </button>
  `;
}

function renderInlineAudioButton(phrase, extraClass = "", moduleNumber = null) {
  const audio = getDocumentAudio(phrase, moduleNumber);
  if (!audio) return "";
  return renderAudioIconButton({
    speak: phrase.bg,
    audio,
    label: "Слушать аудио",
    extraClass
  });
}

function getQuestion(id) {
  return ACTIVE_COURSE_DATA.questions.find((question) => question.id === id);
}

function setAuthMessage(message = "", type = "error") {
  if (!els.authMessage) return;
  els.authMessage.textContent = message;
  els.authMessage.dataset.type = type;
}

function setAuthLoading(isLoading) {
  if (els.authSubmitButton) {
    els.authSubmitButton.disabled = isLoading;
    els.authSubmitButton.textContent = isLoading ? "Проверяем..." : "Войти";
  }
  if (els.authEmail) els.authEmail.disabled = isLoading;
  if (els.authPassword) els.authPassword.disabled = isLoading;
}

function showAuthScreen(message = "", type = "error") {
  els.authScreen?.classList.remove("is-hidden");
  els.courseChooser?.classList.add("is-hidden");
  els.appShell?.classList.add("is-hidden");
  document.body.classList.add("auth-mode");
  setAuthMessage(message, type);
}

function showAuthorizedCourse(session) {
  const previousUserId = currentUser?.id || "";
  const appWasOpen = !els.appShell?.classList.contains("is-hidden");
  currentUser = session?.user || currentUser;
  els.authScreen?.classList.add("is-hidden");
  document.body.classList.remove("auth-mode");
  setAuthMessage("");
  if (appWasOpen && previousUserId && previousUserId === currentUser?.id) {
    restoreCurrentLessonPosition();
    return;
  }
  setCourseMode("interview", { restorePosition: true });
}

function getAuthErrorMessage(error) {
  const message = String(error?.message || "").toLowerCase();
  if (message.includes("invalid login credentials")) return "Неверный email или пароль.";
  if (message.includes("email not confirmed")) return "Email не подтвержден. Проверьте пользователя в Supabase.";
  return "Не удалось войти. Проверьте email и пароль.";
}

async function initAuth() {
  if (!supabaseClient) {
    showAuthScreen("Не удалось загрузить Supabase Auth. Проверьте подключение к интернету.");
    return;
  }

  setAuthLoading(true);
  const { data, error } = await supabaseClient.auth.getSession();
  setAuthLoading(false);

  if (error) {
    showAuthScreen("Не удалось проверить сессию. Попробуйте обновить страницу.");
    return;
  }

  if (data?.session) {
    showAuthorizedCourse(data.session);
  } else {
    showAuthScreen();
  }

  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      showAuthorizedCourse(session);
      return;
    }
    currentUser = null;
    showAuthScreen(event === "SIGNED_OUT" ? "Вы вышли из аккаунта." : "", event === "SIGNED_OUT" ? "info" : "error");
  });
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  if (!supabaseClient) {
    setAuthMessage("Supabase Auth не загрузился. Обновите страницу.");
    return;
  }

  const email = els.authEmail?.value.trim();
  const password = els.authPassword?.value;
  if (!email || !password) {
    setAuthMessage("Введите email и пароль.");
    return;
  }

  setAuthMessage("");
  setAuthLoading(true);
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  setAuthLoading(false);

  if (error) {
    setAuthMessage(getAuthErrorMessage(error));
    return;
  }

  if (data?.session) showAuthorizedCourse(data.session);
}

async function handleSignOut() {
  clearActivePlayback();
  currentUser = null;
  if (supabaseClient) await supabaseClient.auth.signOut();
  showAuthScreen("Вы вышли из аккаунта.", "info");
}

function setCourseMode(_mode = "interview", options = {}) {
  if (!currentUser) {
    showAuthScreen();
    return;
  }
  const mode = "interview";
  state.courseMode = mode;
  ACTIVE_COURSE_DATA = COURSE_DATA;
  state.progress = state.progressMap[mode] || {};
  const savedIndex = Number.parseInt(localStorage.getItem(LESSON_POSITION_KEY) || "0", 10) || 0;
  const requestedIndex = Number.isInteger(options.lessonIndex) ? options.lessonIndex : savedIndex;
  state.lessonIndex = Math.max(0, Math.min(requestedIndex, ACTIVE_COURSE_DATA.lessons.length - 1));
  localStorage.setItem(LESSON_POSITION_KEY, String(state.lessonIndex));
  localStorage.setItem("bgCourseMode", mode);
  els.courseChooser?.classList.add("is-hidden");
  els.appShell?.classList.remove("is-hidden");
  document.body.classList.remove("general-mode");
  document.body.classList.add("interview-mode");
  if (els.courseModeLabel) els.courseModeLabel.textContent = "Курс подготовки";
  if (els.topbarModeLabel) els.topbarModeLabel.textContent = "Подготовка к собеседованию";
  if (els.introPanel) els.introPanel.style.display = "none";
  render();
  if (options.restorePosition) restoreCurrentLessonPosition();
}

function showCourseChooser() {
  if (!currentUser) {
    showAuthScreen();
    return;
  }
  els.courseChooser?.classList.remove("is-hidden");
  els.appShell?.classList.add("is-hidden");
  localStorage.removeItem("bgCourseMode");
}

function getLessonScrollElement() {
  const grid = els.lessonContent?.querySelector(".document-section > .document-grid");
  if (grid && grid.scrollHeight > grid.clientHeight + 4) return grid;
  return document.scrollingElement || document.documentElement;
}

function readLessonScrollTop(scroller = getLessonScrollElement()) {
  if (scroller === document.scrollingElement || scroller === document.documentElement || scroller === document.body) {
    return window.scrollY || scroller.scrollTop || 0;
  }
  return scroller?.scrollTop || 0;
}

function writeLessonScrollTop(top, scroller = getLessonScrollElement()) {
  const nextTop = Math.max(0, Number(top) || 0);
  if (scroller === document.scrollingElement || scroller === document.documentElement || scroller === document.body) {
    window.scrollTo({ top: nextTop, behavior: "auto" });
    return;
  }
  if (scroller) scroller.scrollTop = nextTop;
}

function saveCurrentLessonPosition() {
  if (!ACTIVE_COURSE_DATA?.lessons?.length) return;
  localStorage.setItem(LESSON_POSITION_KEY, String(state.lessonIndex));
  localStorage.setItem(`${LESSON_SCROLL_PREFIX}${state.lessonIndex}`, String(Math.round(readLessonScrollTop())));
}

function restoreCurrentLessonPosition() {
  const savedTop = Number(localStorage.getItem(`${LESSON_SCROLL_PREFIX}${state.lessonIndex}`) || "0");
  requestAnimationFrame(() => {
    requestAnimationFrame(() => writeLessonScrollTop(savedTop));
  });
}

function resetCurrentLessonPosition() {
  requestAnimationFrame(() => {
    writeLessonScrollTop(0);
    saveCurrentLessonPosition();
  });
}

const SAMPLE_PROFILES = {
  male: {
    firstName: "Петър",
    patronymic: "Алексеевич",
    surname: "Иванов",
    birthDate: "1984-03-12",
    birthCity: "Москва",
    birthCountry: "Русия",
    residence: "Русия, град Москва",
    citizenship: "руско",
    ancestor: "Мария Петрова",
    preferredCity: "София",
    job: "работя като инженер",
    favoriteSubject: "история",
    languages: "руски, английски и малко български",
    hobbies: "спорт и пътувания"
  },
  female: {
    firstName: "Анна",
    patronymic: "Сергеевна",
    surname: "Смирнова",
    birthDate: "2002-09-05",
    birthCity: "Минск",
    birthCountry: "Беларус",
    residence: "Беларус, град Минск",
    citizenship: "беларуско",
    ancestor: "Георги Иванов",
    preferredCity: "Пловдив",
    job: "уча в университета",
    favoriteSubject: "литература",
    languages: "руски, английски и малко български",
    hobbies: "книги и музика"
  }
};

const LESSON_START_RULES = {
  1: [
    "Сначала смотрите на болгарскую строку, потом на транскрипцию. Болгарский текст пишется обычным способом, а в русской транскрипции ударная буква выделена прописной.",
    "Транскрипция нужна только как опора: она помогает быстро начать говорить, но лучше каждый пример проговаривать вслух и сверять с аудио.",
    "Если фраза длинная, делите ее на короткие смысловые куски: сначала имя, потом дата, потом город или причина."
  ],
  2: [
    "В болгарском нет русских букв Ы, Ё и Э, поэтому не ищите полного совпадения с русским письмом.",
    "Буква е обычно читается ближе к русскому э, буква ъ передает короткий средний звук, похожий на ы, а щ читается как шт.",
    "На собеседовании важнее говорить ясно и спокойно, чем идеально копировать акцент носителя."
  ],
  3: [
    "Для собеседования безопаснее использовать вежливые формы: здравейте, благодаря, моля, довиждане.",
    "Короткие фразы помогают выиграть время: може ли да повторите, не разбрах, говоря малко български.",
    "Приветствие и благодарность лучше выучить как готовые блоки, чтобы начать разговор уверенно."
  ],
  4: [
    "Глагол съм нужен там, где по-русски часто связка пропускается: аз съм студент, той е лекар.",
    "Форма меняется по лицам: аз съм, ти си, той е, ние сме, вие сте, те са.",
    "Для рассказа о себе чаще всего нужны аз съм, роден съм / родена съм и имам."
  ],
  5: [
    "Отрицание строится просто: частица не ставится перед глаголом или формой съм.",
    "Частица ли делает вопрос и обычно ставится после важного слова: Вие студент ли сте?",
    "Если забыли порядок слов, говорите медленнее и короткими предложениями: Не съм студент. Работя като инженер."
  ],
  6: [
    "Происхождение удобно объяснять через предлоги от, в и по линия на: от Русия, в Москва, по линия на прабаба.",
    "Национальность и гражданство не всегда одно и то же, поэтому отвечайте точно: имам руско гражданство, имам български корени.",
    "Фразу про корни лучше выучить полностью, потому что ее часто уточняют на собеседовании."
  ],
  7: [
    "Даты в болгарском обычно называют порядковым числительным: първи, втори, трети, дванадесети.",
    "Год лучше произносить полностью словами: хиляда деветстотин осемдесет и четвърта година, две хиляди и втора година.",
    "Тренируйте свою дату рождения, дату рождения родственника, номер телефона и адрес отдельно."
  ],
  8: [
    "Многие полезные глаголы в первом лице заканчиваются на -ам или -ям: имам, нямам, работя, живея.",
    "Для собеседования достаточно уверенно владеть простыми моделями: имам документ, живея в град, работя като.",
    "Не усложняйте ответ: одна ясная фраза с правильным глаголом лучше длинного предложения, в котором легко ошибиться."
  ]
};

const SAMPLE_PERSON_BLOCK = [
  "Примерные персонажи для тренировки",
  "Мужской кейс: Петър Алексеевич Иванов. Роден е на дванадесети март хиляда деветстотин осемдесет и четвърта година в Русия, град Москва. Адресът му е: град Москва, улица Тверская, номер петнадесет, апартамент двадесет и четири.",
  "Женский кейс: Анна Сергеевна Смирнова. Родена е на пети септември две хиляди и втора година в Беларус, град Минск. Адресът ѝ е: град Минск, проспект Независимости, номер четиридесет и пет, апартамент осемнадесет.",
  "Когда в ответе встречаются квадратные скобки, внутри них теперь дана подсказка с мужским и женским примером. Свою реальную информацию потом нужно заменить самостоятельно."
];

const HYMN_REFERENCE_BLOCK = [
  "Официальный гимн Болгарии",
  "Официальный ответ: Химнът на Република България е песента „Мила Родино“.",
  "Вопрос: Как се казва официалният химн на Република България? [болг] — «как сэ казва официалният химн на република България?»",
  "Перевод: Как называется официальный гимн Республики Болгария?",
  "Ответ: Официалният химн се казва „Мила Родино“. [болг] — «официалният химн сэ казва Мила Родино»",
  "Перевод: Официальный гимн называется «Мила Родино»."
];

const HYMN_TRAINING_ROWS = [
  ["Горда Стара планина,", "Гордая Старая планина (Балканские горы),"],
  ["до ней Дунава синей,", "Рядом с ней синеет Дунай,"],
  ["слънце Тракия огрява,", "Солнце освещает Фракию,"],
  ["над Пирина пламеней.", "Над Пирином пламенеет."],
  ["Припев:", "Припев:"],
  ["Мила Родино,", "Дорогая Родина,"],
  ["ти си земен рай,", "Ты - земной рай,"],
  ["твойта хубост, твойта прелест,", "Твоя красота, твоя прелесть,"],
  ["ах, те нямат край!", "Ах, не имеют конца!"]
];

const SERVICE_LINE_PATTERNS = [
  /Полный официальный текст гимна/i,
  /проверяйте на сайте/i,
  /Актуализация/i,
  /В старых материалах/i,
  /Что было исправлено/i,
  /Удалены даты/i,
  /Личные ответы заменены/i,
  /Слова и фразы перестроены/i,
  /Добавлены транскрипции/i,
  /Исправлены устаревшие/i,
  /Добавлены недостающие/i,
  /Источники актуализации/i,
  /Проверено на/i,
  /Политические сведения/i,
  /политические должности/i,
  /Европейская комиссия/i,
  /официальные материалы президентской/i
];

function isServiceCourseLine(line) {
  const value = String(line || "").trim();
  return SERVICE_LINE_PATTERNS.some((pattern) => pattern.test(value));
}

let courseContentAdjusted = false;

function getLessonOriginalModuleNumber(lesson) {
  const match = String(lesson?.title || "").match(/^Модуль\s+(\d+)\./i);
  return match ? Number(match[1]) : null;
}

function prependUniqueLines(lesson, marker, lines) {
  if (!lesson?.documentLines || lesson.documentLines.includes(marker)) return;
  lesson.documentLines = [...lines, ...lesson.documentLines];
}

function renumberVisibleModules(lessons) {
  let nextNumber = 1;
  lessons.forEach((lesson) => {
    const match = String(lesson.title || "").match(/^Модуль\s+(\d+)\.\s*(.+)$/i);
    if (!match) return;

    const oldNumber = Number(match[1]);
    const newNumber = nextNumber;
    nextNumber += 1;

    if (oldNumber === newNumber) return;
    lesson.title = `Модуль ${newNumber}. ${match[2]}`;

    if (lesson.documentLines?.length) {
      const sectionPattern = new RegExp(`^${oldNumber}(\\.\\d+\\.)`);
      lesson.documentLines = lesson.documentLines.map((line) => String(line).replace(sectionPattern, `${newNumber}$1`));
    }
  });
}

function applyCourseContentAdjustments() {
  if (courseContentAdjusted) return;
  courseContentAdjusted = true;

  COURSE_DATA.lessons.forEach((lesson) => {
    const moduleNumber = getLessonOriginalModuleNumber(lesson);
    if (LESSON_START_RULES[moduleNumber]) {
      lesson.theory = [...LESSON_START_RULES[moduleNumber], ...(lesson.theory || [])];
    }
  });

  const personalLesson = COURSE_DATA.lessons.find((lesson) => /Личные вопросы/i.test(lesson.title));
  prependUniqueLines(personalLesson, SAMPLE_PERSON_BLOCK[0], SAMPLE_PERSON_BLOCK);

  const countryLesson = COURSE_DATA.lessons.find((lesson) => /Болгария: история/i.test(lesson.title));
  prependUniqueLines(countryLesson, HYMN_REFERENCE_BLOCK[0], HYMN_REFERENCE_BLOCK);

  renumberVisibleModules(COURSE_DATA.lessons);
}

function buildTemplateValues() {
  const p = state.profile;
  const defaults = p.gender === "female" ? SAMPLE_PROFILES.female : SAMPLE_PROFILES.male;
  const relation = p.ancestorRelation || relationFromLineage(p.lineage);
  const relationFemale = ["баба", "майка", "прабаба"].includes(relation);
  const legacyNameParts = String(p.name || "").split(/\s+/).filter(Boolean);
  const firstName = p.firstName || legacyNameParts[0] || defaults.firstName;
  const surname = p.surname || legacyNameParts.slice(1).join(" ") || defaults.surname;
  const patronymic = p.patronymic || defaults.patronymic;
  const fullNameBg = [firstName, patronymic, surname].filter(Boolean).join(" ");
  const birthDate = formatBirthDateBg(p.birthDate || defaults.birthDate);
  const birthCity = p.birthCity || p.birthPlace || defaults.birthCity;
  const birthCountry = p.birthCountry || defaults.birthCountry;
  const birthPlace = p.birthPlace || `${birthCity}, ${birthCountry}`;
  const citizenship = normalizeCitizenship(p.citizenship || defaults.citizenship);

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
    residence: p.residence || birthPlace || defaults.residence,
    citizenship,
    lineageBg: lineageText(p.lineage),
    lineageRu: lineageTextRu(p.lineage),
    ancestor: p.ancestor || defaults.ancestor,
    ancestorRelation: relation,
    ancestorRelationCap: relation.charAt(0).toUpperCase() + relation.slice(1),
    ancestorPronoun: relationFemale ? "Тя" : "Той",
    ancestorNationality: relationFemale ? "българка" : "българин",
    preferredCity: p.preferredCity || defaults.preferredCity,
    job: normalizeRuWordsToBg(p.job || defaults.job),
    favoriteSubject: normalizeRuWordsToBg(p.favoriteSubject || defaults.favoriteSubject),
    languages: normalizeRuWordsToBg(p.languages || defaults.languages),
    hobbies: normalizeRuWordsToBg(p.hobbies || defaults.hobbies)
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

function setLesson(index, options = {}) {
  saveCurrentLessonPosition();
  clearActivePlayback();
  state.lessonIndex = Math.max(0, Math.min(ACTIVE_COURSE_DATA.lessons.length - 1, index));
  localStorage.setItem(LESSON_POSITION_KEY, String(state.lessonIndex));
  render();
  if (options.restorePosition) restoreCurrentLessonPosition();
  else resetCurrentLessonPosition();
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
    ? `<div class="pronunciation">${escapeHtml(formatTranscriptText(phrase.pronunciation))}</div>`
    : "";
  const audioHintHtml = phrase.audio
    ? `<span class="audio-hint">${escapeHtml(phrase.audio)}</span>`
    : "";
  return `
    <div class="phrase-card">
      <div class="phrase-card-top">
        <div class="phrase-main">
          <div class="bg-text">${escapeHtml(formatBulgarianText(phrase.bg))}</div>
          <div class="accent-text">${escapeHtml(formatTranscriptText(cleanTranscription(phrase.accent)))}</div>
          ${pronunciationHtml}
          <div class="translation">${escapeHtml(formatTranslationText(phrase.ru))}</div>
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
        <div class="bg-text">${escapeHtml(formatBulgarianText(question.neutralAnswer))}</div>
        <div class="accent-text">${escapeHtml(formatTranscriptText(cleanTranscription(question.neutralAccent)))}</div>
      </div>
    `
    : "";
  return `
    <div class="question-card">
      <div class="question-main">
        <div class="translation">${escapeHtml(formatTranslationText(question.ru))}</div>
        <div class="bg-text">${escapeHtml(formatBulgarianText(question.question))}</div>
        <div class="accent-text">${escapeHtml(formatTranscriptText(cleanTranscription(question.questionAccent)))}</div>
        <div class="bg-text">${escapeHtml(formatBulgarianText(answer.answer))}</div>
        <div class="accent-text">${escapeHtml(formatTranscriptText(cleanTranscription(answer.accent)))}</div>
        ${answer.answerRu ? `<div class="translation">${escapeHtml(formatTranslationText(answer.answerRu))}</div>` : ""}
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
          <strong>${escapeHtml(formatBulgarianText(word))}</strong>
          <span>${escapeHtml(formatTranscriptText(cleanTranscription(accent)))}</span>
          <span>${escapeHtml(formatTranslationText(pronunciation))}</span>
        </div>
      `
    )
    .join("");

  return `
    <div class="rule-card">
      <h5>${escapeHtml(rule.title)}</h5>
      <p><strong>Зачем:</strong> ${escapeHtml(formatCourseLine(rule.need))}</p>
      <p><strong>Правило:</strong> ${escapeHtml(formatCourseLine(rule.rule))}</p>
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
                    ${row.map((cell, index) => `<td class="${index === 2 ? "accent-cell" : ""}">${escapeHtml(index === 2 ? formatTranscriptText(cleanTranscription(cell)) : formatCourseLine(cell))}</td>`).join("")}
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

function renderStructuredPhrase(phrase, moduleNumber = null) {
  return `
    <div class="structured-phrase">
      <div class="structured-phrase-top">
        <div class="bg-text">${escapeHtml(formatBulgarianText(phrase.bg))}</div>
        ${renderInlineAudioButton(phrase, "structured-audio-button", moduleNumber)}
      </div>
      <div class="structured-label">Транскрипция:</div>
      <div class="accent-text">${escapeHtml(formatTranscriptText(phrase.tr))}</div>
      ${phrase.ru ? `<div class="structured-label">Перевод:</div><div class="translation">${escapeHtml(formatTranslationText(phrase.ru))}</div>` : ""}
    </div>
  `;
}

function renderDocumentTable(rows, moduleNumber = null) {
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
                    <span class="doc-table-word">${escapeHtml(formatBulgarianText(row.bg))}</span>
                  </td>
                  <td class="accent-text" data-label="${labels[1]}">${escapeHtml(formatTranscriptText(row.tr))}</td>
                  <td data-label="${labels[2]}">${escapeHtml(formatTranslationText(row.ru))}</td>
                  <td class="doc-table-audio-cell" data-label="${labels[3]}">${renderInlineAudioButton(row, "table-audio-button", moduleNumber)}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

const DOCUMENT_SECTION_TITLE_PATTERN = /^(\d+(?:\.\d+)*\.|[A-ZА]\.\d+\.)\s/;

const PLAIN_TABLE_SCHEMAS = [
  ["Шаг", "Что делать", "Пример"],
  ["Ошибка", "Почему мешает", "Как исправить"],
  ["Буква", "Ориентир", "Пример", "Русская подсказка"],
  ["Буква", "Правило", "Пример", "Чтение"],
  ["Цифра", "Болгарский", "Произношение"],
  ["Число", "Болгарский", "Произношение"],
  ["День", "Болгарский", "Произношение"],
  ["Болгарский", "Произношение", "Перевод"],
  ["Дата", "Болгарский", "Произношение"],
  ["Дата", "Болгарский ответ", "Русская транскрипция и перевод"],
  ["Что изменяется", "Мужской вариант", "Женский вариант", "Пояснение"],
  ["Цифра", "По-болгарски", "Произношение"],
  ["Знак", "По-болгарски", "Произношение"],
  ["Тема", "Болгарский", "Произношение", "Перевод", "Чтение"],
  ["Слово", "С ударением", "Произношение", "Перевод"],
  ["Русский", "Болгарский", "Произношение"],
  ["Вариант", "Болгарский", "Произношение", "Перевод"],
  ["Родственница", "Болгарский шаблон", "Произношение и перевод"],
  ["Болгарский вопрос", "Произношение", "Перевод"],
  ["Смысл", "Болгарский ответ", "Произношение и перевод"],
  ["Вопрос", "Ответ «да»", "Ответ «нет»"],
  ["Ситуация", "Болгарский ответ", "Перевод"],
  ["Мотив", "Болгарская фраза", "Перевод"],
  ["Город", "Болгарский ответ", "Перевод"],
  ["Тема", "Болгарский ответ", "Перевод"],
  ["Событие", "Дата", "Готовая фраза"],
  ["Дата", "Болгарский ориентир", "Смысл по-русски"],
  ["Дата", "Болгарский ответ", "Перевод"],
  ["Блюдо", "Болгарское описание"],
  ["Роль", "Болгарский", "Произношение", "Перевод"],
  ["День", "Тема", "Контроль"],
  ["День", "Приоритет", "Что можно отложить"]
];

function isPlainTableStopRow(cells) {
  return cells.some((cell) => /^(Произношение|Перевод|Подсказка):/i.test(String(cell || "").trim()));
}

function findPlainTableSchema(chunk) {
  for (const headers of PLAIN_TABLE_SCHEMAS) {
    for (let startIndex = 1; startIndex <= Math.min(4, chunk.length - headers.length); startIndex += 1) {
      if (headers.every((header, index) => String(chunk[startIndex + index] || "").trim() === header)) {
        return { headers, startIndex };
      }
    }
  }
  return null;
}

function formatPlainTableCell(value, header) {
  const text = String(value || "").trim();
  if (/^(Цифра|Число|Дата|День)$/i.test(header)) return escapeHtml(replaceTemplateHints(text));
  if (/(Произношение|Чтение|транскрипция)/i.test(header)) return escapeHtml(formatTranscriptText(cleanTranscription(text)));
  if (/(Болгар|Фраза|Ответ|Вопрос|Модель|Пример|По-болгарски|С ударением|Ориентир)/i.test(header)) return escapeHtml(formatBulgarianText(text));
  return escapeHtml(formatTranslationText(text));
}

function renderPlainDocumentTable(headers, rows) {
  return `
    <div class="doc-table-wrap plain-table-wrap">
      <table class="doc-table plain-doc-table">
        <thead>
          <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row) => `
                <tr>
                  ${row
                    .map((cell, index) => {
                      const header = headers[index] || "";
                      const className = /(Произношение|Чтение|транскрипция)/i.test(header) ? "accent-text" : "";
                      return `<td class="${className}" data-label="${escapeHtml(header)}">${formatPlainTableCell(cell, header)}</td>`;
                    })
                    .join("")}
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderPlainTableChunk(chunk, moduleNumber = null) {
  const schema = findPlainTableSchema(chunk);
  if (!schema) return null;

  const { headers, startIndex } = schema;
  const columnCount = headers.length;
  const rows = [];
  let cursor = startIndex + columnCount;

  while (cursor + columnCount <= chunk.length) {
    const cells = chunk.slice(cursor, cursor + columnCount);
    if (isPlainTableStopRow(cells)) break;
    rows.push(cells);
    cursor += columnCount;
  }

  if (!rows.length) return null;

  const beforeTable = chunk.slice(0, startIndex).map((line) => renderDocumentLine(line)).join("");
  const table = renderPlainDocumentTable(headers, rows);
  const afterTable = chunk.slice(cursor);
  return `
    ${beforeTable}
    ${table}
    ${afterTable.length ? renderDocumentChunk(afterTable, moduleNumber) : ""}
  `;
}

function renderCompactDocumentPhrase(phrase, moduleNumber = null) {
  return `
    <p class="doc-line doc-phrase">
      <span class="doc-phrase-text">${escapeHtml(formatBulgarianText(phrase.bg))} [болг] — «${escapeHtml(formatTranscriptText(phrase.tr))}»</span>
      ${renderInlineAudioButton(phrase, "", moduleNumber)}
    </p>
  `;
}

function renderHymnTrainingBlock(moduleNumber = null) {
  const baseLines = HYMN_REFERENCE_BLOCK.map((line) => renderDocumentLine(line)).join("");
  return `
    ${baseLines}
    <div class="hymn-training-block">
      <h5>Текст гимна для подготовки</h5>
      <div class="hymn-table">
        <div class="hymn-table-head">Болгарский</div>
        <div class="hymn-table-head">Перевод</div>
        ${HYMN_TRAINING_ROWS.map(([bg, ru]) => `
          <div class="hymn-line hymn-line-bg">${escapeHtml(bg)}</div>
          <div class="hymn-line">${escapeHtml(ru)}</div>
        `).join("")}
      </div>
      ${renderInlineAudioButton({ bg: "Мила Родино", tr: "", ru: "" }, "hymn-audio-button", moduleNumber)}
    </div>
  `;
}

function renderDocumentLine(line) {
  const rawValue = String(line || "").trim();
  if (!rawValue || isServiceCourseLine(rawValue)) return "";
  const value = /^Перевод:/i.test(rawValue) ? formatTranslationText(rawValue) : formatCourseLine(rawValue);
  const className = [
    DOCUMENT_SECTION_TITLE_PATTERN.test(value) ? "doc-subtitle" : "",
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

function renderDocumentChunk(chunk, moduleNumber = null) {
  if (!chunk.length || isServiceCourseLine(chunk[0])) return "";
  if (chunk[0] === HYMN_REFERENCE_BLOCK[0]) return renderHymnTrainingBlock(moduleNumber);
  const plainTableHtml = renderPlainTableChunk(chunk, moduleNumber);
  if (plainTableHtml) return plainTableHtml;

  const output = [];
  for (let i = 0; i < chunk.length; i += 1) {
    if (isServiceCourseLine(chunk[i])) continue;
    const phrase = parseDocumentPhrase(chunk[i], chunk[i + 1]);

    if (phrase && isLongDocumentPhrase(phrase)) {
      output.push(renderStructuredPhrase(phrase, moduleNumber));
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
        output.push(renderDocumentTable(rows, moduleNumber));
        i = cursor - 1;
        continue;
      }

      output.push(renderCompactDocumentPhrase(phrase, moduleNumber));
      if (phrase.ru) output.push(renderDocumentLine(`Перевод: ${phrase.ru}`));
      if (phrase.consumedNext) i += 1;
      continue;
    }

    if (phrase && !isLongDocumentPhrase(phrase)) {
      output.push(renderCompactDocumentPhrase(phrase, moduleNumber));
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
  const moduleNumber = getLessonModuleNumber(lesson);
  const chunks = [];
  let current = [];
  lesson.documentLines.forEach((line) => {
    if (isServiceCourseLine(line)) return;
    if (DOCUMENT_SECTION_TITLE_PATTERN.test(line) && current.length) {
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
            (chunk) => {
              const chunkHtml = renderDocumentChunk(chunk, moduleNumber);
              return chunkHtml
                ? `
                  <div class="document-card">
                    ${chunkHtml}
                  </div>
                `
                : "";
            }
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
          <div class="translation">${escapeHtml(formatTranslationText(current.ru))}</div>
          <div class="interview-question">${escapeHtml(formatBulgarianText(current.question))}</div>
          <div class="accent-text">${escapeHtml(formatTranscriptText(cleanTranscription(current.questionAccent)))}</div>
        </div>
        <div class="audio-actions">
          ${renderAudioIconButton({ speak: current.question, audio: current.audio, label: "Слушать вопрос", extraClass: "question-audio-button" })}
          <button class="chip-button" type="button" id="showMockAnswerButton">Показать ответ</button>
          <button class="chip-button" type="button" id="nextMockQuestionButton">Следующий вопрос</button>
        </div>
        <div class="answer-reveal" id="mockAnswer">
          <div class="bg-text">${escapeHtml(formatBulgarianText(answer.answer))}</div>
          <div class="accent-text">${escapeHtml(formatTranscriptText(cleanTranscription(answer.accent)))}</div>
          ${answer.answerRu ? `<div class="translation">${escapeHtml(formatTranslationText(answer.answerRu))}</div>` : ""}
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
  els.lessonContent.classList.toggle("expanded-lesson", /^Расширенный модуль/i.test(lesson.title));
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
        ${lesson.theory.map((item) => `<p>${escapeHtml(formatCourseLine(item))}</p>`).join("")}
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
              <div>${escapeHtml(formatCourseLine(drill))}</div>
            </div>
          `).join("")}
        </div>
      </section>
    `
    : "";

  const mockHtml = lesson.mock ? renderMockInterview() : "";
  const documentHtml = renderDocumentBlocks(lesson);
  const doneLabel = state.progress[lesson.id] ? "Отмечено пройденным" : "Отметить пройденным";
  const summaryHtml = lesson.summary ? `<p class="lesson-summary">${escapeHtml(formatCourseLine(lesson.summary))}</p>` : "";

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
      ${lines.map((line) => `<p>${escapeHtml(formatBulgarianText(line))}</p>`).join("")}
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
els.authForm?.addEventListener("submit", handleAuthSubmit);
els.signOutButton?.addEventListener("click", handleSignOut);

els.startCourseButton.addEventListener("click", () => setLesson(1));
els.skipIntroButton.addEventListener("click", () => setLesson(1));
els.playIntroButton.addEventListener("click", () => playAudioOrSpeak(ACTIVE_COURSE_DATA.introAudioPath, ACTIVE_COURSE_DATA.introText, 0.82, els.playIntroButton));

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    saveCurrentLessonPosition();
  } else if (currentUser) {
    restoreCurrentLessonPosition();
  }
});
window.addEventListener("pagehide", saveCurrentLessonPosition);
window.addEventListener("beforeunload", saveCurrentLessonPosition);

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

applyCourseContentAdjustments();
loadProfileForm();
initAuth();
