# 📡 Récapitulatif Complet - API CellXpert

Guide exhaustif de toutes les requêtes API disponibles avec paramètres et exemples.

---

## 🔑 **Configuration**

```bash
Base URL: https://track.7ladies.com/api/
Affiliate ID: 36063
API Key: 8cf3c4a9f168fae38e86dbdceea73998cdbbdb52a612f176ee0b31bf890424ef10af2ad058a2f651c431208765
```

**Headers requis pour toutes les requêtes:**
```bash
-H "affiliateid: 36063"
-H "x-api-key: VOTRE_CLE_API"
```

---

## 📊 **1. COMMISSIONS** (Liste des commissions)

### 🎯 **Ce qu'elle fait:**
Récupère la liste de toutes les commissions générées sur une période.

### 📋 **Format de réponse:**
XML uniquement (pas de JSON)

### 🔧 **Paramètres:**

| Paramètre | Type | Obligatoire | Défaut | Description |
|-----------|------|-------------|--------|-------------|
| `command` | string | ✅ Oui | - | `commissions` |
| `fromdate` | YYYY-MM-DD | ❌ Non | 1 mois arrière | Date de début |
| `todate` | YYYY-MM-DD | ❌ Non | Aujourd'hui | Date de fin |

### 💻 **Exemple de requête:**

```bash
curl "https://track.7ladies.com/api/?command=commissions&fromdate=2025-10-01&todate=2025-10-31" \
  -H "affiliateid: 36063" \
  -H "x-api-key: 8cf3c4a9f168fae38e86dbdceea73998cdbbdb52a612f176ee0b31bf890424ef10af2ad058a2f651c431208765"
```

### 📦 **Données retournées:**

```xml
<ResultSet>
    <Commission>
        <id>236600</id>
        <TraderId>ivybetio-5998941934987921990</TraderId>
        <TrackingCode>Default</TrackingCode>
        <afp>|afp1:{YOURCLICKID}|afp10:Streamers</afp>
        <CommissionType>CPA FR</CommissionType>
        <Commission>90.00</Commission>
        <created>10/14/2025 11:59:59 PM</created>
    </Commission>
    <!-- ... plus de commissions -->
</ResultSet>
```

### 📊 **Champs disponibles:**
- `id` - ID unique de la commission
- `TraderId` - ID du joueur
- `TrackingCode` - Code de tracking
- `afp` - Paramètres affiliés additionnels
- `CommissionType` - Type de commission (CPA, RevShare, etc.)
- `Commission` - Montant de la commission
- `created` - Date de création

---

## 👥 **2. REGISTRATIONS** (Liste des inscriptions)

### 🎯 **Ce qu'elle fait:**
Récupère la liste de tous les joueurs inscrits avec leurs statistiques.

### 📋 **Format de réponse:**
XML ou JSON (avec `&json=1`)

### 🔧 **Paramètres:**

| Paramètre | Type | Obligatoire | Défaut | Description |
|-----------|------|-------------|--------|-------------|
| `command` | string | ✅ Oui | - | `registrations` |
| `fromdate` | YYYY-MM-DD | ❌ Non | 1 mois arrière | Date de début |
| `todate` | YYYY-MM-DD | ❌ Non | Aujourd'hui | Date de fin |
| `daterange` | string | ❌ Non | registration | `update`, `fdd` (first deposit date) |
| `userid` | string | ❌ Non | - | Recherche un joueur spécifique |
| `json` | 1 | ❌ Non | - | Retourne JSON au lieu de XML |

### 💻 **Exemple de requête:**

