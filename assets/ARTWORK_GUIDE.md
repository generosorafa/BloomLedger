# Artes oficiais — instruções para integração

Este projeto é uma ferramenta independente que poderá ser adaptada a um **Portal aprovado**. **Não acompanha sprites, NPCs, músicas, fontes ou logos extraídos do jogo.**

## 1. Direitos necessários

- As diretrizes de Portals permitem ferramentas como analytics e guias, mas exigem autorização da equipe via Discord **antes do lançamento do Portal**.
- A aprovação de um Portal não substitui automaticamente a necessidade de autorização para cada grupo de assets, especialmente os do **SunnySide Asset Pack**, NPCs e Bumpkins.
- O repositório público do jogo declara que **não há licença geral de reutilização** e orienta a adquirir o SunnySide Asset Pack para uso de seus assets em outros projetos.
- **GitHub Pages é um site externo**, portanto confirme expressamente se a licença/consentimento para imagens cobre esse formato além do Portal dentro do jogo.

Documentos:
- https://docs.sunflower-land.com/contributing/portals-ugc
- https://docs.sunflower-land.com/contributing/portals-ugc/portal-terms-of-service
- https://github.com/sunflower-land/sunflower-land
- https://github.com/sunflower-land/economy-template (aponta para um repositório de imagens privado dos desenvolvedores)

## 2. Como instalar artes aprovadas

1. Obtenha por escrito a autorização ou licença pertinente para sprites de NPCs, comidas e materiais em seu caso de uso.
2. Guarde as evidências no seu computador; não coloque conversas privadas ou tokens em repositórios públicos.
3. Crie as pastas `assets/npcs/` e `assets/items/`; copie somente arquivos cuja distribuição esteja permitida.
4. Abra `data/artwork.json`; substitua `null` por URL HTTPS autorizada ou caminho local. Exemplo: `"Gordo": "./assets/npcs/gordo.png"`.
5. Publique os arquivos junto com o restante do projeto. O site mostrará a arte no NPC, na comida, nos ingredientes e na lista de preços automaticamente.
6. Se não houver imagem, o site exibe ícone provisório com nome real do item, sem quebrar a calculadora.

Também é possível testar uma imagem via painel **Imagens** dentro do próprio site, mas o ajuste só vale para aquele navegador. A versão compartilhada depende de `data/artwork.json`.

## 3. O que enviar para a equipe oficial

Solicitar autorização para:
- uso das imagens dos NPCs e ingredientes do Sunflower Land na calculadora não comercial BloomLedger;
- uso em GitHub Pages público inicialmente e integração eventual como Portal;
- hospedagem dos arquivos no nosso próprio repositório público ou apontamento para CDN oficial, conforme indicação da equipe;
- requisitos de crédito, uso de marcas, atribuição SunnySide e proibição de alterações.
