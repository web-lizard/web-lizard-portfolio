import "@fontsource-variable/manrope";
import "@fontsource-variable/space-grotesk";
import "./style.css";
import { modern, legacy, gnosis } from "./data.js";

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const mobile = matchMedia("(max-width: 700px)");
const scenes = $$(".scene");
const labels = [
  "ÉVIDEMMENT / О САЙТЕ",
  "AVANT / ФУНДАМЕНТ",
  "PREUVES / ПРОЕКТЫ",
  "ARCHIVE / ДО AI",
  "HÉRÉSIE / GNOSIS",
  "CRÉATION / ТВОРЧЕСТВО",
  "SYSTÈMES / СИСТЕМЫ",
  "DIALOGUE / AI",
  "MÉTIER / ПОДХОД",
  "PARLONS / КОНТАКТ",
];
const aliases = {
  projects: "modern",
  eras: "philosophy",
  archive: "legacy",
  workflow: "ai",
};
let active = 0,
  transitionTimer = 0,
  transitioning = false,
  lastWheel = 0,
  wheelAmount = 0,
  wheelConsumed = false,
  initialized = false;
const nav = $(".scene-nav");
const sceneStage = $("#scenes");
const transitionDuration = 1050;
nav.innerHTML = scenes
  .map(
    (s, i) =>
      `<a href="#${s.id}" data-label="${labels[i]}" aria-label="${i + 1}. ${labels[i]}">${String(i + 1).padStart(2, "0")}</a>`,
  )
  .join("");
