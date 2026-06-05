-- ============================================================
-- ConnectRH — Données de démonstration
-- Entreprise fictive : TechVision SAS (40 salariés simulés)
-- À exécuter APRÈS SETUP_COMPLET.sql dans Supabase SQL Editor
-- ============================================================
-- NOTE : Ces profils utilisent des user_id fictifs (UUID v4).
-- Pour une vraie démo interactive, créer les comptes auth via
-- le script seed-auth.ts ou inviter les utilisateurs depuis l'UI.
-- Les données (congés, pointages, entretiens...) sont réelles et
-- consultables par l'admin RH de démo.
-- ============================================================

-- UUIDs stables pour la démo (on les réutilise partout)
DO $$
DECLARE
  -- Profils (id dans public.profiles)
  p_admin    UUID := '00000000-0000-0000-0000-000000000001';
  p_resp1    UUID := '00000000-0000-0000-0000-000000000002';
  p_resp2    UUID := '00000000-0000-0000-0000-000000000003';
  p_s1       UUID := '00000000-0000-0000-0000-000000000010';
  p_s2       UUID := '00000000-0000-0000-0000-000000000011';
  p_s3       UUID := '00000000-0000-0000-0000-000000000012';
  p_s4       UUID := '00000000-0000-0000-0000-000000000013';
  p_s5       UUID := '00000000-0000-0000-0000-000000000014';
  p_s6       UUID := '00000000-0000-0000-0000-000000000015';
  p_s7       UUID := '00000000-0000-0000-0000-000000000016';
  p_s8       UUID := '00000000-0000-0000-0000-000000000017';
  p_s9       UUID := '00000000-0000-0000-0000-000000000018';
  p_s10      UUID := '00000000-0000-0000-0000-000000000019';
  p_s11      UUID := '00000000-0000-0000-0000-000000000020';
  p_s12      UUID := '00000000-0000-0000-0000-000000000021';

  -- user_id fictifs (simulent auth.users)
  u_admin    UUID := 'aaaaaaaa-0000-0000-0000-000000000001';
  u_resp1    UUID := 'aaaaaaaa-0000-0000-0000-000000000002';
  u_resp2    UUID := 'aaaaaaaa-0000-0000-0000-000000000003';
  u_s1       UUID := 'aaaaaaaa-0000-0000-0000-000000000010';
  u_s2       UUID := 'aaaaaaaa-0000-0000-0000-000000000011';
  u_s3       UUID := 'aaaaaaaa-0000-0000-0000-000000000012';
  u_s4       UUID := 'aaaaaaaa-0000-0000-0000-000000000013';
  u_s5       UUID := 'aaaaaaaa-0000-0000-0000-000000000014';
  u_s6       UUID := 'aaaaaaaa-0000-0000-0000-000000000015';
  u_s7       UUID := 'aaaaaaaa-0000-0000-0000-000000000016';
  u_s8       UUID := 'aaaaaaaa-0000-0000-0000-000000000017';
  u_s9       UUID := 'aaaaaaaa-0000-0000-0000-000000000018';
  u_s10      UUID := 'aaaaaaaa-0000-0000-0000-000000000019';
  u_s11      UUID := 'aaaaaaaa-0000-0000-0000-000000000020';
  u_s12      UUID := 'aaaaaaaa-0000-0000-0000-000000000021';

BEGIN

-- ── Profils ──────────────────────────────────────────────────

INSERT INTO public.profiles (id, user_id, role, prenom, nom, email, telephone,
  date_naissance, lieu_naissance, nationalite, statut_marital, nombre_enfants,
  adresse, code_postal, ville, poste, departement, type_contrat,
  date_entree, temps_travail, salaire_brut, convention_collective, responsable_id)
VALUES
-- Admin RH
(p_admin, u_admin, 'rh_admin',
 'Sophie', 'Martin', 'sophie.martin@techvision.fr', '06 12 34 56 78',
 '1985-03-14', 'Lyon', 'Française', 'Marié(e)', 2,
 '12 rue des Lilas', '69003', 'Lyon',
 'DRH', 'Ressources Humaines', 'CDI',
 '2018-09-01', 100, 5800.00, 'SYNTEC', NULL),

