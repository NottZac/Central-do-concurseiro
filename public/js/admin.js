import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { app, gravar, apagar } from "./firebase.js";
import { concursos, apostilas, apostila, mesclar, removerCapa, temCapaEnviada, gerarId } from "./catalogo.js";
import { PRECOS } from "./config.js";
import { abrirModal } from "./modal.js";
import { esc, capaHtml } from "./util.js";

/* Painel do dono do site. Quem escreve no banco é decidido pelas regras do Firebase
   (conta Google autorizada), não por este arquivo. */

const modal = document.querySelector("#admin");
const corpo = document.querySelector("#admin-corpo");
const auth = getAuth(app);

let usuario; // undefined = ainda verificando, null = deslogado
let iniciado = false;
const ui = { aba: "concursos", concurso: null, filtro: "", materia: null, capa: null, tirarCapa: false };

/* ---------- Auxiliares ---------- */
const campo = (rotulo, nome, valor = "", extra = "") =>
  `<label class="field"><span>${rotulo}</span><input name="${nome}" value="${esc(valor)}" ${extra}></label>`;
const area = (rotulo, nome, valor = "", extra = "") =>
  `<label class="field"><span>${rotulo}</span><textarea name="${nome}" ${extra}>${esc(valor)}</textarea></label>`;
const marca = (rotulo, nome, marcado, valor = "") =>
  `<label class="check"><input type="checkbox" name="${nome}" value="${esc(valor)}"${marcado ? " checked" : ""}><span>${rotulo}</span></label>`;

const mensagem = (texto, ok = false) => {
  const el = corpo.querySelector("#admin-msg");
  if (!el) return;
  el.textContent = texto;
  el.classList.toggle("is-ok", ok);
  el.classList.add("is-shown");
};

const erroDoBanco = (err) =>
  /permission_denied/i.test(`${err.code} ${err.message}`)
    ? "Sem permissão para salvar. Entre com a conta Google autorizada do dono do site."
    : `Não foi possível salvar: ${err.message}`;

const idLivre = (base, existe) => {
  let id = base;
  for (let n = 2; existe(id); n += 1) id = `${base}-${n}`;
  return id;
};

const proximaOrdem = (itens) => Math.max(0, ...itens.map((i) => i.ordem ?? 0)) + 10;

/* Reduz a capa para caber no banco (até ~180 KB). */
const prepararCapa = async (arquivo) => {
  const bitmap = await createImageBitmap(arquivo);
  const largura = Math.min(600, bitmap.width);
  const canvas = Object.assign(document.createElement("canvas"), {
    width: largura,
    height: Math.round((bitmap.height * largura) / bitmap.width),
  });
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  for (const tipo of ["image/webp", "image/jpeg"]) {
    for (const qualidade of [0.82, 0.7, 0.55]) {
      const url = canvas.toDataURL(tipo, qualidade);
      if (url.startsWith(`data:${tipo}`) && url.length <= 180000) return url;
    }
  }
  throw new Error("imagem pesada demais, use uma capa menor");
};

/* ---------- Telas ---------- */
const telaLogin = () => `
  <h2 id="admin-titulo">Área do administrador</h2>
  <p class="pane__lead">Entre com a conta Google do dono do site para editar concursos, matérias e capas.</p>
  <button class="btn btn--block admin__entrar" type="button" data-entrar>ENTRAR COM GOOGLE</button>
  <p class="admin__msg" id="admin-msg" role="status"></p>`;

