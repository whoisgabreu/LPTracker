# LP Tracker

Tracker JavaScript simples para Landing Pages, com coleta de eventos e envio para um webhook HTTP.

O tracker foi pensado para ser instalado em qualquer LP através de uma única tag `<script>`, sem necessidade de modificar a estrutura da página para os eventos automáticos.

---

## 1. Instalação

Adicione o tracker à LP:

```html
<script
    src="https://tracker.seudominio.com/v1/script.js"
    data-site="cliente-a">
</script>

O arquivo script.js é carregado a partir da URL centralizada do tracker.

Ambiente de desenvolvimento

Para visualizar os eventos no console do navegador:

<script
    src="https://tracker.seudominio.com/v1/script.js"
    data-site="cliente-a"
    data-debug="true">
</script>

Remova data-debug="true" em produção.

2. Configurações do <script>

O tracker aceita os seguintes atributos:

Atributo	Obrigatório	Padrão	Descrição
data-site	Sim	unknown	Identifica o site/cliente que está enviando os eventos
data-webhook	Não	URL configurada no script	URL do webhook que receberá os eventos
data-debug	Não	false	Ativa logs no console
data-session-timeout	Não	30	Tempo, em minutos, para expiração da sessão por inatividade

Exemplo completo:

<script
    src="https://tracker.seudominio.com/v1/script.js"
    data-site="cliente-a"
    data-webhook="https://n8n.seudominio.com/webhook/lp-events"
    data-debug="true"
    data-session-timeout="30">
</script>
3. data-site

O data-site identifica a LP ou cliente que originou o evento.

Exemplo:

<script
    src="https://tracker.seudominio.com/v1/script.js"
    data-site="cliente-a">
</script>

Todos os eventos enviados terão:

{
    "site_id": "cliente-a"
}

Outra LP pode usar:

<script
    src="https://tracker.seudominio.com/v1/script.js"
    data-site="cliente-b">
</script>

Resultado:

{
    "site_id": "cliente-b"
}
Recomendação

Utilize um identificador estável e simples.

Bom:

cliente-a
mpa-advogados
somaxi
cliente-123

Evite:

Cliente A
Cliente A - Landing Page Principal
Landing Page Final v2

O valor de data-site deve funcionar como uma chave para identificar o projeto no banco de dados.

4. Eventos automáticos

O tracker registra automaticamente:

page_view
page_loaded
scroll_25
scroll_50
scroll_75
scroll_100
button_click
page_view

Disparado quando o tracker é inicializado na página.

Exemplo:

{
    "event": "page_view"
}

Esse evento é único por sessão.

page_loaded

Disparado quando o evento window.load é concluído.

Ele representa que a página terminou o carregamento dos recursos que participam do evento load.

Exemplo:

{
    "event": "page_loaded",
    "data": {
        "load_time": 1842
    }
}

load_time representa aproximadamente o tempo, em milissegundos, desde o início da navegação até o carregamento.

Esse evento é único por sessão.

Eventos de scroll

O tracker monitora automaticamente a profundidade da página:

scroll_25
scroll_50
scroll_75
scroll_100

Exemplo:

{
    "event": "scroll_50",
    "data": {
        "percentage": 50
    }
}

Cada threshold é enviado apenas uma vez por sessão.

5. Rastreamento de elementos com data-track

Para rastrear elementos específicos da LP, utilize:

data-track

Exemplo:

<button data-track="cta">
    Quero falar com um especialista
</button>

Quando o usuário clicar nesse elemento, o tracker enviará:

button_click

com informações sobre o elemento.

6. data-track-name

O data-track-name identifica especificamente o elemento rastreado.

Exemplo:

<button
    data-track="cta"
    data-track-name="hero">
    Quero falar com um especialista
</button>

Outro CTA:

<button
    data-track="cta"
    data-track-name="footer">
    Solicitar orçamento
</button>

Isso permite diferenciar os elementos.

Os eventos terão informações semelhantes a:

{
    "event": "button_click",
    "data": {
        "track": "cta",
        "track_name": "hero",
        "tag": "button",
        "text": "Quero falar com um especialista",
        "href": null
    }
}

E:

{
    "event": "button_click",
    "data": {
        "track": "cta",
        "track_name": "footer",
        "tag": "button",
        "text": "Solicitar orçamento",
        "href": null
    }
}
7. Padrão recomendado para CTAs

Utilize:

data-track="cta"

e um nome semântico:

data-track-name="hero"

Exemplo:

<a
    href="#formulario"
    data-track="cta"
    data-track-name="hero">
    Quero falar com um especialista
</a>

CTA intermediário:

<a
    href="#formulario"
    data-track="cta"
    data-track-name="beneficios">
    Quero saber mais
</a>

CTA final:

<button
    data-track="cta"
    data-track-name="footer">
    Solicitar orçamento
</button>
Recomendações para nomes

Prefira:

hero
beneficios
depoimentos
pricing
footer
header
form

Evite:

botao1
botao2
teste
teste-final
novo-botao

O nome deve descrever a posição ou função do elemento.

8. O tracker não depende de classes CSS

Não é necessário criar classes como:

class="track-button"

ou:

class="analytics-cta"

O tracker utiliza atributos data-*:

data-track="cta"
data-track-name="hero"

Isso mantém a instrumentação separada da estrutura visual da LP.

9. Vários cliques no mesmo elemento

button_click não é um evento único.

Se o usuário clicar cinco vezes no mesmo CTA:

<button
    data-track="cta"
    data-track-name="hero">
    Solicitar orçamento
</button>

serão registrados cinco eventos.

Cada evento terá um event_id diferente.

Isso permite medir tanto:

quantidade total de cliques

quanto, futuramente:

usuários/sessões que clicaram

No processamento dos dados, é possível usar session_id para distinguir as duas métricas.

10. Eventos personalizados

O tracker disponibiliza uma API global:

LPTracker.track()

Ela permite registrar qualquer evento que não seja automático.

Sintaxe:

LPTracker.track("nome_do_evento", {
    chave: "valor"
});

Exemplo:

LPTracker.track("form_start", {
    form: "lead"
});

Resultado:

{
    "event": "form_start",
    "data": {
        "form": "lead"
    }
}
11. Evento de início de formulário

Exemplo:

document
    .querySelector("#lead-form")
    .addEventListener("focusin", function () {


        LPTracker.track("form_start", {
            form: "lead"
        });


    });

Uma implementação real deve evitar disparar form_start a cada campo focado. O ideal é controlar localmente se o primeiro foco já aconteceu.

12. Evento de envio de formulário

Exemplo:

document
    .querySelector("#lead-form")
    .addEventListener("submit", function () {


        LPTracker.track("form_submit", {
            form: "lead"
        });


    });

Payload:

{
    "event": "form_submit",
    "data": {
        "form": "lead"
    }
}
13. Evento de vídeo

Exemplo:

LPTracker.track("video_play", {
    video: "vsl-principal"
});

Outro exemplo:

LPTracker.track("video_50", {
    video: "vsl-principal"
});

Outro:

LPTracker.track("video_complete", {
    video: "vsl-principal"
});

A nomenclatura dos eventos personalizados fica a cargo da aplicação, mas deve ser consistente.

14. Eventos personalizados únicos

Por padrão, eventos personalizados podem ser enviados várias vezes.

Se determinado evento deve acontecer apenas uma vez por sessão, utilize:

LPTracker.track(
    "video_started",
    {
        video: "vsl-principal"
    },
    {
        unique: true
    }
);

Nesse caso, depois do primeiro envio:

video_started

novas chamadas ao mesmo evento serão ignoradas durante a sessão.

15. Atualização manual da atividade

O tracker atualiza automaticamente a atividade da sessão quando eventos relevantes acontecem.

Também é possível atualizar manualmente:

LPTracker.touch();

Isso pode ser útil em aplicações que tenham interações próprias que não geram um evento rastreado.

16. Session ID

Cada visitante recebe um session_id.

Exemplo:

sess_mf8k1z_92ab31cd

A sessão é armazenada no localStorage.

O padrão é:

30 minutos de inatividade

O timeout pode ser alterado:

data-session-timeout="60"

Nesse caso:

60 minutos de inatividade

serão necessários para expirar a sessão.

Importante

O timeout é baseado em inatividade, e não no tempo total desde a criação da sessão.

Exemplo:

12:00 → sessão criada
12:10 → interação
12:25 → interação
12:45 → interação

A sessão continua sendo a mesma porque houve atividade.

Se a última atividade ocorreu às 12:45, a sessão expirará após 30 minutos sem nova atividade, aproximadamente às 13:15.

17. Dados da sessão

Os eventos incluem:

{
    "session": {
        "id": "sess_abc123",
        "started_at": "2026-08-20T15:00:00.000Z",
        "last_activity": "2026-08-20T15:12:00.000Z",
        "timeout_minutes": 30
    }
}

Isso permite reconstruir a jornada do visitante.

18. API pública

O objeto global disponibilizado pelo tracker é:

LPTracker
LPTracker.track()

Envia um evento.

LPTracker.track("form_submit", {
    form: "lead"
});
LPTracker.getSessionId()

Retorna o ID da sessão atual:

const sessionId =
    LPTracker.getSessionId();
LPTracker.getSession()

Retorna os dados da sessão:

const session =
    LPTracker.getSession();

Resultado:

{
    id: "...",
    started_at: "...",
    last_activity: "...",
    timeout_minutes: 30
}
LPTracker.getSiteId()

Retorna o identificador configurado no data-site:

const site =
    LPTracker.getSiteId();
LPTracker.getConfig()

Retorna a configuração atual:

const config =
    LPTracker.getConfig();
LPTracker.touch()

Atualiza manualmente a atividade da sessão:

LPTracker.touch();
19. Estrutura do evento enviado

Todos os eventos seguem uma estrutura semelhante:

{
    "event_id": "evt_abc123",
    "event": "button_click",
    "timestamp": "2026-08-20T15:30:00.000Z",
    "site_id": "cliente-a",
    "session": {
        "id": "sess_abc123",
        "started_at": "2026-08-20T15:00:00.000Z",
        "last_activity": "2026-08-20T15:30:00.000Z",
        "timeout_minutes": 30
    },
    "page": {
        "url": "https://cliente.com.br/",
        "path": "/",
        "title": "Landing Page",
        "referrer": "https://google.com/"
    },
    "device": {
        "user_agent": "...",
        "language": "pt-BR",
        "screen_width": 1920,
        "screen_height": 1080,
        "viewport_width": 1920,
        "viewport_height": 947
    },
    "data": {
        "track": "cta",
        "track_name": "hero",
        "tag": "button",
        "text": "Quero falar com um especialista",
        "href": null
    }
}
20. Webhook

O tracker envia os eventos através de HTTP POST.

Exemplo:

POST https://n8n.seudominio.com/webhook/lp-events

O corpo da requisição é JSON.

O endpoint pode ser configurado diretamente:

<script
    src="https://tracker.seudominio.com/v1/script.js"
    data-site="cliente-a"
    data-webhook="https://n8n.seudominio.com/webhook/lp-events">
</script>

Se data-webhook não for informado, o tracker utiliza a URL padrão configurada no próprio script.js.

21. Debug

Durante o desenvolvimento:

<script
    src="https://tracker.seudominio.com/v1/script.js"
    data-site="cliente-a"
    data-debug="true">
</script>

O console mostrará:

[LPTracker] Nova sessão criada
[LPTracker] Inicializado
[LPTracker] Evento: ...
[LPTracker] Webhook: 200

Para desativar:

<script
    src="https://tracker.seudominio.com/v1/script.js"
    data-site="cliente-a">
</script>
22. Exemplo completo de uma LP
<!DOCTYPE html>
<html lang="pt-BR">


<head>
    <meta charset="UTF-8">


    <title>Minha Landing Page</title>
</head>


<body>


    <header>


        <a
            href="#formulario"
            data-track="cta"
            data-track-name="header">


            Falar com especialista


        </a>


    </header>




    <main>


        <section>


            <h1>
                Transforme seus resultados
            </h1>


            <a
                href="#formulario"
                data-track="cta"
23. Eventos recomendados

Para manter consistência entre LPs, recomendamos uma convenção:

Eventos automáticos
page_view
page_loaded
scroll_25
scroll_50
scroll_75
scroll_100
button_click
page_exit
Eventos personalizados comuns
form_start
form_submit
video_play
video_25
video_50
video_75
video_complete
faq_open
whatsapp_click
phone_click

Esses eventos não precisam ser implementados no tracker. A LP pode dispará-los através de:

LPTracker.track();
24. Recomendação de nomenclatura

Use nomes em snake_case.

Bom:

form_start
form_submit
video_play
video_complete
whatsapp_click
phone_click
faq_open

Evite misturar:

formStart
FormSubmit
VIDEO_PLAY
video-play

A padronização facilita consultas no banco de dados e criação de dashboards.

25. Fluxo geral

A arquitetura final fica:

Landing Page
    │
    │ script.js
    ▼
LP Tracker
    │
    ├── page_view
    ├── page_loaded
    ├── scroll
    ├── button_click
    └── custom events
    │
    ▼
HTTP POST
    │
    ▼
n8n Webhook
    │
    ▼
Processamento
    │
    ▼
Banco de dados
    │
    ├── visitantes
    ├── sessões
    ├── eventos
    ├── conversões
    └── métricas
26. Resumo rápido

Para instalar:

<script
    src="https://tracker.seudominio.com/v1/script.js"
    data-site="cliente-a">
</script>

Para identificar um CTA:

<button
    data-track="cta"
    data-track-name="hero">
    Solicitar orçamento
</button>

Para enviar um evento personalizado:

LPTracker.track("form_submit", {
    form: "lead"
});

Para enviar um evento personalizado único:

LPTracker.track(
    "video_started",
    {
        video: "vsl"
    },
    {
        unique: true
    }
);

Para consultar a sessão:

LPTracker.getSession();

Para consultar o session_id:

LPTracker.getSessionId();

Para atualizar a atividade:

LPTracker.touch();
Observações
page_view, page_loaded e os thresholds de scroll são eventos únicos por sessão.
button_click pode ser enviado várias vezes.
Eventos personalizados podem ser múltiplos por padrão.
unique: true transforma um evento personalizado em evento único por sessão.
A sessão utiliza localStorage.
O timeout padrão é de 30 minutos de inatividade.
data-session-timeout permite alterar o timeout.
data-debug="true" deve ser usado apenas durante desenvolvimento.
O session_id não é um identificador permanente do usuário; ele identifica uma sessão dentro da janela de atividade definida.