-- ============================================================
-- MODULE 2 — Congés & Absences
-- À exécuter après schema.sql (module 1)
-- ============================================================

-- ============================================================
-- TABLE : types_absence
-- ============================================================
CREATE TABLE IF NOT EXISTS public.types_absence (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        TEXT NOT NULL UNIQUE,
  label       TEXT NOT NULL,
  couleur     TEXT NOT NULL DEFAULT '#378ADD',
  decompte    BOOLEAN NOT NULL DEFAULT true,  -- déduit du solde
  ordre       INTEGER DEFAULT 0
);

INSERT INTO public.types_absence (code, label, couleur, decompte, ordre) VALUES
  ('CP',   'Congés payés',              '#378ADD', true,  1),
  ('RTT',  'RTT',                       '#1D9E75', true,  2),
  ('CSS',  'Congé sans solde',          '#888780', true,  3),
  ('REC',  'Récupération',              '#534AB7', true,  4),
  ('MAL',  'Arrêt maladie',             '#E24B4A', false, 5),
  ('MAT',  'Congé maternité/paternité', '#D85A30', false, 6),
  ('FOR',  'Formation',                 '#BA7517', false, 7),
  ('DEP',  'Déplacement professionnel', '#0F6E56', false, 8),
  ('EV',   'Évènement familial',        '#993C1D', false, 9)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- TABLE : soldes_conges (compteurs par salarié)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.soldes_conges (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type_code       TEXT NOT NULL REFERENCES public.types_absence(code),
  annee           INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  solde_initial   NUMERIC(5,1) NOT NULL DEFAULT 0,
  solde_acquis    NUMERIC(5,1) NOT NULL DEFAULT 0,
  solde_pris      NUMERIC(5,1) NOT NULL DEFAULT 0,
  solde_en_cours  NUMERIC(5,1) NOT NULL DEFAULT 0,  -- demandes en attente
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, type_code, annee)
);

-- ============================================================
-- TABLE : demandes_conges
-- ============================================================
CREATE TABLE IF NOT EXISTS public.demandes_conges (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type_code         TEXT NOT NULL REFERENCES public.types_absence(code),
  date_debut        DATE NOT NULL,
  date_fin          DATE NOT NULL,
  nb_jours          NUMERIC(4,1) NOT NULL,
  demi_journee_debut TEXT CHECK (demi_journee_debut IN ('matin','apres-midi')),
  demi_journee_fin  TEXT CHECK (demi_journee_fin IN ('matin','apres-midi')),
  motif             TEXT,
  statut            TEXT NOT NULL DEFAULT 'en_attente'
                    CHECK (statut IN ('en_attente','validee','refusee','annulee')),
  -- Validation
  validee_par       UUID REFERENCES public.profiles(id),
  validee_le        TIMESTAMPTZ,
  commentaire_valid TEXT,
  -- SILAE
  silae_transmis    BOOLEAN DEFAULT false,
  silae_transmis_le TIMESTAMPTZ,
  silae_reference   TEXT,
  -- Meta
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger updated_at
CREATE TRIGGER demandes_conges_updated_at
  BEFORE UPDATE ON public.demandes_conges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE : jours_feries (France métropolitaine)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.jours_feries (
  date  DATE PRIMARY KEY,
  label TEXT NOT NULL
);

INSERT INTO public.jours_feries (date, label) VALUES
  ('2025-01-01', 'Jour de l''An'),
  ('2025-04-21', 'Lundi de Pâques'),
  ('2025-05-01', 'Fête du Travail'),
  ('2025-05-08', 'Victoire 1945'),
  ('2025-05-29', 'Ascension'),
  ('2025-06-09', 'Lundi de Pentecôte'),
  ('2025-07-14', 'Fête Nationale'),
  ('2025-08-15', 'Assomption'),
  ('2025-11-01', 'Toussaint'),
  ('2025-11-11', 'Armistice'),
  ('2025-12-25', 'Noël'),
  ('2026-01-01', 'Jour de l''An'),
  ('2026-04-06', 'Lundi de Pâques'),
  ('2026-05-01', 'Fête du Travail'),
  ('2026-05-08', 'Victoire 1945'),
  ('2026-05-14', 'Ascension'),
  ('2026-05-25', 'Lundi de Pentecôte'),
  ('2026-07-14', 'Fête Nationale'),
  ('2026-08-15', 'Assomption'),
  ('2026-11-01', 'Toussaint'),
  ('2026-11-11', 'Armistice'),
  ('2026-12-25', 'Noël')
ON CONFLICT (date) DO NOTHING;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.types_absence    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soldes_conges    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demandes_conges  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jours_feries     ENABLE ROW LEVEL SECURITY;

-- types_absence : lecture pour tous
CREATE POLICY "all_read_types" ON public.types_absence FOR SELECT USING (true);

-- jours_feries : lecture pour tous
CREATE POLICY "all_read_feries" ON public.jours_feries FOR SELECT USING (true);

-- soldes : salarié voit les siens
CREATE POLICY "own_soldes" ON public.soldes_conges
  FOR ALL USING (
    profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- soldes : responsable et admin voient tout
CREATE POLICY "manager_soldes" ON public.soldes_conges
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role IN ('responsable','rh_admin')
    )
  );