function finishTransition() {
  clearTimeout(transitionTimer);
  transitioning = false;
  sceneStage.classList.remove("is-transitioning");
  scenes.forEach((scene, index) => {
    scene.classList.remove("entering", "exiting");
    scene.classList.toggle("active", index === active);
  });
}
function navigate(
  index,
  { historyMode = "push", focus = false, scroll = true } = {},
) {
  index = Math.max(0, Math.min(scenes.length - 1, index));
  if (mobile.matches) {
    active = index;
    scenes.forEach((s, i) => s.classList.toggle("active", i === index));
    $$(".scene-nav a").forEach((a, i) =>
      i === index
        ? a.setAttribute("aria-current", "page")
        : a.removeAttribute("aria-current"),
    );
    $("#scene-number").textContent = String(index + 1).padStart(2, "0");
    $("#scene-label").textContent = labels[index];
    $(".footer-progress i").style.width =
      ((index + 1) / scenes.length) * 100 + "%";
    $("#previous").disabled = index === 0;
    $("#next").disabled = index === scenes.length - 1;
    if (location.hash !== `#${scenes[index].id}` && historyMode !== "none")
      history[historyMode === "replace" ? "replaceState" : "pushState"](
        null,
        "",
        `#${scenes[index].id}`,
      );
    if (scroll)
      scenes[index].scrollIntoView({
        behavior: initialized && !reduced.matches ? "smooth" : "instant",
        block: "start",
      });
    if (focus) $("h1,h2", scenes[index])?.focus({ preventScroll: true });
    initialized = true;
    return;
  }
  const changed = index !== active;
  if (transitioning) {
    if (!changed) return;
    finishTransition();
  }
  const previous = scenes[active];
  const animate = initialized && changed && !reduced.matches;
  if (animate) {
    const direction = index > active ? 1 : -1;
    sceneStage.style.setProperty("--enter-y", direction > 0 ? "12vh" : "-12vh");
    sceneStage.style.setProperty("--exit-y", direction > 0 ? "-10vh" : "10vh");
    sceneStage.style.setProperty(
      "--clip-start",
      direction > 0 ? "inset(0 0 100% 0)" : "inset(100% 0 0 0)",
    );
    const incoming = scenes[index];
    incoming.classList.remove("active", "exiting");
    incoming.classList.add("entering");
    // Commit the start frame before applying destination styles.
    incoming.getBoundingClientRect();
    getComputedStyle(incoming).clipPath;
    previous.classList.add("exiting");
    previous.classList.remove("active");
    incoming.classList.add("active");
    sceneStage.classList.add("is-transitioning");
    transitioning = true;
    transitionTimer = window.setTimeout(finishTransition, transitionDuration);
  } else if (changed) {
    previous.classList.remove("active", "exiting", "entering");
    scenes[index].classList.add("active");
  }
  active = index;
  window.scrollTo(0, 0);
  sceneStage.scrollTop = 0;
  scenes.forEach((s, i) => {
    s.inert = i !== index;
    s.setAttribute("aria-hidden", String(i !== index));
  });
  if (changed) scenes[index].scrollTop = 0;
  const hash = "#" + scenes[index].id;
  if (location.hash !== hash && historyMode !== "none")
    history[historyMode === "replace" ? "replaceState" : "pushState"](
      null,
      "",
      hash,
    );
  $$(".scene-nav a").forEach((a, i) =>
    i === index
      ? a.setAttribute("aria-current", "page")
      : a.removeAttribute("aria-current"),
  );
  $("#scene-number").textContent = String(index + 1).padStart(2, "0");
  $("#scene-label").textContent = labels[index];
  $(".footer-progress i").style.width =
    ((index + 1) / scenes.length) * 100 + "%";
  $("#previous").disabled = index === 0;
  $("#next").disabled = index === scenes.length - 1;
  $("#announcer").textContent =
    `${index + 1} из ${scenes.length}: ${labels[index]}`;
  if (focus) {
    const heading = $("h1,h2", scenes[index]);
    heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  }
  moveField(index, animate);
  initialized = true;
}
function fromHash() {
  const id = aliases[location.hash.slice(1)] || location.hash.slice(1);
  const i = scenes.findIndex((s) => s.id === id);
  navigate(i < 0 ? 0 : i, { historyMode: "replace" });
}
window.addEventListener("hashchange", fromHash);
window.addEventListener("popstate", fromHash);
document.addEventListener("click", (e) => {
  const link = e.target.closest('a[href^="#"]');
  if (!link) return;
  const id = aliases[link.hash.slice(1)] || link.hash.slice(1);
  const index = scenes.findIndex((s) => s.id === id);
  if (index >= 0) {
    e.preventDefault();
    navigate(index, { focus: link.classList.contains("skip") });
  }
});
$("#previous").onclick = () => navigate(active - 1);
$("#next").onclick = () => navigate(active + 1);
function canScroll(direction) {
  const s = scenes[active];
  return direction > 0
    ? s.scrollTop + s.clientHeight < s.scrollHeight - 3
    : s.scrollTop > 3;
}
document.addEventListener(
  "wheel",
  (e) => {
    if (mobile.matches) return;
    if (
      $("#gallery").open ||
      e.ctrlKey ||
      Math.abs(e.deltaX) > Math.abs(e.deltaY)
    )
      return;
    const now = performance.now(),
      idle = now - lastWheel;
    lastWheel = now;
    if (transitioning) {
      e.preventDefault();
      wheelAmount = 0;
      return;
    }
    if (canScroll(Math.sign(e.deltaY))) {
      wheelAmount = 0;
      return;
    }
    e.preventDefault();
    if (idle > 240 && !transitioning) {
      wheelAmount = 0;
      wheelConsumed = false;
    }
    if (wheelConsumed) {
      wheelAmount = 0;
      return;
    }
    wheelAmount +=
      e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1);
    if (Math.abs(wheelAmount) > 58) {
      navigate(active + Math.sign(wheelAmount));
      wheelAmount = 0;
      wheelConsumed = true;
    }
  },
  { passive: false },
);
document.addEventListener("keydown", (e) => {
  if (mobile.matches) return;
  if ($("#gallery").open) {
    if (e.key === "ArrowRight") showImage(galleryIndex + 1);
    if (e.key === "ArrowLeft") showImage(galleryIndex - 1);
    return;
  }
  if (
    e.defaultPrevented ||
    e.altKey ||
    e.ctrlKey ||
    e.metaKey ||
    e.target.closest(
      'input,textarea,select,[contenteditable="true"],[role="tablist"]',
    )
  )
    return;
  if ((e.key === " " || e.key === "Enter") && e.target.closest("button,a"))
    return;
  const direction = ["ArrowDown", "PageDown", " "].includes(e.key)
    ? e.shiftKey
      ? -1
      : 1
    : ["ArrowUp", "PageUp"].includes(e.key)
      ? -1
      : 0;
  if (!direction) return;
  if (transitioning) {
    e.preventDefault();
    return;
  }
  if (canScroll(direction)) {
    e.preventDefault();
    scenes[active].scrollBy({
      top: direction * scenes[active].clientHeight * 0.7,
      behavior: reduced.matches ? "instant" : "smooth",
    });
    return;
  }
  e.preventDefault();
  if (!e.repeat && !transitioning)
    navigate(active + direction, { focus: true });
});
let touch = null;
document.addEventListener(
  "touchstart",
  (e) => {
    if (mobile.matches) return;
    if (e.touches.length !== 1 || $("#gallery").open) return;
    touch = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      scrollTop: scenes[active].scrollTop,
      time: performance.now(),
      target: e.target,
    };
  },
  { passive: true },
);
document.addEventListener(
  "touchend",
  (e) => {
    if (mobile.matches) return;
    if (!touch || !e.changedTouches.length) return;
    const dy = touch.y - e.changedTouches[0].clientY,
      dx = touch.x - e.changedTouches[0].clientX;
    if (
      Math.abs(dy) > 65 &&
      Math.abs(dy) > Math.abs(dx) * 1.4 &&
      performance.now() - touch.time < 800 &&
      !transitioning &&
      Math.abs(scenes[active].scrollTop - touch.scrollTop) < 4 &&
      !canScroll(Math.sign(dy))
    )
      navigate(active + Math.sign(dy));
    touch = null;
  },
  { passive: true },
);