-- Responsable Technique
(p_resp1, u_resp1, 'responsable',
 'Thomas', 'Dupont', 'thomas.dupont@techvision.fr', '06 23 45 67 89',
 '1982-07-22', 'Paris', 'Française', 'Marié(e)', 1,
 '8 allée des Roses', '75011', 'Paris',
 'Directeur Technique', 'Technique', 'CDI',
 '2019-01-15', 100, 6200.00, 'SYNTEC', p_admin),

-- Responsable Commercial
(p_resp2, u_resp2, 'responsable',
 'Claire', 'Bernard', 'claire.bernard@techvision.fr', '06 34 56 78 90',
 '1987-11-05', 'Bordeaux', 'Française', 'Pacsé(e)', 0,
 '5 avenue Jean Jaurès', '33000', 'Bordeaux',
 'Directrice Commerciale', 'Commercial', 'CDI',
 '2020-03-01', 100, 5500.00, 'SYNTEC', p_admin),

-- Équipe Technique (sous Thomas)
(p_s1, u_s1, 'salarie',
 'Lucas', 'Moreau', 'lucas.moreau@techvision.fr', '06 45 67 89 01',
 '1993-05-18', 'Nantes', 'Française', 'Célibataire', 0,
 '3 rue du Port', '44000', 'Nantes',
 'Développeur Full Stack Senior', 'Technique', 'CDI',
 '2021-06-01', 100, 4800.00, 'SYNTEC', p_resp1),

(p_s2, u_s2, 'salarie',
 'Emma', 'Petit', 'emma.petit@techvision.fr', '06 56 78 90 12',
 '1996-09-30', 'Strasbourg', 'Française', 'Célibataire', 0,
 '17 rue de la Paix', '67000', 'Strasbourg',
 'Développeuse React', 'Technique', 'CDI',
 '2022-02-14', 100, 4200.00, 'SYNTEC', p_resp1),

(p_s3, u_s3, 'salarie',
 'Antoine', 'Leroy', 'antoine.leroy@techvision.fr', '06 67 89 01 23',
 '1990-12-03', 'Marseille', 'Française', 'Marié(e)', 2,
 '22 boulevard Michelet', '13008', 'Marseille',
 'DevOps / Infrastructure', 'Technique', 'CDI',
 '2020-09-07', 100, 4600.00, 'SYNTEC', p_resp1),

(p_s4, u_s4, 'salarie',
 'Léa', 'Simon', 'lea.simon@techvision.fr', '06 78 90 12 34',
 '1998-04-25', 'Toulouse', 'Française', 'Célibataire', 0,
 '9 impasse des Violettes', '31000', 'Toulouse',
 'Développeuse Backend', 'Technique', 'CDD',
 '2023-09-01', 100, 3800.00, 'SYNTEC', p_resp1),

(p_s5, u_s5, 'salarie',
 'Hugo', 'Laurent', 'hugo.laurent@techvision.fr', '06 89 01 23 45',
 '1995-08-14', 'Lille', 'Française', 'Célibataire', 0,
 '44 rue Gambetta', '59000', 'Lille',
 'Data Engineer', 'Technique', 'CDI',
 '2022-11-28', 100, 4400.00, 'SYNTEC', p_resp1),

-- Équipe Commerciale (sous Claire)
(p_s6, u_s6, 'salarie',
 'Camille', 'Robert', 'camille.robert@techvision.fr', '06 90 12 34 56',
 '1988-02-17', 'Nice', 'Française', 'Divorcé(e)', 1,
 '6 promenade des Arts', '06000', 'Nice',
 'Responsable Grands Comptes', 'Commercial', 'CDI',
 '2019-07-01', 100, 4900.00, 'SYNTEC', p_resp2),

(p_s7, u_s7, 'salarie',
 'Nathan', 'Durand', 'nathan.durand@techvision.fr', '06 01 23 45 67',
 '1994-06-08', 'Rennes', 'Française', 'Célibataire', 0,
 '31 rue de Bretagne', '35000', 'Rennes',
 'Commercial Junior', 'Commercial', 'CDI',
 '2023-01-09', 100, 3500.00, 'SYNTEC', p_resp2),

(p_s8, u_s8, 'salarie',
 'Inès', 'Fontaine', 'ines.fontaine@techvision.fr', '06 12 34 56 00',
 '1991-10-21', 'Montpellier', 'Française', 'Pacsé(e)', 0,
 '15 place de la Comédie', '34000', 'Montpellier',
 'Customer Success Manager', 'Commercial', 'CDI',
 '2021-04-12', 80, 3900.00, 'SYNTEC', p_resp2),

