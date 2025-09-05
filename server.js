// server.js
// Servidor Express para upload/list/delete com Vercel Blob SDK

const express = require('express');
const { put, list, del } = require('@vercel/blob');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();

// Middlewares para parsear JSON e form-urlencoded (FormData com enctype application/x-www-form-urlencoded)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve arquivos estáticos (coloque index.html em public/)
app.use(express.static(path.join(__dirname, 'public')));

// ---- Upload ----
app.post('/api/upload', async (req, res) => {
  const filename = req.headers['x-vercel-filename'];
  if (!filename) {
    return res.status(400).json({ message: 'O nome do arquivo é obrigatório no cabeçalho x-vercel-filename.' });
  }

  try {
    // req é o stream do body; put aceita (name, body, options)
    const blob = await put(filename, req, {
      access: 'public',
      // se quiser, passe token aqui: token: process.env.BLOB_READ_WRITE_TOKEN
    });
    return res.status(200).json(blob);
  } catch (error) {
    console.error('Erro no upload:', error);
    return res.status(500).json({ message: 'Erro ao fazer upload do arquivo.', error: error.message });
  }
});

// ---- Listagem de arquivos ----
app.get('/api/files', async (req, res) => {
  try {
    const { blobs } = await list();
    return res.status(200).json(blobs);
  } catch (error) {
    console.error('Erro ao listar arquivos:', error);
    return res.status(500).json({ message: 'Erro ao buscar a lista de arquivos.', error: error.message });
  }
});

// ---- Delete: aceita POST JSON, POST form-data ou DELETE com query param ----
app.post('/api/delete', async (req, res) => {
  const pathname = req.body.pathname;
  const url = req.body.url;

  if (!pathname && !url) {
    return res.status(400).json({ message: 'Informe pathname ou url' });
  }

  const target = url || pathname;

  try {
    const result = await del(target, {
      token: process.env.BLOB_READ_WRITE_TOKEN
    });
    return res.json({ success: true, result });
  } catch (error) {
    console.error('Erro ao deletar:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});


app.delete('/api/delete', async (req, res) => {
  // DELETE /api/delete?pathname=...
  const pathname = req.query.pathname || req.query.path || req.query.url;
  if (!pathname) return res.status(400).json({ message: 'Query "pathname" obrigatória.' });

  try {
    const delResult = await del(pathname, { token: process.env.BLOB_READ_WRITE_TOKEN });
    return res.status(200).json({ message: 'Excluído com sucesso', result: delResult });
  } catch (error) {
    console.error('Erro ao deletar (DELETE):', error);
    if (error?.message?.includes('No token') || error?.message?.includes('token')) {
      return res.status(500).json({
        message: 'Erro ao excluir. Verifique se a variável de ambiente BLOB_READ_WRITE_TOKEN está configurada com permissões de escrita.',
        error: error.message
      });
    }
    return res.status(500).json({ message: 'Erro ao excluir o arquivo.', error: error.message });
  }
});

// Inicializa servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
