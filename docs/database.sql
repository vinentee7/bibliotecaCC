CREATE DATABASE IF NOT EXISTS bibliotecacc
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE bibliotecacc;

CREATE TABLE IF NOT EXISTS usuarios (
  id     INT AUTO_INCREMENT PRIMARY KEY,
  nome   VARCHAR(150) NOT NULL,
  email  VARCHAR(150) NOT NULL UNIQUE,
  senha  VARCHAR(255) NOT NULL,
  perfil ENUM('bibliotecario', 'leitor') NOT NULL
);

CREATE TABLE IF NOT EXISTS livros (
  id                     INT AUTO_INCREMENT PRIMARY KEY,
  titulo                 VARCHAR(200) NOT NULL,
  autor                  VARCHAR(150) NOT NULL,
  ano_publicacao         INT NULL,
  quantidade_disponivel  INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS emprestimos (
  id                       INT AUTO_INCREMENT PRIMARY KEY,
  livro_id                 INT NOT NULL,
  leitor_id                INT NOT NULL,
  data_emprestimo          DATE NOT NULL,
  data_devolucao_prevista  DATE NOT NULL,
  data_devolucao_real      DATE NULL,
  status                   ENUM('ativo', 'devolvido', 'atrasado') NOT NULL DEFAULT 'ativo',
  CONSTRAINT fk_emprestimo_livro
    FOREIGN KEY (livro_id)  REFERENCES livros(id),
  CONSTRAINT fk_emprestimo_leitor
    FOREIGN KEY (leitor_id) REFERENCES usuarios(id)
);

INSERT INTO usuarios (nome, email, senha, perfil) VALUES
  ('Ana Bibliotecária', 'ana@biblioteca.com', '123456', 'bibliotecario'),
  ('Bruno Leitor',      'bruno@email.com',    '123456', 'leitor')
ON DUPLICATE KEY UPDATE email = email;

INSERT INTO livros (titulo, autor, ano_publicacao, quantidade_disponivel) VALUES
  ('Dom Casmurro',            'Machado de Assis',   1899, 3),
  ('O Cortiço',               'Aluísio Azevedo',    1890, 2),
  ('Clean Code',              'Robert C. Martin',   2008, 5);