const abaConcursos = () => {
  const lista = concursos({ todos: true });
  const c = lista.find((x) => x.id === ui.concurso);
  return `
    <div class="admin__lista">
      ${lista
        .map(
          (x) =>
            `<button type="button" class="${x.id === ui.concurso ? "is-ativa" : ""}" data-editar-concurso="${esc(x.id)}">${esc(x.nome)}${x.oculto ? " (oculto)" : ""}<small>${x.grupo ? "grupo do WhatsApp ✓" : "sem grupo"}</small></button>`
        )
        .join("")}
      <button type="button" class="admin__novo${c ? "" : " is-ativa"}" data-editar-concurso="">+ Novo concurso</button>
    </div>
    <form class="admin__form" id="form-concurso" novalidate>
      <h3>${c ? `Editar ${esc(c.nome)}` : "Novo concurso"}</h3>
      ${campo("Nome do concurso", "nome", c?.nome, 'maxlength="80" required placeholder="Ex.: SEDUC-AM"')}
      ${campo("Cargo ou área", "cargo", c?.cargo, 'maxlength="120" placeholder="Ex.: Professor"')}
      ${area("Descrição do concurso", "descricao", c?.descricao, 'maxlength="1200" rows="4"')}
      <label class="field"><span>Situação</span>
        <select name="status">
          <option value="aberto"${c?.status !== "breve" ? " selected" : ""}>Apostilas disponíveis</option>
          <option value="breve"${c?.status === "breve" ? " selected" : ""}>Em breve</option>
        </select>
      </label>
      ${campo("Link do grupo de WhatsApp (materiais gratuitos e novidades)", "grupo", c?.grupo, 'type="url" inputmode="url" maxlength="300" placeholder="https://chat.whatsapp.com/..."')}
      ${campo("Link do edital (opcional)", "edital", c?.edital, 'type="url" inputmode="url" maxlength="300" placeholder="https://..."')}
      <div class="admin__duplo">
        ${campo("Preço da avulsa (R$)", "precoAvulsa", c?.precoAvulsa ?? "", `type="number" step="0.01" min="0.01" placeholder="${PRECOS.avulsa}"`)}
        ${campo("Preço do kit (R$)", "precoKit", c?.precoKit ?? "", `type="number" step="0.01" min="0.01" placeholder="${PRECOS.kit}"`)}
      </div>
      ${marca("Ocultar este concurso do site", "oculto", c?.oculto)}
      <button class="btn btn--block" type="submit">SALVAR CONCURSO</button>
    </form>`;
};

const previaCapa = (a) => capaHtml(a, ui.capa ? { src: ui.capa } : ui.tirarCapa ? { src: a.capa ?? "" } : {});

const abaMaterias = () => {
  const todos = concursos({ todos: true });
  if (!todos.length) return `<p class="pane__lead">Crie um concurso primeiro, na aba Concursos.</p>`;
  if (!todos.some((c) => c.id === ui.filtro)) ui.filtro = todos[0].id;

  const lista = apostilas(ui.filtro, { todas: true });
  const a = ui.materia ? apostila(ui.materia) : null;
  const atual = a ?? { id: "", titulo: "", emoji: "📘", sumario: "", acompanha: "pedagogia,legislacao", principal: true };
  const escolhidas = (atual.acompanha ?? "").split(",").filter(Boolean);
  const outras = lista.filter((x) => x.id !== atual.id && !x.oculto);

  return `
    <label class="field"><span>Concurso</span>
      <select id="filtro-concurso">
        ${todos.map((c) => `<option value="${esc(c.id)}"${c.id === ui.filtro ? " selected" : ""}>${esc(c.nome)}</option>`).join("")}
      </select>
    </label>
    <div class="admin__lista">
      ${lista
        .map(
          (x) =>
            `<button type="button" class="${x.id === ui.materia ? "is-ativa" : ""}" data-editar-materia="${esc(x.id)}">${esc(x.emoji)} ${esc(x.titulo)}${x.oculto ? " (oculta)" : ""}<small>${x.principal === false ? "só acompanha o kit" : "à venda"}</small></button>`
        )
        .join("")}
      <button type="button" class="admin__novo${a ? "" : " is-ativa"}" data-editar-materia="">+ Nova matéria</button>
    </div>
    <form class="admin__form" id="form-materia" novalidate>
      <h3>${a ? `Editar ${esc(a.titulo)}` : "Nova matéria"}</h3>
      ${campo("Título da apostila", "titulo", atual.titulo, 'maxlength="80" required placeholder="Ex.: Matemática"')}
      ${campo("Emoji", "emoji", atual.emoji, 'maxlength="8" placeholder="📘"')}
      <div class="field"><span>Capa</span>
        <div class="admin__capa">
          <div class="admin__prev" id="capa-previa">${previaCapa(atual)}</div>
          <div>
            <label class="btn btn--sm btn--ghost admin__arquivo">Enviar capa<input type="file" name="arquivo" accept="image/*" hidden></label>
            ${a && temCapaEnviada(a.id) && !ui.tirarCapa ? `<button class="link" type="button" data-tirar-capa>Remover capa enviada</button>` : ""}
            <p class="pane__hint">A imagem é reduzida automaticamente. Proporção ideal: 1070 × 1470.</p>
          </div>
        </div>
      </div>
      ${area("Sumário (um item por linha; use “# ” no começo para um título de seção)", "sumario", atual.sumario, 'maxlength="6000" rows="7"')}
      <fieldset class="field admin__kit"><span>Acompanha no kit</span>
        ${outras.length ? outras.map((x) => marca(`${esc(x.emoji)} ${esc(x.titulo)}`, "acompanha", escolhidas.includes(x.id), x.id)).join("") : `<p class="pane__hint">Cadastre outras matérias deste concurso para montar o kit.</p>`}
      </fieldset>
      ${marca("Vendida avulsa e como matéria principal do kit", "principal", atual.principal !== false)}
      ${marca("Ocultar esta matéria do site", "oculto", atual.oculto)}
      <button class="btn btn--block" type="submit">SALVAR MATÉRIA</button>
    </form>`;
};

