# Romaneio · Rotas otimizadas e custo por viagem

Você envia o romaneio em planilha (**Excel .xlsx** ou **.csv**), o sistema localiza os endereços no **OpenStreetMap**, calcula a **melhor ordem de entrega respeitando horários de recebimento** e gera os **links do Google Maps** para mandar ao entregador pelo WhatsApp. Também imprime os **comprovantes de entrega** e calcula o **custo previsto** da rota. Depois da viagem, você lança o **gasto real**, e o consumo real passa a ser a base das próximas estimativas.

**Gratuito e sem chave por padrão:** a lógica roda no navegador e usa só o OpenStreetMap. A busca extra pelo Google é opcional (veja abaixo) e é a única parte que usa um servidor.

| Função | Serviço gratuito usado |
|---|---|
| Achar endereços | Nominatim (OpenStreetMap) |
| Achar endereços que o OSM não acha (opcional) | Geocoding API do Google, pela função `api/geocode_google.js` |
| Tempos, distâncias e traçado | OSRM (OpenStreetMap) |
| Mapas na tela | Leaflet + mapas do OpenStreetMap |
| Navegação do entregador | Links do Google Maps (abrir um link não precisa de chave) |

---

## Como funciona

1. **Planejar rota**
   - Envie a planilha do romaneio (.xlsx ou .csv), ou copie as linhas no Excel e cole no site.
   - Escolha a data, o horário de saída, o veículo e o tipo (entrega ou coleta).
2. **Paradas**
   - Revise os endereços e informe as janelas de horário (ex.: recebe até 11:00).
   - O sistema procura cada endereço no OpenStreetMap, com no máximo 1 consulta por segundo (regra do serviço).
   - Endereços **não encontrados** ou **aproximados** (quando só a cidade foi achada) devem ser marcados no mapa pelo botão 📍.
   - O ponto marcado fica salvo, e na próxima semana esse cliente já é encontrado.
3. **Rota otimizada**
   - O sistema mostra o mapa com o traçado, a ordem das paradas, os horários previstos, os links do Maps, a mensagem pronta para o WhatsApp e o custo previsto.
   - Clique em **Imprimir comprovantes de entrega** (veja abaixo).
   - Clique em **Salvar no histórico**. Os comprovantes também podem ser reimpressos pelo Histórico.
4. **Histórico**
   - No fim do dia, lance o gasto real: KM inicial e final, combustível, horário em que o carro foi ligado e desligado, pedágios e outros gastos.
   - O sistema mostra o comparativo previsto × real.
   - A média de km/l das últimas 4 rotas reais passa a ser usada nas próximas estimativas.

**Base:** já vem configurada nas coordenadas -23.557128, -45.519515 (saída e chegada de todas as rotas). Para mudar, use **Configurações → 📍 Marcar base no mapa**.

### Planilha do romaneio

Baixe o modelo pelo site (**Modelos para preencher**, na tela inicial) ou use os arquivos da pasta `exemplos/`:
- `modelo_romaneio.xlsx`: modelo Excel, com a aba **Instruções** e um exemplo de preenchimento;
- `modelo_romaneio.csv`: o mesmo modelo, em CSV;
- `exemplo_romaneio.csv`: exemplo já preenchido, para testar o sistema.

| Cliente | Endereço | CEP (opcional) | Pacotes | NF | A vista | Boleto |
|---|---|---|---|---|---|---|
| MERCEARIA AQUARIUS | Av. Cassiano Ricardo, 521 - Parque Res. Aquarius, São José dos Campos - SP | | 3 | 0000018183 | | X |

- Uma entrega por linha. **Cliente** e **Endereço** são obrigatórios.
- **A vista** e **Boleto**: marque **X** na forma de pagamento. Se não marcar nenhuma, ou marcar as duas, o site avisa.
- A ordem das colunas não importa, e linhas de título acima do cabeçalho são ignoradas.
- No modelo Excel, as colunas **NF** e **CEP** são de texto, para não perder os zeros à esquerda.
- Linhas sem endereço ficam fora da rota. O site mostra um aviso com o número da linha do Excel.
- O formato antigo `.txt` continua aceito.

### Comprovante de entrega

Depois de calcular a rota, o botão **Imprimir comprovantes de entrega** gera um comprovante por cliente, na ordem da rota (5 por página A4):

```
[logo]  COMPROVANTE DE ENTREGA                                     PG. 1
 ① Cliente: MERCEARIA AQUARIUS              Pacotes: 3   NF: 0000018183
   Endereço: Av. Cassiano Ricardo, 521 - …         À vista (   ) Boleto ( X )
   Nome: ____________________          Assinatura: ____________________
   RG ou CPF: ______________   Data de entrega: 16/10/2026   Horário: ___:___
                      QUEIJOS DO REI LATICÍNIOS LTDA
```