const imagePath = (id) => `/portfolio-media/projects/${id}.webp`;
const tags = (p) =>
  `<div class="tags">${(p.capabilities || p.tags).map((t) => `<span>${t}</span>`).join("")}</div>${p.capabilities ? `<div class="case-tech">${p.tags.join(" / ")}</div>` : ""}`;
function frame(p) {
  return `<button class="browser-frame tilt" data-gallery="${p.id}" aria-label="Открыть скриншоты ${p.name}"><span class="browser-bar"><i></i><i></i><i></i><span>${new URL(p.url).hostname}</span><b>↗</b></span><img src="${imagePath(p.images[0])}" alt="${p.name} — реальный скриншот сайта" width="1440" height="1000" loading="lazy" /></button>`;
}
function renderProject(group, index) {
  const data = group === "modern" ? modern : legacy,
    p = data[index],
    tabs = $(`#${group}-tabs`),
    stage = $(`#${group}-stage`);
  $$("[role=tab]", tabs).forEach((b, i) => {
    b.setAttribute("aria-selected", String(i === index));
    b.tabIndex = i === index ? 0 : -1;
  });
  stage.setAttribute("aria-labelledby", `${group}-tab-${index}`);
  const info = `<div class="project-info"><span class="mono">${p.type}</span><h3>${p.name}</h3>${p.challenge ? `<div class="case-line"><b>ЗАДАЧА</b><p>${p.challenge}</p></div><div class="case-line"><b>МОЯ РАБОТА</b><p>${p.contribution}</p></div>` : `<p>${p.description}</p>`}${tags(p)}<a class="text-link" href="${p.url}" target="_blank" rel="noopener noreferrer">ОТКРЫТЬ САЙТ ↗</a></div>`;
  if (group === "modern")
    stage.innerHTML = `<div>${frame(p)}<span class="gallery-hint">НАЖМИТЕ НА СКРИНШОТ, ЧТОБЫ РАССМОТРЕТЬ / ${p.images.length} КАДРА</span></div>${info}`;
  else
    stage.innerHTML = `${p.images.length ? frame(p) : '<div class="archive-unavailable"><span class="mono">HISTORICAL WORK / NO VERIFIED CAPTURE</span><strong>ADVANCED<br>FRONTEND.</strong><span>WOLF CMS × ART3D</span></div>'}<h3>${p.name}</h3><p>${p.description}</p>${tags(p)}<p class="archive-disclaimer">${p.note || "Скриншот текущей версии, октябрь 2026. Описание относится к моему участию в проекте."}</p><a class="text-link" href="${p.url}" target="_blank" rel="noopener noreferrer">ОТКРЫТЬ САЙТ ↗</a>`;
  bindTilt(stage);
}
function setupTabs(group, data) {
  const tabs = $(`#${group}-tabs`);
  tabs.innerHTML = data
    .map(
      (p, i) =>
        `<button id="${group}-tab-${i}" role="tab" aria-controls="${group}-stage" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${group === "legacy" ? `<span>${String(i + 1).padStart(2, "0")}</span><strong>${p.name}</strong><span>↗</span>` : `<small>0${i + 1}</small>${p.name}`}</button>`,
    )
    .join("");
  $$("button", tabs).forEach(
    (b, i) => (b.onclick = () => renderProject(group, i)),
  );
  tabs.addEventListener("keydown", (e) =>
    tabKeys(e, tabs, (i) => renderProject(group, i)),
  );
  renderProject(group, 0);
}
function tabKeys(e, root, select) {
  const items = $$("[role=tab]", root),
    i = items.indexOf(document.activeElement);
  if (i < 0) return;
  let next = i;
  if (["ArrowRight", "ArrowDown"].includes(e.key))
    next = (i + 1) % items.length;
  else if (["ArrowLeft", "ArrowUp"].includes(e.key))
    next = (i - 1 + items.length) % items.length;
  else if (e.key === "Home") next = 0;
  else if (e.key === "End") next = items.length - 1;
  else return;
  e.preventDefault();
  e.stopPropagation();
  select(next);
  items[next].focus();
}
const allProjects = [...modern, ...legacy, gnosis];
let galleryProject = gnosis,
  galleryIndex = 0;
