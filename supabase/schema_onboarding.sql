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
