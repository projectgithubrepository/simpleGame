# NEON DODGE

<p align="center"><img src="assets/neon-dodge-banner.svg" alt="Neon Dodge" width="100%"></p>
<p align="center"><strong>Arcade espacial para navegador e celular.</strong><br>Desvie dos destroços, colete moedas e sobreviva o máximo possível.</p>
<p align="center"><a href="https://projectgithubrepository.github.io/simpleGame/?v=layout-thrust-readme-4"><strong>▶ JOGAR AGORA</strong></a></p>

## Como jogar
- **Celular:** segure ← ou → nos controles abaixo da tela.
- **Computador:** use ← / → ou A / D.
- **Impulso:** os propulsores laterais acendem enquanto você mantém a direção.
- **Objetivo:** desvie dos obstáculos e colete itens.

## Guia visual dos itens
<table><tr>
<td align="center" width="25%"><img src="assets/coin.svg" width="88" alt="Moeda"><br><strong>MOEDA</strong><br>+5 no saldo</td>
<td align="center" width="25%"><img src="assets/shield.svg" width="88" alt="Escudo"><br><strong>ESCUDO (S)</strong><br>Bloqueia 1 impacto</td>
<td align="center" width="25%"><img src="assets/slow.svg" width="88" alt="Lentidão"><br><strong>LENTIDÃO (L)</strong><br>Obstáculos 50% mais lentos por 5s</td>
<td align="center" width="25%"><img src="assets/rock.svg" width="88" alt="Destroço"><br><strong>DESTROÇO</strong><br>Evite a colisão</td>
</tr></table>

## As três naves
- **Viper:** ciano e magenta.
- **Phantom:** roxa e dourada.
- **Titan:** laranja e vermelha.

A escolha fica acima da área de jogo e pode ser alterada antes ou durante a partida.

## Regras rápidas
- **Moeda dourada ($):** ao tocar, adiciona 5 moedas ao saldo salvo no navegador.
- **Escudo azul (S):** ao coletar, aparece um anel azul ao redor da nave. A próxima colisão é anulada e consome o escudo. Sem escudo, a colisão encerra a partida.
- **Lentidão roxa (L):** ao coletar, reduz em 50% a velocidade dos destroços durante 5 segundos.
- **Propulsor lateral:** efeito visual enquanto você mantém um comando de direção; não é um item coletável.

## Projeto
- HTML, CSS e JavaScript puro.
- Sprites desenhados em canvas e extrudados em camadas (*sprite stacking*).
- Recorde, moedas e nave escolhida ficam salvos no dispositivo.
- Testes automatizados: `npm test`.
- Publicação automática via GitHub Actions e GitHub Pages.

## Links
- [Jogar Neon Dodge](https://projectgithubrepository.github.io/simpleGame/)
- [Código-fonte no GitHub](https://github.com/projectgithubrepository/simpleGame)
