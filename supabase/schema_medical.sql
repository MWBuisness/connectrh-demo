-- MODULE 9 — Suivi des visites médicales & prévention

-- Types de visite
CREATE TABLE IF NOT EXISTS public.types_visite_medicale (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                TEXT NOT NULL UNIQUE,
  label               TEXT NOT NULL,
  couleur             TEXT NOT NULL DEFAULT '#378ADD',
  description         TEXT,
  periodicite_mois    INTEGER,        -- null = ponctuelle
  obligatoire         BOOLEAN DEFAULT true,
  ordre               INTEGER DEFAULT 0
);

INSERT INTO public.types_visite_medicale (code, label, couleur, description, periodicite_mois, obligatoire, ordre) VALUES
  ('VIP',  'Visite d''information et de prévention',    '#1D9E75', 'VIP initiale dans les 3 mois suivant la prise de poste', 60,   true,  1),
  ('SIR',  'Suivi individuel renforcé (SIR)',           '#E24B4A', 'Pour postes à risques — médecin du travail obligatoire',  24,   true,  2),
  ('VRA',  'Visite de reprise après absence',          '#BA7517', 'Après arrêt > 30j, maternité, longue maladie',          null, true,  3),
  ('VPR',  'Visite de pré-reprise',                    '#534AB7', 'Avant fin d''arrêt > 3 mois sur initiative salarié/médecin', null, false, 4),
  ('VPE',  'Visite de pré-embauche',                   '#378ADD', 'Avant l''embauche sur poste à risque',                  null, false, 5),
  ('VMI',  'Visite mi-carrière (45 ans)',               '#D85A30', 'Obligatoire dans l''année des 45 ans',                  null, true,  6),
  ('VDC',  'Visite de départ / fin de contrat',        '#888780', 'Sur demande du salarié en fin de contrat',              null, false, 7),
  ('VSP',  'Visite spontanée',                         '#888780', 'À la demande du salarié ou de l''employeur',            null, false, 8)
ON CONFLICT (code) DO NOTHING;

