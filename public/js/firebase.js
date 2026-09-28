import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getDatabase, ref, get, set, remove } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";
import { getStorage, ref as refStorage, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";

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
const storage = getStorage(app);

/** Concursos, matérias, capas e ajustes do site publicados pelo modo admin. */
export async function lerCatalogo() {
  const [concursos, apostilas, capas, site] = await Promise.all(
    ["concursos", "apostilas", "capas", "site"].map(async (no) => (await get(ref(db, no))).val())
  );
  return { concursos, apostilas, capas, site };
}

export const gravar = (caminho, valor) => set(ref(db, caminho), valor);
export const apagar = (caminho) => remove(ref(db, caminho));

/** Amostra em PDF de uma apostila, guardada no Firebase Storage. */
export const enviarAmostra = async (id, arquivo) => {
  const alvo = refStorage(storage, `amostras/${id}.pdf`);
  await uploadBytes(alvo, arquivo, { contentType: "application/pdf" });
  return getDownloadURL(alvo);
};
export const apagarAmostra = async (id) => {
  try {
    await deleteObject(refStorage(storage, `amostras/${id}.pdf`));
  } catch {
    /* já não existia */
  }
};
