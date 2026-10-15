# Checklist de hardening da VPS Hostinger

Este arquivo é um modelo para revisão antes da publicação. **Não foi aplicado na VPS.** Substitua `app.exemplo.com`, nome de serviço e bucket pelos valores reais. Faça as mudanças de firewall/SSH somente com console Hostinger disponível e uma sessão SSH de contingência aberta.

## 1. Nginx e TLS

Em `/etc/nginx/nginx.conf`, dentro de `http {}`:

```nginx
server_tokens off;
```

Exemplo `/etc/nginx/sites-available/fitpro` para o Express em `127.0.0.1:3000`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name app.exemplo.com;

    location ^~ /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 301 https://$host$request_uri; }
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name app.exemplo.com;

    ssl_certificate /etc/letsencrypt/live/app.exemplo.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.exemplo.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_timeout 1d;
    ssl_session_cache shared:TLS:10m;
    ssl_session_tickets off;
    client_max_body_size 1m;
    access_log off;

    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    location ~* (^|/)\.(?!well-known/) { deny all; }
    location ~* \.(env|ini|log|sql|bak|old|orig|save|conf)$ { deny all; }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_hide_header Server;
        proxy_hide_header X-Powered-By;
        proxy_hide_header Strict-Transport-Security;
    }
}
```

Valide e recarregue: `sudo nginx -t && sudo systemctl reload nginx`. Instale Certbot pelo repositório oficial da distribuição e emita o certificado para o domínio real, por exemplo `sudo certbot --nginx -d app.exemplo.com`; verifique renovação com `sudo certbot renew --dry-run`. O HSTS no exemplo não usa `includeSubDomains` porque não foi confirmado que todos os subdomínios têm HTTPS.

## 2. Firewall e SSH

Confirme primeiro que a chave pública funciona em uma segunda sessão. Aplique as regras sem fechar a sessão atual:

```sh
sudo apt update
sudo apt install -y ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
```

Antes de desabilitar senha/root, crie `/etc/ssh/sshd_config.d/60-fitpro-hardening.conf`:

```text
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
AuthenticationMethods publickey
AllowTcpForwarding no
X11Forwarding no
```

Valide com `sudo sshd -t`, abra outra sessão com chave e só então `sudo systemctl reload ssh`. Trocar porta é opcional e não substitui chave/Firewall; se mudar, atualize UFW e firewall da Hostinger antes.

## 3. Serviços e privilégios

- Execute Express/FastAPI com usuários de sistema dedicados, sem shell interativo; bind das portas de aplicação em `127.0.0.1`. Não exponha `3000`, `8000` ou `5432` na Internet.
- Mantenha `.env` fora da raiz pública, proprietário do usuário do serviço, modo `0600`; configure `ENV=production`, `DEBUG=false`, `DEV_MODE=false`, `SESSION_COOKIE_SECURE=true`, `SESSION_COOKIE_SAMESITE=lax` ou `strict`, `CORS_ORIGINS=https://app.exemplo.com`, `TRUSTED_PROXY_IPS=127.0.0.1`, `SIGNUP_ENABLED=false` após provisionar os clientes e `SECRET_KEY` aleatória de pelo menos 32 caracteres. Gere valores fora do Git e guarde-os em um gestor de segredos. Nginx deve sobrescrever `X-Real-IP` com `$remote_addr`; somente inclua IPs de proxies controlados.
- Nginx termina TLS; o upstream Express deve aceitar tráfego somente local. Configure `BACKEND_URL` para endereço privado/local da API.
- PostgreSQL: `listen_addresses='localhost'` numa instalação nativa e regra `pg_hba.conf` local apenas. Em Docker, não publique a porta e mantenha API e DB numa rede interna.
- Separe proprietário/migrador do banco do usuário runtime da API. Para o usuário runtime existente, conceda apenas DML nas tabelas necessárias e uso de sequences; não conceda `SUPERUSER`, `CREATEDB`, `CREATEROLE`, `DROP` ou propriedade de tabelas. A role de migração deve ser usada só no deploy.
- PHP-FPM não existe nesta stack. Se outro serviço PHP estiver instalado na VPS, audite-o separadamente e não o use para executar este backend Python.

Exemplo de grants (ajuste nomes após revisar migrations e objetos reais):

```sql
ALTER ROLE fitpro_app NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
GRANT CONNECT ON DATABASE fitpro TO fitpro_app;
GRANT USAGE ON SCHEMA public TO fitpro_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO fitpro_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO fitpro_app;
```

Execute como role administrativa e configure default privileges da role de migração para conceder apenas DML em novas tabelas/sequences. Revise antes: `ALL TABLES` inclui tabelas de sessão/auditoria; limite o grant a cada objeto se a aplicação não precisar de algum deles.

## 4. Fail2ban e atualizações

```sh
sudo apt install -y fail2ban unattended-upgrades apt-listchanges
sudo dpkg-reconfigure -plow unattended-upgrades
sudo systemctl enable --now fail2ban
```

