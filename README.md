# Central do Concurseiro

Site de vendas de apostilas para concursos. HTML, CSS e JavaScript puros, hospedado no Firebase Hosting.

## Estrutura

```
public/            site (é a pasta publicada)
  index.html
  css/style.css
  js/config.js     Pix, WhatsApp, planos e preços  <- edite aqui
  js/firebase.js   conexão com o Realtime Database (carrega só quando o cliente confirma o pedido)
  js/main.js       interações e animações
database.rules.json  regras do banco (clientes só conseguem criar pedidos)
firebase.json      configuração do Hosting
```

## Antes de publicar

1. Confira `public/js/config.js`: chave Pix, favorecido, WhatsApp e preços dos planos.
2. O banco é o Realtime Database do projeto (`central-do-concurso-default-rtdb`). As regras deste projeto substituem as que estão lá hoje.

## Testar localmente

```
npx serve public
```

## Publicar

Primeira vez (PowerShell, dentro da pasta do projeto):

```
npm i -g firebase-tools
firebase login
firebase deploy --only database
firebase deploy --only hosting
```

## GitHub

```
git init -b main
git add .
git commit -m "Site Central do Concurseiro"
git remote add origin https://github.com/SEU_USUARIO/NOME_DO_REPOSITORIO.git
git push -u origin main
```

## Deploy automático a cada push

Uma única vez:

```
firebase init hosting:github
```

Informe o repositório quando pedir. O comando cria os arquivos em `.github/workflows` e o secret no GitHub. Depois disso o fluxo é só:

```
git add .
git commit -m "sua mensagem"
git push
```

As regras do banco (`database.rules.json`) não sobem pelo GitHub. Quando mudar esse arquivo, rode `firebase deploy --only database`.

## Ver os pedidos

Console do Firebase > Realtime Database > nó `pedidos`. Cada pedido chega com status `aguardando`.