-- soldes : admin peut modifier
CREATE POLICY "admin_soldes_write" ON public.soldes_conges
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'rh_admin'
    )
  );

-- demandes : salarié gère les siennes
CREATE POLICY "own_demandes" ON public.demandes_conges
  FOR ALL USING (
    profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- demandes : responsable voit son équipe
CREATE POLICY "manager_demandes" ON public.demandes_conges
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role IN ('responsable','rh_admin')
    )
  );

-- ============================================================
-- INDEX
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_demandes_profile    ON public.demandes_conges(profile_id);
CREATE INDEX IF NOT EXISTS idx_demandes_statut     ON public.demandes_conges(statut);
CREATE INDEX IF NOT EXISTS idx_demandes_dates      ON public.demandes_conges(date_debut, date_fin);
CREATE INDEX IF NOT EXISTS idx_soldes_profile      ON public.soldes_conges(profile_id);

-- ============================================================
-- FONCTION : calculer jours ouvrés entre deux dates
-- (exclut week-ends + jours fériés)
-- ============================================================
CREATE OR REPLACE FUNCTION calcul_jours_ouvres(p_debut DATE, p_fin DATE)
RETURNS NUMERIC AS $$
DECLARE
  v_jours NUMERIC := 0;
  v_date DATE := p_debut;
BEGIN
  WHILE v_date <= p_fin LOOP
    IF EXTRACT(DOW FROM v_date) NOT IN (0, 6)
      AND NOT EXISTS (SELECT 1 FROM public.jours_feries WHERE date = v_date)
    THEN
      v_jours := v_jours + 1;
    END IF;
    v_date := v_date + INTERVAL '1 day';
  END LOOP;
  RETURN v_jours;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FONCTION : initialiser les soldes d'un nouveau salarié
-- ============================================================
CREATE OR REPLACE FUNCTION init_soldes_salarie(p_profile_id UUID, p_annee INTEGER DEFAULT NULL)
RETURNS VOID AS $$
DECLARE
  v_annee INTEGER := COALESCE(p_annee, EXTRACT(YEAR FROM CURRENT_DATE));
BEGIN
  INSERT INTO public.soldes_conges (profile_id, type_code, annee, solde_initial, solde_acquis)
  VALUES
    (p_profile_id, 'CP',  v_annee, 25, 25),
    (p_profile_id, 'RTT', v_annee, 10, 10),
    (p_profile_id, 'REC', v_annee, 0,  0)
  ON CONFLICT (profile_id, type_code, annee) DO NOTHING;
END;
$$ LANGUAGE plpgsql;