Ative o jail `sshd` em `/etc/fail2ban/jail.d/sshd.local` com `enabled=true`, `backend=systemd`, `maxretry=5`, `findtime=10m`, `bantime=1h`; confirme `sudo fail2ban-client status sshd`. **Pendente:** Fail2ban para login da aplicação exige gravar o IP de origem em logs; a regra de privacidade definida para este projeto proíbe dados pessoais em logs, e IP pode ser dado pessoal. O template mantém `access_log off` e usa rate limit em memória no backend. Só habilite jail de login após definir base, retenção curta, acesso e aprovação para registrar IP; não grave email, corpo, cookie ou token. Nunca confie em `X-Forwarded-For` recebido diretamente da Internet; Nginx deve sobrescrever `X-Real-IP` e a origem do upstream deve ser privada.

O rate limiter do código atual é por processo. Para múltiplos workers/instâncias, configure backend compartilhado Redis no serviço de rate limit; o Fail2ban é camada adicional, não substituto.

## 5. Backups criptografados e restauração

Instale `age` e AWS CLI (ou cliente do storage externo escolhido). Guarde somente a chave pública `BACKUP_AGE_RECIPIENT` no ambiente do job; mantenha a chave privada de restauração fora da VPS, em cofre separado.

Exemplo para PostgreSQL em Docker, executado pelo usuário de backup com credenciais do Compose e variáveis do bucket já carregadas por systemd:

```sh
set -o pipefail
stamp=$(date -u +%Y%m%dT%H%M%SZ)
docker compose -f /opt/fitpro/saas-backend/docker-compose.yml exec -T db \
  sh -c 'pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB"' \
  | age -r "$BACKUP_AGE_RECIPIENT" \
  | aws s3 cp - "s3://BUCKET-PRIVADO/fitpro/${stamp}.dump.age" --sse AES256
```

Use bucket privado com versionamento, política de retenção e credenciais IAM limitadas a gravar somente no prefixo de backup. Agende via systemd timer diário, monitore o código de saída e retenha cópias fora da conta/host. Pelo menos trimestralmente, baixe uma cópia, descriptografe numa máquina isolada e restaure em banco descartável; registre duração e valide contagem/consistência. Nunca teste restauração sobre produção.

## 6. Chaves, criptografia e migrations (preparadas; não aplicadas)

`migrations/versions/20261011_01_encrypt_sensitive_fields.py` cifra telefone, ficha médica e campos/medidas/notas de avaliação com AES-256-GCM. `20261011_02_tenant_row_level_security.py` ativa `ENABLE` e `FORCE ROW LEVEL SECURITY` para dados de negócio e tabelas filhas. Não aplique até confirmar backup restaurável, volume/janela, credenciais e staging.

Antes de migrar, gere duas chaves independentes de 32 bytes (Base64) fora do repositório e armazene-as em secret manager ou arquivo `.env` fora da pasta pública, acessível somente ao usuário do serviço. Exemplo local de geração, sem imprimir nem salvar automaticamente no projeto: `python -c 'import base64,secrets; print(base64.b64encode(secrets.token_bytes(32)).decode())'` (execute duas vezes). Configure `PII_ENCRYPTION_KEY` e `PII_LOOKUP_KEY` tanto na aplicação quanto no ambiente de migration. Nunca reutilize `SECRET_KEY`.

Procedimento futuro: (1) cópia de segurança criptografada e teste de restauração isolada; (2) staging restaurado, migration com chaves e validação dos dados; (3) conferir ausência de duplicidades normalizadas de telefone; (4) migration do banco antes de publicar o código correspondente; (5) conceder ao usuário runtime apenas DML nos objetos necessários, sem `SUPERUSER`, `BYPASSRLS`, `CREATE` ou ownership; (6) testar consultas e mutações cruzadas com esse usuário restrito; (7) deploy gradual e observação. Runtime obtém o tenant da sessão autenticada e define `app.tenant_id` transacionalmente, inclusive após commits internos. Conexões sem contexto retornam zero linhas nas policies.

A migration de criptografia tem downgrade que decifra os dados e requer as mesmas chaves. Downgrade reintroduz plaintext no banco; faça-o somente com plano de incidente e backup. Backups históricos anteriores à migration continuam contendo plaintext e precisam de política de retenção/expiração. Rotação das chaves exige migration planejada por versão do envelope `enc:v1`.

## 7. Verificações antes de liberar

- `sudo nginx -t`; certificado e `certbot renew --dry-run` válidos.
- Verifique de fora que somente 22/80/443 estão abertos, e que `3000`, `8000`, `5432` não respondem.
- `curl -I https://app.exemplo.com`: TLS, HSTS, CSP, `nosniff`, `DENY`; sem `Server`/`X-Powered-By`.
- Confirme login/logout, CSRF/origem, limites 429, CRUD e isolamento A↔B em staging.
- Confirme `DEBUG=false`, segredo não versionado, cookie Secure/HttpOnly, CORS exato e signup desabilitado.
- Confirme logs sem credenciais/PII, rotação, alertas Fail2ban, backup fora da VPS e restauração testada.
- Dependências: `npm audit --audit-level=high` passou nesta auditoria (zero vulnerabilidades). Não há `composer.json`; a API Python requer auditoria com ferramenta Python apropriada antes do deploy.
