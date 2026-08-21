# LP Tracker

Tracker JavaScript para Landing Pages com coleta de eventos e persistência direta em PostgreSQL.

Instalado em qualquer LP via uma única tag `<script>`, sem necessidade de modificar a estrutura da página para os eventos automáticos.

---

## Arquitetura

```
Landing Page  →  script.js  →  Flask API (/v1/events)  →  PostgreSQL
```

- **script.js** — Coleta eventos no browser e envia via POST
- **Flask** — Recebe, valida e persiste os eventos
- **PostgreSQL** — Armazena sites, sessões e eventos

---

## Instalação na LP

```html
<script
    src="https://tracker.seudominio.com/v1/script.js"
    data-site="cliente-a">
</script>
```

### Atributos de configuração

| Atributo | Obrigatório | Padrão | Descrição |
|----------|-------------|--------|-----------|
| `data-site` | Sim | `unknown` | Identificador do site/cliente (deve existir na tabela `sites`) |
| `data-webhook` | Não | `/v1/events` | URL do endpoint de eventos |
| `data-debug` | Não | `false` | Habilita logs no console (`"true"`) |
| `data-session-timeout` | Não | `30` | Timeout da sessão em minutos |

---

## Eventos rastreados automaticamente

| Evento | Descrição |
|--------|-----------|
| `page_view` | Página visualizada |
| `page_loaded` | Página completamente carregada |
| `scroll_25` | 25% da página rolada |
| `scroll_50` | 50% da página rolada |
| `scroll_75` | 75% da página rolada |
| `scroll_100` | 100% da página rolada |
| `button_click` | Clique em elemento com `data-track` |
| `page_exit` | Saída da página (visibilitychange) |

### Eventos personalizados

Use `LPTracker.track()` para rastrear qualquer interação específica.

```javascript
LPTracker.track(nome, dados, opcoes);
```

---

#### Formulário

Rastrear quando o visitante começa a preencher e quando envia o formulário.

```javascript
(function () {
    var form = document.getElementById("meu-form");
    var started = false;

    // form_start — dispara ao focar no primeiro input
    form.addEventListener("focusin", function () {
        if (!started) {
            started = true;
            LPTracker.track("form_start", { form: "lead" });
        }
    });

    // form_submit — dispara ao enviar
    form.addEventListener("submit", function (e) {
        e.preventDefault();
        LPTracker.track("form_submit", { form: "lead" });
        // ... enviar formulário
    });
})();
```

**Payload armazenado:**

```json
{ "form": "lead" }
```

> **Importante:** não armazenar dados pessoais (email, telefone, etc.) no evento. O tracker é apenas para analytics.

---

#### VSL (Vídeo)

Rastrear reprodução, progresso e conclusão de vídeos.

```javascript
var video = document.getElementById("vsl");
var milestones = { 25: false, 50: false, 75: false };

// Início da reprodução
video.addEventListener("play", function () {
    LPTracker.track("video_started", {
        video: "vsl",
        duration: video.duration
    }, { unique: true });
});

// Progresso (25%, 50%, 75%)
video.addEventListener("timeupdate", function () {
    var pct = (video.currentTime / video.duration) * 100;
    [25, 50, 75].forEach(function (m) {
        if (pct >= m && !milestones[m]) {
            milestones[m] = true;
            LPTracker.track("video_progress", {
                video: "vsl",
                percentage: m
            });
        }
    });
});

// Conclusão
video.addEventListener("ended", function () {
    LPTracker.track("video_complete", { video: "vsl" });
});
```

**Payloads armazenados:**

```json
{ "video": "vsl", "duration": 120 }
{ "video": "vsl", "percentage": 50 }
{ "video": "vsl" }
```

---

#### Links externos

Rastrear cliques em links que saem do site.

```html
<a
    href="https://example.com"
    target="_blank"
    data-track="link"
    data-track-name="parceiro">
    Visitar parceiro
</a>
```

O `button_click` já é rastreado automaticamente para elementos com `data-track`. Para rastrear apenas links externos, basta filtrar no banco:

```sql
SELECT * FROM events
WHERE event_name = 'button_click'
  AND data->>'href' LIKE 'https://%';
```

---

#### WhatsApp

Rastrear cliques no botão do WhatsApp.

```html
<a
    href="https://wa.me/5511999999999?text=Olá"
    target="_blank"
    data-track="whatsapp"
    data-track-name="hero">
    Fale conosco no WhatsApp
</a>
```

Ou via JS para controle total:

```javascript
document.getElementById("whatsapp-btn").addEventListener("click", function () {
    LPTracker.track("whatsapp_click", {
        position: "hero",
        phone: "5511999999999"
    });
});
```

---

#### CTA (Call to Action)

Elementos com `data-track` já são rastreados automaticamente pelo `button_click`.

