import "./french.css";

const terms = {
  LÉZARD: {
    ipa: "/le.zaʁ/",
    ru: "ле-зар (приблизительно; конечная d не произносится)",
    literal: "ящерица; ящер",
    grammar: "существительное мужского рода",
    context:
      "Французское слово связывает имя Web Lizard с Лезардией — авторским миром ящеров-наблюдателей. Французский здесь задаёт торжественную и ироничную интонацию.",
  },
  "HUMAIN AUX COMMANDES": {
    ipa: "/y.mɛ̃ o kɔ.mɑ̃d/",
    ru: "ю-мэн о ко-манд",
    literal: "человек за пультом управления",
    grammar: "устойчивое выражение",
    context:
      "AI помогает, но цели, решения, проверка и ответственность остаются у человека.",
  },
  ÉVIDEMMENT: {
    ipa: "/e.vi.da.mɑ̃/",
    ru: "э-ви-да-ман",
    literal: "очевидно; разумеется; естественно",
    grammar: "наречие",
    context:
      "Сайт прямо признаёт использование AI: в 2026 году это нормальный рабочий инструмент.",
  },
  ARCHIVE: {
    ipa: "/aʁ.ʃiv/",
    ru: "ар-шив",
    literal: "архив",
    grammar: "существительное женского рода",
    context: "Глава с работами, сделанными до эпохи генеративного AI.",
  },
  HÉRÉSIE: {
    ipa: "/e.ʁe.zi/",
    ru: "э-рэ-зи",
    literal: "ересь",
    grammar: "существительное женского рода",
    context:
      "Ироничное название главы о программисте, который построил астрологический продукт.",
  },
  CRÉATION: {
    ipa: "/kʁe.a.sjɔ̃/",
    ru: "кре-а-сьон",
    literal: "создание; творчество",
    grammar: "существительное женского рода",
    context:
      "Глава о визуальном языке, тексте, видео, звуке и нарративе как частях продукта.",
  },
  SYSTÈMES: {
    ipa: "/sis.tɛm/",
    ru: "сис-тэм",
    literal: "системы",
    grammar: "существительное во множественном числе",
    context:
      "Сайт здесь показан как вход в данные, CRM, API, автоматизацию и бизнес-процессы.",
  },
  DIALOGUE: {
    ipa: "/dja.lɔɡ/",
    ru: "дья-лог",
    literal: "диалог; разговор",
    grammar: "существительное мужского рода",
    context:
      "Глава показывает работу с AI как длинный разговор с проверками и возвратами.",
  },
  PREUVES: {
    ipa: "/pʁœv/",
    ru: "прёв",
    literal: "доказательства",
    grammar: "существительное во множественном числе",
    context:
      "Доказательствами служат реальные коммерческие проекты, а не обещания в презентации.",
  },
  PARLONS: {
    ipa: "/paʁ.lɔ̃/",
    ru: "пар-лон",
    literal: "давайте поговорим",
    grammar: "форма глагола parler — «говорить»",
    context: "Финальная глава приглашает обсудить конкретную задачу.",
  },
  MÉTIER: {
    ipa: "/me.tje/",
    ru: "ме-тье",
    literal: "профессия; ремесло; дело",
    grammar: "существительное мужского рода",
    context:
      "Глава о профессиональной роли разработчика и ответственности за итоговый результат.",
  },
  AVANT: {
    ipa: "/a.vɑ̃/",
    ru: "а-ван",
    literal: "до; раньше; прежде",
    grammar: "наречие или предлог",
    context:
      "Глава объясняет, что профессиональный веб-опыт появился раньше генеративного AI.",
  },
  FEU: {
    ipa: "/fø/",
    ru: "фё",
    literal: "огонь",
    grammar: "существительное мужского рода",
    context:
      "Метафора производства: сырая идея проходит через работу и становится системой.",
  },
  OUI: {
    ipa: "/wi/",
    ru: "уи",
    literal: "да",
    grammar: "утвердительное слово",
    context: "Прямой ответ на вопрос «умеешь ли ты работать без AI?»: да.",
  },
};