-- RH / Finance
(p_s9, u_s9, 'salarie',
 'Marc', 'Rousseau', 'marc.rousseau@techvision.fr', '06 23 45 67 00',
 '1983-01-30', 'Grenoble', 'Française', 'Marié(e)', 3,
 '2 chemin des Alpes', '38000', 'Grenoble',
 'Comptable Senior', 'Comptabilité', 'CDI',
 '2017-05-02', 100, 4100.00, 'SYNTEC', p_admin),

(p_s10, u_s10, 'salarie',
 'Pauline', 'Girard', 'pauline.girard@techvision.fr', '06 34 56 78 00',
 '1997-03-12', 'Lyon', 'Française', 'Célibataire', 0,
 '7 cours Vitton', '69006', 'Lyon',
 'Assistante RH', 'Ressources Humaines', 'CDI',
 '2023-03-20', 100, 3200.00, 'SYNTEC', p_admin),

(p_s11, u_s11, 'salarie',
 'Julien', 'Mercier', 'julien.mercier@techvision.fr', '06 45 67 89 00',
 '1986-07-19', 'Paris', 'Française', 'Marié(e)', 1,
 '88 avenue de la République', '75011', 'Paris',
 'Juriste droit social', 'Juridique', 'CDI',
 '2020-10-05', 100, 4700.00, 'SYNTEC', p_admin),

(p_s12, u_s12, 'salarie',
 'Zoé', 'Lefebvre', 'zoe.lefebvre@techvision.fr', '06 56 78 90 00',
 '1999-11-02', 'Paris', 'Française', 'Célibataire', 0,
 '34 rue Oberkampf', '75011', 'Paris',
 'Alternante Marketing Digital', 'Marketing', 'Alternance',
 '2024-09-01', 80, 1600.00, 'SYNTEC', p_resp2)

ON CONFLICT (id) DO UPDATE SET
  prenom = EXCLUDED.prenom, nom = EXCLUDED.nom,
  poste = EXCLUDED.poste, departement = EXCLUDED.departement;

-- ── Soldes congés ─────────────────────────────────────────────

INSERT INTO public.soldes_conges (profile_id, type_code, annee, solde_initial, solde_acquis, solde_pris, solde_en_cours)
VALUES
-- Sophie (Admin)
(p_admin, 'CP',  2026, 25, 25, 8,  0),
(p_admin, 'RTT', 2026, 10, 10, 3,  0),
(p_admin, 'REC', 2026, 0,  0,  0,  0),
-- Thomas (Resp Technique)
(p_resp1, 'CP',  2026, 25, 25, 12, 2),
(p_resp1, 'RTT', 2026, 10, 10, 4,  0),
(p_resp1, 'REC', 2026, 0,  2,  0,  0),
-- Claire (Resp Commercial)
(p_resp2, 'CP',  2026, 25, 25, 6,  5),
(p_resp2, 'RTT', 2026, 10, 10, 2,  0),
-- Lucas
(p_s1, 'CP',  2026, 25, 25, 15, 0),
(p_s1, 'RTT', 2026, 10, 10, 5,  0),
-- Emma
(p_s2, 'CP',  2026, 25, 25, 3,  5),
(p_s2, 'RTT', 2026, 10, 10, 1,  0),
-- Antoine
(p_s3, 'CP',  2026, 25, 25, 10, 0),
(p_s3, 'RTT', 2026, 10, 10, 6,  0),
(p_s3, 'REC', 2026, 0,  4,  2,  0),
-- Léa
(p_s4, 'CP',  2026, 25, 12, 2,  3),
(p_s4, 'RTT', 2026, 10, 5,  0,  0),
-- Hugo
(p_s5, 'CP',  2026, 25, 25, 7,  0),
(p_s5, 'RTT', 2026, 10, 10, 3,  0),
-- Camille
(p_s6, 'CP',  2026, 25, 25, 18, 0),
(p_s6, 'RTT', 2026, 10, 10, 7,  0),
-- Nathan
(p_s7, 'CP',  2026, 25, 25, 4,  0),
(p_s7, 'RTT', 2026, 10, 10, 2,  0),
-- Inès (80%)
(p_s8, 'CP',  2026, 25, 25, 9,  0),
(p_s8, 'RTT', 2026, 10, 8,  4,  0),
-- Marc
(p_s9, 'CP',  2026, 25, 25, 11, 0),
(p_s9, 'RTT', 2026, 10, 10, 5,  0),
-- Pauline
(p_s10, 'CP',  2026, 25, 25, 2,  0),
(p_s10, 'RTT', 2026, 10, 10, 0,  0),
-- Julien
(p_s11, 'CP',  2026, 25, 25, 14, 0),
(p_s11, 'RTT', 2026, 10, 10, 8,  0),
-- Zoé
(p_s12, 'CP',  2026, 25, 12, 1,  0)
ON CONFLICT (profile_id, type_code, annee) DO UPDATE SET
  solde_initial = EXCLUDED.solde_initial,
  solde_acquis  = EXCLUDED.solde_acquis,
  solde_pris    = EXCLUDED.solde_pris;

