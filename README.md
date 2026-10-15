# Romaneio · Rotas otimizadas e custo por viagem

Você envia o romaneio em `.txt`, o sistema localiza os endereços no **OpenStreetMap**, calcula a **melhor ordem de entrega respeitando horários de recebimento** e gera os **links do Google Maps** para mandar ao entregador pelo WhatsApp. Também calcula o **custo previsto** da rota. Depois da viagem, você lança o **gasto real**, e o consumo real passa a ser a base das próximas estimativas.

**100% gratuito, sem chave e sem servidor:** o site é só um conjunto de arquivos estáticos. Toda a lógica roda no navegador.

| Função | Serviço gratuito usado |
|---|---|
| Achar endereços | Nominatim (OpenStreetMap) |
| Tempos, distâncias e traçado | OSRM (OpenStreetMap) |
| Mapas na tela | Leaflet + mapas do OpenStreetMap |
| Navegação do entregador | Links do Google Maps (abrir um link não precisa de chave) |

---

## Como funciona

1. **Planejar rota**
   - Envie o `.txt`.
   - Escolha a data, o horário de saída, o veículo e o tipo (entrega ou coleta).
2. **Paradas**
   - Revise os endereços e informe as janelas de horário (ex.: recebe até 11:00).
   - O sistema procura cada endereço no OpenStreetMap, com no máximo 1 consulta por segundo (regra do serviço).
   - Endereços **não encontrados** ou **aproximados** (quando só a cidade foi achada) devem ser marcados no mapa pelo botão 📍.
   - O ponto marcado fica salvo, e na próxima semana esse cliente já é encontrado.
3. **Rota otimizada**
   - O sistema mostra o mapa com o traçado, a ordem das paradas, os horários previstos, os links do Maps, a mensagem pronta para o WhatsApp e o custo previsto.
   - Clique em **Salvar no histórico**.
4. **Histórico**
   - No fim do dia, lance o gasto real: KM inicial e final, combustível, horário em que o carro foi ligado e desligado, pedágios e outros gastos.
   - O sistema mostra o comparativo previsto × real.
   - A média de km/l das últimas 4 rotas reais passa a ser usada nas próximas estimativas.

**Primeira vez:** vá em **Configurações → 📍 Marcar base no mapa** e marque o local exato de saída e chegada. Rodovia com "km" o OpenStreetMap não encontra com precisão.

### Formato do `.txt`

```
1. CINTIA RAMOS DE PAULA "NEBLINA" – 1 caixa Quadrada – Pedido 18182
Restaurante Neblina, Km 64 – Paraibuna – SP, 12260-000
```

- A linha numerada identifica o cliente.
- As linhas abaixo dela formam o endereço.
- Exemplo pronto em `exemplos/romaneio_exemplo.txt`.

---

## Publicar na Vercel (sem instalar nada)

1. **GitHub:** crie um repositório em https://github.com/new (pode ser privado). Clique em **uploading an existing file** e arraste **o conteúdo** da pasta `romaneio`. Depois clique em **Commit changes**.
2. **Vercel:** em https://vercel.com, entre com a conta do GitHub, clique em **Add New → Project**, importe o repositório e clique em **Deploy**. Não precisa configurar nada.
3. Pronto. A Vercel mostra o endereço do site (ex.: `romaneio.vercel.app`).

Para atualizar o site depois, basta enviar os arquivos alterados ao GitHub. A Vercel publica sozinha.

> O site precisa ser aberto pelo endereço da Vercel. Clicar duas vezes no `index.html` não funciona, porque o navegador bloqueia os módulos JavaScript abertos direto do disco.

---

## Estrutura do projeto

```
index.html                  página única
styles/                     main.css (tela) e print.css (relatório / PDF)
src/
  main.js                   inicializa as telas e as abas
  config/                   configurações gerais, serviços do OSM e valores de referência de custo
  parsing/txt_parser.js     leitura do .txt
  maps/
    address_variants.js     simplifica o endereço (tira CEP, km, nome do comércio) para o OSM achar
    nominatim_client.js     busca de endereços (1 consulta/segundo)
    geocoder.js             coordenadas + cache + pontos marcados no mapa
    osrm_client.js          tabela de tempos/distâncias e traçado da rota
    distance_matrix.js      matriz para o otimizador
    leaflet_loader.js       carrega o mapa sob demanda
    maps_link_builder.js    links do Google Maps (divide a cada 9 paradas)
  optimization/             simulação de horários e otimização da ordem
  costs/                    cálculo único de custos (previsto e real) e consumo aprendido
  services/route_planner.js orquestra o planejamento completo
  storage/                  salvamento no navegador e backup .json
  reports/                  mensagem do WhatsApp, tabelas de custo, relatório para impressão
  ui/                       uma tela/componente por arquivo (inclui mapa da rota e seletor no mapa)
  utils/                    formatação, horários, atalhos de página
tests/                      testes automáticos (precisam de Node.js: npm test)
```

**Princípios usados no código**
- Funções e arquivos em `snake_case`, cada arquivo com uma responsabilidade.
- **DRY:**
  - um único cálculo de custo serve para o previsto e para o real;
  - os campos de formulário são gerados a partir de listas;
  - o seletor de mapa é o mesmo para a base e para as paradas.
- **KISS:**
  - JavaScript puro, sem framework, sem dependências, sem build e sem servidor.

---

## Como o custo é calculado

| Item | Cálculo |
|---|---|
| Combustível | km ÷ km/l × preço do litro (no real: valor gasto informado) |
| Manutenção preventiva, preditiva e corretiva | km × R$/km de cada uma |
| Pneus | km × (preço do jogo ÷ vida útil em km) |
| Seguro, IPVA, licenciamento, rastreador | km × (valor anual ÷ km rodados por ano) |
| Depreciação | km × (valor FIPE × taxa anual ÷ km por ano) |
| Motorista | horas de rota × custo por hora |
| Pedágios e outros | valores informados |

Os valores de referência da Fiorino 2015 foram pesquisados em outubro/2026 (ANP, FIPE, tabelas de revisão, Procon, CAGED). Eles podem ser editados em **Configurações**, e as fontes aparecem na tela e no relatório.

---

## Observações

- **Tempos de viagem.** O OSRM calcula pelas velocidades das vias, sem trânsito. Em estrada de terra o tempo real pode ser maior. O gasto real lançado no histórico mostra essa diferença.
- **Regras de uso dos serviços gratuitos.** O uso semanal fica muito abaixo dos limites. Não use o sistema para consultas em massa.
- **Links no celular.**
  - O **app** Google Maps aceita 9 paradas por link.
  - Pelo navegador do celular, o limite é 3. Por isso, o entregador precisa ter o app instalado.
  - Se precisar, ajuste `max_waypoints_per_link` em `src/config/app_config.js`.
- **Dados.**
  - Ficam salvos no navegador do PC. Use **Configurações → Baixar backup** periodicamente.
  - Para acessar de vários aparelhos, troque `src/storage/storage_repository.js` por um banco gratuito (Supabase ou Firebase) mantendo as mesmas funções.
- **Coleta de leite.** O tipo de rota **Coleta** e o cadastro de vários veículos já existem. Marque cada fazenda no mapa uma vez e ela fica salva.
