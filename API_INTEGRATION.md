# API de Réservation en Ligne - Documentation

## URLs de Base
- **Production**: `https://vrawwiqeutbqqdzkhrax.supabase.co/functions/v1/`
- **Développement**: `http://localhost:54328/functions/v1/`

## Endpoints Disponibles

### 1. Récupérer les Services
**Endpoint**: `GET /get-services`

**Paramètres (optionnels)**:
- `category`: Filtrer par catégorie (`coupe`, `barbe`, `combo`, `soin`, `couleur`)

**Exemple**:
```bash
curl "https://vrawwiqeutbqqdzkhrax.supabase.co/functions/v1/get-services"
```

**Réponse**:
```json
{
  "services": [
    {
      "id": "1",
      "name": "Coupe Homme",
      "price": 18.00,
      "duration": 30,
      "category": "coupe",
      "appointmentBuffer": 10
    }
  ],
  "categories": [
    {
      "id": "coupe",
      "name": "Coupes"
    }
  ]
}
```

### 2. Récupérer les Coiffeurs
**Endpoint**: `GET /get-barbers`

**Exemple**:
```bash
curl "https://vrawwiqeutbqqdzkhrax.supabase.co/functions/v1/get-barbers"
```

**Réponse**:
```json
{
  "barbers": [
    {
      "id": "uuid",
      "name": "Jean Dupont",
      "working_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "work_hours": {
        "start": "10:00",
        "end": "19:00"
      },
      "color": "bg-blue-600"
    }
  ]
}
```

### 3. Récupérer les Créneaux Disponibles
**Endpoint**: `GET /get-available-slots`

**Paramètres requis**:
- `date`: Date au format YYYY-MM-DD
- `serviceDuration`: Durée du service en minutes (défaut: 30)

**Paramètres optionnels**:
- `barberId`: ID d'un coiffeur spécifique

**Exemple**:
```bash
curl "https://vrawwiqeutbqqdzkhrax.supabase.co/functions/v1/get-available-slots?date=2024-03-15&serviceDuration=30"
```

**Réponse**:
```json
{
  "date": "2024-03-15",
  "available_slots": [
    {
      "barber_id": "uuid",
      "barber_name": "Jean Dupont",
      "slots": [
        {
          "start_time": "2024-03-15T10:00:00.000Z",
          "end_time": "2024-03-15T10:30:00.000Z",
          "time_display": "10:00"
        }
      ]
    }
  ]
}
```

### 4. Créer une Réservation
**Endpoint**: `POST /create-booking`

**Corps de la requête**:
```json
{
  "client_name": "Marie Martin",
  "client_phone": "0123456789",
  "client_email": "marie@example.com",
  "barber_id": "uuid-du-coiffeur",
  "start_time": "2024-03-15T10:00:00.000Z",
  "end_time": "2024-03-15T10:30:00.000Z",
  "services": [
    {
      "id": "1",
      "name": "Coupe Homme",
      "price": 18.00,
      "duration": 30
    }
  ],
  "notes": "Coupe courte s'il vous plaît"
}
```

**Exemple**:
```bash
curl -X POST "https://vrawwiqeutbqqdzkhrax.supabase.co/functions/v1/create-booking" \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "Marie Martin",
    "client_phone": "0123456789",
    "barber_id": "uuid-du-coiffeur",
    "start_time": "2024-03-15T10:00:00.000Z",
    "end_time": "2024-03-15T10:30:00.000Z",
    "services": [
      {
        "id": "1",
        "name": "Coupe Homme",
        "price": 18.00,
        "duration": 30
      }
    ]
  }'
```

**Réponse en cas de succès**:
```json
{
  "success": true,
  "appointment": {
    "id": "uuid-du-rendez-vous",
    "client_name": "Marie Martin",
    "barber_name": "Jean Dupont",
    "start_time": "2024-03-15T10:00:00.000Z",
    "end_time": "2024-03-15T10:30:00.000Z",
    "services": [...],
    "total_price": 18.00,
    "status": "scheduled"
  },
  "message": "Réservation créée avec succès"
}
```

## Flux de Réservation Recommandé

1. **Récupérer les services** avec `GET /get-services`
2. **Récupérer les coiffeurs** avec `GET /get-barbers`
3. **Afficher un sélecteur de date** à l'utilisateur
4. **Récupérer les créneaux disponibles** avec `GET /get-available-slots`
5. **Créer la réservation** avec `POST /create-booking`

## Gestion des Erreurs

Toutes les APIs retournent des codes de statut HTTP appropriés :
- `200`: Succès
- `400`: Erreur de validation (paramètres manquants ou invalides)
- `404`: Ressource non trouvée
- `409`: Conflit (créneau déjà pris)
- `500`: Erreur serveur

Format d'erreur :
```json
{
  "error": "Description de l'erreur"
}
```

## CORS

Toutes les APIs supportent CORS avec les headers suivants :
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type`

## Notes Importantes

- Les créneaux sont générés par tranches de 30 minutes
- Les réservations externes n'ont pas de `user_id` (utilisateurs non authentifiés)
- Le statut par défaut des nouvelles réservations est `scheduled`
- Le paiement par défaut est `is_paid: false`
- Les conflits de créneaux sont vérifiés automatiquement