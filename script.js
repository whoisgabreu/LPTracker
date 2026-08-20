(function () {
    "use strict";

    // =========================================================
    // LP TRACKER
    // =========================================================
    //
    // Exemplo de instalação:
    //
    // <script
    //     src="https://tracker.seudominio.com/v1/script.js"
    //     data-site="cliente-a"
    //     data-debug="true"
    //     data-session-timeout="30">
    // </script>
    //
    // =========================================================


    // =========================================================
    // CONFIGURAÇÃO
    // =========================================================

    const scriptElement = document.currentScript;

    const CONFIG = {

        // Webhook responsável por receber os eventos
        webhookUrl:
            scriptElement?.dataset.webhook ||
            "/v1/events",

        // Identificação da LP/cliente
        siteId:
            scriptElement?.dataset.site ||
            "unknown",

        // Debug
        debug:
            scriptElement?.dataset.debug === "true",

        // Timeout da sessão em minutos
        sessionTimeoutMinutes:
            parseInt(
                scriptElement?.dataset.sessionTimeout ||
                "30",
                10
            )

    };


    // =========================================================
    // CONSTANTES
    // =========================================================

    const SESSION_STORAGE_KEY =
        "lp_tracker_session";

    const SESSION_TIMEOUT =
        CONFIG.sessionTimeoutMinutes *
        60 *
        1000;


    // =========================================================
    // EVENTOS ÚNICOS
    // =========================================================
    //
    // Estes eventos só podem ocorrer uma vez por sessão.
    //
    // =========================================================

    const UNIQUE_EVENTS = new Set([

        "page_view",

        "page_loaded",

        "scroll_25",

        "scroll_50",

        "scroll_75",

        "scroll_100"

    ]);


    // Eventos únicos já enviados
    const sentUniqueEvents =
        new Set();


    // =========================================================
    // GERADOR DE IDS
    // =========================================================

    function generateId(prefix) {

        return (
            prefix +
            "_" +
            Date.now().toString(36) +
            "_" +
            Math.random()
                .toString(36)
                .substring(2, 10)
        );

    }


    // =========================================================
    // DATA ATUAL
    // =========================================================

    function getCurrentTimestamp() {

        return Date.now();

    }


    // =========================================================
    // FORMATA TIMESTAMP
    // =========================================================

    function toISOString(timestamp) {

        return new Date(
            timestamp
        ).toISOString();

    }


    // =========================================================
    // CARREGA SESSÃO
    // =========================================================

    function loadSession() {

        try {

            const stored =
                localStorage.getItem(
                    SESSION_STORAGE_KEY
                );


            if (!stored) {

                return null;

            }


            const session =
                JSON.parse(stored);


            if (
                !session ||
                !session.id ||
                !session.last_activity ||
                !session.started_at
            ) {

                return null;

            }


            return session;

        } catch (error) {

            if (CONFIG.debug) {

                console.error(
                    "[LPTracker] Erro ao carregar sessão:",
                    error
                );

            }

            return null;

        }

    }


    // =========================================================
    // VERIFICA SE A SESSÃO EXPIROU
    // =========================================================

    function isSessionExpired(session) {

        if (!session) {

            return true;

        }


        const now =
            getCurrentTimestamp();


        const elapsed =
            now -
            session.last_activity;


        return elapsed >= SESSION_TIMEOUT;

    }


    // =========================================================
    // CRIA NOVA SESSÃO
    // =========================================================

    function createSession() {

        const now =
            getCurrentTimestamp();


        const session = {

            id:
                generateId("sess"),

            started_at:
                now,

            last_activity:
                now

        };


        try {

            localStorage.setItem(
                SESSION_STORAGE_KEY,
                JSON.stringify(session)
            );

        } catch (error) {

            if (CONFIG.debug) {

                console.error(
                    "[LPTracker] Erro ao salvar sessão:",
                    error
                );

            }

        }


        if (CONFIG.debug) {

            console.log(
                "[LPTracker] Nova sessão criada:",
                session
            );

        }


        return session;

    }


    // =========================================================
    // OBTÉM SESSÃO ATUAL
    // =========================================================

    function getCurrentSession() {

        const existingSession =
            loadSession();


        if (
            existingSession &&
            !isSessionExpired(
                existingSession
            )
        ) {

            return existingSession;

        }


        return createSession();

    }


    // =========================================================
    // SESSÃO ATUAL
    // =========================================================

    let currentSession =
        getCurrentSession();


    // =========================================================
    // RENOVA ATIVIDADE DA SESSÃO
    // =========================================================

    function updateSessionActivity() {

        const now =
            getCurrentTimestamp();


        // -----------------------------------------------------
        // Verifica se a sessão ainda está válida
        // -----------------------------------------------------

        if (
            isSessionExpired(
                currentSession
            )
        ) {

            currentSession =
                createSession();

            return currentSession;

        }


        // -----------------------------------------------------
        // Atualiza última atividade
        // -----------------------------------------------------

        currentSession.last_activity =
            now;


        try {

            localStorage.setItem(
                SESSION_STORAGE_KEY,
                JSON.stringify(
                    currentSession
                )
            );

        } catch (error) {

            if (CONFIG.debug) {

                console.error(
                    "[LPTracker] Erro ao atualizar sessão:",
                    error
                );

            }

        }


        return currentSession;

    }


    // =========================================================
    // DADOS DA SESSÃO
    // =========================================================

    function getSessionData() {

        return {

            id:
                currentSession.id,

            started_at:
                toISOString(
                    currentSession.started_at
                ),

            last_activity:
                toISOString(
                    currentSession.last_activity
                ),

            timeout_minutes:
                CONFIG.sessionTimeoutMinutes

        };

    }


    // =========================================================
    // DADOS DA PÁGINA
    // =========================================================

    function getPageData() {

        return {

            url:
                window.location.href,

            path:
                window.location.pathname,

            title:
                document.title,

            referrer:
                document.referrer || null

        };

    }


    // =========================================================
    // DADOS DO DISPOSITIVO
    // =========================================================

    function getDeviceData() {

        return {

            user_agent:
                navigator.userAgent,

            language:
                navigator.language,

            screen_width:
                window.screen.width,

            screen_height:
                window.screen.height,

            viewport_width:
                window.innerWidth,

            viewport_height:
                window.innerHeight

        };

    }


    // =========================================================
    // VERIFICA EVENTO ÚNICO
    // =========================================================

    function isUniqueEvent(eventName) {

        return UNIQUE_EVENTS.has(
            eventName
        );

    }


    // =========================================================
    // ENVIO DO EVENTO
    // =========================================================

    function sendEvent(
        eventName,
        data = {},
        options = {}
    ) {

        const {

            unique = false,

            useBeacon = false,

            updateActivity = true

        } = options;


        // -----------------------------------------------------
        // Atualiza atividade da sessão
        // -----------------------------------------------------

        if (updateActivity) {

            updateSessionActivity();

        }


        // -----------------------------------------------------
        // Verifica se é evento único
        // -----------------------------------------------------

        const shouldBeUnique =
            isUniqueEvent(eventName) ||
            unique;


        // -----------------------------------------------------
        // Impede duplicação
        // -----------------------------------------------------

        if (
            shouldBeUnique &&
            sentUniqueEvents.has(eventName)
        ) {

            if (CONFIG.debug) {

                console.log(
                    "[LPTracker] Evento duplicado ignorado:",
                    eventName
                );

            }

            return false;

        }


        // -----------------------------------------------------
        // Marca evento único
        // -----------------------------------------------------

        if (shouldBeUnique) {

            sentUniqueEvents.add(
                eventName
            );

        }


        // -----------------------------------------------------
        // Gera ID
        // -----------------------------------------------------

        const eventId =
            generateId("evt");


        // -----------------------------------------------------
        // PAYLOAD
        // -----------------------------------------------------

        const payload = {

            event_id:
                eventId,

            event:
                eventName,

            timestamp:
                new Date().toISOString(),

            site_id:
                CONFIG.siteId,

            session:
                getSessionData(),

            page:
                getPageData(),

            device:
                getDeviceData(),

            data:
                data

        };


        // -----------------------------------------------------
        // DEBUG
        // -----------------------------------------------------

        if (CONFIG.debug) {

            console.log(
                "[LPTracker] Evento:",
                payload
            );

        }


        // -----------------------------------------------------
        // SEND BEACON
        // -----------------------------------------------------

        if (
            useBeacon &&
            navigator.sendBeacon
        ) {

            try {

                const blob =
                    new Blob(
                        [
                            JSON.stringify(
                                payload
                            )
                        ],
                        {
                            type:
                                "application/json"
                        }
                    );


                const sent =
                    navigator.sendBeacon(
                        CONFIG.webhookUrl,
                        blob
                    );


                if (CONFIG.debug) {

                    console.log(
                        "[LPTracker] Beacon enviado:",
                        sent
                    );

                }


                return sent;

            } catch (error) {

                if (CONFIG.debug) {

                    console.error(
                        "[LPTracker] Erro no Beacon:",
                        error
                    );

                }

            }

        }


        // -----------------------------------------------------
        // FETCH
        // -----------------------------------------------------

        fetch(
            CONFIG.webhookUrl,
            {

                method:
                    "POST",

                headers:
                    {
                        "Content-Type":
                            "application/json"
                    },

                body:
                    JSON.stringify(
                        payload
                    ),

                keepalive:
                    true

            }
        )

        .then(
            function (response) {

                if (CONFIG.debug) {

                    console.log(
                        "[LPTracker] Webhook:",
                        response.status
                    );

                }

            }
        )

        .catch(
            function (error) {

                if (CONFIG.debug) {

                    console.error(
                        "[LPTracker] Erro ao enviar:",
                        error
                    );

                }

            }
        );


        return true;

    }


    // =========================================================
    // PAGE VIEW
    // =========================================================

    function trackPageView() {

        sendEvent(
            "page_view",
            {
                loaded_at_script:
                    true
            }
        );

    }


    // =========================================================
    // PAGE LOADED
    // =========================================================

    function trackPageLoaded() {

        sendEvent(
            "page_loaded",
            {
                load_time:
                    Math.round(
                        performance.now()
                    )
            }
        );

    }


    // =========================================================
    // SCROLL
    // =========================================================

    const SCROLL_THRESHOLDS = [

        25,

        50,

        75,

        100

    ];


    function getScrollPercentage() {

        const scrollTop =
            window.scrollY ||
            document.documentElement.scrollTop;


        const documentHeight =
            document.documentElement.scrollHeight;


        const viewportHeight =
            window.innerHeight;


        const scrollableHeight =
            documentHeight -
            viewportHeight;


        // Página menor que a viewport
        if (
            scrollableHeight <= 0
        ) {

            return 100;

        }


        const percentage =
            (
                scrollTop /
                scrollableHeight
            ) * 100;


        return Math.min(
            percentage,
            100
        );

    }


    function trackScroll() {

        const percentage =
            getScrollPercentage();


        SCROLL_THRESHOLDS.forEach(
            function (threshold) {

                if (
                    percentage >= threshold
                ) {

                    sendEvent(
                        `scroll_${threshold}`,
                        {
                            percentage:
                                threshold
                        }
                    );

                }

            }
        );

    }


    // =========================================================
    // THROTTLE DO SCROLL
    // =========================================================

    let scrollTicking =
        false;


    function handleScroll() {

        // Scroll é uma atividade
        updateSessionActivity();


        if (scrollTicking) {

            return;

        }


        scrollTicking =
            true;


        requestAnimationFrame(
            function () {

                trackScroll();

                scrollTicking =
                    false;

            }
        );

    }


    // =========================================================
    // CLIQUES
    // =========================================================

    function setupClickTracking() {

        document.addEventListener(
            "click",
            function (event) {

                const element =
                    event.target.closest(
                        "[data-track]"
                    );


                if (!element) {

                    return;

                }


                const trackType =
                    element.dataset.track ||
                    null;


                const trackName =
                    element.dataset.trackName ||
                    null;


                const tagName =
                    element.tagName
                        .toLowerCase();


                const text =
                    (
                        element.innerText ||
                        element.textContent ||
                        ""
                    )
                    .trim()
                    .substring(
                        0,
                        500
                    );


                const href =
                    element.href ||
                    null;


                sendEvent(
                    "button_click",
                    {

                        track:
                            trackType,

                        track_name:
                            trackName,

                        tag:
                            tagName,

                        text:
                            text || null,

                        href:
                            href

                    }
                );

            }
        );

    }


    // =========================================================
    // EVENTO DE SAÍDA
    // =========================================================
    //
    // Não usamos isso para determinar abandono
    // de carregamento.
    //
    // É apenas um evento complementar.
    //
    // =========================================================

    function trackPageExit() {

        sendEvent(
            "page_exit",
            {
                visibility_state:
                    document.visibilityState
            },
            {
                useBeacon:
                    true,

                updateActivity:
                    false
            }
        );

    }


    // =========================================================
    // VISIBILIDADE DA PÁGINA
    // =========================================================

    function setupVisibilityTracking() {

        document.addEventListener(
            "visibilitychange",
            function () {

                if (
                    document.visibilityState ===
                    "hidden"
                ) {

                    trackPageExit();

                }

            }
        );

    }


    // =========================================================
    // API PÚBLICA
    // =========================================================

    window.LPTracker = {

        // -----------------------------------------------------
        // Evento personalizado
        // -----------------------------------------------------

        track:
            function (
                eventName,
                data = {},
                options = {}
            ) {

                return sendEvent(
                    eventName,
                    data,
                    options
                );

            },


        // -----------------------------------------------------
        // Session ID
        // -----------------------------------------------------

        getSessionId:
            function () {

                return currentSession.id;

            },


        // -----------------------------------------------------
        // Dados da sessão
        // -----------------------------------------------------

        getSession:
            function () {

                return {
                    ...getSessionData()
                };

            },


        // -----------------------------------------------------
        // Site ID
        // -----------------------------------------------------

        getSiteId:
            function () {

                return CONFIG.siteId;

            },


        // -----------------------------------------------------
        // Configuração
        // -----------------------------------------------------

        getConfig:
            function () {

                return {
                    ...CONFIG
                };

            },


        // -----------------------------------------------------
        // Atualizar atividade manualmente
        // -----------------------------------------------------

        touch:
            function () {

                updateSessionActivity();

            }

    };


    // =========================================================
    // INICIALIZAÇÃO
    // =========================================================

    function init() {

        // -----------------------------------------------------
        // PAGE VIEW
        // -----------------------------------------------------

        trackPageView();


        // -----------------------------------------------------
        // PAGE LOADED
        // -----------------------------------------------------

        if (
            document.readyState ===
            "complete"
        ) {

            trackPageLoaded();

        } else {

            window.addEventListener(
                "load",
                trackPageLoaded,
                {
                    once: true
                }
            );

        }


        // -----------------------------------------------------
        // SCROLL
        // -----------------------------------------------------

        window.addEventListener(
            "scroll",
            handleScroll,
            {
                passive: true
            }
        );


        // -----------------------------------------------------
        // CLIQUES
        // -----------------------------------------------------

        setupClickTracking();


        // -----------------------------------------------------
        // VISIBILIDADE / SAÍDA
        // -----------------------------------------------------

        setupVisibilityTracking();


        // -----------------------------------------------------
        // DEBUG
        // -----------------------------------------------------

        if (CONFIG.debug) {

            console.log(
                "[LPTracker] Inicializado",
                {

                    site:
                        CONFIG.siteId,

                    session:
                        currentSession.id,

                    session_started_at:
                        toISOString(
                            currentSession.started_at
                        ),

                    session_last_activity:
                        toISOString(
                            currentSession.last_activity
                        ),

                    session_timeout_minutes:
                        CONFIG.sessionTimeoutMinutes,

                    webhook:
                        CONFIG.webhookUrl

                }
            );

        }

    }


    // =========================================================
    // START
    // =========================================================

    init();


})();