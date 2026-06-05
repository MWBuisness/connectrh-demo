-- MODULE 7 — Plan de formation & Développement des compétences

-- Catalogue des formations
CREATE TABLE IF NOT EXISTS public.formations_catalogue (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titre           TEXT NOT NULL,
  organisme       TEXT,
  description     TEXT,
  categorie       TEXT NOT NULL DEFAULT 'metier'
                  CHECK (categorie IN ('metier','securite','reglementaire','management','bureautique','langue','autre')),
  duree_heures    NUMERIC(6,1),
  duree_jours     NUMERIC(4,1),
  cout_moyen      NUMERIC(10,2),
  modalite        TEXT NOT NULL DEFAULT 'presentiel'
                  CHECK (modalite IN ('presentiel','distanciel','hybride','e-learning')),
  certifiante     BOOLEAN DEFAULT false,
  eligible_cpf    BOOLEAN DEFAULT false,
  renouvellement_mois INTEGER,
  actif           BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.formations_catalogue (titre, organisme, categorie, duree_heures, cout_moyen, modalite, certifiante, eligible_cpf) VALUES
  ('Sécurité incendie - Évacuation', 'Interne', 'securite', 3.5, 0, 'presentiel', false, false),
  ('Premiers secours - SST', 'Croix Rouge', 'securite', 14, 350, 'presentiel', true, true),
  ('RGPD - Sensibilisation', 'Interne', 'reglementaire', 3, 0, 'e-learning', false, false),
  ('Excel avancé', 'TOSA', 'bureautique', 14, 890, 'presentiel', true, true),
  ('Management d équipe', 'CEGOS', 'management', 21, 1490, 'presentiel', false, false),
  ('Anglais professionnel', 'Wall Street English', 'langue', 40, 1200, 'hybride', true, true),
  ('Habilitation électrique B0', 'Bureau Veritas', 'securite', 14, 650, 'presentiel', true, false)
ON CONFLICT DO NOTHING;

-- Plan de développement des compétences (niveau entreprise)
CREATE TABLE IF NOT EXISTS public.plans_formation (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  annee       INTEGER NOT NULL,
  titre       TEXT NOT NULL,
  budget_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  budget_engage NUMERIC(12,2) NOT NULL DEFAULT 0,
  statut      TEXT NOT NULL DEFAULT 'brouillon'
              CHECK (statut IN ('brouillon','valide','cloture')),
  cree_par    UUID REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(annee)
);

-- Demandes de formation (par salarié)
CREATE TABLE IF NOT EXISTS public.demandes_formation (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id           UUID REFERENCES public.plans_formation(id),
  formation_id      UUID REFERENCES public.formations_catalogue(id),
  -- Si formation hors catalogue
  titre_libre       TEXT,
  organisme_libre   TEXT,
  description_libre TEXT,
  -- Planification
  date_souhaitee    DATE,
  date_debut        DATE,
  date_fin          DATE,
  duree_heures      NUMERIC(6,1),
  -- Coûts
  cout_estime       NUMERIC(10,2),
  cout_reel         NUMERIC(10,2),
  -- Financement
  financement       TEXT NOT NULL DEFAULT 'entreprise'
                    CHECK (financement IN ('entreprise','cpf','cpf_abonde','opco','personnel')),
  montant_opco      NUMERIC(10,2),
  dossier_opco_ref  TEXT,
  heures_cpf        NUMERIC(6,1),
  -- Statut workflow
  statut            TEXT NOT NULL DEFAULT 'demande'
                    CHECK (statut IN ('demande','validee_manager','validee_rh','planifiee','en_cours','terminee','annulee','refusee')),
  motif_refus       TEXT,
  -- Résultat
  note_satisfaction INTEGER CHECK (note_satisfaction BETWEEN 1 AND 5),
  commentaire_fin   TEXT,
  attestation_path  TEXT,
  -- Obligation légale (renouvellement)
  renouvellement_de UUID REFERENCES public.demandes_formation(id),
  -- Meta
  origine           TEXT DEFAULT 'salarie' CHECK (origine IN ('salarie','manager','rh','entretien')),
  validee_manager_par  UUID REFERENCES public.profiles(id),
  validee_manager_le   TIMESTAMPTZ,
  validee_rh_par       UUID REFERENCES public.profiles(id),
  validee_rh_le        TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER demandes_formation_updated_at BEFORE UPDATE ON public.demandes_formation
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Suivi des heures CPF par salarié
CREATE TABLE IF NOT EXISTS public.cpf_compteurs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  heures_droit NUMERIC(6,1) NOT NULL DEFAULT 500,
  heures_utilise NUMERIC(6,1) NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Alertes formations réglementaires (renouvellements)
CREATE TABLE IF NOT EXISTS public.alertes_formation (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  formation_id UUID REFERENCES public.formations_catalogue(id),
  titre       TEXT NOT NULL,
  echeance    DATE NOT NULL,
  lue         BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.formations_catalogue  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans_formation        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demandes_formation     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpf_compteurs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertes_formation      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "all_read_catalogue"     ON public.formations_catalogue FOR SELECT USING (true);
CREATE POLICY "admin_write_catalogue"  ON public.formations_catalogue FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'rh_admin'));
CREATE POLICY "all_read_plans"         ON public.plans_formation FOR SELECT USING (true);
CREATE POLICY "admin_write_plans"      ON public.plans_formation FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'rh_admin'));
CREATE POLICY "own_demandes_form"      ON public.demandes_formation FOR ALL USING (profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "manager_demandes_form"  ON public.demandes_formation FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('responsable','rh_admin')));
CREATE POLICY "own_cpf"               ON public.cpf_compteurs FOR ALL USING (profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "admin_cpf"             ON public.cpf_compteurs FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('responsable','rh_admin')));
CREATE POLICY "own_alertes_form"      ON public.alertes_formation FOR ALL USING (profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "admin_alertes_form"    ON public.alertes_formation FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('responsable','rh_admin')));

CREATE INDEX IF NOT EXISTS idx_demandes_form_profile ON public.demandes_formation(profile_id);
CREATE INDEX IF NOT EXISTS idx_demandes_form_statut  ON public.demandes_formation(statut);
CREATE INDEX IF NOT EXISTS idx_demandes_form_plan    ON public.demandes_formation(plan_id);
CREATE INDEX IF NOT EXISTS idx_alertes_form_profile  ON public.alertes_formation(profile_id, echeance);