- **Nome, RG ou CPF e Assinatura** ficam em branco para quem recebe preencher.
- **Data de entrega** já vem preenchida com a data da rota escolhida na tela inicial.
- **Horário** fica em branco para o entregador preencher.
- Cabeçalho com o logo da Queijos do Rei e o número da página (PG. 1, PG. 2…). Rodapé com "QUEIJOS DO REI LATICÍNIOS LTDA" centralizado.
- O número no círculo é a ordem da entrega na rota.
- Para salvar em PDF, escolha **Salvar como PDF** na janela de impressão. Use o Chrome ou o Edge e deixe a escala em 100%.
- Nome da empresa, logo e comprovantes por página ficam em `src/config/app_config.js` (`COMPANY_CONFIG` e `RECEIPT_CONFIG`). O logo é o arquivo `assets/logo_queijos_do_rei.png`.

### Abreviações de endereço

Antes de procurar no mapa, o sistema troca as abreviações mais comuns pelas palavras inteiras. Exemplo: `Av. Dep. Benedito Matarazzo, 9009 - Jd Oswaldo Cruz` vira `Avenida Deputado Benedito Matarazzo, 9009 - Jardim Oswaldo Cruz`. Vale com ou sem ponto e em maiúsculas (JD., Jd, jd.).

- **Tipos de rua:** R., Av., Tv./Trav., Al., Pç./Pça., Lgo., Est./Estr., Rod., Ld., Vd., Bc., Vla., Psg., Srv.
- **Bairros e complementos:** Jd./Jard., Jds., Pq./Pque., Res./Resid., Cond., Cj./Conj., Vl., Lot., Ch./Chác., Sít., Faz., Núc., Hab., Rec., Dist., Ed./Edif., Bl., Qd., Lt., Ap./Apto., Cs., Sl., Fds.
- **Títulos em nomes de rua:** Dr., Dra., Prof., Profª, Eng., Dep., Sen., Ver., Pres., Gov., Pref., Min., Des., Cons., Comend., Cel., Cap., Ten., Maj., Gen./Gal., Sgt., Brig., Mal., Alm., Cmte., Pe., Fr., Mons., Visc., Bar., Sta., Sto., Sr., Sra., N. Sra. (Nossa Senhora).

**Regras de segurança.** Elas evitam estragar o que já está certo:
- só expande quando vem outra palavra depois, por isso o "AL" de "Maceió - AL" continua sendo o estado;
- tipos de rua só valem no começo do endereço;
- abreviações que também são palavras comuns (Bar., Faz., Mal., Ver.…) só valem com ponto.

O comprovante e a mensagem do WhatsApp mostram o endereço como foi digitado. A expansão serve só para a busca. A lista fica em `src/maps/address_abbreviations.js`, e para incluir uma abreviação basta acrescentar uma linha na tabela.

---

## Publicar na Vercel (sem instalar nada)

1. **GitHub:** crie um repositório em https://github.com/new (pode ser privado). Clique em **uploading an existing file** e arraste **o conteúdo** da pasta `romaneio`. Depois clique em **Commit changes**.
2. **Vercel:** em https://vercel.com, entre com a conta do GitHub, clique em **Add New → Project**, importe o repositório e clique em **Deploy**. Não precisa configurar nada.
3. Pronto. A Vercel mostra o endereço do site (ex.: `romaneio.vercel.app`).

Para atualizar o site depois, basta enviar os arquivos alterados ao GitHub. A Vercel publica sozinha.

> O site precisa ser aberto pelo endereço da Vercel. Clicar duas vezes no `index.html` não funciona, porque o navegador bloqueia os módulos JavaScript abertos direto do disco.

---

## Busca extra pelo Google (opcional)

O OpenStreetMap acha bem ruas e comércios conhecidos, mas em muitos endereços do Brasil não tem o número da casa, o bairro ou o condomínio. Quando isso acontece, o sistema pergunta ao Google, que costuma ter o ponto exato.

**Quando o Google é chamado.** Só em dois casos:
- o OpenStreetMap não achou o endereço;
- o OpenStreetMap achou só a cidade, ou só a rua quando o endereço tem número (ex.: `Av. Cassiano Ricardo, 521`).

Endereço que o OSM acha direto nunca vai ao Google. Esses clientes aparecem como "via Google" na tabela de paradas.

**É opcional.** Sem a chave, o site funciona só com o OpenStreetMap, e os endereços difíceis aparecem como "Aproximado" para você marcar no mapa 📍.

**Como ligar:**
1. No https://console.cloud.google.com, crie um projeto e vincule um cartão (o Google exige, mesmo para o uso gratuito).
2. Em **APIs e serviços → Biblioteca**, ative somente a **Geocoding API**.
3. Em **Credenciais → Criar credenciais → Chave de API**. Na chave, em **Restrições de API**, marque só a Geocoding API. Em **Restrições de aplicativo**, deixe **Nenhuma** (a chave fica só no servidor).
4. Em **Cotas**, defina um limite diário (ex.: 100 consultas por dia) e, em **Faturamento → Orçamentos e alertas**, crie um orçamento de R$ 1 com alerta por e-mail. Assim você nunca é cobrado sem perceber.
5. Na Vercel, em **Settings → Environment Variables**, cadastre:
   - `GOOGLE_MAPS_API_KEY` = a chave;
   - `APP_ACCESS_TOKEN` = uma senha qualquer (recomendado: sem ela, quem descobrir o endereço do site pode gastar a sua cota).
