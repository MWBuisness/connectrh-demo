-- ============================================================
-- MODULE 3 — Gestion du temps & badgeage
-- À exécuter après schema.sql et schema_conges.sql
-- ============================================================

-- ============================================================
-- TABLE : pointages (badgeage entrée/sortie)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pointages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  heure_entree    TIME,
  heure_sortie    TIME,
  pause_minutes   INTEGER DEFAULT 0,
  duree_minutes   INTEGER GENERATED ALWAYS AS (
    CASE
      WHEN heure_entree IS NOT NULL AND heure_sortie IS NOT NULL
      THEN EXTRACT(EPOCH FROM (heure_sortie - heure_entree))::INTEGER / 60 - COALESCE(pause_minutes, 0)
      ELSE NULL
    END
  ) STORED,
  type_journee    TEXT NOT NULL DEFAULT 'bureau'
                  CHECK (type_journee IN ('bureau','teletravail','deplacement','formation','absent')),
  note            TEXT,
  statut          TEXT NOT NULL DEFAULT 'en_cours'
                  CHECK (statut IN ('en_cours','valide','anomalie')),
  valide_par      UUID REFERENCES public.profiles(id),
  valide_le       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, date)
);

CREATE TRIGGER pointages_updated_at
  BEFORE UPDATE ON public.pointages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE : compteurs_temps (cumuls mensuels)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.compteurs_temps (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  annee               INTEGER NOT NULL,
  mois                INTEGER NOT NULL CHECK (mois BETWEEN 1 AND 12),
  -- Heures
  heures_contractuelles NUMERIC(6,2) NOT NULL DEFAULT 0,
  heures_realisees    NUMERIC(6,2) NOT NULL DEFAULT 0,
  heures_sup          NUMERIC(6,2) NOT NULL DEFAULT 0,
  heures_recup        NUMERIC(6,2) NOT NULL DEFAULT 0,
  -- Jours
  jours_bureau        INTEGER NOT NULL DEFAULT 0,
  jours_teletravail   INTEGER NOT NULL DEFAULT 0,
  jours_deplacement   INTEGER NOT NULL DEFAULT 0,
  jours_absence       INTEGER NOT NULL DEFAULT 0,
  -- Forfait jours (cadres)
  jours_forfait       INTEGER NOT NULL DEFAULT 0,   -- jours travaillés dans le mois
  -- SILAE
  silae_transmis      BOOLEAN DEFAULT false,
  silae_transmis_le   TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, annee, mois)
);

-- ============================================================
-- TABLE : teletravail_compteurs (suivi annuel TT)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.teletravail_compteurs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  annee           INTEGER NOT NULL,
  plafond_jours   INTEGER NOT NULL DEFAULT 100,  -- selon accord TT
  jours_pris      INTEGER NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, annee)
);

-- ============================================================
-- TABLE : alertes_temps
-- ============================================================
CREATE TABLE IF NOT EXISTS public.alertes_temps (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type_alerte TEXT NOT NULL CHECK (type_alerte IN (
    'heures_sup_seuil','forfait_jours_seuil','teletravail_seuil',
    'pointage_manquant','anomalie_duree'
  )),
  message     TEXT NOT NULL,
  date_alerte DATE NOT NULL DEFAULT CURRENT_DATE,
  lue         BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.pointages             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compteurs_temps       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teletravail_compteurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertes_temps         ENABLE ROW LEVEL SECURITY;

-- Pointages : salarié gère les siens
CREATE POLICY "own_pointages" ON public.pointages
  FOR ALL USING (
    profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );
CREATE POLICY "manager_pointages" ON public.pointages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('responsable','rh_admin'))
  );
CREATE POLICY "admin_pointages_write" ON public.pointages
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('responsable','rh_admin'))
  );

-- Compteurs
CREATE POLICY "own_compteurs" ON public.compteurs_temps
  FOR ALL USING (
    profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );
CREATE POLICY "manager_compteurs" ON public.compteurs_temps
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('responsable','rh_admin'))
  );