-- ── Demandes de congés ───────────────────────────────────────

INSERT INTO public.demandes_conges
  (profile_id, type_code, date_debut, date_fin, nb_jours, motif, statut,
   validee_par, validee_le, silae_transmis, silae_transmis_le)
VALUES
-- Congés validés passés
(p_s1, 'CP', '2026-01-06', '2026-01-10', 5, 'Vacances hiver', 'validee', p_admin, '2025-12-15 09:00:00+01', true, '2025-12-15 10:00:00+01'),
(p_s1, 'CP', '2026-04-14', '2026-04-18', 5, 'Vacances printemps', 'validee', p_admin, '2026-03-20 14:00:00+01', true, '2026-03-20 15:00:00+01'),
(p_s3, 'CP', '2026-02-17', '2026-02-21', 5, 'Vacances ski', 'validee', p_resp1, '2026-01-30 11:00:00+01', true, '2026-01-30 12:00:00+01'),
(p_s6, 'CP', '2026-02-10', '2026-02-28', 15, 'Vacances longues', 'validee', p_resp2, '2026-01-20 10:00:00+01', true, '2026-01-20 11:00:00+01'),
(p_s9, 'CP', '2026-03-23', '2026-04-04', 11, 'Vacances Pâques', 'validee', p_admin, '2026-02-28 09:00:00+01', true, '2026-02-28 10:00:00+01'),
(p_s11, 'CP', '2026-05-12', '2026-05-23', 10, 'Voyage', 'validee', p_admin, '2026-04-15 14:00:00+01', true, '2026-04-15 15:00:00+01'),
-- Congés validés à venir (non encore transmis SILAE)
(p_resp1, 'CP', '2026-07-14', '2026-07-25', 10, 'Été', 'validee', p_admin, '2026-05-20 09:00:00+01', false, NULL),
(p_s2, 'CP', '2026-07-01', '2026-07-11', 5, 'Vacances juillet', 'validee', p_resp1, '2026-06-01 09:00:00+01', false, NULL),
(p_resp2, 'CP', '2026-06-23', '2026-07-04', 5, 'Long week-end', 'validee', p_admin, '2026-06-01 09:00:00+01', false, NULL),
-- Demandes en attente de validation
(p_s4, 'CP', '2026-06-30', '2026-07-04', 3, 'Mariage amis', 'en_attente', NULL, NULL, false, NULL),
(p_s7, 'RTT', '2026-06-13', '2026-06-13', 1, 'RTT', 'en_attente', NULL, NULL, false, NULL),
(p_s5, 'CP', '2026-08-01', '2026-08-15', 11, 'Vacances été', 'en_attente', NULL, NULL, false, NULL),
-- Demande refusée (exemple)
(p_s8, 'CP', '2026-06-02', '2026-06-06', 5, 'Semaine perso', 'refusee', p_resp2, '2026-05-28 10:00:00+01', false, NULL);

-- ── Pointages (3 dernières semaines) ────────────────────────

