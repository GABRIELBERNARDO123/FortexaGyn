# Fit Pro — checklist de validação e deploy do backend

Atualizado em 2026-10-11. Este documento registra o que foi validado localmente e prepara um deploy controlado. **Nenhum código foi publicado, nenhuma migration foi executada no banco persistente da aplicação durante esta etapa e nenhuma VPS/domínio real foi acessada.** Não execute produção sem aprovação, backup restaurável, secrets configurados e janela de mudança.

## Ambiente e dependências

- Python da imagem: 3.11, base fixada por digest no `Dockerfile`.
- API: FastAPI + SQLAlchemy; PostgreSQL 16; migrations Alembic.
- `cryptography==50.0.2` consta em `requirements.txt` e `requirements.lock`. A build reproduzível instalou e importou essa versão com Python 3.11. Nenhuma instalação manual no container em execução é necessária.
- `requirements.lock` fixa versões resolvidas de runtime. `requirements-test.lock` fixa o ambiente completo de teste, incluindo pytest e transitivas, somente na imagem `test`; `requirements-test.txt` documenta as dependências diretas de teste.
- `.dockerignore` impede copiar `.env`, Git, backups SQL/dumps, caches e frontend. A imagem `runtime` copia somente app, migrations e config; não contém `tests/` nem `.env`.
- Configure os valores obrigatórios no ambiente do serviço/secret manager: `ENV=production`, `DEBUG=false`, `DEV_MODE=false`, `SECRET_KEY` aleatória de pelo menos 32 caracteres, `PII_ENCRYPTION_KEY` e `PII_LOOKUP_KEY` independentes (Base64 de 32 bytes), `SESSION_COOKIE_SECURE=true`, `SESSION_COOKIE_SAMESITE=lax` ou `strict`, `CORS_ORIGINS` com origens HTTPS exatas, credenciais do PostgreSQL e `TRUSTED_PROXY_IPS` somente com proxies confiáveis. Não coloque secrets em argumentos de build, Git ou imagem.

## Build local reproduzível e smoke check

No diretório `saas-backend`:

```sh
docker build --target runtime -t fitpro-backend:local .
docker run --rm --entrypoint python \
  -e POSTGRES_USER=fitpro_test -e POSTGRES_PASSWORD=temporary-only \
  -e POSTGRES_DB=fitpro_test \
  -e SECRET_KEY=temporary-validation-secret-at-least-32-bytes \
  fitpro-backend:local -c 'import cryptography; from app.main import app; print(cryptography.__version__, app.title)'
docker run --rm --entrypoint python fitpro-backend:local -m pip check
docker compose config -q
```

Use credenciais exclusivamente descartáveis no smoke check. A imagem de validação construída nesta auditoria importou a aplicação, importou `cryptography 50.0.2`, passou `pip check` e excluiu `.env`/testes. O container da API que já estava em execução não foi substituído nem reiniciado; use a imagem validada em um deploy aprovado para ativar as mudanças.

## Testes e migrations em PostgreSQL descartável

`docker-compose.test.yml` declara projeto `fitpro-validation` próprio e usa `tmpfs` para `/var/lib/postgresql/data`; não remova nem reutilize volumes do Compose de aplicação. Gere credenciais descartáveis somente na shell de teste e remova os containers depois:

```sh
export FITPRO_TEST_DB_PASSWORD="$(python -c 'import secrets; print(secrets.token_urlsafe(32))')"
export FITPRO_TEST_APP_PASSWORD="$(python -c 'import secrets; print(secrets.token_urlsafe(32))')"
docker compose -f docker-compose.test.yml -p fitpro-validation down
docker compose -f docker-compose.test.yml -p fitpro-validation up --build --abort-on-container-failure --exit-code-from tests
docker compose -f docker-compose.test.yml -p fitpro-validation down
unset FITPRO_TEST_DB_PASSWORD FITPRO_TEST_APP_PASSWORD
```

