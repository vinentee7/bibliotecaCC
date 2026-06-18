const API = '/api';

const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');
if (!usuario || usuario.perfil !== 'bibliotecario') {
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

async function carregarLivros() {
    const resp = await fetch(`${API}/livros`);
    const livros = await resp.json();
    const tbody = document.getElementById('tabela-livros');

    if (livros.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="vazio">Nenhum livro cadastrado.</td></tr>';
        return;
    }

    tbody.innerHTML = livros.map(l => `
    <tr>
        <td>${l.id}</td>

        <td>
            <div style="display:flex;align-items:center;gap:10px;">
                <img
                    src="${l.capa || 'https://via.placeholder.com/50x70?text=Livro'}"
                    alt="${esc(l.titulo)}"
                    style="
                        width:50px;
                        height:70px;
                        object-fit:cover;
                        border-radius:6px;
                        border:1px solid #ddd;
                    "
                >

                <span>${esc(l.titulo)}</span>
            </div>
        </td>

        <td>${esc(l.autor)}</td>
        <td>${l.ano_publicacao ?? '-'}</td>
        <td>${l.quantidade_disponivel}</td>

        <td>
            <button class="btn-acao btn-editar"
                onclick='editarLivro(${JSON.stringify(l)})'>
                Editar
            </button>

            <button class="btn-acao btn-excluir"
                onclick="excluirLivro(${l.id})">
                Excluir
            </button>
        </td>
    </tr>
`).join('');
}

document.getElementById('form-livro').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('livro-id').value;
    const dados = {
        titulo: document.getElementById('livro-titulo').value.trim(),
        autor: document.getElementById('livro-autor').value.trim(),
        ano_publicacao: document.getElementById('livro-ano').value || null,
        quantidade_disponivel: Number(document.getElementById('livro-quantidade').value),
        capa: document.getElementById('livro-capa').value.trim()
    };

    const url = id ? `${API}/livros/${id}` : `${API}/livros`;
    const metodo = id ? 'PUT' : 'POST';

    const resp = await fetch(url, { method: metodo, headers: authHeaders(), body: JSON.stringify(dados) });
    const json = await resp.json();

    if (!resp.ok) {
        mostrarMensagem(json.erro || 'Erro ao salvar livro.');
        return;
    }
    mostrarMensagem(json.mensagem, 'sucesso');
    cancelarEdicao();
    carregarLivros();
});

function editarLivro(livro) {
    document.getElementById('livro-id').value = livro.id;
    document.getElementById('livro-titulo').value = livro.titulo;
    document.getElementById('livro-autor').value = livro.autor;
    document.getElementById('livro-ano').value = livro.ano_publicacao ?? '';
    document.getElementById('livro-quantidade').value = livro.quantidade_disponivel;
    document.getElementById('livro-capa').value = livro.capa || '';
    document.getElementById('titulo-form').textContent = `Editando livro #${livro.id}`;
    document.getElementById('btn-cancelar').classList.remove('escondido');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const preview = document.getElementById('preview-capa');
    if (livro.capa) {
        preview.src = livro.capa;
        preview.style.display = 'block';
    }
}

function cancelarEdicao() {
    document.getElementById('form-livro').reset();
    document.getElementById('livro-id').value = '';
    document.getElementById('titulo-form').textContent = 'Cadastrar novo livro';
    document.getElementById('btn-cancelar').classList.add('escondido');
    document.getElementById('preview-capa').style.display = 'none';
}

async function excluirLivro(id) {
    if (!confirm('Tem certeza que deseja remover este livro?')) return;
    const resp = await fetch(`${API}/livros/${id}`, { method: 'DELETE', headers: authHeaders() });
    const json = await resp.json();
    if (!resp.ok) {
        mostrarMensagem(json.erro || 'Erro ao excluir.');
        return;
    }
    mostrarMensagem(json.mensagem, 'sucesso');
    carregarLivros();
}

async function carregarEmprestimos() {
    const resp = await fetch(`${API}/emprestimos`);
    const lista = await resp.json();
    const tbody = document.getElementById('tabela-emprestimos');

    if (lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="vazio">Nenhum empréstimo registrado.</td></tr>';
        return;
    }

    tbody.innerHTML = lista.map(e => {
        const solicitou = e.data_devolucao_real && e.status !== 'devolvido';
        const podeAprovar = solicitou;
        const statusText = solicitou ? 'aguardando aprovação' : e.status;
        const statusClass = solicitou ? 'pendente' : e.status;

        return `
        <tr>
            <td>${e.id}</td>
            <td>${esc(e.leitor_nome)}</td>
            <td>${esc(e.livro_titulo)}</td>
            <td>${formatarData(e.data_emprestimo)}</td>
            <td>${formatarData(e.data_devolucao_prevista)}</td>
            <td><span class="badge ${statusClass}">${statusText}</span></td>
            <td>
                ${podeAprovar ? `<button class="btn-acao btn-ok" onclick="aprovarDevolucao(${e.id})">Aprovar devolução</button>` : ''}
                <button class="btn-acao btn-excluir" onclick="excluirEmprestimo(${e.id})">Excluir</button>
            </td>
        </tr>`;
    }).join('');
}

async function aprovarDevolucao(id) {
    const resp = await fetch(`${API}/emprestimos/${id}/devolver`, { method: 'PUT', headers: authHeaders() });
    const json = await resp.json();
    if (!resp.ok) {
        mostrarMensagem(json.erro || 'Erro ao aprovar devolução.');
        return;
    }
    mostrarMensagem(json.mensagem, 'sucesso');
    carregarLivros();
    carregarEmprestimos();
}

async function excluirEmprestimo(id) {
    if (!confirm('Remover este empréstimo do registro?')) return;
    const resp = await fetch(`${API}/emprestimos/${id}`, { method: 'DELETE', headers: authHeaders() });
    const json = await resp.json();
    if (!resp.ok) {
        mostrarMensagem(json.erro || 'Erro ao remover.');
        return;
    }
    mostrarMensagem(json.mensagem, 'sucesso');
    carregarLivros();
    carregarEmprestimos();
}
const campoCapa = document.getElementById('livro-capa');

if (campoCapa) {
    campoCapa.addEventListener('input', () => {
        const preview = document.getElementById('preview-capa');

        if (campoCapa.value.trim()) {
            preview.src = campoCapa.value;
            preview.style.display = 'block';
        } else {
            preview.style.display = 'none';
        }
    });
}

document.getElementById('nome-usuario').textContent = `Olá, ${usuario.nome}`;
carregarLivros();
carregarEmprestimos();