```bash
# Format JSON
curl "https://track.7ladies.com/api/?command=registrations&fromdate=2025-10-01&todate=2025-10-31&json=1" \
  -H "affiliateid: 36063" \
  -H "x-api-key: 8cf3c4a9f168fae38e86dbdceea73998cdbbdb52a612f176ee0b31bf890424ef10af2ad058a2f651c431208765"

# Rechercher un joueur spécifique
curl "https://track.7ladies.com/api/?command=registrations&userid=ivybetio-5998941934987921990&json=1" \
  -H "affiliateid: 36063" \
  -H "x-api-key: 8cf3c4a9f168fae38e86dbdceea73998cdbbdb52a612f176ee0b31bf890424ef10af2ad058a2f651c431208765"

# Par date de premier dépôt
curl "https://track.7ladies.com/api/?command=registrations&fromdate=2025-10-01&todate=2025-10-31&daterange=fdd&json=1" \
  -H "affiliateid: 36063" \
  -H "x-api-key: 8cf3c4a9f168fae38e86dbdceea73998cdbbdb52a612f176ee0b31bf890424ef10af2ad058a2f651c431208765"
```

### 📦 **Données retournées (JSON):**

```json
{
  "registrations": [
    {
      "User_ID": "ivybetio-5998941934987921990",
      "Registration_Date": "2025-10-14T22:20:11.500",
      "Tracking_Code": "Default",
      "afp": "|afp1:{YOURCLICKID}|afp10:Streamers",
      "Status": "New",
      "Country": "FR",
      "Position_Count": 0,
      "PL": 0,
      "Net_PL": 0,
      "Lot_Amount": 0,
      "Volume": 0,
      "First_Deposit": 0,
      "Deposits": 20.0000,
      "Withdrawals": 0,
      "Net_Deposits": 20.0000,
      "Deposit_Count": 1,
      "Commission": 96.4800,
      "Qualification_Date": "2025-10-14T23:24:41.070"
    }
  ]
}
```

### 📊 **Champs disponibles:**
- `User_ID` - ID unique du joueur
- `Registration_Date` - Date d'inscription
- `Tracking_Code` - Code de tracking
- `afp` - Paramètres affiliés
- `Status` - Statut (New, Active, etc.)
- `Country` - Pays (code ISO)
- `Deposits` - Total des dépôts
- `Commission` - Commission générée
- `Qualification_Date` - Date de qualification (premier dépôt)

---

## 📈 **3. MEDIA REPORT** (Statistiques détaillées)

### 🎯 **Ce qu'elle fait:**
Récupère des statistiques agrégées (visiteurs, inscriptions, FTD, commissions) avec différents niveaux de détail.

### 📋 **Format de réponse:**
XML uniquement (pas de JSON natif)

### 🔧 **Paramètres:**

#### **Dates:**
| Paramètre | Type | Obligatoire | Défaut | Description |
|-----------|------|-------------|--------|-------------|
| `command` | string | ✅ Oui | - | `mediareport` |
| `fromdate` | YYYY-MM-DD | ❌ Non | 1 mois arrière | Date de début |
| `todate` | YYYY-MM-DD | ❌ Non | Aujourd'hui | Date de fin |

#### **Breakdowns (au moins 1 obligatoire):**
| Paramètre | Valeur | Description |
|-----------|--------|-------------|
| `Day` | `1` | Breakdown par jour |
| `DateFormat` | `day`, `month`, `year` | Format alternatif (mois, année) |
| `TrackingCode` | `1` | Breakdown par tracking code |
| `Brand` | `1` | Breakdown par brand/casino |
| `Language` | `1` | Breakdown par langue |
| `Type` | `1` | Breakdown par type de média |
| `Size` | `1` | Breakdown par taille bannière |
| `Name` | `1` | Breakdown par nom bannière |

#### **Filtres (optionnels):**
| Paramètre | Description | Exemple |
|-----------|-------------|---------|
| `Filter-TrackingCode` | Filtrer par tracking code | `Default` |
| `Filter-Brand` | Filtrer par brand | `ivybetio` |
| `Filter-Language` | Filtrer par langue | `fr` |
| `Filter-Type` | Filtrer par type | `banner` |
| `Filter-Size` | Filtrer par taille | `728x90` |
| `Filter-Name` | Filtrer par nom | `promo_oct` |

### 💻 **Exemples de requêtes:**

