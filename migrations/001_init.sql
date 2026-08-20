-- LP Tracker - Schema Initialization
-- PostgreSQL

BEGIN;

-- ============================================================
-- TABLE: sites
-- ============================================================

CREATE TABLE sites (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_key    VARCHAR(100) NOT NULL UNIQUE,
    name        VARCHAR(255),
    domain      VARCHAR(255),
    active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: sessions
-- ============================================================

CREATE TABLE sessions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id        VARCHAR(100) NOT NULL,
    site_id           UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    started_at        TIMESTAMPTZ NOT NULL,
    last_activity_at  TIMESTAMPTZ NOT NULL,
    ended_at          TIMESTAMPTZ,
    landing_url       TEXT,
    landing_path      TEXT,
    referrer          TEXT,
    user_agent        TEXT,
    language          VARCHAR(20),
    screen_width      INTEGER,
    screen_height     INTEGER,
    viewport_width    INTEGER,
    viewport_height   INTEGER,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (site_id, session_id)
);

CREATE INDEX idx_sessions_site_id ON sessions (site_id);
CREATE INDEX idx_sessions_last_activity_at ON sessions (last_activity_at);

-- ============================================================
-- TABLE: events
-- ============================================================

CREATE TABLE events (
    id          BIGSERIAL PRIMARY KEY,
    event_id    VARCHAR(100) NOT NULL UNIQUE,
    site_id     UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    session_id  UUID REFERENCES sessions(id) ON DELETE SET NULL,
    event_name  VARCHAR(100) NOT NULL,
    timestamp   TIMESTAMPTZ NOT NULL,
    page_url    TEXT,
    page_path   TEXT,
    page_title  TEXT,
    data        JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_site_id ON events (site_id);
CREATE INDEX idx_events_session_id ON events (session_id);
CREATE INDEX idx_events_event_name ON events (event_name);
CREATE INDEX idx_events_timestamp ON events (timestamp);
CREATE INDEX idx_events_site_timestamp ON events (site_id, timestamp);

COMMIT;
