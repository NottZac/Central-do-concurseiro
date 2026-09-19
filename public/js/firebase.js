import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getDatabase, ref, get, set, remove, push, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyC6ZQ1Lnym8-1pI9RqAcWjBo3rLMOrZlVc",
  authDomain: "central-do-concurso.firebaseapp.com",
  databaseURL: "https://central-do-concurso-default-rtdb.firebaseio.com",
  projectId: "central-do-concurso",
  storageBucket: "central-do-concurso.firebasestorage.app",
  messagingSenderId: "333803225597",
  appId: "1:333803225597:web:598a8ba4a7690f9ede9994",
};

export const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/** Concursos, matérias, capas e ajustes do site publicados pelo modo admin. */
export async function lerCatalogo() {
  const [concursos, apostilas, capas, site] = await Promise.all(
    ["concursos", "apostilas", "capas", "site"].map(async (no) => (await get(ref(db, no))).val())
  );
  return { concursos, apostilas, capas, site };
}

export const gravar = (caminho, valor) => set(ref(db, caminho), valor);
export const apagar = (caminho) => remove(ref(db, caminho));

/** Registra o pedido em "pedidos" e devolve o id gerado. */
export async function salvarPedido(pedido) {
  const novoPedido = push(ref(db, "pedidos"));
  await set(novoPedido, { ...pedido, status: "aguardando", criadoEm: serverTimestamp() });
  return novoPedido.key;
}
