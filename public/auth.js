const API = '/api';

function mostrarAba(aba) {
    const ehLogin = aba === 'login';
    document.getElementById('form-login').classList.toggle('escondido', !ehLogin);
    document.getElementById('form-registro').classList.toggle('escondido', ehLogin);
    document.getElementById('aba-login').classList.toggle('ativa', ehLogin);
    document.getElementById('aba-registro').classList.toggle('ativa', !ehLogin);
    mostrarMensagem('');
}

function mostrarMensagem(texto, tipo = 'erro') {
    const el = document.getElementById('mensagem');
    el.textContent = texto;
    el.className = 'mensagem ' + (texto ? tipo : '');
}

document.getElementById('form-registro').addEventListener('submit', async (e) => {
    e.preventDefault();
    const dados = {
        nome: document.getElementById('reg-nome').value.trim(),
        email: document.getElementById('reg-email').value.trim(),
        senha: document.getElementById('reg-senha').value,
        perfil: document.getElementById('reg-perfil').value
    };

    try {
        const resp = await fetch(`${API}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });
        const json = await resp.json();

        if (!resp.ok) {
            mostrarMensagem(json.erro || 'Erro ao cadastrar.');
            return;
        }
        mostrarMensagem('Conta criada! Agora é só entrar.', 'sucesso');
        e.target.reset();
        mostrarAba('login');
    } catch {
        mostrarMensagem('Não foi possível conectar ao servidor.');
    }
});

document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const dados = {
        email: document.getElementById('login-email').value.trim(),
        senha: document.getElementById('login-senha').value
    };

    try {
        const resp = await fetch(`${API}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });
        const json = await resp.json();

        if (!resp.ok) {
            mostrarMensagem(json.erro || 'Email ou senha inválidos.');
            return;
        }

        localStorage.setItem('usuario', JSON.stringify(json.usuario));

        if (json.usuario.perfil === 'bibliotecario') {
            window.location.href = 'bibliotecario.html';
        } else {
            window.location.href = 'leitor.html';
        }
    } catch {
        mostrarMensagem('Não foi possível conectar ao servidor.');
    }
});
