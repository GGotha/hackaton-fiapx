# Roteiro de gravação — FIAP X (Hackaton Fase 5)

> **Limite da banca: 10 minutos.** Este roteiro fecha em ~9:30 com folga.
> Se quiser esticar até 15, os blocos marcados com ⏱️+ são onde detalhar mais.
>
> **Regra de ouro:** a banca exige mostrar **(1) Documentação, (2) Arquitetura escolhida,
> (3) O projeto funcionando**. Os três blocos abaixo cobrem exatamente isso, nessa ordem.

## ✅ ESTADO PRONTO (já deixei tudo no ponto — 2026-09-21)

**A stack já está de pé e semeada. É só abrir as abas e gravar.**

**Credenciais de login — use este (o e-mail de falha chega de verdade):**
- **e-mail:** `clashgustavo1@gmail.com`  ← é o dono da conta Resend, então o aviso de falha é entregue
- **senha:** `fiapx123456`
- (alternativo, sem e-mail real: `demo@fiapx.com` / `fiapx123456`)

**Já engatilhado no `clashgustavo1@gmail.com`:**
- `BigBuckBunny_720p.mp4` → **COMPLETED**, 596 frames (vitrine + Download funcionando)
- `broken.mp4` → **FAILED** (mostra o status FAILED na lista; já mandou 1 e-mail real de falha)

**Para o upload ao vivo** use os outros de `test-videos/`
(`ElephantsDream_HD.mp4`, `sintel_trailer-1080p.mp4`, `Popeye_forPresident.mp4`).

**Portas (2 ajustes locais que fiz pra evitar conflito com outros apps seus):**
- Tudo do demo passa pelo **Kong `:8000`** e pelo app em **`:4200`** — use só esses.
- As portas diretas do `api`/`auth` foram remapeadas pra `:3010`/`:3011` (via
  `docker-compose.override.yml`) porque você tinha um Next.js na 3001 e um node na 3000.
  **Não precisa mostrar elas** — o roteiro todo usa a `:8000`.
- Se reiniciar a stack: `docker compose up -d` e, se quiser re-semear, `bash scratchpad-seed.sh`.

---

## Antes de apertar REC (checklist de preparo)

- [x] Stack `up` e `healthy` (`docker compose ps`) — **feito**.
- [x] Usuário de demo criado e 1 vídeo já COMPLETED — **feito**.
- [ ] Abas do navegador já abertas, nesta ordem:
  1. http://localhost:4200 — web app (deslogado)
  2. http://localhost:8000/api/docs — Swagger
  3. http://localhost:15672 — RabbitMQ (login `fiapx`/`fiapx`)
  4. http://localhost:3005 — Grafana (`admin`/`admin`)
  5. http://localhost:9001 — MinIO console (`minioadmin`/`minioadmin`)
  6. Repositório no GitHub
  7. `docs/architecture.md` renderizado (VS Code preview ou GitHub) — pros diagramas
  8. `.github/workflows/ci.yml` com a última run verde do Actions
- [ ] `test-videos/` à mão (usar 2 vídeos: um curto pro fluxo feliz, e disparar 2-3 juntos).
- [ ] Terminal grande com fonte legível, e um segundo terminal pronto pra `docker compose logs -f worker`.
- [ ] Zoom do navegador ~110%, tema escuro (combina com a UI "spacetime").
- [ ] Áudio testado, notificações do SO silenciadas.

---

## BLOCO 0 — Abertura (0:00 – 0:30)

**Tela:** web app na home (deslogado).

> "Olá, sou o Gustavo. Este é o **FIAP X**, o sistema de processamento de vídeos da Fase 5.
> A ideia: o usuário envia um vídeo, o sistema extrai os frames com ffmpeg e devolve um
> `.zip` pra download. Peguei aquele PoC simples e reescrevi como uma **arquitetura de
> microsserviços escalável**. Vou mostrar a documentação, a arquitetura e o sistema rodando."

Fale rápido, sem enrolar. A banca quer ver as três coisas.

---

## BLOCO 1 — Documentação + Arquitetura (0:30 – 3:30)  ⏱️+

> Cobre 2 dos 3 entregáveis de apresentação de uma vez. Não leia tudo — aponte e explique o porquê.

**Tela:** README no GitHub, depois `docs/architecture.md`.

1. **README (0:30 – 1:15)** — mostre:
   - Os badges e a seção **Funcionalidades**.
   - A tabela **"Requisitos → Implementação"** — passe o dedo linha a linha, é o mapa direto
     do enunciado pro código. Diga: *"cada requisito do brief está aqui com onde foi resolvido."*

