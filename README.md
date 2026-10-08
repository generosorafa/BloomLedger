# BloomLedger — Sunflower Land Delivery & Market Analyzer (MVP v0.3)

Protótipo **independente**, projetado para **GitHub Pages** sem backend e sem dependências npm. Código autoral. Não afiliado ao Sunflower Land. **Não inclui imagens nem código de terceiros.**

## O que funciona agora
- Seleção de alguns deliveries confirmados e pedido personalizado entre as receitas já cadastradas.
- Cálculo recursivo dos ingredientes, inclusive comidas que exigem outras receitas (Goblin Brunch).
- Recompensa real digitada pelo usuário, cálculo de lucro econômico, ROI, custo de oportunidade e desembolso com inventário.
- Edição/importação/exportação de preços unitários FLOWER, persistência local no navegador.
- Tentativa de consulta *direta* a `https://sfl.world/api/v1/prices`, com erro explícito se CORS, 403 ou formato bloquearem. **Dados só são incorporados automaticamente quando a resposta declara explicitamente `currency: "FLOWER"`**; o esquema real deste endpoint não foi validado. A estrutura de respostas reais **não foi validada em tempo real** neste ambiente; os dados vindos de terceiros precisam de verificação antes do uso operacional.
- Valores iniciais são **exemplos históricos**, não preços ao vivo.

## Deploy em GitHub Pages
1. Crie um repositório público no GitHub chamado, por exemplo, `bloomledger`.
2. Faça upload **do conteúdo desta pasta** para a raiz do repositório (`index.html`, `src/`, `data/`, `.nojekyll`).
3. No repositório, abra **Settings → Pages → Build and deployment → Deploy from a branch → main → /(root) → Save**.
4. Aguarde o GitHub publicar na URL `https://SEU_USUARIO.github.io/bloomledger/`.
5. Não coloque nenhuma chave privada, JWT de portal ou senha no repositório ou JavaScript do navegador.

## Rodar localmente
```sh
python -m http.server 8000
# Visite http://localhost:8000
node --test test/*.test.mjs
```

## Como tornar P2P confiável
O endpoint `sfl.world` foi identificado em projetos comunitários, mas não é API oficial com SLA. A tentativa direta pode falhar por CORS/403. **Não use um proxy público que receba credenciais de jogadores.** Caminhos futuros:
1. Confirmar com a equipe do jogo um endpoint de preço de marketplace com autorização de consulta e campos de *best ask*, quantidade, data e paginação. A Community API atual pede VIP + Bumpkin nível 50 para chave.
2. Serviço próprio pequeno (por exemplo, Cloudflare Worker) que agrega dados autorizados e fornece JSON **público e sem segredos**, com timestamp, cache, limites e sinalização de erro. Não expor `x-api-key` no frontend.
3. Alternativa estática: workflow GitHub Actions agendado lê API permitida em ambiente de secrets, gera `data/prices.json`, divulga timestamp, e não publica em caso de erro. Exige checar regras de uso/rate limit.
4. Formato esperado: `{ "prices": {"Cauliflower": 0.0068, "Wheat": 0.0187}, "updatedAt": "...", "source": "...", "currency": "FLOWER" }` com prova da fonte e distinção entre preços *ask, bid, last*. O MVP aceita o objeto `prices` mas ainda não lê os metadados.

## Fontes consultadas (2026-10-08)
- https://github.com/sunflower-land/sunflower-land — frontend público; repositório declara **sem licença de reutilização**.
- https://github.com/sunflower-land/sunflower-land/blob/main/src/features/game/types/consumables.ts — receitas e tempos extraídos manualmente como fatos; não foram copiados trechos de código.
- https://primerascripto.com/en/sunflower-land/npc-deliveries/ — modelos e quantidades de pedidos dos NPCs.
- https://sunflower-land.com/community-docs/ — API, condição VIP e Bumpkin nível 50 para emitir chave.
- https://github.com/sunflower-land/sunflower-land/blob/main/docs/OFFCHAIN_API.md — farms e regras de consulta; recomenda cerca de 15 s entre chamadas em lote.
- https://github.com/ispankzombiez/SFL-Calculator/blob/main/js/api.js — evidência do endpoint comunitário `sfl.world/api/v1/prices`; requer validação adicional.
- https://sfl-manager.com/land/Precioso/trading — números usados **somente para demonstração**, sem atestado de atualidade.

