# Bella Delivery

Site de pedidos (modelo Nonna) + painel de gestão + app do entregador, num só projeto.

- `public/index.html`: site do cliente (cardápio, sacola, endereço com área de entrega, cupom, acompanhamento do pedido)
- `public/admin.html`: painel da equipe em `/painel` (pedidos, cozinha, PDV, cardápio, estoque, entregas, área de entrega, caixa, clientes e cupons, relatórios, app do entregador, configurações)
- `api/`: funções da Vercel que falam com o banco Neon (Postgres)
- `prototipos/`: protótipos originais

Variáveis de ambiente: `DATABASE_URL` (Neon) e `APP_SECRET` (assinatura do login).
Primeiro acesso ao painel: Bella, PIN 1234. Troque os PINs em Configurações › Equipe.

## Vários restaurantes

- `/central`: admin central (senha na variável `CENTRAL_PASSWORD`). Cadastra restaurantes, vê pedidos e vendas, troca o PIN do dono, desativa.
- `/<loja>`: site do restaurante · `/<loja>/painel`: painel. Sem loja na URL (`/`, `/admin`) = loja `bella`.
- No banco, `kv` e `orders` têm a coluna `tenant`; a tabela `tenants` lista os restaurantes.
- Loja nova começa **pausada**, com cardápio de exemplo e só o usuário dono.
