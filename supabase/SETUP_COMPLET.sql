-- ============================================================
-- SIRH ConnectRH — Schéma Supabase
-- À exécuter dans : Supabase > SQL Editor > New Query
-- ============================================================

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE : profiles (étendue de auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  role                TEXT NOT NULL DEFAULT 'salarie' CHECK (role IN ('salarie','responsable','rh_admin')),
  -- Infos personnelles
  prenom              TEXT NOT NULL DEFAULT '',
  nom                 TEXT NOT NULL DEFAULT '',
  email               TEXT NOT NULL DEFAULT '',
  telephone           TEXT,
  date_naissance      DATE,
  lieu_naissance      TEXT,
  nationalite         TEXT DEFAULT 'Française',
  statut_marital      TEXT CHECK (statut_marital IN ('Célibataire','Marié(e)','Pacsé(e)','Divorcé(e)','Veuf/Veuve')),
  nombre_enfants      INTEGER DEFAULT 0,
  -- Adresse
  adresse             TEXT,
  code_postal         TEXT,
  ville               TEXT,
  pays                TEXT DEFAULT 'France',
  -- Contrat
  poste               TEXT NOT NULL DEFAULT '',
  departement         TEXT NOT NULL DEFAULT '',
  type_contrat        TEXT NOT NULL DEFAULT 'CDI' CHECK (type_contrat IN ('CDI','CDD','Stage','Alternance','Freelance')),
  date_entree         DATE NOT NULL DEFAULT CURRENT_DATE,
  date_fin_contrat    DATE,
  temps_travail       INTEGER NOT NULL DEFAULT 100 CHECK (temps_travail BETWEEN 1 AND 100),
  convention_collective TEXT,
  responsable_id      UUID REFERENCES public.profiles(id),
  -- Bancaire (chiffré côté app)
  iban                TEXT,
  bic                 TEXT,
  -- Paie
  salaire_brut        NUMERIC(10,2),
  -- Meta
  avatar_url          TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE : departements
-- ============================================================
CREATE TABLE IF NOT EXISTS public.departements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom             TEXT NOT NULL UNIQUE,
  responsable_id  UUID REFERENCES public.profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Données initiales
INSERT INTO public.departements (nom) VALUES
  ('Direction'),('Ressources Humaines'),('Comptabilité'),
  ('Commercial'),('Marketing'),('Technique'),('Juridique'),('Finance')
ON CONFLICT (nom) DO NOTHING;

-- ============================================================
-- TRIGGER : updated_at automatique
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TRIGGER : créer profil à l'inscription
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, prenom, nom, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'prenom', ''),
    COALESCE(NEW.raw_user_meta_data->>'nom', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'salarie')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- RLS — Row Level Security
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departements ENABLE ROW LEVEL SECURITY;

-- Chaque salarié voit son propre profil
CREATE POLICY "salarie_own_profile" ON public.profiles
  FOR ALL USING (auth.uid() = user_id);

-- Les responsables voient leur équipe
CREATE POLICY "responsable_sees_team" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles AS me
      WHERE me.user_id = auth.uid()
      AND me.role IN ('responsable','rh_admin')
    )
  );

-- Les admins RH peuvent tout modifier
CREATE POLICY "rh_admin_all" ON public.profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles AS me
      WHERE me.user_id = auth.uid()
      AND me.role = 'rh_admin'
    )
  );

-- Tout le monde peut lire les départements
CREATE POLICY "all_read_departements" ON public.departements
  FOR SELECT USING (true);

-- Seuls les admins peuvent modifier les départements
CREATE POLICY "rh_admin_departements" ON public.departements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles AS me
      WHERE me.user_id = auth.uid()
      AND me.role = 'rh_admin'
    )
  );

-- ============================================================
-- INDEX pour les performances
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_responsable_id ON public.profiles(responsable_id);
CREATE INDEX IF NOT EXISTS idx_profiles_departement ON public.profiles(departement);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
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
-- ============================================================
-- MODULE 4 — Coffre-fort & Signature électronique
-- À exécuter après les schemas précédents
-- ============================================================

-- ============================================================
-- TABLE : categories_document
-- ============================================================
CREATE TABLE IF NOT EXISTS public.categories_document (
  id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code    TEXT NOT NULL UNIQUE,
  label   TEXT NOT NULL,
  icone   TEXT NOT NULL DEFAULT 'file',
  couleur TEXT NOT NULL DEFAULT '#378ADD',
  ordre   INTEGER DEFAULT 0
);