2. **Diagrama de arquitetura (1:15 – 2:30)** — abra `docs/architecture.md` (diagrama mermaid).
   > "Cinco apps por trás de um gateway **Kong**:
   > - **api** (NestJS) — dono do ciclo de vida do vídeo: recebe upload, grava metadados no
   >   **Postgres**, guarda o binário no **S3**, publica o job no **RabbitMQ**, e hospeda o
   >   **WebSocket** de status ao vivo.
   > - **auth** (better-auth) — usuário/senha, emite **JWT** EdDSA validado via JWKS; identidade no **MongoDB**.
   > - **worker** — consumidor concorrente da fila durável: baixa do S3, extrai frames com ffmpeg,
   >   zipa, sobe o zip pro S3, atualiza status. **Escala = mais réplicas de worker.**
   > - **notification** — consome eventos e manda e-mail via **Resend**.
   > - **app** — front React + Vite."

3. **Explicar as escolhas (2:30 – 3:30)** — o ponto que mais dá nota:
   > "Duas decisões-chave:
   > - **RabbitMQ é o coração do 'não perder requisição em pico'**: fila durável, mensagens
   >   persistentes, publisher confirms, **ack só no sucesso** e **DLQ** pra falhas. Se o worker
   >   morre no meio, a mensagem volta pra fila.
   > - **Redis é só cache + pub/sub** pro fan-out do WebSocket — **não** é a fila de jobs.
   > - **Persistência poliglota**: Postgres pra metadados, MongoDB pra identidade, S3 pros binários."
   >
   > Mostre rápido o `infra/db/init.sql` (entregável "script de criação do banco") e cite
   > `infra/k8s` + `infra/terraform` como prova de escalabilidade/deploy.

---

## BLOCO 2 — O projeto funcionando (3:30 – 8:30)  ← peso máximo da nota

### 2.1 Login / cadastro — "protegido por usuário e senha" (3:30 – 4:15)

**Tela:** web app.

- Crie uma conta (nome, e-mail, senha) **ou** faça login. Narre:
  > "Autenticação por usuário e senha no serviço **auth**. Ao logar recebo um **JWT** que o
  > gateway repassa pra api; a api valida a assinatura contra o JWKS do auth."
- (Opcional ⏱️+) abra o DevTools → Network e mostre o token no header `Authorization: Bearer`.

### 2.2 Upload de 1 vídeo + status ao vivo (4:15 – 5:45)

**Tela:** dashboard logado.

- A lista já abre com o **BigBuckBunny (COMPLETED, 596 frames)** que deixei pronto — mostre
  ele primeiro pra provar o resultado final. Depois arraste um **novo** vídeo ao vivo:
  `test-videos/sintel_trailer-1080p.mp4` (curto, processa rápido).
- Narre enquanto acontece:
  > "Upload é multipart. A api responde **202 na hora** — grava `PENDING` no Postgres, sobe o
  > raw pro S3 e publica o job no RabbitMQ. O processamento é assíncrono."
- Mostre a barra de progresso do upload e o card do vídeo aparecendo como **PENDING**.
- **Aqui está o show:** o status vira **PROCESSING → COMPLETED** ao vivo, sem dar refresh.
  > "Isso é o WebSocket: o worker publica cada transição no Redis, a api faz fan-out pro browser."
- Quando ficar **COMPLETED**, clique em **Download** e mostre o `.zip` baixado (abra e mostre os frames/PNGs dentro — fecha o loop do requisito principal).

### 2.3 Processar VÁRIOS ao mesmo tempo — "concorrência + pico" (5:45 – 7:00)

**Tela:** dashboard + aba RabbitMQ + terminal com logs.

- Dispare **3 uploads em sequência rápida** (os outros vídeos de `test-videos/`).
- Fale:
  > "Requisito: processar mais de um vídeo simultaneamente e não perder nada em pico."