const keys = Object.keys(terms).sort((a, b) => b.length - a.length);
const escaped = keys.map((key) => key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
const matcher = new RegExp(
  `(?<![\\p{L}])(${escaped.join("|")})(?![\\p{L}])`,
  "giu",
);
let counter = 0;

function normalizedKey(value) {
  const upper = value.toLocaleUpperCase("fr-FR");
  return keys.find((key) => key === upper);
}

function termLabel(word, data) {
  return `${word}. Французский язык. Произношение ${data.ru}. Перевод: ${data.literal}. ${data.context}`;
}

function wrapTextNode(node) {
  if (
    !node.nodeValue?.trim() ||
    node.parentElement?.closest(
      "script, style, textarea, [aria-hidden='true'], .sr-only, .fr-term, #fr-tooltip",
    )
  )
    return;
  matcher.lastIndex = 0;
  if (!matcher.test(node.nodeValue)) return;
  matcher.lastIndex = 0;
  const fragment = document.createDocumentFragment();
  let last = 0;
  for (const match of node.nodeValue.matchAll(matcher)) {
    fragment.append(node.nodeValue.slice(last, match.index));
    const key = normalizedKey(match[0]);
    const span = document.createElement("span");
    span.className = "fr-term";
    span.dataset.fr = key;
    span.lang = "fr";
    span.textContent = match[0];
    span.setAttribute("aria-label", termLabel(match[0], terms[key]));
    span.setAttribute("aria-describedby", "fr-tooltip");
    if (!node.parentElement.closest("a, button")) span.tabIndex = 0;
    fragment.append(span);
    last = match.index + match[0].length;
  }
  fragment.append(node.nodeValue.slice(last));
  node.replaceWith(fragment);
}

function enhance(root) {
  if (root.nodeType === Node.TEXT_NODE) {
    wrapTextNode(root);
    return;
  }
  if (!(root instanceof Element) && root !== document) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(wrapTextNode);
}

export function setupFrenchTooltips(root = document) {
  const tooltip = document.createElement("aside");
  tooltip.id = "fr-tooltip";
  tooltip.className = "fr-tooltip";
  tooltip.setAttribute("role", "tooltip");
  tooltip.hidden = true;
  document.body.append(tooltip);
  let active = null;
  let pinned = false;

  function render(term) {
    const data = terms[term.dataset.fr];
    const id = `fr-term-${++counter}`;
    term.dataset.frId = id;
    tooltip.innerHTML = `<strong>FRANÇAIS · ЭТО ФРАНЦУЗСКИЙ ЯЗЫК</strong><span class="fr-word" lang="fr">${term.textContent}</span><dl><div><dt>IPA</dt><dd>${data.ipa}</dd></div><div><dt>ПО-РУССКИ</dt><dd>${data.ru}</dd></div><div><dt>БУКВАЛЬНО</dt><dd>${data.literal}</dd></div><div><dt>ЧТО ЭТО</dt><dd>${data.grammar}</dd></div></dl><p><b>В этой главе:</b> ${data.context}</p>`;
    tooltip.hidden = false;
    active = term;
    requestAnimationFrame(position);
  }

  function position() {
    if (!active || tooltip.hidden) return;
    const anchor = active.getBoundingClientRect();
    const box = tooltip.getBoundingClientRect();
    const gap = 12;
    const left = Math.max(
      12,
      Math.min(
        innerWidth - box.width - 12,
        anchor.left + anchor.width / 2 - box.width / 2,
      ),
    );
    const fitsAbove = anchor.top > box.height + gap + 8;
    const top = fitsAbove
      ? anchor.top - box.height - gap
      : Math.min(innerHeight - box.height - 12, anchor.bottom + gap);
    tooltip.style.translate = `${Math.round(left)}px ${Math.round(Math.max(12, top))}px`;
    tooltip.classList.toggle("below", !fitsAbove);
  }

  function hide() {
    if (pinned || active === document.activeElement) return;
    tooltip.hidden = true;
    active = null;
  }

  enhance(root);
  new MutationObserver((records) => {
    for (const record of records)
      record.addedNodes.forEach((node) => {
        if (node !== tooltip && !tooltip.contains(node)) enhance(node);
      });
  }).observe(root, { childList: true, subtree: true });

  document.addEventListener("pointerover", (event) => {
    const term =
      event.target.closest?.(".fr-term") ||
      event.target.closest?.("a, button")?.querySelector(".fr-term");
    if (term) render(term);
  });
  document.addEventListener("pointerout", (event) => {
    const term =
      event.target.closest?.(".fr-term") ||
      event.target.closest?.("a, button")?.querySelector(".fr-term");
    if (term && !term.contains(event.relatedTarget)) hide();
  });
  document.addEventListener("focusin", (event) => {
    const term =
      event.target.closest?.(".fr-term") ||
      event.target.querySelector?.(".fr-term");
    if (term) render(term);
  });
  document.addEventListener("focusout", (event) => {
    if (event.target.closest?.(".fr-term")) hide();
  });
  document.addEventListener("click", (event) => {
    const term = event.target.closest?.(".fr-term");
    if (term && !term.closest("a, button")) {
      event.stopPropagation();
      pinned = active !== term || !pinned;
      pinned ? render(term) : hide();
      return;
    }
    pinned = false;
    hide();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      pinned = false;
      hide();
      active?.blur();
    }
  });
  window.addEventListener("resize", position);
  document.addEventListener("scroll", position, true);
}