INSERT INTO public.categories_document (code, label, icone, couleur, ordre) VALUES
  ('BULLETIN',    'Bulletin de paie',         'file-invoice',    '#1D9E75', 1),
  ('CONTRAT',     'Contrat de travail',        'file-certificate','#378ADD', 2),
  ('AVENANT',     'Avenant au contrat',        'file-text',       '#534AB7', 3),
  ('RUPTURE',     'Rupture / Solde tout compte','file-x',         '#E24B4A', 4),
  ('FORMATION',   'Attestation formation',     'school',          '#BA7517', 5),
  ('MEDICAL',     'Document médical',          'heart-rate',      '#D85A30', 6),
  ('IDENTITE',    'Pièce d''identité',         'id-badge-2',      '#888780', 7),
  ('AUTRE',       'Autre document',            'file',            '#888780', 8)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- TABLE : documents (coffre-fort)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.documents (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Propriétaire
  profile_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Métadonnées
  categorie_code      TEXT NOT NULL REFERENCES public.categories_document(code),
  titre               TEXT NOT NULL,
  description         TEXT,
  -- Fichier (stocké dans Supabase Storage)
  storage_path        TEXT NOT NULL,   -- chemin dans le bucket
  nom_fichier         TEXT NOT NULL,
  taille_octets       INTEGER,
  mime_type           TEXT NOT NULL DEFAULT 'application/pdf',
  -- Période concernée (pour bulletins : mois/année)
  periode_mois        INTEGER CHECK (periode_mois BETWEEN 1 AND 12),
  periode_annee       INTEGER,
  -- Signature
  signature_requise   BOOLEAN NOT NULL DEFAULT false,
  signature_mode      TEXT DEFAULT 'avancee'
                      CHECK (signature_mode IN ('simple','avancee','docusign')),
  -- Signature avancée (interne)
  signe               BOOLEAN NOT NULL DEFAULT false,
  signe_le            TIMESTAMPTZ,
  signature_data      TEXT,           -- JSON : {initiales, trace SVG, ip, user_agent}
  signature_hash      TEXT,           -- SHA-256 du fichier au moment de la signature
  -- DocuSign (si mode docusign)
  docusign_envelope_id TEXT,
  docusign_statut     TEXT,
  docusign_signe_le   TIMESTAMPTZ,
  -- Émetteur
  emis_par            UUID REFERENCES public.profiles(id),
  -- Accès
  visible_salarie     BOOLEAN NOT NULL DEFAULT true,
  -- Archivage légal
  date_archivage_legal DATE,          -- date limite de conservation
  -- Meta
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE : demandes_signature
-- Permet au RH d'envoyer une demande de signature à un salarié
-- ============================================================
CREATE TABLE IF NOT EXISTS public.demandes_signature (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id     UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  profile_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  statut          TEXT NOT NULL DEFAULT 'en_attente'
                  CHECK (statut IN ('en_attente','signe','refuse','expire')),
  message         TEXT,           -- message personnalisé du RH
  date_limite     DATE,           -- date d'expiration de la demande
  signe_le        TIMESTAMPTZ,
  refuse_le       TIMESTAMPTZ,
  motif_refus     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, profile_id)
);

-- ============================================================
-- TABLE : parametres_docusign (configuration par entreprise)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.parametres_docusign (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actif           BOOLEAN NOT NULL DEFAULT false,
  account_id      TEXT,
  integration_key TEXT,
  secret_key      TEXT,            -- chiffré en production
  base_uri        TEXT DEFAULT 'https://demo.docusign.net/restapi',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Insérer une ligne vide par défaut
INSERT INTO public.parametres_docusign (actif) VALUES (false)
ON CONFLICT DO NOTHING;

-- ============================================================
-- STORAGE BUCKET (à créer dans Supabase Dashboard)
-- Dashboard > Storage > New Bucket : "documents-rh"
-- Private bucket (accès via signed URLs uniquement)
-- ============================================================
-- NOTE : exécuter manuellement dans le dashboard Supabase :
-- 1. Storage > New bucket > Nom: "documents-rh" > Private
-- 2. Ou via API : supabase.storage.createBucket('documents-rh', { public: false })

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.documents           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demandes_signature  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories_document ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parametres_docusign ENABLE ROW LEVEL SECURITY;

-- Catégories : lecture pour tous
CREATE POLICY "all_read_categories" ON public.categories_document
  FOR SELECT USING (true);

-- Documents : salarié voit les siens (si visible)
CREATE POLICY "own_documents_read" ON public.documents
  FOR SELECT USING (
    profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    AND visible_salarie = true
  );

-- Documents : salarié peut déposer ses propres docs
CREATE POLICY "own_documents_insert" ON public.documents
  FOR INSERT WITH CHECK (
    profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Documents : salarié peut mettre à jour ses propres docs (pour signature)
CREATE POLICY "own_documents_update" ON public.documents
  FOR UPDATE USING (
    profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Documents : admin et responsable voient tout
CREATE POLICY "manager_documents" ON public.documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role IN ('responsable','rh_admin')
    )
  );

-- Demandes signature : le salarié concerné
CREATE POLICY "own_demandes_sig" ON public.demandes_signature
  FOR ALL USING (
    profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Demandes signature : admin/responsable
CREATE POLICY "admin_demandes_sig" ON public.demandes_signature
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role IN ('responsable','rh_admin')
    )
  );