const telaPainel = () => `
  <div class="admin__topo">
    <div><h2 id="admin-titulo">Modo admin</h2><p class="admin__user">${esc(usuario.email)}</p></div>
    <button class="link" type="button" data-sair>Sair</button>
  </div>
  <div class="admin__abas" role="tablist">
    <button type="button" role="tab" aria-selected="${ui.aba === "concursos"}" class="${ui.aba === "concursos" ? "is-ativa" : ""}" data-aba="concursos">Concursos</button>
    <button type="button" role="tab" aria-selected="${ui.aba === "materias"}" class="${ui.aba === "materias" ? "is-ativa" : ""}" data-aba="materias">Matérias</button>
  </div>
  ${ui.aba === "concursos" ? abaConcursos() : abaMaterias()}
  <p class="admin__msg" id="admin-msg" role="status"></p>`;

const desenhar = () => {
  corpo.innerHTML = usuario === undefined ? `<p class="pane__lead">Verificando acesso…</p>` : usuario ? telaPainel() : telaLogin();
};

/* ---------- Ações ---------- */
const salvarConcurso = async (form) => {
  const dados = Object.fromEntries(new FormData(form));
  const existente = concursos({ todos: true }).find((c) => c.id === ui.concurso);
  const nome = dados.nome.trim();
  if (nome.length < 2) return mensagem("Informe o nome do concurso.");
  for (const chave of ["grupo", "edital"]) {
    if (dados[chave].trim() && !dados[chave].trim().startsWith("https://")) return mensagem("Os links precisam começar com https://");
  }

  const id = existente?.id ?? idLivre(gerarId(nome), (x) => concursos({ todos: true }).some((c) => c.id === x));
  const registro = {
    nome,
    cargo: dados.cargo.trim(),
    descricao: dados.descricao.trim(),
    status: dados.status,
    grupo: dados.grupo.trim(),
    edital: dados.edital.trim(),
    oculto: form.elements.oculto.checked,
    ordem: existente?.ordem ?? proximaOrdem(concursos({ todos: true })),
  };
  const precos = {};
  for (const chave of ["precoAvulsa", "precoKit"]) if (dados[chave]) precos[chave] = Number(dados[chave]);

  try {
    await gravar(`concursos/${id}`, { ...registro, ...precos });
  } catch (err) {
    return mensagem(erroDoBanco(err));
  }
  mesclar({ concursos: { [id]: { precoAvulsa: undefined, precoKit: undefined, ...registro, ...precos } } });
  ui.concurso = id;
  desenhar();
  mensagem("Concurso salvo. O site já foi atualizado.", true);
};