```html
<!-- Básico -->
<button data-track="cta" data-track-name="hero">
    Começar agora
</button>

<!-- Link estilizado como botão -->
<a href="#preco" data-track="cta" data-track-name="nav">
    Ver planos
</a>

<!-- Elemento com href externo -->
<a href="https://app.exemplo.com" data-track="cta" data-track-name="footer">
    Acessar plataforma
</a>
```

**Atributos disponíveis:**

| Atributo | Descrição |
|----------|-----------|
| `data-track` | Tipo do evento (ex: `cta`, `whatsapp`, `link`) |
| `data-track-name` | Identificador específico (ex: `hero`, `footer`, `nav`) |

**Payload armazenado:**

```json
{
    "track": "cta",
    "track_name": "hero",
    "tag": "button",
    "text": "Começar agora",
    "href": null
}
```

---

#### Marcar evento como único

Alguns eventos devem ocorrer apenas uma vez por sessão. Use `{ unique: true }`:

```javascript
// Só registra o primeiro play do vídeo na sessão
LPTracker.track("video_started", { video: "vsl" }, { unique: true });

// Registrado normalmente (pode ocorrer várias vezes)
LPTracker.track("whatsapp_click", { position: "hero" });
```

Os eventos `page_view`, `page_loaded`, `scroll_*` já são únicos por padrão.

### API pública

```javascript
LPTracker.track(nome, dados, opcoes);  // Enviar evento personalizado
LPTracker.getSessionId();              // Obter ID da sessão
LPTracker.getSession();                // Obter dados da sessão
LPTracker.getSiteId();                 // Obter site_id
LPTracker.getConfig();                 // Obter configuração
LPTracker.touch();                     // Renovar atividade da sessão
```

---

## Deploy

### Docker

```bash
docker build -t lptracker .
docker run -p 5000:5000 -e DATABASE_URL="postgres://..." lptracker
```

### Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | Sim | URL de conexão com PostgreSQL |

---

## Schema do banco

### sites
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | PK |
| `site_key` | VARCHAR(100) | Identificador público (usado no `data-site`) |
| `name` | VARCHAR(255) | Nome amigável |
| `domain` | VARCHAR(255) | Domínio principal |
| `active` | BOOLEAN | Se o site está ativo |
| `created_at` | TIMESTAMPTZ | Criação |
| `updated_at` | TIMESTAMPTZ | Última atualização |

### sessions
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | PK interno |
| `session_id` | VARCHAR(100) | ID gerado pelo tracker |
| `site_id` | UUID | FK → sites |
| `started_at` | TIMESTAMPTZ | Início da sessão |
| `last_activity_at` | TIMESTAMPTZ | Última atividade |
| `ended_at` | TIMESTAMPTZ | Fim da sessão (nullable) |
| `landing_url` | TEXT | URL da landing page |
| `referrer` | TEXT | Origem da navegação |
| `user_agent` | TEXT | User agent do navegador |
| `language` | VARCHAR(20) | Idioma |
| `screen_*` / `viewport_*` | INTEGER | Dimensões do dispositivo |

### events
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | BIGSERIAL | PK sequencial |
| `event_id` | VARCHAR(100) | ID único do evento (gerado pelo tracker) |
| `site_id` | UUID | FK → sites |
| `session_id` | UUID | FK → sessions |
| `event_name` | VARCHAR(100) | Nome do evento |
| `timestamp` | TIMESTAMPTZ | Momento do evento no browser |
| `page_url` | TEXT | URL da página |
| `page_path` | TEXT | Path da página |
| `page_title` | TEXT | Título da página |
| `data` | JSONB | Dados específicos do evento |

---

## API

### `POST /v1/events`

Recebe eventos do tracker e persiste no banco.

**Payload:**

```json
{
  "event_id": "evt_abc123",
  "event": "button_click",
  "timestamp": "2026-08-20T15:30:00.000Z",
  "site_id": "cliente-a",
  "session": {
    "id": "sess_xyz789",
    "started_at": "2026-08-20T15:00:00.000Z",
    "last_activity": "2026-08-20T15:30:00.000Z"
  },
  "page": {
    "url": "https://exemplo.com/",
    "path": "/",
    "title": "Landing Page",
    "referrer": "https://google.com/"
  },
  "device": {
    "user_agent": "Mozilla/5.0 ...",
    "language": "pt-BR",
    "screen_width": 1920,
    "screen_height": 1080,
    "viewport_width": 1920,
    "viewport_height": 947
  },
  "data": {}
}
```

**Respostas:**

| Status | Descrição |
|--------|-----------|
| `200` | Evento processado com sucesso |
| `400` | Payload inválido ou campos obrigatórios ausentes |
| `404` | Site não encontrado ou inativo |

### `GET /health`

Retorna `ok` se o serviço estiver funcionando.
# LPTracker
