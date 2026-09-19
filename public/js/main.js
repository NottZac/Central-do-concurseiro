import { SITE, PIX } from "./config.js";
import { aoMudar, mesclar, concursos, concurso, principais, apostila, kitDe, comKit, preco, planoAvulso, planoKit } from "./catalogo.js";
import { abrirModal } from "./modal.js";
import { moeda, esc, capaHtml } from "./util.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const atraso = (ms) => new Promise((resolver) => setTimeout(resolver, ms));
const comTimeout = (promessa, ms) =>
  Promise.race([promessa, new Promise((_, rejeitar) => setTimeout(() => rejeitar(new Error("tempo esgotado")), ms))]);
const linkWhatsapp = (texto) => `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(texto)}`;

/* ---------- Conteúdo fixo ---------- */
$$("[data-pix-chave]").forEach((el) => (el.textContent = PIX.chave));
$$("[data-pix-tipo]").forEach((el) => (el.textContent = PIX.tipo));
$$("[data-pix-favorecido]").forEach((el) => (el.textContent = PIX.favorecido));
$$("[data-whatsapp]").forEach((el) => (el.href = linkWhatsapp(el.dataset.whatsapp)));

/* ---------- Header ---------- */
const header = $(".header");
const atualizarHeader = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
atualizarHeader();
window.addEventListener("scroll", atualizarHeader, { passive: true });