-- DocuSign params : admin seulement
CREATE POLICY "admin_docusign" ON public.parametres_docusign
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'rh_admin'
    )
  );

-- ============================================================
-- INDEX
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_documents_profile     ON public.documents(profile_id);
CREATE INDEX IF NOT EXISTS idx_documents_categorie   ON public.documents(categorie_code);
CREATE INDEX IF NOT EXISTS idx_documents_periode     ON public.documents(periode_annee, periode_mois);
CREATE INDEX IF NOT EXISTS idx_documents_signature   ON public.documents(signature_requise, signe);
CREATE INDEX IF NOT EXISTS idx_demsig_profile        ON public.demandes_signature(profile_id, statut);
CREATE INDEX IF NOT EXISTS idx_demsig_document       ON public.demandes_signature(document_id);

-- ============================================================
-- FONCTION : générer URL signée (appelée depuis l'app)
-- En production, appeler supabase.storage.from('documents-rh').createSignedUrl()
-- ============================================================

-- ============================================================
-- FONCTION : archivage légal bulletins (50 ans)
-- ============================================================
CREATE OR REPLACE FUNCTION set_archivage_legal()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.categorie_code = 'BULLETIN' THEN
    NEW.date_archivage_legal := (CURRENT_DATE + INTERVAL '50 years')::DATE;
  ELSIF NEW.categorie_code IN ('CONTRAT','AVENANT','RUPTURE') THEN
    NEW.date_archivage_legal := (CURRENT_DATE + INTERVAL '5 years')::DATE;
  ELSE
    NEW.date_archivage_legal := (CURRENT_DATE + INTERVAL '3 years')::DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_archivage_legal
  BEFORE INSERT ON public.documents
  FOR EACH ROW EXECUTE FUNCTION set_archivage_legal();
-- MODULE 5 — Onboarding / Offboarding & Matériel

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Types de matériel
CREATE TABLE IF NOT EXISTS public.types_materiel (
  id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code     TEXT NOT NULL UNIQUE,
  label    TEXT NOT NULL,
  icone    TEXT NOT NULL DEFAULT 'device-laptop',
  couleur  TEXT NOT NULL DEFAULT '#378ADD',
  champs_edl  JSONB NOT NULL DEFAULT '[]',
  ordre    INTEGER DEFAULT 0
);

INSERT INTO public.types_materiel (code, label, icone, couleur, champs_edl, ordre) VALUES
('VEHICULE','Véhicule de fonction','car','#378ADD','[
  {"id":"immatriculation","label":"Immatriculation","type":"text","requis":true},
  {"id":"marque_modele","label":"Marque / Modèle","type":"text","requis":true},
  {"id":"kilometrage","label":"Kilométrage","type":"number","requis":true},
  {"id":"carburant","label":"Carburant","type":"select","options":["Essence","Diesel","Hybride","Électrique"],"requis":true},
  {"id":"etat_ext","label":"État extérieur","type":"select","options":["Neuf","Très bon","Bon","Usagé","Endommagé"],"requis":true},
  {"id":"etat_int","label":"État intérieur","type":"select","options":["Neuf","Très bon","Bon","Usagé","Endommagé"],"requis":true},
  {"id":"rayures","label":"Rayures / Bosses","type":"textarea","requis":false},
  {"id":"cartes","label":"Cartes incluses (péage, carburant)","type":"text","requis":false},
  {"id":"date_controle","label":"Prochain contrôle technique","type":"date","requis":false}
]'::jsonb, 1),
('PC_PORTABLE','Ordinateur portable','device-laptop','#1D9E75','[
  {"id":"marque_modele","label":"Marque / Modèle","type":"text","requis":true},
  {"id":"numero_serie","label":"Numéro de série","type":"text","requis":true},
  {"id":"os","label":"Système exploitation","type":"select","options":["Windows 11","Windows 10","macOS","Linux"],"requis":false},
  {"id":"etat","label":"État général","type":"select","options":["Neuf","Très bon","Bon","Usagé","Endommagé"],"requis":true},
  {"id":"accessoires","label":"Accessoires inclus","type":"textarea","requis":false}
]'::jsonb, 2),
('TELEPHONE','Téléphone portable','device-mobile','#534AB7','[
  {"id":"marque_modele","label":"Marque / Modèle","type":"text","requis":true},
  {"id":"imei","label":"IMEI","type":"text","requis":true},
  {"id":"numero","label":"Numéro","type":"text","requis":false},
  {"id":"operateur","label":"Opérateur","type":"text","requis":false},
  {"id":"etat","label":"État général","type":"select","options":["Neuf","Très bon","Bon","Usagé","Endommagé"],"requis":true}
]'::jsonb, 3),
('BADGE','Badge / Accès','id-badge-2','#BA7517','[
  {"id":"numero_badge","label":"Numéro de badge","type":"text","requis":true},
  {"id":"zones_acces","label":"Zones d accès","type":"textarea","requis":false},
  {"id":"date_validite","label":"Date de validité","type":"date","requis":false}
]'::jsonb, 4),
('CLE','Clés / Accès physique','key','#D85A30','[
  {"id":"description","label":"Description","type":"text","requis":true},
  {"id":"quantite","label":"Nombre","type":"number","requis":true},
  {"id":"zones","label":"Zones / Locaux","type":"textarea","requis":false}
]'::jsonb, 5),
('AUTRE','Autre matériel','tool','#888780','[
  {"id":"description","label":"Description","type":"text","requis":true},
  {"id":"reference","label":"Référence","type":"text","requis":false},
  {"id":"etat","label":"État","type":"select","options":["Neuf","Très bon","Bon","Usagé","Endommagé"],"requis":true}
]'::jsonb, 6)
ON CONFLICT (code) DO NOTHING;

-- Parc matériel
CREATE TABLE IF NOT EXISTS public.materiels (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type_code    TEXT NOT NULL REFERENCES public.types_materiel(code),
  libelle      TEXT NOT NULL,
  reference    TEXT,
  valeur_achat NUMERIC(10,2),
  date_achat   DATE,
  statut       TEXT NOT NULL DEFAULT 'disponible'
               CHECK (statut IN ('disponible','attribue','en_maintenance','hors_service')),
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER materiels_updated_at BEFORE UPDATE ON public.materiels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Attributions + États des lieux
CREATE TABLE IF NOT EXISTS public.attributions_materiel (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  materiel_id            UUID NOT NULL REFERENCES public.materiels(id),
  profile_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date_remise            DATE NOT NULL DEFAULT CURRENT_DATE,
  remis_par              UUID REFERENCES public.profiles(id),
  edl_remise             JSONB NOT NULL DEFAULT '{}',
  photos_remise          TEXT[] DEFAULT '{}',
  signature_remise       TEXT,
  signe_remise_le        TIMESTAMPTZ,
  date_restitution       DATE,
  restitue_a             UUID REFERENCES public.profiles(id),
  edl_restitution        JSONB DEFAULT '{}',
  photos_restitution     TEXT[] DEFAULT '{}',
  signature_restitution  TEXT,
  signe_restitution_le   TIMESTAMPTZ,
  observations_restitution TEXT,
  statut                 TEXT NOT NULL DEFAULT 'actif'
                         CHECK (statut IN ('actif','restitue','litige')),
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER attributions_updated_at BEFORE UPDATE ON public.attributions_materiel
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Templates onboarding
CREATE TABLE IF NOT EXISTS public.templates_onboarding (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom        TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'onboarding' CHECK (type IN ('onboarding','offboarding')),
  etapes     JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.templates_onboarding (nom, type, etapes) VALUES
('Onboarding standard','onboarding','[
  {"id":"rh","categorie":"RH","label":"Administration RH","taches":[
    {"id":"t1","label":"Contrat signé","responsable":"rh"},
    {"id":"t2","label":"Mutuelle souscrite","responsable":"rh"},
    {"id":"t3","label":"RIB collecté","responsable":"salarie"},
    {"id":"t4","label":"Visite médicale planifiée","responsable":"rh"}
  ]},
  {"id":"it","categorie":"IT","label":"Équipements","taches":[
    {"id":"t5","label":"PC configuré et remis","responsable":"it"},
    {"id":"t6","label":"Téléphone remis","responsable":"it"},
    {"id":"t7","label":"Email créé","responsable":"it"},
    {"id":"t8","label":"Badge remis","responsable":"rh"}
  ]},
  {"id":"accueil","categorie":"Accueil","label":"Intégration","taches":[
    {"id":"t9","label":"Visite des locaux","responsable":"manager"},
    {"id":"t10","label":"Présentation équipe","responsable":"manager"},
    {"id":"t11","label":"Règlement intérieur signé","responsable":"rh"},
    {"id":"t12","label":"Formation sécurité","responsable":"rh"}
  ]}
]'::jsonb),
('Offboarding standard','offboarding','[
  {"id":"rh","categorie":"RH","label":"Documents de sortie","taches":[
    {"id":"o1","label":"Entretien de départ","responsable":"rh"},
    {"id":"o2","label":"Solde de tout compte","responsable":"rh"},
    {"id":"o3","label":"Attestation employeur","responsable":"rh"},
    {"id":"o4","label":"Certificat de travail","responsable":"rh"}
  ]},
  {"id":"materiel","categorie":"Matériel","label":"Restitution","taches":[
    {"id":"o5","label":"PC restitué — état des lieux signé","responsable":"it"},
    {"id":"o6","label":"Téléphone restitué","responsable":"it"},
    {"id":"o7","label":"Badge restitué et désactivé","responsable":"rh"},
    {"id":"o8","label":"Véhicule restitué — état des lieux signé","responsable":"manager"}
  ]},
  {"id":"acces","categorie":"Accès","label":"Clôture accès","taches":[
    {"id":"o9","label":"Accès informatiques désactivés","responsable":"it"},
    {"id":"o10","label":"Email archivé","responsable":"it"},
    {"id":"o11","label":"Accès physiques révoqués","responsable":"rh"}
  ]}
]'::jsonb)
ON CONFLICT DO NOTHING;

-- Dossiers par salarié
CREATE TABLE IF NOT EXISTS public.dossiers_onboarding (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  template_id  UUID REFERENCES public.templates_onboarding(id),
  type         TEXT NOT NULL CHECK (type IN ('onboarding','offboarding')),
  date_debut   DATE NOT NULL DEFAULT CURRENT_DATE,
  date_cible   DATE,
  statut       TEXT NOT NULL DEFAULT 'en_cours'
               CHECK (statut IN ('en_cours','complete','abandonne')),
  progression  INTEGER NOT NULL DEFAULT 0,
  taches_faites JSONB NOT NULL DEFAULT '[]',
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, type)
);

CREATE TRIGGER dossiers_updated_at BEFORE UPDATE ON public.dossiers_onboarding
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE public.types_materiel        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materiels             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attributions_materiel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates_onboarding  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dossiers_onboarding   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "all_read_types_mat"   ON public.types_materiel FOR SELECT USING (true);
CREATE POLICY "all_read_mat"         ON public.materiels FOR SELECT USING (true);
CREATE POLICY "admin_write_mat"      ON public.materiels FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('responsable','rh_admin')));
CREATE POLICY "own_attributions"     ON public.attributions_materiel FOR SELECT USING (profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "own_sign_attribution" ON public.attributions_materiel FOR UPDATE USING (profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "admin_attributions"   ON public.attributions_materiel FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('responsable','rh_admin')));
CREATE POLICY "all_read_templates"   ON public.templates_onboarding FOR SELECT USING (true);
CREATE POLICY "own_dossier"          ON public.dossiers_onboarding FOR ALL USING (profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "admin_dossiers"       ON public.dossiers_onboarding FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('responsable','rh_admin')));

CREATE INDEX IF NOT EXISTS idx_attributions_profile ON public.attributions_materiel(profile_id);
CREATE INDEX IF NOT EXISTS idx_dossiers_profile     ON public.dossiers_onboarding(profile_id);
CREATE INDEX IF NOT EXISTS idx_materiels_statut     ON public.materiels(statut);
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
