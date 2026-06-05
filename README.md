# ConnectRH — SIRH connecté à SILAE

Application SIRH complète construite avec Next.js 14 + Supabase.

## Stack technique
- **Frontend** : Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend / BDD** : Supabase (Auth + PostgreSQL + RLS)
- **Déploiement** : Vercel (gratuit)

---

## Installation en 3 étapes

### Étape 1 — Supabase (compte du CLIENT)
1. Le client crée un compte gratuit sur supabase.com
2. Nouveau projet (région EU West)
3. Settings > API : copier Project URL + anon key + service_role key

### Étape 2 — Variables d'environnement
Remplir .env.local :
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Étape 3 — Base de données
Dans Supabase > SQL Editor > New Query :
Copier-coller le contenu de supabase/schema.sql et exécuter.

---

## Déploiement Vercel (gratuit)
1. Pousser sur GitHub
2. Importer sur vercel.com
3. Ajouter les variables d'environnement
4. Deploy automatique

---

## Premier admin RH
1. Créer un compte sur /auth/login
2. Supabase > Table Editor > profiles > changer role en "rh_admin"
3. Inviter les salariés depuis l'interface

---

## Modules v1
- [x] Authentification sécurisée
- [x] Profils salariés complets
- [x] Dashboard par rôle (salarié / responsable / RH admin)
- [x] Liste collaborateurs
- [x] Invitation de salariés
- [ ] Congés & absences (module 2)
- [ ] Gestion du temps (module 3)
- [ ] Intégration SILAE (module 4)
