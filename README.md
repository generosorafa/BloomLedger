# BloomLedger v0.4 · NPC Deliveries & Market

Protótipo **independente** para Sunflower Land, com design compacto inspirado na organização funcional de uma página de referência, sem copiar o código dela. Roda como site estático em **GitHub Pages**, sem banco de dados ou chaves no navegador.

## Recursos já implementados

- 24 NPCs organizados em cartões e filtros (6 FLOWER, 7 Coins e 11 Tickets).
- 62 pedidos de referência dos 6 NPCs FLOWER. **A lista não equivale aos pedidos atuais de cada jogador.**
- Média de recompensa por NPC de referência pública, custo médio **apenas dos pedidos que possuam cotação**, cobertura de preço e margem média estimada (não confundir recompensa média com recompensa específica do pedido).
- Verde quando a margem excede 50%; laranja quando está entre 0% e 50%; vermelho para lucro negativo; cinza para falta de dados.
- Comparação entre comprar item pronto e fabricar pelos ingredientes cadastrados, inclusive receitas com sub-receitas, quando existirem preços.
- Painel individual com ajuste de recompensa real e taxas (salvo localmente); preços informados manualmente.
- Catálogo `data/artwork.json` pronto para imagens de uso autorizado, mas sem distribuição de artes sem confirmação de licença.
- **Atualização automática preparada, não ativada:** rotina GitHub Actions para obter preços de fonte autorizada, validar os dados, gerar `data/p2p-latest.json`, publicar e servir ao frontend. O navegador recarrega esse arquivo a cada 10 minutos enquanto estiver visível.
- Descarte de snapshots com mais de 90 minutos, moeda não validada, erro de formato e ofertas insuficientes. Se o feed só contiver piso de preço, os custos são estimativas e não comprovam disponibilidade do volume pedido.

## Publicar no GitHub Pages

1. Crie um repositório público e envie **todo o conteúdo desta pasta para a raiz**: `index.html`, `src/`, `data/`, `.github/` e `assets/`.
2. Vá a **Settings → Pages → Build and deployment → Deploy from a branch → main → /(root)**.
3. O endereço deve seguir `https://USUARIO.github.io/REPOSITORIO/` (ou domínio próprio se você configurar DNS).
4. O site carrega mesmo antes de existir uma cotação. Use **Ver demonstração** para testar as cores; **os números demonstrativos não são do mercado atual**.

## Ligar atualização automática de preços

A integração NÃO foi ativada neste pacote porque a fonte pública `https://sfl.world/api/v1/prices` não pôde ser acessada/validada neste ambiente e não há uma garantia documentada sobre seu formato, sua moeda ou sua licença de uso. Não transformamos preços desconhecidos em FLOWER.

Se uma fonte pública permitida for verificada:

1. No GitHub em **Settings → Secrets and variables → Actions → Variables**, crie `P2P_SOURCE_URL` com a URL HTTPS autorizada que devolve JSON.
2. Se o JSON não tiver campo `currency` com `FLOWER` ou `SFL`, **somente depois de confirmar a moeda na documentação da fonte**, crie `P2P_SOURCE_CURRENCY=FLOWER`.
3. Teste **Actions → Market P2P snapshot → Run workflow**. Ele coleta, valida, verifica pelo menos 2 produtos dos NPCs e salva o snapshot com a data da captura; falhas nunca publicam números falsos.
4. Após um push válido, o GitHub Pages serve `data/p2p-latest.json`. O navegador recarrega a cada 10 minutos. O arquivo perde o estado válido ao passar de 90 minutos desde a captura ou desde a data da atualização do mercado, se fornecida.
5. A tarefa está agendada para `17 * * * *` (aproximadamente uma vez por hora, sujeita aos atrasos do GitHub). **O job só roda quando a variável `P2P_SOURCE_URL` estiver configurada.**

A fonte oficial Sunflower Land possui `/community/data?type=tradeable`, mas a comunidade atualmente exige uma chave (VIP e Bumpkin nível 50, sujeito às regras do serviço) e impõe limites. Não cole chaves em `index.html`, JavaScript público, `data/`, nem em variáveis não protegidas do repositório. Para dados oficiais autenticados, desenvolver um coletor separado que use **GitHub Actions Secrets** e chamadas espaçadas, após autorização e confirmação do formato; esse coletor ainda não está integrado. Não use scraping automatizado não autorizado.

### JSON aceito no coletor

```json
{
  "currency":"FLOWER",
  "marketUpdatedAt":"2026-10-08T15:00:00Z",
  "prices":{
    "Cauliflower":{"lowestAsk":0.0068,"offers":[{"price":0.0068,"quantity":200}]},
    "Wheat":{"lowestAsk":0.0187,"offers":[{"price":0.0187,"quantity":50}]}
  }
}
```

Esse JSON é **um exemplo fictício de formato**, não uma cotação real. Também são aceitos valores numéricos por item ou um array de objetos `name` e `price`. Para acesso autenticado diferente, adapte somente `scripts/update-market.mjs`, não as páginas públicas.

**Nota sobre liquidez:** com `offers`, somamos preços por faixa até completar a quantidade ou marcamos cotação indisponível; sem `offers`, multiplicamos pelo menor preço por unidade e marcamos o custo como **estimado**.

## Rodar e testar localmente

```bash
python3 -m http.server 8000
# abra http://localhost:8000
node --test test/*.test.mjs
```

## Fontes e limites

- Catálogo de NPCs de referência: https://primerascripto.com/en/sunflower-land/npc-deliveries/
- Código-fonte e receitas publicadas: https://github.com/sunflower-land/sunflower-land
- Documentação de acesso comunitário: https://sunflower-land.com/community-docs/
- Portals & direitos: https://docs.sunflower-land.com/contributing/portals-ugc/portal-terms-of-service

O usuário deve conferir recompensas e boosts no próprio jogo. Não calculamos conversão de Coins ou Tickets para FLOWER sem metodologia confirmada. O projeto não contém wallet, assinatura, autenticação, transações nem vinculação automática à fazenda. Termos do portal exigem aprovação e direitos sobre imagens; esta publicação em GitHub Pages não implica Portal aprovado.
