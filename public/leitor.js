// ============================================================
// leitor.js - Painel do Leitor
// ============================================================

const API = '/api';

const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');
if (!usuario || usuario.perfil !== 'leitor') {
    window.location.href = 'index.html';
}

function authHeaders() {
    return {
        'Content-Type': 'application/json',
        'x-perfil': usuario.perfil,
        'x-user-id': usuario.id
    };
}

function sair() {
    localStorage.removeItem('usuario');
    window.location.href = 'index.html';
}

function mostrarMensagem(texto, tipo = 'erro') {
    const el = document.getElementById('mensagem');
    el.textContent = texto;
    el.className = 'mensagem ' + (texto ? tipo : '');
    if (texto) setTimeout(() => mostrarMensagem(''), 4000);
}

function esc(txt) {
    const d = document.createElement('div');
    d.textContent = txt ?? '';
    return d.innerHTML;
}

function formatarData(data) {
    if (!data) return '-';
    return new Date(data).toLocaleDateString('pt-BR');
}

// ============================================================
// Catálogo de livros
// ============================================================
async function carregarLivros() {
    const resp = await fetch(`${API}/livros`);
    const livros = await resp.json();
    const tbody = document.getElementById('tabela-livros');

    if (livros.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="vazio">Nenhum livro no acervo.</td></tr>';
        return;
    }

    tbody.innerHTML = livros.map(l => {
        const disponivel = l.quantidade_disponivel > 0;
        return `
        <tr>
            <td>${l.id}</td>
            <td>${esc(l.titulo)}</td>
            <td>${esc(l.autor)}</td>
            <td>${l.ano_publicacao ?? '-'}</td>
            <td>${l.quantidade_disponivel}</td>
            <td>
                <button class="btn-acao" onclick="solicitarEmprestimo(${l.id})" ${disponivel ? '' : 'disabled'}>
                    ${disponivel ? 'Solicitar empréstimo' : 'Indisponível'}
                </button>
            </td>
        </tr>`;
    }).join('');
}

async function solicitarEmprestimo(livroId) {
    const resp = await fetch(`${API}/emprestimos`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ livro_id: livroId })
    });
    const json = await resp.json();
    if (!resp.ok) {
        mostrarMensagem(json.erro || 'Erro ao solicitar empréstimo.');
        return;
    }
    mostrarMensagem(json.mensagem, 'sucesso');
    carregarLivros();
    carregarEmprestimos();
}

// ============================================================
// Meus empréstimos
// ============================================================
async function carregarEmprestimos() {
    const resp = await fetch(`${API}/emprestimos?leitor_id=${usuario.id}`);
    const lista = await resp.json();
    const tbody = document.getElementById('tabela-emprestimos');

    if (lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="vazio">Você ainda não fez empréstimos.</td></tr>';
        return;
    }

    tbody.innerHTML = lista.map(e => {
        const aguardando = e.data_devolucao_real && e.status !== 'devolvido';
        let acao = '';
        if (e.status === 'devolvido') {
            acao = '<small>Devolvido</small>';
        } else if (aguardando) {
            acao = '<small>Aguardando aprovação</small>';
        } else {
            acao = `<button class="btn-acao btn-ok" onclick="solicitarDevolucao(${e.id})">Solicitar devolução</button>`;
        }
        return `
        <tr>
            <td>${esc(e.livro_titulo)}</td>
            <td>${formatarData(e.data_emprestimo)}</td>
            <td>${formatarData(e.data_devolucao_prevista)}</td>
            <td><span class="badge ${e.status}">${e.status}</span></td>
            <td>${acao}</td>
        </tr>`;
    }).join('');
}

async function solicitarDevolucao(id) {
    const resp = await fetch(`${API}/emprestimos/${id}/solicitar-devolucao`, {
        method: 'PUT',
        headers: authHeaders()
    });
    const json = await resp.json();
    if (!resp.ok) {
        mostrarMensagem(json.erro || 'Erro ao solicitar devolução.');
        return;
    }
    mostrarMensagem(json.mensagem, 'sucesso');
    carregarEmprestimos();
}

// ---------- Inicialização ----------
document.getElementById('nome-usuario').textContent = `Olá, ${usuario.nome}`;
carregarLivros();
carregarEmprestimos();