```bash
# 1. Par jour uniquement
curl "https://track.7ladies.com/api/?command=mediareport&fromdate=2025-10-01&todate=2025-10-31&Day=1" \
  -H "affiliateid: 36063" \
  -H "x-api-key: 8cf3c4a9f168fae38e86dbdceea73998cdbbdb52a612f176ee0b31bf890424ef10af2ad058a2f651c431208765"

# 2. Par tracking code uniquement
curl "https://track.7ladies.com/api/?command=mediareport&fromdate=2025-10-01&todate=2025-10-31&TrackingCode=1" \
  -H "affiliateid: 36063" \
  -H "x-api-key: 8cf3c4a9f168fae38e86dbdceea73998cdbbdb52a612f176ee0b31bf890424ef10af2ad058a2f651c431208765"

# 3. Par jour + tracking code
curl "https://track.7ladies.com/api/?command=mediareport&fromdate=2025-10-01&todate=2025-10-31&Day=1&TrackingCode=1" \
  -H "affiliateid: 36063" \
  -H "x-api-key: 8cf3c4a9f168fae38e86dbdceea73998cdbbdb52a612f176ee0b31bf890424ef10af2ad058a2f651c431208765"

# 4. Par mois (grouper par mois)
curl "https://track.7ladies.com/api/?command=mediareport&fromdate=2025-01-01&todate=2025-12-31&DateFormat=month" \
  -H "affiliateid: 36063" \
  -H "x-api-key: 8cf3c4a9f168fae38e86dbdceea73998cdbbdb52a612f176ee0b31bf890424ef10af2ad058a2f651c431208765"

# 5. Avec filtre tracking code
curl "https://track.7ladies.com/api/?command=mediareport&fromdate=2025-10-01&todate=2025-10-31&Day=1&Filter-TrackingCode=Default" \
  -H "affiliateid: 36063" \
  -H "x-api-key: 8cf3c4a9f168fae38e86dbdceea73998cdbbdb52a612f176ee0b31bf890424ef10af2ad058a2f651c431208765"

# 6. Par brand
curl "https://track.7ladies.com/api/?command=mediareport&fromdate=2025-10-01&todate=2025-10-31&Brand=1" \
  -H "affiliateid: 36063" \
  -H "x-api-key: 8cf3c4a9f168fae38e86dbdceea73998cdbbdb52a612f176ee0b31bf890424ef10af2ad058a2f651c431208765"
```

### 📦 **Données retournées (XML):**

```xml
<ResultSet xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <row>
        <Day>2025/10/15</Day>
        <Tracking_Code>Default</Tracking_Code>
        <Impressions>0</Impressions>
        <Visitors>2480</Visitors>
        <Unique_Visitors>2472</Unique_Visitors>
        <Leads>994</Leads>
        <Unique_Leads>994</Unique_Leads>
        <Registrations>994</Registrations>
        <Unique_Pre_Reals>219</Unique_Pre_Reals>
        <FTD>219</FTD>
        <QFTD>201</QFTD>
        <Deposits>3280</Deposits>
        <Volume>0</Volume>
        <PL>0</PL>
        <Commission>18371.6054</Commission>
        <Demo>0</Demo>
        <Unique_Demo>0</Unique_Demo>
    </row>
</ResultSet>
```

### 📊 **Champs disponibles:**
- `Day` - Date (si breakdown Day)
- `Tracking_Code` - Code tracking (si breakdown TrackingCode)
- `Brand` - Brand (si breakdown Brand)
- `Impressions` - Nombre d'impressions
- `Visitors` - Visiteurs (avec doublons)
- `Unique_Visitors` - Visiteurs uniques
- `Leads` - Nombre de leads
- `Unique_Leads` - Leads uniques
- `Registrations` - Inscriptions
- `Unique_Pre_Reals` - Pre-reals uniques
- `FTD` - First Time Deposits (nombre)
- `QFTD` - Qualified FTD (nombre)
- `Deposits` - Montant total des dépôts
- `Volume` - Volume de trading
- `PL` - Profit/Loss
- `Commission` - Commissions générées
- `Demo` - Comptes demo
- `Unique_Demo` - Comptes demo uniques

---

## 📝 **RÉSUMÉ DES COMMANDES**

