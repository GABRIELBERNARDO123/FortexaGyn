# Auditoria de segurança FitPro — 10/10/2026

## Escopo e limitações

O workspace contém React/TypeScript (`fitpro-frontend`) e FastAPI/SQLAlchemy (`saas-backend`), não PHP. Há PostgreSQL na configuração local, mas não há configuração Nginx, SSH, UFW, Fail2ban, PHP-FPM ou acesso à VPS neste repositório. A auditoria e as correções aplicam-se ao código presente; a infraestrutura deve ser conferida no host real antes do deploy.

## Rotas e entradas

Todas as rotas estão sob `/api/v1`. Entradas de corpo usam os schemas citados. `tenant_id`, `user_id`, papel e grants são derivados da sessão; campos extras dos modelos Pydantic são ignorados.

| Método e rota | Entradas (path/query/body) | Controle principal |
|---|---|---|
| POST `/auth/signup` | body `SignupRequest`: email, owner_name, tenant_name, password | signup configurável |
| POST `/auth/verify-email` | body `VerifyEmailRequest`: email, code | código de uso único/expiração/tentativas |
| POST `/auth/login` | body `LoginRequest`: email, password | sessão opaca |
| POST `/auth/logout` | cookie de sessão | revoga sessão |
| GET `/auth/me` | cookie de sessão | autenticação |
| GET/PATCH `/account` | PATCH body `AccountUpdate`: name | owner; tenant da sessão |
| GET/POST `/users` | POST body `UserCreate`: name, email, password, access_profile | owner; tenant da sessão |
| PATCH/DELETE `/users/{user_id}` | UUID path; PATCH `UserAccessUpdate`: access_profile | owner; tenant da sessão |
| GET/POST `/students` | GET query `coach_id`; POST `StudentCreate` | grants; tenant da sessão |
| GET/PATCH/DELETE `/students/{student_id}` | UUID path; PATCH `StudentUpdate` | grants; tenant da sessão |
| GET/POST `/coaches` | POST `CoachCreate` | grants; tenant da sessão |
| GET/PATCH/DELETE `/coaches/{coach_id}` | UUID path; PATCH `CoachUpdate` | grants; tenant da sessão |
| GET/POST `/products` | POST `ProductCreate` | grants; tenant da sessão |
| GET/PATCH/DELETE `/products/{product_id}` | UUID path; PATCH `ProductUpdate` | grants; tenant da sessão |
| GET `/checkins` | query `student_id`, `on_date` | grants; tenant da sessão |
| POST `/checkins` | body `CheckinCreate`: student_id, note | grants; aluno conferido no tenant |
| DELETE `/checkins/{checkin_id}` | UUID path | grants; tenant da sessão |
| GET `/transactions` | query `kind`, `category`, `from_date`, `to_date` | grants; tenant da sessão |
| POST `/transactions` | body `TransactionCreate` | grants; referências conferidas no tenant |
| GET `/transactions/summary` | query `start`, `end` (date) | grants; tenant da sessão |
| PATCH/DELETE `/transactions/{tx_id}` | UUID path; PATCH `TransactionUpdate` | grants; tenant da sessão |
| GET `/payments` | query `student_id` | grants; tenant da sessão |
| POST `/payments` | body `PaymentCreate` | grants; aluno conferido no tenant |
| DELETE `/payments/{payment_id}` | UUID path | grants; tenant da sessão |
| GET `/payments/next-due/{student_id}` | UUID path | grants; aluno conferido no tenant |
| GET/POST `/sales` | POST body `SaleCreate`: student_id, method, items[{product_id, quantity}] | grants; estoque/preço obtidos no servidor |
| DELETE `/sales/{sale_id}` | UUID path | grants; tenant da sessão |
| GET `/workouts` | query `student_id` | grants; tenant da sessão |
| GET/POST `/workouts` | POST `WorkoutCreate` | grants; referências conferidas no tenant |
| GET/PATCH/DELETE `/workouts/{workout_id}` | UUID path; PATCH `WorkoutUpdate` | grants; tenant da sessão |
| GET `/assessments` | query `student_id` | grants; tenant da sessão |
| GET/POST `/assessments` | POST `AssessmentCreate` | grants; aluno conferido no tenant |
| GET/PATCH/DELETE `/assessments/{assessment_id}` | UUID path; PATCH `AssessmentUpdate` | grants; tenant da sessão |
| GET `/dashboard/summary`, `/overview` | sem parâmetros | grants; agregações por tenant |
| GET `/health` | sem parâmetros | público; status da API |

