/* Tudo que muda com frequência fica aqui: Pix, WhatsApp, preços e catálogo. */

export const SITE = {
  nome: "Central do Concurseiro",
  // DDI + DDD + número, só dígitos
  whatsapp: "5592986318382",
};

export const PIX = {
  chave: "+5592986318382",
  tipo: "Telefone",
  favorecido: "Isaac Mendonça de Souza",
};

export const PRECOS = { avulsa: 19.9, kit: 29.9 };

/* Capas em public/assets/capas/<id>.webp */
export const APOSTILAS = {
  portugues: "Língua Portuguesa",
  matematica: "Matemática",
  geografia: "Geografia",
  biologia: "Biologia",
  quimica: "Química",
  fisica: "Física",
  artes: "Artes",
  filosofia: "Filosofia",
  pedagogia: "Conhecimentos Pedagógicos",
  legislacao: "Legislação Completa",
};

/* Apostilas vendidas como matéria principal (vitrine e seletor do kit). */
export const PRINCIPAIS = ["portugues", "matematica", "geografia", "biologia", "quimica", "fisica", "artes", "filosofia", "pedagogia"];

/* Kit = matéria específica + Pedagógicos + Legislação.
   No kit de Pedagogia, Português entra como a segunda. */
export const kitDe = (id) => [id, id === "pedagogia" ? "portugues" : "pedagogia", "legislacao"];

export const planoAvulso = (id) => ({
  id: `avulsa-${id}`,
  nome: `Apostila avulsa: ${APOSTILAS[id]}`,
  preco: PRECOS.avulsa,
});

export const planoKit = (id) => ({
  id: `kit-${id}`,
  nome: `Kit completo: ${kitDe(id).map((item) => APOSTILAS[item]).join(" + ")} + Mapas Mentais`,
  preco: PRECOS.kit,
});
