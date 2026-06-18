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
        'Authorization': `Bearer ${usuario.token}`,
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
    const resp = await fetch(`${API}/livros`, { headers: authHeaders() });
    const livros = await resp.json();

    const catalogo = document.getElementById('catalogo-livros');
    const totalEl = document.getElementById('total-livros');

    if (!livros.length) {
        catalogo.innerHTML = `<div class="vazio">Nenhum livro disponível no momento.</div>`;
        if (totalEl) totalEl.textContent = '0 livros';
        return;
    }

    if (totalEl) {
        totalEl.textContent = `${livros.length} ${livros.length === 1 ? 'livro' : 'livros'}`;
    }

    catalogo.innerHTML = livros.map(l => {
        const disponivel = l.quantidade_disponivel > 0;
        const capaUrl = l.capa || `https://via.placeholder.com/300x450/e4e7ec/9aa0ac?text=${encodeURIComponent(l.titulo)}`;

        return `
        <div class="livro-card">
            <div class="capa-wrapper">
                <img
                    class="livro-capa"
                    src="${capaUrl}"
                    alt="Capa de ${esc(l.titulo)}"
                    loading="lazy"
                >
                <span class="capa-badge ${disponivel ? 'disponivel' : 'indisponivel'}">
                    ${disponivel ? `${l.quantidade_disponivel} disp.` : 'Indisponível'}
                </span>
            </div>

            <div class="livro-info">
                <h3>${esc(l.titulo)}</h3>
                <p class="autor">${esc(l.autor)}</p>
                <p class="ano">${l.ano_publicacao || '-'}</p>
                <p class="estoque ${disponivel ? '' : 'zero'}">
                    ${disponivel ? `${l.quantidade_disponivel} disponível(is)` : 'Sem estoque'}
                </p>
                <button
                    class="btn-emprestar"
                    onclick="solicitarEmprestimo(${l.id})"
                    ${disponivel ? '' : 'disabled'}
                    aria-label="${disponivel ? `Solicitar empréstimo de ${esc(l.titulo)}` : 'Livro indisponível'}"
                >
                    ${disponivel ? 'Solicitar empréstimo' : 'Indisponível'}
                </button>
            </div>
        </div>
        `;
    }).join('');

    configurarBusca();
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
    const resp = await fetch(`${API}/emprestimos?leitor_id=${usuario.id}`, { headers: authHeaders() });
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
            acao = '<small style="color:#9aa0ac">Devolvido</small>';
        } else if (aguardando) {
            acao = '<small style="color:#9aa0ac">Aguardando aprovação</small>';
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

// ============================================================
// Busca
// ============================================================
function configurarBusca() {
    const campo = document.getElementById('busca-livro');
    if (!campo) return;

    campo.addEventListener('input', () => {
        const termo = campo.value.toLowerCase().trim();
        let visiveis = 0;

        document.querySelectorAll('.livro-card').forEach(card => {
            const titulo = card.querySelector('h3').textContent.toLowerCase();
            const autor  = card.querySelector('.autor').textContent.toLowerCase();
            const match  = titulo.includes(termo) || autor.includes(termo);

            card.style.display = match ? '' : 'none';
            if (match) visiveis++;
        });

        const totalEl = document.getElementById('total-livros');
        if (totalEl) {
            totalEl.textContent = `${visiveis} ${visiveis === 1 ? 'livro' : 'livros'}`;
        }
    });
}

// ============================================================
// Inicialização
// ============================================================
const primeiroNome = usuario.nome.split(' ')[0];
document.getElementById('nome-usuario').textContent = `Olá, ${primeiroNome}`;

// Gera iniciais para o avatar
const avatarEl = document.getElementById('avatar-iniciais');
if (avatarEl) {
    const partes = usuario.nome.trim().split(' ');
    const iniciais = partes.length >= 2
        ? partes[0][0] + partes[partes.length - 1][0]
        : partes[0].substring(0, 2);
    avatarEl.textContent = iniciais.toUpperCase();
}

carregarLivros();
carregarEmprestimos();
configurarBusca();