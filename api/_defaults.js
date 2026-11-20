// Valores iniciais gravados no banco no primeiro acesso. Depois tudo é editado pelo painel.
export const STEPS = [
  { name: "Escolha a massa", min: 1, max: 1, opts: [["Espaguete", 0], ["Penne", 0], ["Talharim", 0], ["Fusilli", 0], ["Nhoque", 400]] },
  { name: "Escolha o molho", min: 1, max: 1, opts: [["Bolonhesa", 0], ["Sugo", 0], ["Branco", 0], ["Rosé", 0], ["Pesto", 300]] },
  { name: "Ingredientes", min: 0, max: 4, opts: [["Bacon", 300], ["Frango", 300], ["Calabresa", 300], ["Champignon", 300], ["Milho", 200], ["Azeitona", 200], ["Tomate seco", 300], ["Brócolis", 200]] },
  { name: "Finalização", min: 0, max: 2, opts: [["Parmesão", 0], ["Manjericão", 0], ["Mussarela gratinada", 400], ["Catupiry", 300]] },
];
export const DEFAULTS = {
  store: { name: "Bella Massa & Batata", addr: "Praça da Sé, São Paulo - SP (provisório: troque em Configurações › Loja)", lat: -23.5503, lng: -46.6339 },
  paused: false,
  zones: [
    { id: "z1", name: "Pertinho", type: "circle", cx: 600, cy: 410, r: 230, fee: 500, eta: "30–40", on: true, color: "#2f7d4f" },
    { id: "z2", name: "Bairros vizinhos", type: "circle", cx: 600, cy: 410, r: 430, fee: 800, eta: "40–55", on: true, color: "#d99a1e" },
  ],
  hours: [0, 1, 2, 3, 4, 5, 6].map(i => (i === 1 ? { on: true, a: "18:00", b: "23:00" } : { on: true, a: "11:00", b: "23:30" })),
  holidays: [{ d: "2026-12-25", n: "Natal" }, { d: "2027-01-01", n: "Ano Novo" }],
  wa: {
    auto: true,
    on: { novo: true, producao: true, pronto: true, rota: true, entregue: true },
    tpl: {
      novo: "Oi {nome}! 🍝 Recebemos seu pedido {num} na Bella. Total {total}. Acompanhe aqui: {link}",
      producao: "{nome}, seu pedido {num} já está no fogo! 🔥 Previsão: {tempo}.",
      pronto: "{nome}, seu pedido {num} está pronto para retirar no balcão. 😊",
      rota: "Saiu para entrega! 🛵 {entregador} está levando seu pedido {num}. Código de entrega: {codigo}",
      entregue: "Pedido {num} entregue. Bom apetite! 😋 Conta pra gente o que achou: {link}",
    },
  },
  coupons: [
    { code: "BEMVINDO", type: "pct", v: 10, min: 3000, on: true, uses: 0 },
    { code: "FRETEGRATIS", type: "frete", v: 0, min: 5000, on: false, uses: 0 },
  ],
  loyal: { on: true, n: 10, reward: "um Macarrão à Bolonhesa grátis" },
  cats: ["Massas", "Batatas", "Coxinhas"],
  products: [
    { id: 1, cat: "Massas", name: "Monte seu macarrão", desc: "Escolha a massa, o molho e os ingredientes. Montado na hora, do seu jeito. 400 g.", price: 2200, img: "/img/macarrao.jpg", tag: "Mais pedido", addons: [], steps: STEPS, rec: [["massa", 0.15], ["molho", 0.12], ["parm", 0.02], ["emb", 1]], on: true, out: false },
    { id: 2, cat: "Batatas", name: "Batata Cheddar, Bacon & Linguiça", desc: "Batata crocante com cheddar cremoso, bacon e linguiça. 300 g.", price: 1200, img: "/img/batata.jpg", tag: "Pra dividir", addons: [], rec: [["batata", 0.3], ["cheddar", 0.08], ["bacon", 0.05], ["emb", 1]], on: true, out: false },
    { id: 3, cat: "Coxinhas", name: "Coxinha de Camarão", desc: "Recheio de camarão refogado com temperos da casa.", price: 1000, img: "/img/coxinha.jpg", tag: "", addons: [], rec: [["massacx", 1], ["camarao", 1]], on: true, out: false },
    { id: 4, cat: "Coxinhas", name: "Coxinha de Bacalhau", desc: "Bacalhau desfiado com batata e azeite.", price: 1200, img: "/img/coxinha.jpg", tag: "", addons: [], rec: [["massacx", 1], ["bacalhau", 1]], on: true, out: false },
    { id: 5, cat: "Coxinhas", name: "Coxinha de Frango", desc: "Massa leve e recheio cremoso de frango.", price: 1000, img: "/img/coxinha.jpg", tag: "", addons: [], rec: [["massacx", 1], ["frango", 1]], on: true, out: false },
  ],
  autoOut: true,
  stock: [
    { id: "massa", n: "Espaguete", u: "kg", q: 5, min: 2 }, { id: "molho", n: "Molho bolonhesa", u: "kg", q: 4, min: 1.5 },
    { id: "parm", n: "Parmesão", u: "kg", q: 1, min: 0.5 }, { id: "batata", n: "Batata congelada", u: "kg", q: 8, min: 3 },
    { id: "cheddar", n: "Cheddar", u: "kg", q: 2, min: 1 }, { id: "bacon", n: "Bacon", u: "kg", q: 2, min: 1 },
    { id: "massacx", n: "Massa de coxinha", u: "un", q: 80, min: 30 }, { id: "camarao", n: "Recheio de camarão", u: "un", q: 30, min: 15 },
    { id: "bacalhau", n: "Recheio de bacalhau", u: "un", q: 30, min: 15 }, { id: "frango", n: "Recheio de frango", u: "un", q: 40, min: 15 },
    { id: "emb", n: "Embalagem delivery", u: "un", q: 100, min: 40 },
  ],
  riders: [
    { id: "r1", name: "João", moto: "Moto não informada", color: "#3c6fb6", online: false, pos: { x: 600, y: 410 }, kmT: 0 },
    { id: "r2", name: "Carla", moto: "Moto não informada", color: "#8a4fb0", online: false, pos: { x: 600, y: 410 }, kmT: 0 },
  ],
  users: [
    { id: "u1", name: "Bella (dona)", role: "dono", pin: "1234" },
    { id: "u2", name: "Atendente", role: "atendente", pin: "1111" },
    { id: "u3", name: "Cozinha", role: "cozinha", pin: "2222" },
    { id: "u4", name: "João", role: "entregador", pin: "3333", rider: "r1" },
    { id: "u5", name: "Carla", role: "entregador", pin: "4444", rider: "r2" },
  ],
  caixa: { open: false },
};