INSERT INTO public.pointages (profile_id, date, heure_entree, heure_sortie, pause_minutes, type_journee, statut)
VALUES
-- Semaine du 26 mai
(p_s1, '2026-05-26', '08:47', '18:12', 60, 'bureau', 'valide'),
(p_s1, '2026-05-27', '09:02', '17:58', 60, 'bureau', 'valide'),
(p_s1, '2026-05-28', '08:55', '19:30', 60, 'bureau', 'valide'),
(p_s1, '2026-05-29', '09:15', '18:00', 60, 'teletravail', 'valide'),
(p_s2, '2026-05-26', '09:00', '18:00', 60, 'teletravail', 'valide'),
(p_s2, '2026-05-27', '09:10', '17:45', 60, 'bureau', 'valide'),
(p_s2, '2026-05-28', '09:00', '18:30', 60, 'bureau', 'valide'),
(p_s3, '2026-05-26', '08:30', '17:30', 45, 'bureau', 'valide'),
(p_s3, '2026-05-27', '08:45', '18:45', 45, 'bureau', 'valide'),
(p_s3, '2026-05-28', '09:00', '20:00', 60, 'bureau', 'valide'),
(p_s4, '2026-05-26', '09:30', '18:00', 60, 'bureau', 'valide'),
(p_s4, '2026-05-27', '09:00', '17:30', 60, 'teletravail', 'valide'),
(p_s5, '2026-05-26', '10:00', '19:00', 60, 'teletravail', 'valide'),
(p_s5, '2026-05-27', '09:30', '18:30', 60, 'bureau', 'valide'),
(p_s6, '2026-05-26', '08:00', '17:00', 45, 'deplacement', 'valide'),
(p_s6, '2026-05-27', '09:00', '18:00', 60, 'bureau', 'valide'),
(p_s7, '2026-05-26', '09:00', '18:30', 60, 'bureau', 'valide'),
(p_s8, '2026-05-26', '09:00', '17:00', 60, 'teletravail', 'valide'),
(p_s9, '2026-05-26', '08:30', '17:30', 60, 'bureau', 'valide'),
(p_s10, '2026-05-26', '09:00', '18:00', 60, 'bureau', 'valide'),
-- Semaine du 2 juin
(p_s1, '2026-06-02', '08:50', '18:20', 60, 'bureau', 'valide'),
(p_s1, '2026-06-03', '09:05', '19:00', 60, 'bureau', 'valide'),
(p_s1, '2026-06-04', '08:45', '18:10', 60, 'teletravail', 'valide'),
(p_s2, '2026-06-02', '09:15', '18:15', 60, 'bureau', 'valide'),
(p_s2, '2026-06-03', '09:00', '17:50', 60, 'teletravail', 'valide'),
(p_s3, '2026-06-02', '08:30', '18:00', 45, 'bureau', 'valide'),
(p_s3, '2026-06-03', '08:45', '19:15', 45, 'bureau', 'valide'),
(p_s4, '2026-06-02', '09:30', '17:45', 60, 'bureau', 'valide'),
(p_s5, '2026-06-02', '10:00', '18:45', 60, 'teletravail', 'valide'),
(p_s6, '2026-06-02', '08:00', '16:30', 45, 'deplacement', 'valide'),
(p_s6, '2026-06-03', '09:00', '18:00', 60, 'bureau', 'valide'),
(p_s7, '2026-06-02', '09:00', '18:00', 60, 'bureau', 'valide'),
(p_s8, '2026-06-02', '09:00', '17:00', 60, 'teletravail', 'valide'),
(p_s9, '2026-06-02', '08:30', '17:30', 60, 'bureau', 'valide'),
(p_s10, '2026-06-02', '09:00', '17:30', 60, 'bureau', 'valide'),
(p_s11, '2026-06-02', '09:30', '18:30', 60, 'bureau', 'valide'),
-- Aujourd'hui (en cours)
(p_s1, '2026-06-05', '08:52', NULL, 0, 'bureau', 'en_cours'),
(p_s2, '2026-06-05', '09:08', NULL, 0, 'teletravail', 'en_cours'),
(p_s3, '2026-06-05', '08:35', NULL, 0, 'bureau', 'en_cours'),
(p_s5, '2026-06-05', '09:45', NULL, 0, 'bureau', 'en_cours'),
(p_s7, '2026-06-05', '09:00', NULL, 0, 'bureau', 'en_cours'),
(p_s9, '2026-06-05', '08:30', NULL, 0, 'bureau', 'en_cours'),
(p_s10, '2026-06-05', '09:00', NULL, 0, 'bureau', 'en_cours')
ON CONFLICT (profile_id, date) DO NOTHING;

-- ── Compteurs mensuels mai 2026 ──────────────────────────────

