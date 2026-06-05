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