## Limitações explícitas
- Sem login ou carregamento automático de uma fazenda; os dados de inventário são digitados.
- Apenas amostra verificada de NPCs e comidas; **não** cobre todos deliveries e modificadores.
- Tempo informado é sequencial base, desconsidera paralelização, skills e boosts.
- Recompensa precisa ser digitada para cada pedido; o indicador médio dos NPCs é apenas referência para o placeholder.
- A consulta de `sfl.world` não foi validada ao vivo na elaboração.
- Preço mais baixo publicado pode não estar disponível para toda a quantidade, e preço de venda/compra pode divergir. Taxas de negociação, sementes, custo em Coins, rendimento extra e consumo de energia não são incluídos automaticamente.
- O comparativo de comprar a comida pronta ocorre apenas se o preço dessa comida estiver inserido na fonte; o MVP ainda não constrói livros de ofertas por volume.
- A API comunitária oficial do jogo pode ter requisitos adicionais ou diferentes por endpoint; verifique no ambiente logado.

## Próximos passos priorizados
P0: confirmar API real e esquema com preço unitário, timestamp e liquidez; ajustar CORS em backend autorizado. P1: extrair/cadastrar mais receitas e todos NPCs, estoque/API da fazenda com permissão, layout de comparação múltipla. P2: custos de semente, Coins, boosts e yield, frequência de deliveries, otimização comprar vs fabricar, histórico. P3: alertas, ranking personalizado e eventual integração como portal oficial.


## Atualização v0.2 — Indicador de margem e imagens

- A margem é calculada como `(recompensa - custo total) / recompensa * 100`; esse indicador é diferente do ROI.
- Margem acima de 50% = verde; entre 0% e 50%, inclusive = laranja; lucro negativo = vermelho; dados insuficientes = neutro.
- Nomes reais de NPCs e itens; imagens reais podem ser vinculadas no painel *Imagens oficiais — quando autorizadas*, que aceita URLs HTTPS autorizadas e arquivos locais `./assets/`.
- O projeto não inclui mídias de Sunflower Land por falta de licença explícita de redistribuição. O README oficial do jogo declara limitações de licenciamento dos assets, inclusive SunnySide e Bumpkins. Para publicação pública, confirmar autorização/licença com o detentor dos direitos.
- Recursos de preços demonstrativos ou manuais não são mostrados como preço ao vivo.

## Atualização v0.3 — Preparação para Portal e catálogo de imagens (08/10/2026)

- Agora a interface lê automaticamente **`data/artwork.json`** ao carregar. O manifesto inclui os nomes de 2 NPCs e 22 itens/receitas cadastrados nesta fase. Cada entrada `null` é uma imagem pendente, não uma licença.
- Quando obtiver os direitos necessários, substitua os `null` por URLs HTTPS autorizadas ou caminhos de arquivos aprovados, por exemplo `./assets/npcs/gordo.png` ou `./assets/items/wheat.png`.
- Copie arquivos que você tem permissão de redistribuir para `assets/` e publique o conjunto no GitHub Pages. Eles aparecerão automaticamente junto aos NPCs, ingredientes e preços. Links quebrados exibem emoji provisório.
- O painel de imagens possui visualização do catálogo atual, aplicação de ajustes locais, contagem de imagens configuradas e botão para limpar ajustes locais. A edição local não altera o JSON compartilhado do GitHub.
- Links de imagem são validados: HTTPS ou caminho local sob `./assets/`, rejeitando protocolos inseguros e caminhos relativos que escapem da pasta.
- Consulte **`assets/ARTWORK_GUIDE.md`** para as etapas de licença, autorização de Portal e integração das imagens. Não copie sprites originais para um repositório público sem uma base de direitos.
- **Autorização do Portal ainda não obtida.** Os termos oficiais exigem contato com a equipe pelo Discord antes do lançamento do Portal e determinam que o desenvolvedor tenha direito de utilizar os conteúdos incorporados. O README público do jogo distingue código acessível de código licenciado; o template oficial de minigames descreve os assets em um repositório de imagens privado.
- Este pacote é um protótipo independente para GitHub Pages. **O endpoint de P2P não foi validado e não é uma fonte confirmada de dados atuais.**

### O que atualizei no projeto inteiro

| Arquivo | Alteração |
| --- | --- |
| `index.html` | Painel de artes e estado de autorização, botões e versão 0.3 |
| `src/app.mjs` | Carregamento automático do catálogo e interações |
| `src/artwork.mjs` | Exibição automática das imagens e fallback |
| `src/artwork-core.mjs` | Validação/mesclagem do catálogo sem acesso ao navegador |
| `data/artwork.json` | Lista editável com 24 entradas iniciais |
| `src/style.css` | Estilo do painel de configuração |
| `test/artwork.test.mjs` | Quatro novos testes |
| `assets/ARTWORK_GUIDE.md` | Orientação para arte autorizada e regras de Portal |

Fontes específicas para autorização (consultadas em 08/10/2026):
- https://docs.sunflower-land.com/contributing/portals-ugc
- https://docs.sunflower-land.com/contributing/portals-ugc/portal-terms-of-service
- https://github.com/sunflower-land/sunflower-land
- https://github.com/sunflower-land/economy-template