## Achados por gravidade (estado antes das correções)

### Crítico

- Código de verificação de cadastro é `000000` quando `DEV_MODE=true`: `app/services/signup_service.py:47-53`. A configuração de desenvolvimento podia ser habilitada em produção sem uma trava adicional.

### Alto

- Login sem limite de tentativas/bloqueio: `app/api/v1/auth.py:154-168`, `app/services/auth_service.py:151-196`.
- Operações autenticadas por cookie não exigiam token CSRF nem validavam `Origin`: `app/api/v1/auth.py:179-196`; não havia middleware de origem em `app/main.py`.
- Cookies podiam ser emitidos sem `Secure`; `SESSION_COOKIE_SECURE=False` era o padrão: `app/core/config.py:26-31`, `app/api/v1/auth.py:34-44`.
- RLS foi preparada nas migrations `20261011_02_tenant_row_level_security.py` e `app/core/database.py`; ainda não aplicada. Até migração e teste com role runtime sem `BYPASSRLS`, a proteção efetiva continua dependendo dos filtros de serviço.
- Validação de domínio incompleta em schemas: avaliação admite medidas/valores sem limites (`app/schemas/assessment.py:7-24`); treino aceita strings, listas e números sem limites (`app/schemas/workout.py:7-37`); método de venda sem enum e itens sem limite (`app/schemas/sale.py:7-16`); categoria de produto sem enum (`app/schemas/product.py:11-28`); plano/status de aluno como string livre (`app/schemas/student.py:11-36`).
- Entradas inválidas retornavam o status padrão 422 do FastAPI em vez do 400 solicitado; não havia handler em `app/main.py`.

### Médio

- Sem fluxo de recuperação de senha; não há endpoint/schema/tabela de token de redefinição.
- Criptografia de campo e HMAC de telefone foram preparados (`app/core/field_encryption.py`, `app/models/student.py`, `app/models/assessment.py`), mas dependem da migration `20261011_01` e de duas chaves externas; até isso ser aplicado, a base permanece em plaintext. Não há campos CPF/endereço no modelo atual.
- Não havia cabeçalhos de segurança HTTP na API/servidor Express: `app/main.py:21-34`, `fitpro-frontend/server.js`.
- Signup público vinha habilitado por padrão e `SameSite=lax`: `app/core/config.py:26-43`.
- E-mail de verificação possui limite de tentativas por registro, mas signup/verify também não possuem rate limit de rede: `app/services/signup_service.py:33-34`.
- Cobertura de IDOR existente verificava leituras e exclusões cruzadas, mas não PATCH/POST para cada recurso (`tests/test_account_security_api.py`, `tests/test_tenant_reference_validation.py`).
- Configuração de produção ausente no workspace. Não foi possível avaliar Nginx/TLS/UFW/SSH/PostgreSQL remoto, rotação/backup, unattended-upgrades ou fail2ban.

### Baixo

- CORS permite qualquer cabeçalho por configuração (`app/main.py:28-34`), embora as origens venham de lista de ambiente e não haja wildcard default.
- Mensagens de falha de login e de conta são distintas em alguns casos (`app/services/auth_service.py:174-216`), permitindo enumeração parcial de status/email.

## SQL, saída e outras superfícies

As consultas encontradas são SQLAlchemy ORM com expressões vinculadas. Não encontrei concatenação de entrada de usuário em SQL, `innerHTML`/`dangerouslySetInnerHTML`, uploads, desserialização insegura, execução de comandos ou endpoint de exportação/arquivo no inventário. O Express serve somente os artefatos estáticos; não existe cache de dados de tenant configurado.

## Isolamento multi-tenant

As consultas de negócio revisadas filtram por `tenant_id`; IDs estrangeiros retornam 404 e referências cruzadas (aluno, professor, produto) são checadas no tenant nos serviços. O `tenant_id` é obtido do usuário autenticado. A cobertura automática foi ampliada durante esta auditoria. Policies RLS estão preparadas, incluindo filhos de venda/treino e logs; continuam pendentes de aplicação e testes em role runtime sem privilégios de bypass.

## Itens que exigem etapa aprovada/infraestrutura

- Criptografia de telefone/ficha médica/avaliação física e HMAC de telefone estão preparadas em `20261011_01_encrypt_sensitive_fields.py`; RLS está preparada em `20261011_02_tenant_row_level_security.py`. Nenhuma foi aplicada. Pendente staging, backup restaurável, configuração externa de chaves, role runtime sem `BYPASSRLS` e execução autorizada pelo operador.
- Recuperação de senha necessita modelo/tabela, serviço de entrega e política de revogação de sessões; precisa definição do domínio/provedor de e-mail.
- O workspace não contém configuração da VPS. Os comandos/checklist de produção estão em `VPS_DEPLOY_SECURITY.md`; não foram executados.

