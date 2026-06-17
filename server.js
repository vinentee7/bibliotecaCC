const express = require('express');
const path = require('path');

const app = express();
const port = 3000;

app.use(express.json());                               
app.use(express.static(path.join(__dirname, 'public'))); 

const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

app.listen(port, () => {
    console.log(`Servidor da Biblioteca rodando em http://localhost:${port}`);
});
