#!/bin/sh
set -e

echo "Aguardando banco de dados..."
node dist/migrate.js

echo "Iniciando servidor..."
exec node dist/server.js
