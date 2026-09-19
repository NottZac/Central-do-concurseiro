import { SITE, PIX, PLANOS } from "./config.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const moeda = (valor) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const comTimeout = (promessa, ms) =>
  Promise.race([promessa, new Promise((_, rejeitar) => setTimeout(() => rejeitar(new Error("tempo esgotado")), ms))]);
const linkWhatsapp = (texto) => `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(texto)}`;

/* ---------- Conteúdo vindo do config.js ---------- */
$$("[data-preco]").forEach((el) => (el.textContent = moeda(PLANOS[el.dataset.preco].preco)));
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
$$("[data-reveal]").forEach((el) => observer.observe(el));

/* ---------- Acordeões ---------- */
document.addEventListener("click", (e) => {
  const botao = e.target.closest(".acc__btn");
  if (!botao) return;
  const aberto = botao.closest(".acc").classList.toggle("is-open");
  botao.setAttribute("aria-expanded", aberto);
});

/* ---------- Modal de compra ---------- */
const modal = $("#checkout");
const painel = $(".modal__panel", modal);
const progresso = $(".modal__progress", modal);
const view = $("#steps-view");
const panes = $$(".pane", view);
let ultimoFoco = null;
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

const focaveis = () =>
  $$("a[href], button:not([disabled]), input, [tabindex]:not([tabindex='-1'])", painel).filter(
    (el) => el.offsetParent !== null && !el.closest(".pane:not(.is-active)")
  );

const abrirCheckout = (e) => {
  plano = PLANOS[e.currentTarget.dataset.openCheckout];
  $("#plano-nome").textContent = plano.nome;
  $("#plano-preco").textContent = moeda(plano.preco);
  ultimoFoco = document.activeElement;
  document.documentElement.style.setProperty("--scrollbar", `${window.innerWidth - document.documentElement.clientWidth}px`);
  document.body.classList.add("is-locked");
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  irParaEtapa(1);
  painel.focus({ preventScroll: true });
};

const fecharCheckout = () => {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("is-locked");
  ultimoFoco?.focus({ preventScroll: true });
};

$$("[data-open-checkout]").forEach((el) => el.addEventListener("click", abrirCheckout));
$$("[data-close-checkout]").forEach((el) => el.addEventListener("click", fecharCheckout));
$$("[data-go]").forEach((el) => el.addEventListener("click", () => irParaEtapa(Number(el.dataset.go))));
window.addEventListener("resize", () => modal.classList.contains("is-open") && ajustarAltura());

document.addEventListener("keydown", (e) => {
  if (!modal.classList.contains("is-open")) return;
  if (e.key === "Escape") return fecharCheckout();
  if (e.key !== "Tab") return;
  const itens = focaveis();
  const primeiro = itens[0];
  const ultimo = itens[itens.length - 1];
  if (e.shiftKey && document.activeElement === primeiro) {
    e.preventDefault();
    ultimo.focus();
  } else if (!e.shiftKey && document.activeElement === ultimo) {
    e.preventDefault();
    primeiro.focus();
  }
});

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
        produtoId: plano.id,
        produto: plano.nome,
        valor: plano.preco,
      }),
      8000
    );
  } catch (err) {
    console.error("Não foi possível registrar o pedido:", err);
  }

  const referencia = codigo ? ` Pedido: ${codigo.slice(-6).toUpperCase()}.` : "";
  const aviso = plano.aviso ? ` ${plano.aviso}` : "";
  $("#whatsapp-comprovante").href = linkWhatsapp(
    `Olá! Acabei de pagar via Pix: ${plano.nome} (${moeda(plano.preco)}). Meu nome é ${nome.value.trim()}.${referencia}${aviso}`
  );
  $("#done-text").textContent = codigo
    ? "Pedido registrado. Envie o comprovante do Pix pelo WhatsApp para liberarmos sua apostila."
    : "Envie o comprovante do Pix pelo WhatsApp para liberarmos sua apostila.";

  botaoEnviar.classList.remove("is-loading");
  botaoEnviar.disabled = false;
  irParaEtapa(3);
});
