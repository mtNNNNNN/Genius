# LogiMemory

Jogo da memória multiplayer para uma apresentação de ADM/Controle/Logística.

## Rodar no computador

1. Instale Node.js.
2. Abra o terminal nesta pasta.
3. Rode:
   npm install
   npm start
4. Abra http://localhost:3000

## Apresentação

No computador ligado à TV:
- abra `http://localhost:3000/?display=1&room=ADM`
- a tela mostra o jogo, ranking e QR Code.

Nos celulares:
- escaneie o QR Code
- coloque o nome
- entre na sala ADM

## Importante

Esta primeira versão é um protótipo funcional. O ranking e as salas ficam na memória do servidor e são apagados quando o servidor reinicia.

Para publicar na internet, pode-se usar Render, Railway ou outro host que aceite Node.js. Depois de publicado, o QR Code passa a usar automaticamente o endereço público.
