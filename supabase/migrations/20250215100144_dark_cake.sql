/*
  # Initial Kudos Application Schema

  1. New Tables
    - users
      - id (uuid, primary key)
      - google_id (text, unique)
      - name (text)
      - email (text, unique)
      - manager_id (uuid, self-referential)
      - created_at (timestamptz)
    
    - categories
      - id (uuid, primary key)
      - name (text, unique)
    
    - kudos
      - id (uuid, primary key)
      - giver_id (uuid, references users)
      - recipient_id (uuid, references users)
      - category_id (uuid, references categories)
      - message (text)
      - image_url (text)
      - created_at (timestamptz)
    
    - kudos_recipients
      - kudos_id (uuid, references kudos)
      - recipient_id (uuid, references users)
      - Primary key: (kudos_id, recipient_id)
    
    - notifications
      - id (uuid, primary key)
      - user_id (uuid, references users)
      - type (text)
      - channel (text)
      - sent_at (timestamptz)
    
    - leaderboard
      - user_id (uuid, references users)
      - points (integer)
      - last_updated (timestamptz)
    
    - settings
      - user_id (uuid, references users)
      - notify_by_email (boolean)
      - notify_by_slack (boolean)
      - reminder_opt_in (boolean)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    
  3. Indexes
    - Index on users.email and users.google_id
    - Index on kudos.recipient_id and kudos.giver_id
    - Index on leaderboard.points
    - Index on categories.name
*/

-- Enable UUID extension
CREATE
EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users
(
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    google_id  TEXT UNIQUE NOT NULL,
    name       TEXT        NOT NULL,
    email      TEXT UNIQUE NOT NULL,
    manager_id UUID REFERENCES users (id),
    created_at TIMESTAMPTZ      DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
)
    );

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_google_id ON users (google_id);

-- Categories table
CREATE TABLE categories
(
    id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL
);

CREATE INDEX idx_categories_name ON categories (name);

-- Kudos table
CREATE TABLE kudos
(
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    giver_id     UUID NOT NULL REFERENCES users (id),
    recipient_id UUID NOT NULL REFERENCES users (id),
    category_id  UUID NOT NULL REFERENCES categories (id),
    message      TEXT,
    image_url    TEXT,
    created_at   TIMESTAMPTZ      DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT different_users CHECK (giver_id != recipient_id
)
    );

CREATE INDEX idx_kudos_giver ON kudos (giver_id);
CREATE INDEX idx_kudos_recipient ON kudos (recipient_id);

-- Kudos Recipients table
CREATE TABLE kudos_recipients
(
    kudos_id     UUID REFERENCES kudos (id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES users (id),
    PRIMARY KEY (kudos_id, recipient_id)
);

-- Notifications table
CREATE TABLE notifications
(
    id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users (id),
    type    TEXT NOT NULL CHECK (type IN ('KudosReceived', 'Reminder')),
    channel TEXT NOT NULL CHECK (channel IN ('Slack', 'Email')),
    sent_at TIMESTAMPTZ      DEFAULT CURRENT_TIMESTAMP
);

-- Leaderboard table
CREATE TABLE leaderboard
(
    user_id      UUID PRIMARY KEY REFERENCES users (id),
    points       INTEGER NOT NULL DEFAULT 0,
    last_updated TIMESTAMPTZ      DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_leaderboard_points ON leaderboard (points DESC);

-- Settings table
CREATE TABLE settings
(
    user_id         UUID PRIMARY KEY REFERENCES users (id),
    notify_by_email BOOLEAN DEFAULT true,
    notify_by_slack BOOLEAN DEFAULT true,
    reminder_opt_in BOOLEAN DEFAULT true
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE kudos ENABLE ROW LEVEL SECURITY;
ALTER TABLE kudos_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users policies
CREATE
POLICY "Users can view all users"
    ON users FOR
SELECT
    TO authenticated
    USING (true);

-- Categories policies
CREATE
POLICY "Anyone can view categories"
    ON categories FOR
SELECT
    TO authenticated
    USING (true);

-- Kudos policies
CREATE
POLICY "Users can view all kudos"
    ON kudos FOR
SELECT
    TO authenticated
    USING (true);

CREATE
POLICY "Users can create kudos"
    ON kudos FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = giver_id);

-- Kudos Recipients policies
CREATE
POLICY "Users can view all kudos recipients"
    ON kudos_recipients FOR
SELECT
    TO authenticated
    USING (true);

-- Notifications policies
CREATE
POLICY "Users can view their own notifications"
    ON notifications FOR
SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Leaderboard policies
CREATE
POLICY "Users can view all leaderboard entries"
    ON leaderboard FOR
SELECT
    TO authenticated
    USING (true);

-- Settings policies
CREATE
POLICY "Users can view and update their own settings"
    ON settings FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Insert default categories
INSERT INTO categories (name)
VALUES ('Innovation'),
       ('Teamwork'),
       ('Leadership'),
       ('Customer Focus'),
       ('Excellence');