function showImage(index) {
  galleryIndex =
    (index + galleryProject.images.length) % galleryProject.images.length;
  $("#gallery-image").src = imagePath(galleryProject.images[galleryIndex]);
  $("#gallery-image").alt =
    `${galleryProject.name} — скриншот ${galleryIndex + 1}`;
  $("#gallery-title").textContent = galleryProject.name;
  $("#gallery-count").textContent =
    `${galleryIndex + 1} / ${galleryProject.images.length}`;
  $("#gallery-prev").disabled = $("#gallery-next").disabled =
    galleryProject.images.length < 2;
}
document.addEventListener("click", (e) => {
  const button = e.target.closest("[data-gallery]");
  if (!button) return;
  galleryProject = allProjects.find((p) => p.id === button.dataset.gallery);
  showImage(0);
  $("#gallery").showModal();
});
$("#gallery-close").onclick = () => $("#gallery").close();
$("#gallery-prev").onclick = () => showImage(galleryIndex - 1);
$("#gallery-next").onclick = () => showImage(galleryIndex + 1);
$("#gallery").addEventListener("click", (e) => {
  if (e.target === $("#gallery")) {
    const r = e.target.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      e.target.close();
  }
});
function bindTilt(root = document) {
  $$(".tilt", root).forEach((el) => {
    let raf = 0;
    el.addEventListener("pointermove", (e) => {
      if (reduced.matches || e.pointerType !== "mouse") return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect(),
          x = (e.clientX - r.left) / r.width - 0.5,
          y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(1200px) rotateY(${x * 6}deg) rotateX(${-y * 4}deg) translateY(-2px)`;
      });
    });
    el.addEventListener("pointerleave", () => {
      cancelAnimationFrame(raf);
      el.style.transform = "";
    });
  });
}
setupTabs("modern", modern);
setupTabs("legacy", legacy);
bindTilt();

// One shared low-cost wireframe: redraw only during pointer interaction or scene changes.
const canvas = $("#field"),
  ctx = canvas.getContext("2d");
let pointer = { x: 0, y: 0 },
  fieldFrame = 0,
  fieldTransitionFrame = 0,
  fieldScene = 0;
function moveField(index, animate) {
  cancelAnimationFrame(fieldTransitionFrame);
  if (!animate) {
    fieldScene = index;
    drawField();
    return;
  }
  const origin = fieldScene;
  const start = performance.now();
  function frame(now) {
    const progress = Math.min((now - start) / transitionDuration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    fieldScene = origin + (index - origin) * eased;
    drawField();
    if (progress < 1) fieldTransitionFrame = requestAnimationFrame(frame);
  }
  fieldTransitionFrame = requestAnimationFrame(frame);
}
function drawField() {
  if (!ctx || document.hidden) return;
  const dpr = Math.min(devicePixelRatio || 1, 1.5),
    w = innerWidth,
    h = innerHeight;
  if (
    canvas.width !== Math.round(w * dpr) ||
    canvas.height !== Math.round(h * dpr)
  ) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const cx = w * (0.68 + 0.09 * Math.min(fieldScene, 1)),
    cy = h * 0.48,
    r = Math.min(w, h) * 0.47,
    angle = fieldScene * 0.37 + pointer.x * 0.08;
  ctx.strokeStyle = "#799f42";
  ctx.lineWidth = 0.6;
  const points = [];
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2 + angle;
    const z = Math.sin(a * 3 + fieldScene) * 0.28;
    points.push([
      cx + Math.cos(a) * r * (1 + z * 0.15),
      cy + Math.sin(a) * r * 0.75 + pointer.y * 9,
    ]);
  }
  for (let i = 0; i < 48; i++) {
    if (i % 2 === 0) {
      ctx.beginPath();
      ctx.moveTo(...points[i]);
      ctx.lineTo(...points[(i + 17) % 48]);
      ctx.stroke();
    }
    ctx.fillStyle = "#a4d748";
    ctx.fillRect(points[i][0], points[i][1], 1.5, 1.5);
  }
}
document.addEventListener(
  "pointermove",
  (e) => {
    if (reduced.matches || e.pointerType !== "mouse" || document.hidden) return;
    pointer = {
      x: e.clientX / innerWidth - 0.5,
      y: e.clientY / innerHeight - 0.5,
    };
    if (!fieldFrame)
      fieldFrame = requestAnimationFrame(() => {
        fieldFrame = 0;
        drawField();
      });
  },
  { passive: true },
);
window.addEventListener("resize", drawField);
reduced.addEventListener("change", drawField);
document.addEventListener("visibilitychange", drawField);
fromHash();
const chapterObserver = new IntersectionObserver(
  (entries) => {
    if (!mobile.matches) return;
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    const index = scenes.indexOf(visible.target);
    if (index !== active)
      navigate(index, { historyMode: "replace", scroll: false });
  },
  { threshold: [0.25, 0.5, 0.75] },
);
scenes.forEach((scene) => chapterObserver.observe(scene));
mobile.addEventListener("change", () => {
  finishTransition();
  initialized = false;
  scenes.forEach((scene) => {
    scene.inert = false;
    scene.setAttribute("aria-hidden", "false");
  });
  fromHash();
});