/* ---------- Aparecer ao rolar ---------- */
const observer = new IntersectionObserver(
  (entradas) => {
    entradas.forEach((entrada) => {
      if (!entrada.isIntersecting) return;
      entrada.target.classList.add("is-visible");
      observer.unobserve(entrada.target);
    });
  },
  { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
);

/* imediato: redesenho por atualização do catálogo, sem repetir a animação de entrada */
const observar = (raiz, imediato = false) =>
  $$("[data-reveal]:not(.is-visible)", raiz).forEach((el) => (imediato ? el.classList.add("is-visible") : observer.observe(el)));

/* ---------- Acordeões ---------- */
document.addEventListener("click", (e) => {
  const botao = e.target.closest(".acc__btn");
  if (!botao) return;
  const aberto = botao.closest(".acc").classList.toggle("is-open");
  botao.setAttribute("aria-expanded", aberto);
});

/* ---------- Início: lista de concursos ---------- */
const renderHome = ({ imediato = false } = {}) => {
  $("#concursos-grid").innerHTML = concursos()
    .map((c, i) => {
      const lista = principais(c.id);
      const capas = lista.length ? lista.slice(0, 3).map((a) => capaHtml(a)).join("") : capaHtml({ id: "", titulo: c.nome, emoji: "📚" });
      const meta = lista.length ? `${lista.length} matérias · a partir de ${moeda(preco(c.id, "avulsa"))}` : "Apostilas em preparo";
      return `
        <a class="ccard" href="/c/${esc(c.id)}" data-nav data-reveal style="--d: ${(i % 3) * 90}ms">
          <div class="ccard__capas" aria-hidden="true">${capas}</div>
          <div class="ccard__corpo">
            <span class="status status--${esc(c.status)}">${c.status === "aberto" ? "Apostilas disponíveis" : "Em breve"}</span>
            <h3>${esc(c.nome)}</h3>
            ${c.cargo ? `<p>${esc(c.cargo)}</p>` : ""}
            <p class="ccard__meta">${meta}</p>
            <span class="ccard__ir">Ver matérias e kit</span>
          </div>
        </a>`;
    })
    .join("");
  observar($("#concursos-grid"), imediato);
};

/* ---------- Página do concurso ---------- */
const seletor = $("#materia");
const kitCapas = $("#kit-capas");
let timerKit;

const cardMateria = (a, i) => `
  <article class="card" data-reveal style="--d: ${(i % 3) * 90}ms">
    <button class="card__cover" type="button" data-detalhe="${esc(a.id)}" aria-label="Ver sumário: ${esc(a.titulo)}">${capaHtml(a)}</button>
    <h3><span aria-hidden="true">${esc(a.emoji)}</span> ${esc(a.titulo)}</h3>
    <p class="card__price">${moeda(preco(a.concurso, "avulsa"))} <small>avulsa</small></p>
    <div class="card__actions">
      <button class="btn btn--sm" type="button" data-comprar="avulsa" data-id="${esc(a.id)}">Comprar</button>
      <button class="btn btn--sm btn--ghost" type="button" data-detalhe="${esc(a.id)}">Sumário</button>
    </div>
  </article>`;

const atualizarKit = async () => {
  if (!seletor.value) return;
  const itens = kitDe(seletor.value);
  const cid = itens[0].concurso;
  kitCapas.style.setProperty("--n", itens.length);
  kitCapas.innerHTML = itens
    .map(
      (a, i) => `
      <figure class="kit__cover">
        <button class="kit__capa" type="button" data-detalhe="${esc(a.id)}" aria-label="Ver sumário: ${esc(a.titulo)}">${capaHtml(a, { eager: true })}</button>
        <figcaption><small>${i === 0 ? "Apostila principal" : "Acompanha o kit"}</small><strong>${esc(a.titulo)}</strong></figcaption>
      </figure>`
    )
    .join("");
  $("#kit-preco").textContent = moeda(preco(cid, "kit"));
  $("#kit-resumo").textContent = `${itens.length} apostilas em PDF: ${itens.map((a) => a.titulo).join(" + ")}.`;
  $("#kit-avulsa").textContent = `Prefere só a matéria? ${itens[0].titulo} avulsa por ${moeda(preco(cid, "avulsa"))}`;
  await Promise.all($$("img", kitCapas).map((img) => img.decode().catch(() => {})));
};

seletor.addEventListener("change", () => {
  kitCapas.classList.add("is-swapping");
  clearTimeout(timerKit);
  timerKit = setTimeout(async () => {
    await atualizarKit();
    kitCapas.classList.remove("is-swapping");
  }, 280);
});

const renderConcurso = (id, { imediato = false } = {}) => {
  const c = concurso(id);
  const lista = principais(id);
  const comKits = lista.filter(comKit);
  const grupo = c.grupo ? esc(c.grupo) : "";

  $("#c-tag").textContent = `Concurso ${c.nome}${c.cargo ? ` · ${c.cargo}` : ""}`;
  $("#c-titulo").innerHTML = `Apostilas para o concurso <span class="nowrap">${esc(c.nome)}</span>`;
  $("#c-desc").textContent = c.descricao ?? "";
  $("#c-acoes").innerHTML =
    (lista.length ? `<a class="btn" href="#catalogo">ESCOLHER MINHA MATÉRIA</a>` : "") +
    (grupo ? `<a class="btn${lista.length ? " btn--ghost" : ""}" href="${grupo}" target="_blank" rel="noopener">Entrar no grupo do WhatsApp</a>` : "");
  $("#c-meta").innerHTML =
    "<li>PDF digital</li><li>Pagamento via Pix</li>" +
    (c.edital ? `<li><a class="meta-link" href="${esc(c.edital)}" target="_blank" rel="noopener">Ver edital</a></li>` : "");
  $("#c-visual").innerHTML = lista.length ? `<div class="hero__cover">${capaHtml(lista[0], { eager: true })}</div>` : "";

  $("#catalogo").hidden = !lista.length;
  $("#catalogo-sub").innerHTML =
    `Apostila avulsa em PDF por <b>${moeda(preco(id, "avulsa"))}</b>.` +
    (comKits.length ? ` Quer mais? O kit completo sai por <b>${moeda(preco(id, "kit"))}</b>.` : "");
  $("#catalogo-grid").innerHTML = lista.map(cardMateria).join("");

  $("#kit").hidden = !comKits.length;
  const anterior = seletor.value;
  seletor.innerHTML = comKits.map((a) => `<option value="${esc(a.id)}">${esc(a.titulo)}</option>`).join("");
  if (comKits.some((a) => a.id === anterior)) seletor.value = anterior;
  atualizarKit();

  $("#c-grupo").hidden = !grupo;
  $("#c-grupo-texto").textContent = `Entre no grupo do WhatsApp do concurso ${c.nome} para receber materiais gratuitos e novidades.`;
  $("#c-grupo-link").href = c.grupo || "#";

  observar($("#view-concurso"), imediato);
};

/* ---------- Detalhe da apostila (sumário) ---------- */
const abrirDetalhe = (id) => {
  const a = apostila(id);
  const c = concurso(a.concurso);
  const linhas = (a.sumario ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  const sumario = linhas.length
    ? `<ul class="sumario">${linhas.map((l) => (l.startsWith("# ") ? `<li class="sumario__titulo">${esc(l.slice(2))}</li>` : `<li>${esc(l)}</li>`)).join("")}</ul>`
    : `<p class="detalhe__vazio">O sumário desta apostila será publicado em breve.</p>`;
  const acoes =
    a.principal === false
      ? `<p class="detalhe__vazio">Esta apostila acompanha os kits do concurso.</p>`
      : (comKit(a) ? `<button class="btn btn--block" type="button" data-comprar="kit" data-id="${esc(a.id)}">KIT COMPLETO · ${moeda(preco(a.concurso, "kit"))}</button>` : "") +
        `<button class="btn btn--ghost btn--block" type="button" data-comprar="avulsa" data-id="${esc(a.id)}">APOSTILA AVULSA · ${moeda(preco(a.concurso, "avulsa"))}</button>`;

  $("#detalhe-corpo").innerHTML = `
    <div class="detalhe__capa">${capaHtml(a, { eager: true })}</div>
    <div class="detalhe__info">
      <span class="tag"><span aria-hidden="true">${esc(a.emoji)}</span> ${esc(c?.nome ?? "")}</span>
      <h2 id="detalhe-titulo">${esc(a.titulo)}</h2>
      <h3>O que vem na apostila</h3>
      ${sumario}
      <div class="detalhe__acoes">${acoes}</div>
    </div>`;
  $("#detalhe .modal__panel").scrollTop = 0;
  abrirModal($("#detalhe"));
};

/* ---------- Rotas: / (início) e /c/<concurso> ---------- */
const views = { home: $("#view-home"), concurso: $("#view-concurso") };
let viewAtual = null;
let caminhoAtual = null;
let idAtual = null;

const trocarView = async (proxima, preparar) => {
  if (viewAtual) {
    viewAtual.classList.add("is-out");
    await atraso(300);
    viewAtual.hidden = true;
    viewAtual.classList.remove("is-out");
  }
  preparar();
  window.scrollTo({ top: 0, behavior: "instant" });
  proxima.hidden = false;
  proxima.classList.add("is-out");
  void proxima.offsetWidth;
  proxima.classList.remove("is-out");
  viewAtual = proxima;
};

const rotear = async () => {
  const achou = location.pathname.match(/^\/c\/([^/]+)\/?$/);
  let id = achou ? decodeURIComponent(achou[1]) : null;
  if (id && !concurso(id)) {
    await Promise.race([bancoPronto, atraso(5000)]);
    if (!concurso(id)) {
      id = null;
      history.replaceState(null, "", "/");
    }
  }

  const caminho = id ? `/c/${id}` : "/";
  if (caminho !== caminhoAtual) {
    idAtual = id;
    await trocarView(id ? views.concurso : views.home, () => (id ? renderConcurso(id) : renderHome()));
    caminhoAtual = caminho;
    document.title = id ? `Apostilas ${concurso(id).nome} | Central do Concurseiro` : "Central do Concurseiro | Apostilas para concursos";
    if (location.hash) requestAnimationFrame(() => $(location.hash)?.scrollIntoView({ behavior: "smooth" }));
  } else if (location.hash) {
    $(location.hash)?.scrollIntoView({ behavior: "smooth" });
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
};

const irPara = (url) => {
  history.pushState(null, "", url);
  return rotear();
};

document.addEventListener("click", (e) => {
  const link = e.target.closest("a[data-nav]");
  if (!link || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey) return;
  e.preventDefault();
  irPara(link.getAttribute("href"));
});
window.addEventListener("popstate", rotear);

/* ---------- Catálogo publicado pelo admin ---------- */
const carregarBanco = async () => {
  try {
    const { lerCatalogo } = await comTimeout(import("./firebase.js"), 8000);
    mesclar(await comTimeout(lerCatalogo(), 8000));
  } catch (err) {
    console.warn("Catálogo do banco indisponível, usando o inicial:", err);
  }
};

const renderTudo = () => {
  renderHome({ imediato: true });
  if (idAtual && concurso(idAtual)) renderConcurso(idAtual, { imediato: true });
};

aoMudar(renderTudo);
observar(document);
const bancoPronto = carregarBanco();
rotear();

/* ---------- Modo admin: 5 toques rápidos na logo ---------- */
let toques = 0;
let timerToques;
document.addEventListener(
  "click",
  async (e) => {
    if (!e.target.closest("[data-admin-trigger]")) return;
    toques += 1;
    clearTimeout(timerToques);
    timerToques = setTimeout(() => (toques = 0), 2000);
    if (toques < 5) return;
    toques = 0;
    e.preventDefault();
    const { abrirAdmin } = await import("./admin.js");
    abrirAdmin();
  },
  true
);

/* ---------- Compra ---------- */
const checkout = $("#checkout");
const view = $("#steps-view");
const progresso = $(".modal__progress", checkout);
const panes = $$(".pane", view);
let etapaAtual = 1;
let plano;

const ajustarAltura = () => {
  view.style.height = `${panes[etapaAtual - 1].offsetHeight}px`;
};

const irParaEtapa = (etapa) => {
  etapaAtual = etapa;
  panes.forEach((pane, i) => {
    pane.classList.toggle("is-active", i + 1 === etapa);
    pane.classList.toggle("is-before", i + 1 < etapa);
  });
  progresso.dataset.step = etapa;
  ajustarAltura();
};

const abrirCheckout = (novoPlano) => {
  plano = novoPlano;
  $("#plano-nome").textContent = plano.nome;
  $("#plano-preco").textContent = moeda(plano.preco);
  abrirModal(checkout);
  irParaEtapa(1);
};

document.addEventListener("click", (e) => {
  const comprar = e.target.closest("[data-comprar]");
  if (comprar) {
    const id = comprar.dataset.id ?? seletor.value;
    return abrirCheckout(comprar.dataset.comprar === "kit" ? planoKit(id) : planoAvulso(id));
  }
  const detalhe = e.target.closest("[data-detalhe]");
  if (detalhe) abrirDetalhe(detalhe.dataset.detalhe);
});

$$("[data-go]").forEach((el) => el.addEventListener("click", () => irParaEtapa(Number(el.dataset.go))));
window.addEventListener("resize", () => checkout.classList.contains("is-open") && ajustarAltura());

/* ---------- Copiar chave Pix ---------- */
const botaoCopiar = $("#copy-pix");
let timerCopiar;
botaoCopiar.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(PIX.chave);
  } catch {
    const range = document.createRange();
    range.selectNodeContents($("[data-pix-chave]"));
    getSelection().removeAllRanges();
    getSelection().addRange(range);
  }
  botaoCopiar.classList.add("is-copied");
  clearTimeout(timerCopiar);
  timerCopiar = setTimeout(() => botaoCopiar.classList.remove("is-copied"), 2000);
});