6. Em **Deployments → … → Redeploy** para valer a mudança.
7. No site, em **Configurações → Senha de acesso**, informe a mesma senha do passo 5.

**A chave nunca fica visível.** Ela existe só na Vercel e só a função `api/geocode_google.js`, que roda no servidor, a usa. O navegador chama `/api/geocode_google` e nunca recebe a chave. Não coloque a chave em nenhum arquivo do projeto.

**Custo.** O Google dá uma cota mensal gratuita para a Geocoding API (confira o valor atual em https://mapsplatform.google.com/pricing). Cada endereço novo gasta no máximo uma consulta, e o resultado fica guardado, então o uso semanal fica muito abaixo.

**Regra de uso do Google.** O Google só permite guardar as coordenadas que ele devolve por até 30 dias, então esses endereços são buscados de novo depois desse prazo. Pontos marcados por você no mapa 📍 ou digitados como coordenadas ficam guardados para sempre. Os termos do Google também restringem mostrar resultados dele sobre um mapa que não seja do Google (aqui o mapa é do OpenStreetMap). Para uso interno e pequeno costuma ser tolerado, mas leia os termos atuais em https://cloud.google.com/maps-platform/terms antes de depender disso.

---

## Estrutura do projeto

```
index.html                  página única
assets/logo_queijos_do_rei.png  logo do comprovante de entrega
exemplos/                   modelos da planilha (.xlsx, .csv) e exemplo preenchido
api/
  geocode_google.js         função da Vercel (servidor) que consulta o Google com a chave guardada
  _lib/google_geocoder.js   chamada à Geocoding API e leitura da precisão do resultado
styles/                     main.css (tela) e print.css (comprovantes, relatório / PDF)
src/
  main.js                   inicializa as telas e as abas
  config/                   configurações gerais, serviços do OSM e valores de referência de custo
  parsing/
    romaneio_file_reader.js entrada única: escolhe o leitor pelo tipo de arquivo (.xlsx, .csv, .txt, colado)
    xlsx_reader.js          lê a primeira aba do Excel (sem bibliotecas)
    zip_reader.js           abre o .xlsx (que é um ZIP) com o descompactador do navegador
    csv_parser.js           lê CSV com ";", "," ou tabulação (colado do Excel)
    romaneio_table.js       reconhece as colunas e monta as entregas, com avisos por linha
    text_decoder.js         lê texto em UTF-8 ou ANSI (Excel/Bloco de Notas antigos)
    txt_parser.js           formato antigo (.txt)
  maps/
    address_variants.js     simplifica o endereço (tira CEP, km, nome do comércio) para o OSM achar
    nominatim_client.js     busca de endereços (1 consulta/segundo)
    google_geocode_client.js  segunda opinião do Google (opcional, só quando o OSM não acha bem)
    location_precision.js   decide se o resultado é exato, só a rua ou só a cidade
    address_abbreviations.js  Av. → Avenida, Jd. → Jardim, Dep. → Deputado… antes de buscar
    geocoder.js             coordenadas + cache + pontos marcados no mapa
    osrm_client.js          tabela de tempos/distâncias e traçado da rota
    distance_matrix.js      matriz para o otimizador
    leaflet_loader.js       carrega o mapa sob demanda
    maps_link_builder.js    links do Google Maps (divide a cada 9 paradas)
  optimization/             simulação de horários e otimização da ordem
  costs/                    cálculo único de custos (previsto e real) e consumo aprendido
  services/route_planner.js orquestra o planejamento completo
  storage/                  salvamento no navegador e backup .json
  reports/
    delivery_receipts.js    comprovantes de entrega (páginas A4 com cabeçalho e rodapé)
    report_builder.js       relatório da rota para impressão
    whatsapp_message.js     mensagem para o entregador
    cost_tables.js          tabelas de custo previsto e real
  ui/                       uma tela/componente por arquivo (inclui mapa da rota e seletor no mapa)
  utils/                    formatação, horários, atalhos de página
tests/                      testes automáticos (precisam de Node.js: npm test)
```

**Princípios usados no código**
- Funções e arquivos em `snake_case`, cada arquivo com uma responsabilidade.
- **DRY:**
  - um único cálculo de custo serve para o previsto e para o real;
  - os campos de formulário são gerados a partir de listas;
  - o seletor de mapa é o mesmo para a base e para as paradas;
  - Excel, CSV e texto colado passam pelo mesmo reconhecimento de colunas (`romaneio_table.js`).
- **KISS:**
  - JavaScript puro, sem framework, sem dependências (até o Excel é lido sem biblioteca), sem build e sem servidor.

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
