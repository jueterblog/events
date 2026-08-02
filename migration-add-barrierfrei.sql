-- ============================================================
-- Migration: add barrier-free (Barrierefrei) fields
-- Run this in Supabase SQL Editor (new snippet)
-- ============================================================

alter table events add column is_barrierfrei boolean not null default false;
alter table events add column barrierfrei_info text not null default '';
