-- ============================================================
-- Migration: add location + address fields
-- Run this in Supabase SQL Editor (new snippet)
-- ============================================================

alter table events add column location text not null default '';
alter table events add column address text not null default '';