INSERT INTO public.compteurs_temps
  (profile_id, annee, mois, heures_contractuelles, heures_realisees, heures_sup,
   jours_bureau, jours_teletravail, jours_deplacement, jours_absence, silae_transmis)
VALUES
(p_s1,    2026, 5, 168, 178.5, 10.5, 14, 5, 0, 2, false),
(p_s2,    2026, 5, 168, 165.0,  0.0, 10, 9, 0, 2, false),
(p_s3,    2026, 5, 168, 182.0, 14.0, 16, 3, 1, 1, false),
(p_s4,    2026, 5, 168, 160.0,  0.0, 11, 6, 0, 4, false),
(p_s5,    2026, 5, 168, 170.0,  2.0,  8,10, 0, 3, false),
(p_s6,    2026, 5, 168, 172.0,  4.0, 12, 2, 6, 1, false),
(p_s7,    2026, 5, 168, 165.0,  0.0, 16, 3, 0, 2, false),
(p_s8,    2026, 5, 134, 130.0,  0.0,  5,12, 0, 4, false),
(p_s9,    2026, 5, 168, 168.0,  0.0, 18, 2, 0, 1, false),
(p_s10,   2026, 5, 168, 166.0,  0.0, 15, 5, 0, 1, false),
(p_resp1, 2026, 5, 168, 185.0, 17.0, 16, 4, 1, 0, false),
(p_resp2, 2026, 5, 168, 170.0,  2.0, 14, 4, 2, 1, false)
ON CONFLICT (profile_id, annee, mois) DO UPDATE SET
  heures_realisees = EXCLUDED.heures_realisees,
  heures_sup       = EXCLUDED.heures_sup,
  silae_transmis   = EXCLUDED.silae_transmis;

-- ── Entretiens ───────────────────────────────────────────────

INSERT INTO public.entretiens
  (type_code, profile_id, manager_id, date_prevue, lieu, statut,
   note_globale, signe_manager, signe_salarie,
   objectifs_actuels, objectifs_nouveaux, competences)
VALUES
-- Entretiens réalisés et signés
('AEA', p_s1, p_resp1, '2026-03-15', 'Salle Confluence - Lyon', 'signe',
 4.2, true, true,
 '[{"id":"o1","titre":"Refonte API REST","note":4,"atteint":true},{"id":"o2","titre":"Montée en compétence DevOps","note":3,"atteint":false}]'::jsonb,
 '[{"id":"o3","titre":"Lead tech sur projet Alpha","echeance":"2026-12-31"},{"id":"o4","titre":"Certification AWS","echeance":"2026-09-30"}]'::jsonb,
 '[{"id":"c1","label":"Maîtrise technique","note_1_5":4},{"id":"c2","label":"Communication","note_1_5":4},{"id":"c3","label":"Autonomie","note_1_5":5}]'::jsonb),

('AEA', p_s3, p_resp1, '2026-03-22', 'Visioconférence', 'signe',
 3.8, true, true,
 '[{"id":"o1","titre":"Migration vers Kubernetes","note":4,"atteint":true}]'::jsonb,
 '[{"id":"o2","titre":"Formation certifiante Kubernetes","echeance":"2026-06-30"}]'::jsonb,
 '[{"id":"c1","label":"Maîtrise technique","note_1_5":4},{"id":"c2","label":"Travail en équipe","note_1_5":4}]'::jsonb),

('AEA', p_s6, p_resp2, '2026-04-10', 'Bureau direction', 'signe',
 4.5, true, true,
 '[{"id":"o1","titre":"Objectif CA grands comptes","note":5,"atteint":true}]'::jsonb,
 '[{"id":"o2","titre":"Développement zone Sud-Ouest","echeance":"2026-12-31"}]'::jsonb,
 '[{"id":"c1","label":"Maîtrise technique du poste","note_1_5":5},{"id":"c2","label":"Initiative","note_1_5":5}]'::jsonb),

-- Entretien planifié à venir
('AEA', p_s2, p_resp1, '2026-06-20', 'Salle Confluence - Lyon', 'planifie',
 NULL, false, false, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb),

('AEP', p_s9, p_admin, '2026-06-25', 'Bureau RH', 'planifie',
 NULL, false, false, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb),

