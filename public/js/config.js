/* Dados fixos do site. O que você muda pelo modo admin (concursos, matérias, capas,
   grupos de WhatsApp) fica no banco e se sobrepõe ao catálogo inicial abaixo. */

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

/* Preço padrão. Cada concurso pode ter o seu (precoAvulsa / precoKit). */
export const PRECOS = { avulsa: 19.9, kit: 29.9 };

/* Catálogo inicial. Capas ficam em public/assets/capas/<id>.webp;
   matéria sem "capa" mostra uma capa provisória até você enviar a arte pelo admin. */
const COM_KIT = "pedagogia,legislacao";

const materia = (ordem, titulo, emoji, capa, acompanha = COM_KIT) => ({
  concurso: "seduc-am",
  titulo,
  emoji,
  capa: capa ? `/assets/capas/${capa}.webp` : "",
  sumario: "",
  acompanha,
  principal: true,
  ordem,
});

export const SEED = {
  concursos: {
    "seduc-am": {
      nome: "SEDUC-AM",
      cargo: "Professor",
      descricao:
        "Apostilas para os cargos de professor da SEDUC-AM, organizadas por disciplina. Escolha a matéria do seu cargo e monte o kit com Conhecimentos Pedagógicos e Legislação. Sempre confira o edital vigente.",
      status: "aberto",
      grupo: "",
      edital: "",
      ordem: 10,
    },
  },
  apostilas: {
    portugues: materia(10, "Língua Portuguesa", "📖", "portugues"),
    matematica: materia(20, "Matemática", "➗", "matematica"),
    historia: materia(30, "História", "📜", ""),
    geografia: materia(40, "Geografia", "🌎", "geografia"),
    biologia: materia(50, "Biologia", "🧬", "biologia"),
    fisica: materia(60, "Física", "⚛️", "fisica"),
    quimica: materia(70, "Química", "🧪", "quimica"),
    ingles: materia(80, "Inglês", "🇺🇸", ""),
    "educacao-fisica": materia(90, "Educação Física", "🏃", ""),
    artes: materia(100, "Artes", "🎨", "artes"),
    filosofia: materia(110, "Filosofia", "💭", "filosofia"),
    sociologia: materia(120, "Sociologia", "👥", ""),
    pedagogia: materia(130, "Conhecimentos Pedagógicos", "🧑‍🏫", "pedagogia", "portugues,legislacao"),
    legislacao: { ...materia(140, "Legislação Completa", "⚖️", "legislacao", ""), principal: false },
  },
};