/* ---------- Pedido ---------- */
const form = $("#pedido-form");
const erro = $("#form-error");
const botaoEnviar = $("#submit-pedido");

const mostrarErro = (mensagem, campo) => {
  erro.textContent = mensagem;
  erro.classList.add("is-shown");
  $$("input", form).forEach((input) => input.classList.toggle("is-invalid", input === campo));
  campo.focus();
};

form.addEventListener("input", (e) => {
  e.target.classList.remove("is-invalid");
  erro.classList.remove("is-shown");
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const { nome, whatsapp, email } = form.elements;
  const telefone = whatsapp.value.replace(/\D/g, "");

  if (nome.value.trim().length < 2) return mostrarErro("Informe seu nome completo.", nome);
  if (telefone.length < 10 || telefone.length > 13) return mostrarErro("Informe o WhatsApp com DDD.", whatsapp);
  if (email.value && !email.checkValidity()) return mostrarErro("Esse e-mail parece inválido.", email);

  botaoEnviar.classList.add("is-loading");
  botaoEnviar.disabled = true;

  let codigo = null;
  try {
    const { salvarPedido } = await comTimeout(import("./firebase.js"), 8000);
    codigo = await comTimeout(
      salvarPedido({
        nome: nome.value.trim(),
        whatsapp: telefone,
        email: email.value.trim(),
        produtoId: plano.id.slice(0, 60),
        produto: plano.nome.slice(0, 120),
        valor: plano.preco,
      }),
      8000
    );
  } catch (err) {
    console.error("Não foi possível registrar o pedido:", err);
  }

  const referencia = codigo ? ` Pedido: ${codigo.slice(-6).toUpperCase()}.` : "";
  $("#whatsapp-comprovante").href = linkWhatsapp(
    `Olá! Acabei de pagar via Pix: ${plano.nome} (${moeda(plano.preco)}). Meu nome é ${nome.value.trim()}.${referencia}`
  );
  $("#done-text").textContent = codigo
    ? "Pedido registrado. Envie o comprovante do Pix pelo WhatsApp para liberarmos sua apostila."
    : "Envie o comprovante do Pix pelo WhatsApp para liberarmos sua apostila.";

  botaoEnviar.classList.remove("is-loading");
  botaoEnviar.disabled = false;
  irParaEtapa(3);
});
