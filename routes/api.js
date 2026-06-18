const express = require('express');
const router = express.Router();
const db = require('../db');

function requirePerfil(perfilNecessario) {
    return (req, res, next) => {
        const perfil = req.header('x-perfil');
        if (perfil !== perfilNecessario) {
            return res.status(403).json({
                erro: `Acesso negado. Apenas usuários com perfil "${perfilNecessario}" podem realizar esta ação.`
            });
        }
        next();
    };
}

async function atualizarAtrasados() {
    await db.query(
        `UPDATE emprestimos
            SET status = 'atrasado'
          WHERE status = 'ativo'
            AND data_devolucao_real IS NULL
            AND data_devolucao_prevista < CURDATE()`
    );
}

router.post('/register', async (req, res) => {
    try {
        const { nome, email, senha, perfil } = req.body;

        if (!nome || !email || !senha || !perfil) {
            return res.status(400).json({ erro: 'Preencha nome, email, senha e perfil.' });
        }
        if (perfil !== 'bibliotecario' && perfil !== 'leitor') {
            return res.status(400).json({ erro: 'Perfil deve ser "bibliotecario" ou "leitor".' });
        }

        const [resultado] = await db.query(
            'INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)',
            [nome, email, senha, perfil]
        );

        res.status(201).json({
            mensagem: 'Usuário registrado com sucesso!',
            id: resultado.insertId
        });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ erro: 'Já existe um usuário com este email.' });
        }
        console.error(err);
        res.status(500).json({ erro: 'Erro ao registrar usuário.' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({ erro: 'Informe email e senha.' });
        }

        const [linhas] = await db.query(
            'SELECT id, nome, email, perfil FROM usuarios WHERE email = ? AND senha = ?',
            [email, senha]
        );

        if (linhas.length === 0) {
            return res.status(401).json({ erro: 'Email ou senha inválidos.' });
        }

        res.json({ mensagem: 'Login realizado com sucesso!', usuario: linhas[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao realizar login.' });
    }
});

router.get('/livros', async (req, res) => {
    try {
        const [livros] = await db.query('SELECT * FROM livros ORDER BY id');
        res.json(livros);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao listar livros.' });
    }
});

router.get('/livros/:id', async (req, res) => {
    try {
        const [livros] = await db.query('SELECT * FROM livros WHERE id = ?', [req.params.id]);
        if (livros.length === 0) {
            return res.status(404).json({ erro: 'Livro não encontrado.' });
        }
        res.json(livros[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao buscar livro.' });
    }
});

router.post('/livros', requirePerfil('bibliotecario'), async (req, res) => {
    try {
        const { titulo, autor, ano_publicacao, quantidade_disponivel, capa } = req.body;

        if (!titulo || !autor || quantidade_disponivel == null) {
            return res.status(400).json({ erro: 'Título, autor e quantidade são obrigatórios.' });
        }

        const [resultado] = await db.query(
            'INSERT INTO livros (titulo, autor, ano_publicacao, quantidade_disponivel, capa) VALUES (?, ?, ?, ?, ?)',
            [titulo, autor, ano_publicacao || null, quantidade_disponivel, capa]
        );

        res.status(201).json({ mensagem: 'Livro cadastrado com sucesso!', id: resultado.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao cadastrar livro.' });
    }
});

router.put('/livros/:id', requirePerfil('bibliotecario'), async (req, res) => {
    try {
        const { titulo, autor, ano_publicacao, quantidade_disponivel, capa } = req.body;

        if (!titulo || !autor || quantidade_disponivel == null) {
            return res.status(400).json({ erro: 'Título, autor e quantidade são obrigatórios.' });
        }

        const [resultado] = await db.query(
            `UPDATE livros
                SET titulo = ?, autor = ?, ano_publicacao = ?, quantidade_disponivel = ?, capa = ?
              WHERE id = ?`,
            [titulo, autor, ano_publicacao || null, quantidade_disponivel, capa , req.params.id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ erro: 'Livro não encontrado.' });
        }
        res.json({ mensagem: 'Livro atualizado com sucesso!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao atualizar livro.' });
    }
});

router.delete('/livros/:id', requirePerfil('bibliotecario'), async (req, res) => {
    try {
        const [resultado] = await db.query('DELETE FROM livros WHERE id = ?', [req.params.id]);
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ erro: 'Livro não encontrado.' });
        }
        res.json({ mensagem: 'Livro removido com sucesso!' });
    } catch (err) {
        if (err.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({ erro: 'Não é possível remover: o livro possui empréstimos registrados.' });
        }
        console.error(err);
        res.status(500).json({ erro: 'Erro ao remover livro.' });
    }
});

router.get('/emprestimos', async (req, res) => {
    try {
        await atualizarAtrasados();

        const { leitor_id } = req.query;
        let sql = `
            SELECT e.id, e.livro_id, e.leitor_id,
                   l.titulo AS livro_titulo, l.autor AS livro_autor,
                   u.nome   AS leitor_nome,
                   e.data_emprestimo, e.data_devolucao_prevista,
                   e.data_devolucao_real, e.status
              FROM emprestimos e
              JOIN livros   l ON l.id = e.livro_id
              JOIN usuarios u ON u.id = e.leitor_id`;
        const params = [];

        if (leitor_id) {
            sql += ' WHERE e.leitor_id = ?';
            params.push(leitor_id);
        }
        sql += ' ORDER BY e.id DESC';

        const [emprestimos] = await db.query(sql, params);
        res.json(emprestimos);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao listar empréstimos.' });
    }
});

router.post('/emprestimos', requirePerfil('leitor'), async (req, res) => {
    try {
        const { livro_id } = req.body;
        const leitor_id = req.header('x-user-id');
        const dias = Number(req.body.dias) || 7; 

        if (!livro_id || !leitor_id) {
            return res.status(400).json({ erro: 'Informe o livro e o leitor.' });
        }

        const [livros] = await db.query('SELECT * FROM livros WHERE id = ?', [livro_id]);
        if (livros.length === 0) {
            return res.status(404).json({ erro: 'Livro não encontrado.' });
        }
        if (livros[0].quantidade_disponivel <= 0) {
            return res.status(400).json({ erro: 'Livro sem exemplares disponíveis.' });
        }

        await db.query(
            'UPDATE livros SET quantidade_disponivel = quantidade_disponivel - 1 WHERE id = ?',
            [livro_id]
        );

        const [resultado] = await db.query(
            `INSERT INTO emprestimos
                (livro_id, leitor_id, data_emprestimo, data_devolucao_prevista, status)
             VALUES (?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL ? DAY), 'ativo')`,
            [livro_id, leitor_id, dias]
        );

        res.status(201).json({ mensagem: 'Empréstimo realizado com sucesso!', id: resultado.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao criar empréstimo.' });
    }
});

router.put('/emprestimos/:id/solicitar-devolucao', requirePerfil('leitor'), async (req, res) => {
    try {
        const [emprestimos] = await db.query('SELECT * FROM emprestimos WHERE id = ?', [req.params.id]);
        if (emprestimos.length === 0) {
            return res.status(404).json({ erro: 'Empréstimo não encontrado.' });
        }
        if (emprestimos[0].status === 'devolvido') {
            return res.status(400).json({ erro: 'Este empréstimo já foi devolvido.' });
        }

        await db.query(
            'UPDATE emprestimos SET data_devolucao_real = CURDATE() WHERE id = ?',
            [req.params.id]
        );
        res.json({ mensagem: 'Devolução solicitada. Aguardando aprovação do bibliotecário.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao solicitar devolução.' });
    }
});

router.put('/emprestimos/:id/devolver', requirePerfil('bibliotecario'), async (req, res) => {
    try {
        const [emprestimos] = await db.query('SELECT * FROM emprestimos WHERE id = ?', [req.params.id]);
        if (emprestimos.length === 0) {
            return res.status(404).json({ erro: 'Empréstimo não encontrado.' });
        }
        if (emprestimos[0].status === 'devolvido') {
            return res.status(400).json({ erro: 'Este empréstimo já foi devolvido.' });
        }
        if (!emprestimos[0].data_devolucao_real) {
            return res.status(400).json({ erro: 'Devolução ainda não foi solicitada.' });
        }

        await db.query(
            'UPDATE livros SET quantidade_disponivel = quantidade_disponivel + 1 WHERE id = ?',
            [emprestimos[0].livro_id]
        );

        await db.query(
            `UPDATE emprestimos
                SET status = 'devolvido',
                    data_devolucao_real = COALESCE(data_devolucao_real, CURDATE())
              WHERE id = ?`,
            [req.params.id]
        );

        res.json({ mensagem: 'Devolução aprovada e estoque atualizado!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao aprovar devolução.' });
    }
});

router.delete('/emprestimos/:id', requirePerfil('bibliotecario'), async (req, res) => {
    try {
        const [emprestimos] = await db.query('SELECT * FROM emprestimos WHERE id = ?', [req.params.id]);
        if (emprestimos.length === 0) {
            return res.status(404).json({ erro: 'Empréstimo não encontrado.' });
        }

        if (emprestimos[0].status !== 'devolvido') {
            await db.query(
                'UPDATE livros SET quantidade_disponivel = quantidade_disponivel + 1 WHERE id = ?',
                [emprestimos[0].livro_id]
            );
        }

        await db.query('DELETE FROM emprestimos WHERE id = ?', [req.params.id]);
        res.json({ mensagem: 'Empréstimo removido com sucesso!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao remover empréstimo.' });
    }
});

module.exports = router;
