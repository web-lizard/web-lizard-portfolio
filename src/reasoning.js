// HTML nodes remain readable without SVG; edges follow their responsive positions.
export function setupReasoning(root, reduced) {
  const nodes = [...root.querySelectorAll("[data-step]")];
  const svg = root.querySelector("svg");
  const detail = document.querySelector("#reasoning-detail");
  const steps = Object.fromEntries(
    nodes.map((node) => [node.dataset.step, node]),
  );
  const descriptions = {
    human:
      "Человек — задаю цель, ограничения и критерии готовности. Ответственность начинается здесь.",
    context:
      "Контекст — собираю устройство продукта, код, документацию и ограничения бизнеса.",
    ai: "AI — обсуждаю архитектуру и получаю варианты. Ответ модели ещё не готовое решение.",
    variant:
      "Вариант — сравниваю подходы: сложность, поддержку и то, как они впишутся в систему.",
    check:
      "Проверка — сверяю решение с требованиями и документацией. Ошибка отправляет нас на новый круг.",
    error:
      "Ошибка → уточнение → AI. Разбираю причину, добавляю недостающий контекст и прошу переделать.",
    clarify:
      "Уточнение — формулирую, что именно не работает. Возвращаю контекст в диалог, а не повторяю тот же запрос.",
    code: "Код — встраиваю выбранное решение в существующий продукт и проверяю изменения.",
    test: "Тест — проверяю основной сценарий, границы и регрессии. Новый ответ модели не заменяет проверку.",
    constraint:
      "Новое условие → итерация → контекст. Если изменились ограничения, пересматриваю решение.",
    iteration:
      "Итерация — фиксирую найденные ограничения и возвращаюсь к архитектуре с новым контекстом.",
    deploy:
      "Результат — после проверки выпускаю изменение, проверяю его в работе и фиксирую решения.",
  };
  const main = [
    "human",
    "context",
    "ai",
    "variant",
    "check",
    "code",
    "test",
    "deploy",
  ];
  const routes = {
    error: ["check", "error", "clarify", "ai", "variant", "check"],
    clarify: ["error", "clarify", "ai", "variant", "check"],
    constraint: ["test", "constraint", "iteration", "context", "ai"],
    iteration: ["constraint", "iteration", "context", "ai"],
  };
  const pairs = new Map();
  for (const route of [main, ...Object.values(routes)]) {
    route
      .slice(1)
      .forEach((to, i) => pairs.set(`${route[i]}:${to}`, [route[i], to]));
  }
  const paths = [...pairs].map(([key, pair]) => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.dataset.edge = key;
    svg.append(path);
    return { path, pair };
  });
  function select(id) {
    const route = routes[id] || main.slice(0, main.indexOf(id) + 1);
    const edges = new Set(route.slice(1).map((to, i) => `${route[i]}:${to}`));
    nodes.forEach((node) => {
      node.classList.toggle("on-route", route.includes(node.dataset.step));
      node.setAttribute("aria-pressed", String(node.dataset.step === id));
    });
    paths.forEach(({ path }) =>
      path.classList.toggle("on-route", edges.has(path.dataset.edge)),
    );
    detail.textContent = descriptions[id];
  }
  function draw() {
    // offset coordinates stay stable while the parent scene is transitioning.
    svg.setAttribute("viewBox", `0 0 ${root.clientWidth} ${root.clientHeight}`);
    paths.forEach(({ path, pair: [from, to] }) => {
      const a = steps[from],
        b = steps[to];
      const ax = a.offsetLeft + a.offsetWidth / 2,
        ay = a.offsetTop + a.offsetHeight / 2;
      const bx = b.offsetLeft + b.offsetWidth / 2,
        by = b.offsetTop + b.offsetHeight / 2;
      const bend = Math.max(25, Math.abs(bx - ax) * 0.35);
      path.setAttribute(
        "d",
        `M ${ax} ${ay} C ${ax + bend} ${ay}, ${bx - bend} ${by}, ${bx} ${by}`,
      );
    });
  }
  nodes.forEach((node) => {
    node.setAttribute("aria-describedby", "reasoning-detail");
    node.addEventListener("click", () => select(node.dataset.step));
    node.addEventListener("focus", () => select(node.dataset.step));
    node.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "mouse") select(node.dataset.step);
    });
  });
  root.addEventListener("keydown", (event) => {
    const index = nodes.indexOf(document.activeElement);
    if (index < 0) return;
    const delta = ["ArrowRight", "ArrowDown"].includes(event.key)
      ? 1
      : ["ArrowLeft", "ArrowUp"].includes(event.key)
        ? -1
        : 0;
    if (!delta && !["Home", "End"].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    nodes[
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? nodes.length - 1
          : (index + delta + nodes.length) % nodes.length
    ].focus();
  });
  // Scrolling long chapters also reveals a route; direct interaction always works.
  let scrollFrame = 0;
  root.closest(".scene").addEventListener(
    "scroll",
    () => {
      if (
        reduced.matches ||
        root.contains(document.activeElement) ||
        scrollFrame
      )
        return;
      scrollFrame = requestAnimationFrame(() => {
        scrollFrame = 0;
        const scene = root.closest(".scene");
        const progress =
          scene.scrollTop /
          Math.max(1, scene.scrollHeight - scene.clientHeight);
        select(
          main[Math.min(main.length - 1, Math.floor(progress * main.length))],
        );
      });
    },
    { passive: true },
  );
  new ResizeObserver(draw).observe(root);
  select("deploy");
  draw();
}