- Corte pra aba do **RabbitMQ** (http://localhost:15672) → mostre a fila `video.process` com
  mensagens entrando e sendo consumidas, e a **DLQ** existindo.
- (⏱️+ forte) mostre a **escala horizontal** ao vivo:
  ```bash
  docker compose up -d --scale worker=3
  ```
  > "Subi pra 3 workers. São **consumidores concorrentes competindo** pela mesma fila — a vazão
  > triplica sem trocar uma linha de código. É assim que o sistema aguenta pico."
- Volte ao dashboard: os vários cards virando COMPLETED em paralelo.

### 2.4 Notificação por e-mail em caso de erro (7:00 – 7:40)  ← e-mail REAL, já configurado

**Tela:** dashboard + terminal (`docker compose logs -f notification`) + painel do Resend + Gmail.

- Requisito: "em caso de erro, notificar o usuário". **Já está enviando de verdade** (dry-run
  desligado, key do Resend carregada). O e-mail chega em `clashgustavo1@gmail.com` (dono da conta Resend).
- **Forçar a falha ao vivo:** arraste `test-videos/broken.mp4` (arquivo inválido) na zona de upload.
  O card vira **FAILED** com o motivo (`ffmpeg exited with code 1: Invalid data found...`).
  > "O worker capturou o erro, marcou FAILED e publicou `video.failed`. O serviço de notificação
  > consumiu o evento e disparou o e-mail pelo Resend."
- Mostre o **log** do notification: `email sent to clashgustavo1@gmail.com — Falha no processamento: broken.mp4`.
- Abra o **painel do Resend** (Emails/Logs) e o **Gmail**: o e-mail chegou, com o template FIAP X
  (base escura, magenta, em português) — mostre também o de **conclusão** (`Seu vídeo está pronto`).
- Atalho pra não depender do drag ao vivo: `bash scratchpad-fail.sh clashgustavo1@gmail.com` faz
  login, sobe o `broken.mp4`, espera o FAILED e imprime o log do envio.
- Detalhe de robustez pra citar: se o Resend recusar, o consumidor faz `nack` **sem requeue** —
  não entra em loop; falhas persistentes iriam pra **DLQ**.

### 2.5 Listagem de status + persistência (7:40 – 8:30)

**Tela:** dashboard (lista paginada) → Swagger → MinIO.

- Mostre a **lista de vídeos do usuário com status** (requisito explícito), paginada.
- Abra o **Swagger** (http://localhost:8000/api/docs) e mostre `GET /api/videos` e
  `GET /api/videos/:id/download` (presigned URL).
- Rápido no **MinIO console**: os buckets com o **raw** e o **zip** — prova de que os
  binários persistem no S3.
  > "Metadados no Postgres, binários no S3. Nada fica só em memória."

---

## BLOCO 3 — Qualidade: testes + CI/CD (8:30 – 9:15)

**Tela:** GitHub Actions + terminal.

- Abra a aba **Actions** no GitHub com a run verde de `ci.yml`.
  > "CI no GitHub Actions em todo push/PR: install → **Biome** → typecheck → **test** → build,
  > por projeto afetado no Nx."
- Cite os testes:
  > "**Unitários** cobrem domínio e use-cases puros; **integração** sobe Postgres e RabbitMQ
  > reais via **Testcontainers**."
- (Se quiser e o tempo permitir ⏱️+) rode um recorte rápido:
  ```bash
  pnpm nx run-many -t test --projects=@fiapx/worker
  ```
- Cite **Prometheus/Grafana**: abra o dashboard `fiapx-overview` no Grafana por 3 segundos.
  > "Cada serviço expõe `/metrics`; Prometheus coleta e o Grafana mostra."

---

## BLOCO 4 — Fechamento (9:15 – 9:30)

**Tela:** README / repo no GitHub.

> "Recapitulando o que a banca pediu: microsserviços com **DDD e SOLID**, **RabbitMQ** garantindo
> que nada se perde em pico, **auth** com JWT, listagem de status ao vivo, notificação por e-mail,
> persistência poliglota, **testes + CI/CD** e infra em **Docker, Kubernetes e Terraform**.
> O código está no GitHub, no link da descrição. Obrigado!"

Mostre o **link do repositório** na tela (é um entregável obrigatório).

---

## Mapa requisito → onde aparece no vídeo (confira antes de enviar)

| Requisito do brief | Bloco |
|---|---|
| Processar vários vídeos ao mesmo tempo | 2.3 |
| Não perder requisição em pico (fila durável) | 1.3, 2.3 |
| Protegido por usuário e senha | 2.1 |
| Listagem de status dos vídeos do usuário | 2.2, 2.5 |
| Notificação em caso de erro (e-mail) | 2.4 |
| Persistir os dados | 2.5 (Postgres + MinIO/S3) |
| Arquitetura escalável | 1.3, 2.3 (scale worker), infra k8s/terraform |
| Versionado no GitHub | 4 |
| Testes de qualidade | 3 |
| CI/CD | 3 |
| **Entregável:** documentação da arquitetura | 1 |
| **Entregável:** script de criação do banco | 1.3 (`infra/db/init.sql`) |
| **Entregável:** link do GitHub | 4 |

## Dicas de gravação

- **Grave por blocos** e junte na edição — evita travar tentando fazer tudo de uma vez.
- Deixe o processamento acontecendo **enquanto narra outra coisa** pra não gastar tempo em silêncio.
- Se um upload demorar, corte na edição (fala "acelerando aqui" / speed-up).
- Tenha um **plano B**: se o WebSocket falhar ao vivo, dê F5 pra mostrar o status atualizado.
- Fale sempre o **porquê**, não só o quê — é o que diferencia nota em arquitetura.