O `down` acima remove apenas os containers e a rede daquele projeto de validação; **não use `-v`** e não rode estes comandos sem `-f docker-compose.test.yml -p fitpro-validation`. A imagem de teste cria o banco vazio, aplica migrations até `20261010_02`, insere registros sintéticos no esquema legado, migra até `head`, valida ciphertext/descriptografia e roda pytest como `fitpro_app`. `fitpro_app` é `NOSUPERUSER`, `NOBYPASSRLS`, `NOCREATEDB`, `NOCREATEROLE`, não é proprietário das tabelas e não tem privilégio de leitura em `licenses`.

Resultado local em 2026-10-11: `alembic heads` mostrou apenas `20261011_02 (head)`; `alembic history` mostrou cadeia linear da revisão base `0001` até `20261011_02`; migration desde vazio, upgrade a partir de esquema pré-criptografia com dados sintéticos, verificação dos campos cifrados e **32 testes passaram** no papel restrito. Os testes cobrem autenticação/sessão, papéis, criação concorrente, tentativas BOLA entre dois tenants e RLS. O log PostgreSQL contém erros de policy/constraint esperados pelos testes negativos. Permaneceram dois avisos de depreciação em dependências Starlette/AnyIO.

O RLS está habilitado e `FORCE` em `tenants`, `users`, `sessions`, `email_verifications`, tabelas de negócio tenant-owned, tabelas filhas e `audit_logs`, com policies testadas para SELECT/INSERT/UPDATE/DELETE. O estado foi testado com queries diretas e requests HTTP para A↔B, IDs trocados, ausência de contexto, inserção em tenant estrangeiro, conexão transacionada/commit e verificação de flags da role. As conexões do app aplicam o tenant confiável da sessão por transação; `SET LOCAL` não persiste após commit.

Limite: o contexto atual usa GUCs PostgreSQL configuráveis pela própria role. Isso protege consultas da aplicação contra predicados esquecidos e reduz exposição acidental, mas **não** impede alguém que já possui credenciais SQL do papel da aplicação de definir manualmente outro `app.tenant_id`. O segredo do banco deve permanecer privado e prepared statements/autorização HTTP continuam essenciais. Para isolamento contra comprometimento das credenciais SQL, planeje credenciais/roles por tenant ou contexto assinado validado dentro do banco.

`users` possui policy específica para o lookup de login por e-mail exato, usuário da sessão e tenant ativo. `licenses` é legado/global: não há rota ativa para ativação e a função de serviço não pode funcionar com a role runtime atual, pois o papel não tem acesso direto à tabela. Mantenha-a assim até reimplementar provisioning com uma operação privilegiada isolada e auditada; não conceda SELECT/UPDATE amplo à API.

## Backup, migration de produção e rollback

Antes de qualquer alteração em VPS:

1. Identifique banco, versão, volume, responsável e janela. Confirme que a conexão aponta para staging/produção conforme planejado sem imprimir credenciais.
2. Gere o dump PostgreSQL custom e cifre imediatamente com uma chave pública de backup, nunca com a chave da aplicação:

   ```sh
   set -euo pipefail
   stamp=$(date -u +%Y%m%dT%H%M%SZ)
   docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB"' \
     | age -r "$BACKUP_AGE_RECIPIENT" > "/secure/backups/fitpro-${stamp}.dump.age"
   test -s "/secure/backups/fitpro-${stamp}.dump.age"
   cd /secure/backups
   sha256sum "fitpro-${stamp}.dump.age" > "fitpro-${stamp}.dump.age.sha256"
   aws s3 cp "/secure/backups/fitpro-${stamp}.dump.age" \
     "s3://BUCKET-PRIVADO/fitpro/${stamp}.dump.age" --sse AES256
   aws s3 cp "/secure/backups/fitpro-${stamp}.dump.age.sha256" \
     "s3://BUCKET-PRIVADO/fitpro/${stamp}.dump.age.sha256" --sse AES256
   ```

   Use bucket privado/versionado e identidade IAM somente de escrita no prefixo. Proteja `.env` do job e os arquivos em `/secure/backups`; monitore saída e espaço disponível.
