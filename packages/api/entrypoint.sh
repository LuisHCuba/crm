#!/bin/sh
set -e

echo "Executando migrações..."
node dist/migrate.js

echo "Executando seed..."
node dist/seed-admin.js

echo "Iniciando servidor..."
exec node dist/server.js