-- Télétravail
CREATE POLICY "own_tt" ON public.teletravail_compteurs
  FOR ALL USING (
    profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );
CREATE POLICY "manager_tt" ON public.teletravail_compteurs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('responsable','rh_admin'))
  );

-- Alertes
CREATE POLICY "own_alertes" ON public.alertes_temps
  FOR ALL USING (
    profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );
CREATE POLICY "manager_alertes" ON public.alertes_temps
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('responsable','rh_admin'))
  );

-- ============================================================
-- INDEX
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_pointages_profile_date ON public.pointages(profile_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_compteurs_profile      ON public.compteurs_temps(profile_id, annee, mois);
CREATE INDEX IF NOT EXISTS idx_alertes_profile        ON public.alertes_temps(profile_id, lue);

-- ============================================================
-- FONCTION : calculer et upsert le compteur mensuel
-- ============================================================
CREATE OR REPLACE FUNCTION recalcul_compteur_mensuel(p_profile_id UUID, p_annee INTEGER, p_mois INTEGER)
RETURNS VOID AS $$
DECLARE
  v_heures_realisees NUMERIC;
  v_jours_bureau     INTEGER;
  v_jours_tt         INTEGER;
  v_jours_dep        INTEGER;
  v_jours_abs        INTEGER;
  v_heures_contract  NUMERIC;
  v_temps_travail    INTEGER;
BEGIN
  SELECT temps_travail INTO v_temps_travail
  FROM public.profiles WHERE id = p_profile_id;

  -- Heures contractuelles = (jours ouvrés du mois × 8h × taux temps partiel)
  v_heures_contract := (SELECT COUNT(*) FROM generate_series(
    make_date(p_annee, p_mois, 1),
    (make_date(p_annee, p_mois, 1) + INTERVAL '1 month - 1 day')::DATE,
    '1 day'::INTERVAL
  ) AS d
  WHERE EXTRACT(DOW FROM d) NOT IN (0,6)
  AND NOT EXISTS (SELECT 1 FROM public.jours_feries WHERE date = d::DATE)
  ) * 8 * COALESCE(v_temps_travail, 100) / 100.0;

  SELECT
    COALESCE(SUM(duree_minutes)::NUMERIC / 60, 0),
    COUNT(*) FILTER (WHERE type_journee = 'bureau'),
    COUNT(*) FILTER (WHERE type_journee = 'teletravail'),
    COUNT(*) FILTER (WHERE type_journee = 'deplacement'),
    COUNT(*) FILTER (WHERE type_journee = 'absent')
  INTO v_heures_realisees, v_jours_bureau, v_jours_tt, v_jours_dep, v_jours_abs
  FROM public.pointages
  WHERE profile_id = p_profile_id
    AND EXTRACT(YEAR FROM date) = p_annee
    AND EXTRACT(MONTH FROM date) = p_mois;

  INSERT INTO public.compteurs_temps (
    profile_id, annee, mois,
    heures_contractuelles, heures_realisees,
    heures_sup, jours_bureau, jours_teletravail,
    jours_deplacement, jours_absence,
    jours_forfait
  ) VALUES (
    p_profile_id, p_annee, p_mois,
    v_heures_contract, v_heures_realisees,
    GREATEST(0, v_heures_realisees - v_heures_contract),
    v_jours_bureau, v_jours_tt,
    v_jours_dep, v_jours_abs,
    v_jours_bureau + v_jours_tt + v_jours_dep
  )
  ON CONFLICT (profile_id, annee, mois) DO UPDATE SET
    heures_contractuelles = EXCLUDED.heures_contractuelles,
    heures_realisees      = EXCLUDED.heures_realisees,
    heures_sup            = EXCLUDED.heures_sup,
    jours_bureau          = EXCLUDED.jours_bureau,
    jours_teletravail     = EXCLUDED.jours_teletravail,
    jours_deplacement     = EXCLUDED.jours_deplacement,
    jours_absence         = EXCLUDED.jours_absence,
    jours_forfait         = EXCLUDED.jours_forfait,
    updated_at            = NOW();
END;
$$ LANGUAGE plpgsql;