## Correções aplicadas nesta auditoria

- `ENV=production` agora rejeita `DEBUG=true`, `DEV_MODE=true`, cookie inseguro e CORS wildcard/HTTP. Cookie passa a `Secure` por padrão quando `ENV` é produção; o modo de desenvolvimento mantém HTTP local funcional.
- Rate limit em login (5/min por IP), signup (3/h) e verificação (5/h). O IP só é lido de `X-Real-IP` quando o peer está na lista explícita `TRUSTED_PROXY_IPS`; caso contrário, usa o peer direto. O armazenamento é em memória por processo.
- Mutações autenticadas por cookie validam `Origin` contra CORS/origem local. Respostas de validação são HTTP 400 genéricas e não ecoam entrada.
- Schemas de avaliação, check-in, produto, aluno, transação, pagamento, venda e treino receberam enums/limites/faixas. Datas de resumo/transação e período de treino são conferidos. IDs extras de tenant/role continuam ignorados e os serviços derivam tenant da sessão.
- O pagamento usa o preço/plano persistido como referência padrão; termos personalizados são permitidos ao owner autenticado e negados a membros, inclusive `operations_admin`. Preço de item de venda é obtido do produto no servidor.
- Venda bloqueia a linha de estoque durante a baixa, evitando overselling por compras concorrentes.
- API/Express definem cabeçalhos de segurança; `X-Powered-By` foi desabilitado. A rota de health não revela `ENV`. As respostas API são `no-store`.
- Eventos de login, autorização e exclusão não registram IP, user-agent, senha, token ou corpo. Novos registros de sessão também não armazenam IP/user-agent. Dados antigos dessas colunas não foram apagados.
- Testes ampliados para leitura/alteração/exclusão e criação com referências cruzadas entre tenants, valores inválidos, CSRF, cabeçalhos e rate limit.
- Preparado AES-256-GCM para telefone, ficha médica e dados de avaliação, com HMAC separado para manter unicidade por tenant; produção agora exige as duas chaves externas.
- Preparada a segunda camada RLS com contexto `app.tenant_id` derivado da sessão autenticada e reaplicado após cada transação. As migrations de dados e políticas não foram executadas.

## Validação executada e pendências atualizadas

- Isolamento/validação: `27 passed` em PostgreSQL Docker descartável; o volume do banco local do app não foi usado. O teste gerou somente dados sintéticos, e o container/rede temporários foram removidos.
- Frontend: `npm run lint`, `npm run build`, `node --check server.js`, `git diff --check` passaram. `npm audit --audit-level=high`: zero vulnerabilidades.
- Scanner dedicado de segredos não está instalado; busca heurística em arquivos versionados e histórico Git alcançável não encontrou padrões suspeitos. `.env` não está versionado (somente `.env.example`). Isso não substitui Gitleaks/TruffleHog.
- Não há `composer.json`; a stack da API é Python. Auditoria de dependências Python (`pip-audit`) ainda precisa ser executada.
- Os novos testes de cifra foram adicionados, mas não executados: o container atual não tem a dependência `cryptography` instalada nem monta `tests/`. A integração RLS é opt-in (`RUN_RLS_INTEGRATION=1`) e requer migrations aplicadas e role runtime sem bypass; não foi executada.
- Também pendentes: redefinição de senha; backend Redis para rate limit distribuído; política para pagamentos parciais/descontos; retenção/remoção dos IPs e user-agents históricos em `sessions`/`audit_logs`; configuração real da VPS e restauração de backup.
- RLS preparada cobre tabelas de negócio tenant-scoped, tabelas filhas e logs. `users` e `licenses` têm fluxos globais de autenticação/ativação sem tenant previamente confiável e permanecem fora das policies; seguem protegidas pelos filtros explícitos e controle de sessão dos serviços.
- Fail2ban de login da aplicação conflita com a regra de não guardar IP em logs. O guia mantém access log desabilitado e registra esse bloqueio; resolva base/retenção/acesso antes de habilitar captura de IP para banimento. O jail SSH padrão depende dos registros de autenticação do sistema operacional.
- A CSP permite scripts inline apenas em `/standalone` para preservar a página legada; a interface React principal mantém `script-src 'self'`.