3. Baixe em máquina isolada; verifique checksum e formato, descriptografe com a identidade mantida fora da VPS e valide o archive sem restaurar sobre produção:

   ```sh
   aws s3 cp "s3://BUCKET-PRIVADO/fitpro/${stamp}.dump.age" \
     "/secure/restore/fitpro-${stamp}.dump.age"
   aws s3 cp "s3://BUCKET-PRIVADO/fitpro/${stamp}.dump.age.sha256" \
     "/secure/restore/fitpro-${stamp}.dump.age.sha256"
   cd /secure/restore
   sha256sum -c "fitpro-${stamp}.dump.age.sha256"
   age -d -i /secure/keys/backup-restore.age \
     "/secure/restore/fitpro-${stamp}.dump.age" | pg_restore --list
   ```

   Em seguida restaure em PostgreSQL descartável, confira contagens/constraints e teste aplicação. Um arquivo criado sem restauração isolada não é backup validado.
4. Em staging restaurado, configure as mesmas chaves AES-GCM independentes no ambiente de migration e runtime. Teste `alembic upgrade head`, dados cifrados, políticas RLS, APIs e login com papel runtime restrito.
5. Faça inventário/contagem de telefones duplicados por tenant. A migration `20261011_01` interrompe se encontrar colisões depois de normalizar espaços; resolva-as no fluxo aprovado antes de nova tentativa.
6. Depois de aprovação explícita, faça migration por identidade separada na rede privada do banco, usando arquivo de ambiente fora da imagem/Git:

   ```sh
   docker run --rm --network fitpro-private \
     --env-file /secure/fitpro-migration.env \
     fitpro-backend:<tag-aprovada> alembic upgrade head
   docker run --rm --network fitpro-private \
     --env-file /secure/fitpro-migration.env \
     fitpro-backend:<tag-aprovada> alembic current
   ```

   `fitpro-private`, tag, variáveis e secrets são placeholders que precisam ser substituídos após inspecionar a VPS. Confirme head único, schema, grants e smoke/integridade. Coordene publicação do runtime compatível após a migration.
7. Rollback preferencial é reimplantar a imagem anterior após análise de compatibilidade. Não reverta schema automaticamente: o downgrade de criptografia recoloca plaintext no banco. Restauração do dump só após decisão explícita sobre perda dos writes posteriores ao backup e plano de reconciliação.

Não use `docker compose down -v`, `DROP DATABASE`, downgrade automático ou migration contra `.env` local como substituto de staging/backup.

## Checklist da VPS / domínio real (bloqueado por acesso externo)

- [ ] DNS A/AAAA aponta para IP correto; domínios frontend/backend e proxy Nginx confirmados.
- [ ] Certificado válido e renovação testada; redirect HTTP→HTTPS, TLS 1.2+, HSTS, CSP e cabeçalhos verificados externamente.
- [ ] Portas públicas limitadas a 22/80/443; PostgreSQL privado/localhost e porta API não exposta.
- [ ] Nginx encaminha ao serviço correto e sobrescreve cabeçalhos de proxy; CORS usa origens HTTPS reais e exatas.
- [ ] Sessão HttpOnly/Secure/SameSite persistente, regenerada no login, logout revogado; rotas protegidas retornam 401/403 corretamente.
- [ ] Fail2ban/SSH por chave, `unattended-upgrades`, logs com rotação e sem senha/token/PII; rate limit compartilhado para múltiplos workers.
- [ ] Backup cifrado fora da VPS e teste de restauração registrado.
- [ ] Scanner de secrets aprovado executado no Git history e árvores de trabalho; `.env` conferido localmente sem expor valores.
- [ ] Papel PostgreSQL real verificado: sem `SUPERUSER`, `BYPASSRLS`, ownership, `CREATE` ou `DROP`; RLS ativo/forçado no banco alvo.
- [ ] Login/logout e isolamento A↔B testados no domínio real e navegador após aprovação do deploy.

Necessários para concluir: acesso autorizado à VPS/Hostinger, domínio(s) reais, certificado/proxy e método seguro de acesso a configuração; usuário de staging e credenciais de teste via secret manager; política aprovada de backup, janela de migration e pessoa autorizadora. Nenhum destes itens foi simulado nesta execução.