const salvarMateria = async (form) => {
  const dados = new FormData(form);
  const existente = ui.materia ? apostila(ui.materia) : null;
  const titulo = dados.get("titulo").trim();
  if (titulo.length < 2) return mensagem("Informe o título da apostila.");

  const cid = existente?.concurso ?? ui.filtro;
  const id = existente?.id ?? idLivre(gerarId(titulo), apostila);
  const registro = {
    concurso: cid,
    titulo,
    emoji: dados.get("emoji").trim() || "📘",
    sumario: dados.get("sumario").trim(),
    acompanha: dados.getAll("acompanha").join(","),
    principal: form.elements.principal.checked,
    oculto: form.elements.oculto.checked,
    ordem: existente?.ordem ?? proximaOrdem(apostilas(cid, { todas: true })),
  };

  try {
    await gravar(`apostilas/${id}`, registro);
    if (ui.capa) await gravar(`capas/${id}`, ui.capa);
    else if (ui.tirarCapa) await apagar(`capas/${id}`);
  } catch (err) {
    return mensagem(erroDoBanco(err));
  }
  mesclar({ apostilas: { [id]: registro }, capas: ui.capa ? { [id]: ui.capa } : {} });
  if (ui.tirarCapa && !ui.capa) removerCapa(id);
  ui.materia = id;
  ui.capa = null;
  ui.tirarCapa = false;
  desenhar();
  mensagem("Matéria salva. O site já foi atualizado.", true);
};

const entrar = async () => {
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
  } catch (err) {
    mensagem(err.code === "auth/popup-closed-by-user" ? "Login cancelado." : `Não foi possível entrar: ${err.message}`);
  }
};

const aoClicar = (e) => {
  const alvo = e.target.closest("button");
  if (!alvo) return;
  if ("entrar" in alvo.dataset) return entrar();
  if ("sair" in alvo.dataset) return signOut(auth);
  if (alvo.dataset.aba) {
    ui.aba = alvo.dataset.aba;
  } else if ("editarConcurso" in alvo.dataset) {
    ui.concurso = alvo.dataset.editarConcurso || null;
  } else if ("editarMateria" in alvo.dataset) {
    ui.materia = alvo.dataset.editarMateria || null;
    ui.capa = null;
    ui.tirarCapa = false;
  } else if ("tirarCapa" in alvo.dataset) {
    ui.tirarCapa = true;
    ui.capa = null;
    corpo.querySelector("#capa-previa").innerHTML = previaCapa(ui.materia ? apostila(ui.materia) : { titulo: "", emoji: "📘" });
    return alvo.remove();
  } else {
    return;
  }
  desenhar();
};

const aoAlterar = async (e) => {
  if (e.target.id === "filtro-concurso") {
    ui.filtro = e.target.value;
    ui.materia = null;
    return desenhar();
  }
  if (e.target.name !== "arquivo" || !e.target.files[0]) return;
  try {
    ui.capa = await prepararCapa(e.target.files[0]);
    ui.tirarCapa = false;
    corpo.querySelector("#capa-previa").innerHTML = capaHtml({ titulo: "Nova capa", emoji: "" }, { src: ui.capa });
  } catch (err) {
    mensagem(`Capa não aceita: ${err.message}`);
  }
};

const aoEnviar = (e) => {
  e.preventDefault();
  if (e.target.id === "form-concurso") salvarConcurso(e.target);
  if (e.target.id === "form-materia") salvarMateria(e.target);
};

export const abrirAdmin = () => {
  if (!iniciado) {
    iniciado = true;
    ui.concurso = concursos({ todos: true })[0]?.id ?? null;
    corpo.addEventListener("click", aoClicar);
    corpo.addEventListener("change", aoAlterar);
    corpo.addEventListener("submit", aoEnviar);
    onAuthStateChanged(auth, (u) => {
      usuario = u;
      desenhar();
    });
  }
  desenhar();
  abrirModal(modal);
};