-- Entretien en cours de préparation
('AEA', p_s5, p_resp1, '2026-06-18', 'Visioconférence', 'prep_manager',
 NULL, false, false, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb);

-- ── Demandes de formation ────────────────────────────────────

INSERT INTO public.demandes_formation
  (profile_id, formation_id, date_debut, date_fin, duree_heures,
   cout_reel, financement, statut, note_satisfaction, commentaire_fin,
   validee_manager_par, validee_manager_le, validee_rh_par, validee_rh_le)
SELECT
  p_s3, fc.id, '2026-04-07', '2026-04-11', 21,
  1490, 'entreprise', 'terminee', 5, 'Excellente formation, très pratique. Certif obtenue !',
  p_resp1, '2026-02-15 10:00:00+01', p_admin, '2026-02-16 09:00:00+01'
FROM public.formations_catalogue fc WHERE fc.titre = 'Management d équipe' LIMIT 1;

INSERT INTO public.demandes_formation
  (profile_id, formation_id, date_souhaitee, duree_heures,
   cout_estime, financement, statut,
   validee_manager_par, validee_manager_le)
SELECT
  p_s5, fc.id, '2026-09-15', 14,
  350, 'entreprise', 'validee_manager',
  p_resp1, '2026-05-30 10:00:00+01'
FROM public.formations_catalogue fc WHERE fc.titre = 'Premiers secours - SST' LIMIT 1;

INSERT INTO public.demandes_formation
  (profile_id, titre_libre, organisme_libre, description_libre,
   date_souhaitee, duree_heures, cout_estime, financement, statut)
VALUES
  (p_s2, 'Formation Next.js 15 avancé', 'Grafikart Pro',
   'Maîtriser les Server Components et le streaming en production',
   '2026-07-10', 14, 490, 'entreprise', 'demande');

-- ── Visites médicales ────────────────────────────────────────

INSERT INTO public.visites_medicales
  (profile_id, type_code, date_realisee, medecin, lieu,
   aptitude, statut, prochaine_date)
VALUES
(p_s1,  'VIP', '2021-07-15', 'Dr. Leclerc', 'CIAMT Lyon',        'apte', 'realisee', '2026-07-15'),
(p_s2,  'VIP', '2022-03-10', 'Dr. Bourget', 'MTA Strasbourg',    'apte', 'realisee', '2027-03-10'),
(p_s3,  'VIP', '2021-01-20', 'Dr. Roux',    'AISMT Marseille',   'apte', 'realisee', '2026-01-20'),
(p_s4,  'VIP', '2023-10-05', 'Dr. Blanc',   'CIAMT Toulouse',    'apte', 'realisee', '2028-10-05'),
(p_s5,  'VIP', '2023-02-14', 'Dr. Morin',   'AISMT Lille',       'apte', 'realisee', '2028-02-14'),
(p_s6,  'VIP', '2019-08-01', 'Dr. Faure',   'MTA Nice',          'apte', 'realisee', '2024-08-01'),
(p_s9,  'VIP', '2017-06-12', 'Dr. Laurent', 'CIAMT Grenoble',    'apte_amenagements', 'realisee', '2022-06-12'),
(p_s11, 'VIP', '2020-11-03', 'Dr. Garnier', 'CIAMT Paris',       'apte', 'realisee', '2025-11-03');

-- Visite en retard (alerte à générer)
INSERT INTO public.alertes_medicales
  (profile_id, type_alerte, message, echeance, urgence)
VALUES
(p_s6,  'visite_en_retard', 'VIP échue depuis août 2024 — à replanifier d''urgence', '2024-08-01', 'haute'),
(p_s9,  'aptitude_a_renouveler', 'Aptitude avec aménagements à reconfirmer — visite en retard', '2022-06-12', 'haute'),
(p_s11, 'visite_en_retard', 'VIP échue depuis novembre 2025 — planification requise', '2025-11-03', 'normale');

-- ── Dossiers onboarding ──────────────────────────────────────

INSERT INTO public.dossiers_onboarding
  (profile_id, type, date_debut, date_cible, statut, progression, taches_faites)
SELECT
  p_s12, 'onboarding', '2024-09-01', '2024-09-15', 'en_cours', 72,
  '["t1","t2","t3","t5","t7","t8","t9","t10","t11"]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM public.dossiers_onboarding WHERE profile_id = p_s12 AND type = 'onboarding'
);

END $$;
