-- MODULE 6 — Entretiens & Évaluations

-- Types d'entretien
CREATE TABLE IF NOT EXISTS public.types_entretien (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        TEXT NOT NULL UNIQUE,
  label       TEXT NOT NULL,
  couleur     TEXT NOT NULL DEFAULT '#378ADD',
  description TEXT,
  periodicite_mois INTEGER,  -- null = ponctuel
  obligatoire BOOLEAN DEFAULT false,
  ordre       INTEGER DEFAULT 0
);

INSERT INTO public.types_entretien (code, label, couleur, description, periodicite_mois, obligatoire, ordre) VALUES
  ('AEP',  'Entretien professionnel',         '#1D9E75', 'Obligatoire tous les 2 ans (loi du 5 mars 2014)', 24,  true,  1),
  ('AEA',  'Entretien annuel',                '#378ADD', 'Évaluation annuelle des objectifs et compétences', 12,  false, 2),
  ('AMI',  'Entretien de mi-année',           '#534AB7', 'Bilan intermédiaire et ajustement des objectifs',  6,  false, 3),
  ('APE',  'Entretien de période d essai',    '#BA7517', 'Bilan en fin de période d essai',                  null, false, 4),
  ('ARE',  'Entretien de retour absence',     '#D85A30', 'Retour congé maternité, arrêt maladie, etc.',      null, false, 5),
  ('ABI',  'Bilan à 6 ans',                   '#E24B4A', 'Bilan de parcours obligatoire tous les 6 ans',    72,  true,  6),
  ('ADI',  'Entretien de départ',             '#888780', 'Entretien de sortie',                              null, false, 7)
ON CONFLICT (code) DO NOTHING;

-- Campagnes d'entretien
CREATE TABLE IF NOT EXISTS public.campagnes_entretien (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type_code       TEXT NOT NULL REFERENCES public.types_entretien(code),
  titre           TEXT NOT NULL,
  description     TEXT,
  date_debut      DATE NOT NULL,
  date_fin        DATE NOT NULL,
  statut          TEXT NOT NULL DEFAULT 'planifiee'
                  CHECK (statut IN ('planifiee','en_cours','terminee','annulee')),
  cree_par        UUID REFERENCES public.profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Entretiens individuels
CREATE TABLE IF NOT EXISTS public.entretiens (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campagne_id       UUID REFERENCES public.campagnes_entretien(id),
  type_code         TEXT NOT NULL REFERENCES public.types_entretien(code),
  profile_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  manager_id        UUID REFERENCES public.profiles(id),
  -- Planification
  date_prevue       DATE,
  heure_prevue      TIME,
  lieu              TEXT,
  -- Statut workflow
  statut            TEXT NOT NULL DEFAULT 'planifie'
                    CHECK (statut IN ('planifie','prep_manager','prep_salarie','en_cours','realise','signe')),
  -- Préparation manager
  prep_manager      JSONB DEFAULT '{}',
  prep_manager_le   TIMESTAMPTZ,
  -- Préparation salarié
  prep_salarie      JSONB DEFAULT '{}',
  prep_salarie_le   TIMESTAMPTZ,
  -- Compte-rendu (rempli pendant/après l'entretien)
  compte_rendu      JSONB DEFAULT '{}',
  realise_le        TIMESTAMPTZ,
  -- Objectifs
  objectifs_actuels JSONB DEFAULT '[]',  -- [{id, titre, description, echeance, note, atteint}]
  objectifs_nouveaux JSONB DEFAULT '[]', -- [{id, titre, description, echeance, priorite}]
  -- Compétences notées
  competences       JSONB DEFAULT '[]',  -- [{id, label, note_1_5, commentaire}]
  -- Note globale
  note_globale      NUMERIC(3,1),        -- 1.0 à 5.0
  -- Signature
  signe_manager     BOOLEAN DEFAULT false
  , signe_manager_le TIMESTAMPTZ
  , signe_salarie   BOOLEAN DEFAULT false
  , signe_salarie_le TIMESTAMPTZ
  -- SILAE / légal
  , transmis_silae  BOOLEAN DEFAULT false
  , created_at      TIMESTAMPTZ DEFAULT NOW()
  , updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER entretiens_updated_at BEFORE UPDATE ON public.entretiens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Alertes légales entretien professionnel
CREATE TABLE IF NOT EXISTS public.alertes_entretien (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type_alerte     TEXT NOT NULL CHECK (type_alerte IN ('ep_2ans','ep_6ans','ep_en_retard')),
  message         TEXT NOT NULL,
  date_alerte     DATE NOT NULL DEFAULT CURRENT_DATE,
  echeance        DATE,
  lue             BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.types_entretien       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campagnes_entretien   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entretiens            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertes_entretien     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "all_read_types_ent"    ON public.types_entretien FOR SELECT USING (true);
CREATE POLICY "all_read_campagnes"    ON public.campagnes_entretien FOR SELECT USING (true);
CREATE POLICY "admin_write_campagnes" ON public.campagnes_entretien FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('responsable','rh_admin')));

-- Entretiens : salarié voit les siens
CREATE POLICY "own_entretiens"        ON public.entretiens FOR SELECT USING (profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "own_entretiens_update" ON public.entretiens FOR UPDATE USING (profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
-- Manager voit les entretiens de son équipe
CREATE POLICY "manager_entretiens"    ON public.entretiens FOR ALL USING (
  manager_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'rh_admin')
);

CREATE POLICY "own_alertes_ent"       ON public.alertes_entretien FOR ALL USING (profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "admin_alertes_ent"     ON public.alertes_entretien FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('responsable','rh_admin')));

-- INDEX
CREATE INDEX IF NOT EXISTS idx_entretiens_profile  ON public.entretiens(profile_id);
CREATE INDEX IF NOT EXISTS idx_entretiens_manager  ON public.entretiens(manager_id);
CREATE INDEX IF NOT EXISTS idx_entretiens_statut   ON public.entretiens(statut);
CREATE INDEX IF NOT EXISTS idx_entretiens_type     ON public.entretiens(type_code);
CREATE INDEX IF NOT EXISTS idx_alertes_ent_profile ON public.alertes_entretien(profile_id, lue);

-- Compétences pré-définies (référentiel)
CREATE TABLE IF NOT EXISTS public.competences_referentiel (
  id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  categorie TEXT NOT NULL,
  label   TEXT NOT NULL,
  ordre   INTEGER DEFAULT 0
);

INSERT INTO public.competences_referentiel (categorie, label, ordre) VALUES
  ('Savoir-faire','Maîtrise technique du poste',1),
  ('Savoir-faire','Qualité du travail rendu',2),
  ('Savoir-faire','Respect des délais',3),
  ('Savoir-faire','Autonomie',4),
  ('Savoir-être','Communication',5),
  ('Savoir-être','Travail en équipe',6),
  ('Savoir-être','Adaptabilité',7),
  ('Savoir-être','Initiative et proactivité',8),
  ('Management','Animation d équipe',9),
  ('Management','Développement des collaborateurs',10),
  ('Management','Prise de décision',11)
ON CONFLICT DO NOTHING;

ALTER TABLE public.competences_referentiel ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_read_comp" ON public.competences_referentiel FOR SELECT USING (true);