| Commande | Ce qu'elle retourne | Format JSON | Cas d'usage |
|----------|---------------------|-------------|-------------|
| `commissions` | Liste détaillée des commissions | ❌ Non | Voir le détail de chaque commission |
| `registrations` | Liste des joueurs inscrits | ✅ Oui (`&json=1`) | Analyser les joueurs, conversions |
| `mediareport` | Statistiques agrégées | ❌ Non | Analytics, dashboards, rapports |

---

## 🎯 **CAS D'USAGE PRATIQUES**

### **1. Dashboard Principal**
```bash
# Vue d'ensemble par tracking code
curl "https://track.7ladies.com/api/?command=mediareport&fromdate=2025-10-01&todate=2025-10-31&TrackingCode=1" \
  -H "affiliateid: 36063" \
  -H "x-api-key: VOTRE_CLE"
```

### **2. Graphique des inscriptions par jour**
```bash
# Données pour chart
curl "https://track.7ladies.com/api/?command=mediareport&fromdate=2025-10-01&todate=2025-10-31&Day=1" \
  -H "affiliateid: 36063" \
  -H "x-api-key: VOTRE_CLE"
```

### **3. Liste des joueurs convertis**
```bash
# Filtrer les joueurs avec dépôt
curl "https://track.7ladies.com/api/?command=registrations&fromdate=2025-10-01&todate=2025-10-31&daterange=fdd&json=1" \
  -H "affiliateid: 36063" \
  -H "x-api-key: VOTRE_CLE"
```

### **4. Analyse par source de traffic (AFP)**
```bash
# Récupérer toutes les inscriptions et parser les AFP côté client
curl "https://track.7ladies.com/api/?command=registrations&fromdate=2025-10-01&todate=2025-10-31&json=1" \
  -H "affiliateid: 36063" \
  -H "x-api-key: VOTRE_CLE"

# Puis parser afp:|afp10:Tiktok ou |afp10:Streamers
```

### **5. Rapport mensuel**
```bash
# Stats par mois
curl "https://track.7ladies.com/api/?command=mediareport&fromdate=2025-01-01&todate=2025-12-31&DateFormat=month" \
  -H "affiliateid: 36063" \
  -H "x-api-key: VOTRE_CLE"
```

---

## ⚠️ **LIMITATIONS & BONNES PRATIQUES**

### **Limitations:**
- ❌ Maximum recommandé: **31 jours** par requête
- ❌ Pas de dates futures
- ❌ `mediareport` et `commissions` ne supportent pas JSON
- ⚠️ `mediareport` nécessite au moins 1 breakdown

### **Bonnes pratiques:**
- ✅ Utiliser `json=1` pour `registrations` (plus facile à parser)
- ✅ Limiter les périodes à 30 jours
- ✅ Convertir XML en JSON côté client si besoin
- ✅ Cacher les réponses (elles changent peu)
- ✅ Parser les AFP pour extraire les sub-tracking codes

---

## 🔧 **CONVERSION XML → JSON (PowerShell)**

```powershell
# Fonction pour convertir media report en JSON
$headers = @{
    'affiliateid' = '36063'
    'x-api-key' = 'VOTRE_CLE'
}

$response = Invoke-WebRequest -Uri "https://track.7ladies.com/api/?command=mediareport&fromdate=2025-10-01&todate=2025-10-31&TrackingCode=1" -Headers $headers

# Parser XML
[xml]$xml = $response.Content

# Convertir en objets PowerShell
$jsonData = $xml.ResultSet.row | ForEach-Object {
    [PSCustomObject]@{
        Day = $_.Day
        TrackingCode = $_.Tracking_Code
        UniqueVisitors = [int]$_.Unique_Visitors
        Registrations = [int]$_.Registrations
        FTD = [int]$_.FTD
        Commission = [decimal]$_.Commission
    }
}

# Convertir en JSON
$jsonData | ConvertTo-Json -Depth 3
```

---

## 📚 **RESSOURCES**

- **Documentation Postman:** Voir `cellxpert-affiliate-api-settings.json`
- **Vos clés:** Stockées dans `.env`

---

**Dernière mise à jour:** 18 octobre 2025
