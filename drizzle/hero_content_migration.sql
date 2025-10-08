-- Migration: Add Hero Content System
-- Created: 2025-10-08
-- Description: Adds hero_contents table for intro videos, hero spots, and menu heroes

-- Create enum for hero content types
DO $$ BEGIN
  CREATE TYPE hero_content_type AS ENUM ('intro_video', 'hero_spot', 'menu_hero');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create hero_contents table
CREATE TABLE IF NOT EXISTS hero_contents (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  name VARCHAR NOT NULL,
  type hero_content_type NOT NULL,

  -- Content
  title VARCHAR NOT NULL,
  subtitle TEXT,

  -- Media references
  image_media_id VARCHAR REFERENCES media_assets(id),
  video_media_id VARCHAR REFERENCES media_assets(id),

  -- CTA configuration
  cta_primary JSONB, -- { label, action: 'story'|'app'|'url', target }
  cta_secondary JSONB,

  -- Settings
  settings JSONB, -- { loop, autoplay, muted, showOnLaunch }

  -- Status
  is_active BOOLEAN DEFAULT false,

  -- Audit fields
  created_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS hero_contents_type_idx ON hero_contents(type);
CREATE INDEX IF NOT EXISTS hero_contents_is_active_idx ON hero_contents(is_active);
CREATE INDEX IF NOT EXISTS hero_contents_image_media_id_idx ON hero_contents(image_media_id);
CREATE INDEX IF NOT EXISTS hero_contents_video_media_id_idx ON hero_contents(video_media_id);

-- Add comment for documentation
COMMENT ON TABLE hero_contents IS 'Stores intro videos, hero spots, and menu heroes with media references and CTA configuration';
COMMENT ON COLUMN hero_contents.type IS 'Type of hero content: intro_video (launch screen), hero_spot (in-app), or menu_hero';
COMMENT ON COLUMN hero_contents.settings IS 'Playback settings: { loop: boolean, autoplay: boolean, muted: boolean, showOnLaunch: boolean }';
COMMENT ON COLUMN hero_contents.cta_primary IS 'Primary call-to-action: { label: string, action: story|app|url, target?: string }';
COMMENT ON COLUMN hero_contents.cta_secondary IS 'Secondary call-to-action (optional): { label: string, action: story|app|url, target?: string }';
