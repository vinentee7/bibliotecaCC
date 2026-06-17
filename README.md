# 📚 BibliotecaCC

Sistema de gerenciamento de empréstimos de livros (N2 - AT2 - Programação para Web).
Projeto desenvolvido para a Universidade Católica de Brasília.

Permite que usuários se cadastrem como **bibliotecário** ou **leitor**, com permissões diferentes:

- **Bibliotecário**: cadastra, edita e remove livros (CRUD), visualiza todos os empréstimos e aprova devoluções.
- **Leitor**: consulta o catálogo, solicita empréstimos e solicita devoluções.

## 🛠️ Stack

- **Backend:** Node.js + Express
- **Banco:** MySQL / MariaDB (via `mysql2`)
- **Frontend:** HTML, CSS e JavaScript puro

## 📁 Estrutura

```
bibliotecaCC/
├── db.js               # Conexão com o banco (pool mysql2)
├── server.js           # Servidor Express (serve o frontend + API)
├── package.json
├── routes/
│   └── api.js          # Todas as rotas da API (auth, livros, emprestimos)
├── public/             # Frontend
│   ├── index.html      # Login e Registro
│   ├── bibliotecario.html
│   ├── leitor.html
│   ├── style.css
│   ├── auth.js
│   ├── bibliotecario.js
│   └── leitor.js
└── docs/
    └── database.sql    # Script de criação do banco e tabelas
```

## 🚀 Como rodar

### 1. Banco de dados
Suba o MySQL/MariaDB local (ex.: XAMPP) e crie as tabelas:

```bash
mysql -u root -p < docs/database.sql
```

> Ou cole o conteúdo de `docs/database.sql` no **phpMyAdmin** / **MySQL Workbench**.
> O script cria o banco `bibliotecacc`, as 3 tabelas e dados de exemplo.

### 2. Ajustar credenciais (se necessário)
As credenciais ficam em [`db.js`](db.js). O padrão está configurado para o XAMPP
(usuário `root`, **sem senha**, porta `3306`). Altere se o seu ambiente for diferente.

### 3. Instalar e iniciar
```bash
npm install
npm start
```

Acesse: **http://localhost:3000**

## 👤 Usuários de exemplo (criados pelo `database.sql`)

| Perfil        | Email                | Senha  |
|---------------|----------------------|--------|
| Bibliotecário | ana@biblioteca.com   | 123456 |
| Leitor        | bruno@email.com      | 123456 |

## 🔌 Rotas da API

| Método | Rota                                      | Quem pode      | Descrição                          |
|--------|-------------------------------------------|----------------|------------------------------------|
| POST   | `/api/register`                           | todos          | Cadastra usuário                   |
| POST   | `/api/login`                              | todos          | Autentica                          |
| GET    | `/api/livros`                             | todos          | Lista livros                       |
| GET    | `/api/livros/:id`                         | todos          | Detalhe de um livro                |
| POST   | `/api/livros`                             | bibliotecário  | Cadastra livro                     |
| PUT    | `/api/livros/:id`                         | bibliotecário  | Atualiza livro                     |
| DELETE | `/api/livros/:id`                         | bibliotecário  | Remove livro                       |
| GET    | `/api/emprestimos`                        | todos          | Lista empréstimos (`?leitor_id=`)  |
| POST   | `/api/emprestimos`                        | leitor         | Cria empréstimo (baixa estoque)    |
| PUT    | `/api/emprestimos/:id/solicitar-devolucao`| leitor         | Solicita devolução                 |
| PUT    | `/api/emprestimos/:id/devolver`           | bibliotecário  | Aprova devolução (repõe estoque)   |
| DELETE | `/api/emprestimos/:id`                     | bibliotecário  | Cancela/remove empréstimo          |

> O controle de permissão é feito pelos cabeçalhos `x-perfil` e `x-user-id`,
> enviados automaticamente pelo frontend a partir do usuário logado.

## ⚙️ Regras de negócio implementadas

- Apenas **bibliotecário** adiciona/edita/remove livros.
- Apenas **leitor** solicita empréstimos.
- Empréstimo **diminui** o estoque na criação e **aumenta** na devolução.
- Status do empréstimo: `ativo` → `devolvido`; é marcado como `atrasado`
  automaticamente quando passa da data prevista sem devolução.

## 🤝 Compartilhar o banco com a equipe

Por enquanto o banco é **local**. Para compartilhar entre os membros, a forma mais
simples é cada um rodar o `docs/database.sql` na sua própria máquina (mesmo schema).
Quando quiserem um banco **único e online**, dá para migrar para um serviço gratuito
(ex.: [Railway](https://railway.app), [Aiven](https://aiven.io) ou
[db4free.net](https://db4free.net)) e apenas trocar `host`, `user`, `password` e
`database` no [`db.js`](db.js) — o restante do código continua igual.
