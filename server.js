const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;
const VALOR_POR_KM = 2.50; // Valor fixo por quilômetro rodado

// Configurações do Express
app.use(express.json());
app.use(express.static(path.join(__dirname))); // Serve os arquivos HTML/CSS da raiz

// Conexão com o Banco de Dados
const db = new sqlite3.Database('./siscristovao.db', (err) => {
    if (err) console.error('Erro ao conectar ao SQLite:', err.message);
    else console.log('Conectado ao banco de dados siscristovao.db com sucesso.');
});

// ==================== ROTAS DO SISTEMA ====================

// [NOVA] Rota para Cadastrar Novo Produtor (Cliente)
app.post('/api/produtores/cadastro', (req, res) => {
    const { nome, cpf, telefone } = req.body;
    
    const query = `INSERT INTO produtores (nome, cpf, telefone) VALUES (?, ?, ?)`;
    
    db.run(query, [nome, cpf, telefone], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                return res.status(400).json({ message: 'Este CPF já está cadastrado.' });
            }
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, produtor_id: this.lastID, message: 'Produtor cadastrado com sucesso!' });
    });
});

// 1. Rota de Autenticação / Busca do Produtor por CPF (CORRIGIDA)
app.post('/api/login', (req, res) => { // Alterado 'require' para 'res' aqui
    const { cpf } = req.body;
    db.get('SELECT * FROM produtores WHERE cpf = ?', [cpf], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ message: 'Produtor não encontrado com este CPF.' });
        res.json(row); // Retorna os dados do produtor logado (incluindo o id)
    });
});

// 2. Listar Serviços Disponíveis
app.get('/api/servicos', (req, res) => {
    db.all('SELECT * FROM servicos', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 3. Salvar Novo Agendamento com Orçamento de Distância
app.post('/api/agendamentos', (req, res) => {
    const { produtor_id, data_hora, agronomo_responsavel, distancia_km, total_servicos } = req.body;

    const custo_deslocamento = distancia_km * VALOR_POR_KM;
    const total_geral = total_servicos + custo_deslocamento;

    const query = `INSERT INTO agendamentos (produtor_id, data_hora, agronomo_responsavel, distancia_km, custo_deslocamento, total_geral) 
                   VALUES (?, ?, ?, ?, ?, ?)`;

    db.run(query, [produtor_id, data_hora, agronomo_responsavel, distancia_km, custo_deslocamento, total_geral], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, agendamentoId: this.lastID, custo_deslocamento, total_geral });
    });
});

// 4. Consultar Histórico de Agendamentos
app.get('/api/historico', (req, res) => {
    const query = `
        SELECT agendamentos.*, produtores.nome as produtor_nome 
        FROM agendamentos 
        JOIN produtores ON agendamentos.produtor_id = produtores.id
        ORDER BY agendamentos.data_hora DESC
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Inicialização do Servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando profissionalmente em: http://localhost:${PORT}`);
});
