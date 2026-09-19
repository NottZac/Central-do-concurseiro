/* Tudo que muda com frequência fica aqui: Pix, WhatsApp, planos e preços. */

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

export const PLANOS = {
  avulsa: {
    id: "apostila-avulsa",
    nome: "Apostila avulsa",
    preco: 19.9,
    aviso: "A apostila que eu quero é:",
  },
  kit: {
    id: "kit-completo",
    nome: "Kit completo: 3 apostilas + mapas mentais",
    preco: 29.9,
  },
};
