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