-- Visites médicales
CREATE TABLE IF NOT EXISTS public.visites_medicales (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type_code         TEXT NOT NULL REFERENCES public.types_visite_medicale(code),
  -- Planification
  date_prevue       DATE,
  date_realisee     DATE,
  -- Médecin / service
  medecin           TEXT,
  service_sst       TEXT,            -- service de santé au travail
  lieu              TEXT,
  -- Résultat
  aptitude          TEXT CHECK (aptitude IN ('apte','apte_amenagements','inapte_partiel','inapte','en_attente')),
  amenagements      TEXT,            -- description des aménagements si aptitude partielle
  restrictions      TEXT,            -- restrictions médicales
  remarques         TEXT,
  -- Documents
  attestation_path  TEXT,            -- path storage de l'attestation
  -- Suivi
  statut            TEXT NOT NULL DEFAULT 'planifiee'
                    CHECK (statut IN ('planifiee','realisee','annulee','a_planifier')),
  -- Prochaine visite
  prochaine_date    DATE,            -- calculée automatiquement selon périodicité
  rappel_envoye     BOOLEAN DEFAULT false,
  -- Meta
  cree_par          UUID REFERENCES public.profiles(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER visites_medicales_updated_at
  BEFORE UPDATE ON public.visites_medicales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Postes à risques (pour SIR automatique)
CREATE TABLE IF NOT EXISTS public.postes_risques (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code_risque TEXT NOT NULL,
  label       TEXT NOT NULL,
  description TEXT,
  type_suivi  TEXT NOT NULL DEFAULT 'SIR'
              CHECK (type_suivi IN ('SIR','VIP'))
);

INSERT INTO public.postes_risques (code_risque, label, type_suivi) VALUES
  ('AMIANTE',   'Exposition à l''amiante',            'SIR'),
  ('CHIMIQUE',  'Agents chimiques dangereux',          'SIR'),
  ('BRUIT',     'Exposition au bruit (>85 dB)',        'SIR'),
  ('NUIT',      'Travail de nuit',                     'SIR'),
  ('IONISANT',  'Rayonnements ionisants',              'SIR'),
  ('TMS',       'Risque TMS / postures contraignantes','SIR'),
  ('ECRAN',     'Travail sur écran',                   'VIP'),
  ('ROUTIER',   'Grand déplacement / conduite',        'VIP')
ON CONFLICT DO NOTHING;

-- Alertes médicales
CREATE TABLE IF NOT EXISTS public.alertes_medicales (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  visite_id   UUID REFERENCES public.visites_medicales(id),
  type_alerte TEXT NOT NULL CHECK (type_alerte IN (
    'visite_en_retard','visite_a_planifier','visite_proche',
    'aptitude_a_renouveler','inapte_signalement'
  )),
  message     TEXT NOT NULL,
  echeance    DATE,
  urgence     TEXT NOT NULL DEFAULT 'normale' CHECK (urgence IN ('normale','haute','critique')),
  lue         BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- DUER (Document Unique d'Évaluation des Risques)
CREATE TABLE IF NOT EXISTS public.duer_risques (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unite_travail   TEXT NOT NULL,
  risque          TEXT NOT NULL,
  description     TEXT,
  gravite         INTEGER NOT NULL DEFAULT 2 CHECK (gravite BETWEEN 1 AND 4),
  probabilite     INTEGER NOT NULL DEFAULT 2 CHECK (probabilite BETWEEN 1 AND 4),
  criticite       INTEGER GENERATED ALWAYS AS (gravite * probabilite) STORED,
  mesures_actuelles TEXT,
  mesures_prevues   TEXT,
  responsable     TEXT,
  echeance        DATE,
  statut          TEXT DEFAULT 'identifie'
                  CHECK (statut IN ('identifie','en_cours','traite')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER duer_updated_at BEFORE UPDATE ON public.duer_risques
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE public.types_visite_medicale ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visites_medicales     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.postes_risques        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertes_medicales     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duer_risques          ENABLE ROW LEVEL SECURITY;

CREATE POLICY "all_read_types_vm"   ON public.types_visite_medicale FOR SELECT USING (true);
CREATE POLICY "all_read_postes_r"   ON public.postes_risques FOR SELECT USING (true);

-- Salarié voit ses propres visites
CREATE POLICY "own_visites"         ON public.visites_medicales FOR SELECT
  USING (profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
-- Admin/responsable voient tout
CREATE POLICY "admin_visites"       ON public.visites_medicales FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('responsable','rh_admin')));

CREATE POLICY "own_alertes_med"     ON public.alertes_medicales FOR ALL
  USING (profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "admin_alertes_med"   ON public.alertes_medicales FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('responsable','rh_admin')));

CREATE POLICY "admin_duer"          ON public.duer_risques FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('responsable','rh_admin')));

-- INDEX
CREATE INDEX IF NOT EXISTS idx_visites_profile     ON public.visites_medicales(profile_id);
CREATE INDEX IF NOT EXISTS idx_visites_type        ON public.visites_medicales(type_code);
CREATE INDEX IF NOT EXISTS idx_visites_statut      ON public.visites_medicales(statut);
CREATE INDEX IF NOT EXISTS idx_visites_prochaine   ON public.visites_medicales(prochaine_date);
CREATE INDEX IF NOT EXISTS idx_alertes_med_profile ON public.alertes_medicales(profile_id, lue);

-- FONCTION : calculer la prochaine date de visite
CREATE OR REPLACE FUNCTION calc_prochaine_visite(p_type_code TEXT, p_date_realisee DATE)
RETURNS DATE AS $$
DECLARE v_periodicite INTEGER;
BEGIN
  SELECT periodicite_mois INTO v_periodicite FROM public.types_visite_medicale WHERE code = p_type_code;
  IF v_periodicite IS NULL THEN RETURN NULL; END IF;
  RETURN p_date_realisee + (v_periodicite || ' months')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER : auto-calculer prochaine date après visite réalisée
CREATE OR REPLACE FUNCTION auto_prochaine_visite()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.statut = 'realisee' AND NEW.date_realisee IS NOT NULL AND OLD.statut != 'realisee' THEN
    NEW.prochaine_date := calc_prochaine_visite(NEW.type_code, NEW.date_realisee);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prochaine_visite
  BEFORE UPDATE ON public.visites_medicales
  FOR EACH ROW EXECUTE FUNCTION auto_prochaine_visite();
