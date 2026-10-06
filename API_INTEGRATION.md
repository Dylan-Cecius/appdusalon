# API Integration — V2

Les anciens endpoints V1 `get-services`, `get-barbers`, `get-available-slots` et `create-booking` sont retirés en V2 et répondent HTTP 410.

## Réservation publique V2

### Charger un salon, ses services et son équipe
`GET /functions/v1/get-salon-booking-data?slug=<salon-slug>`

Retourne les données publiques nécessaires au parcours de réservation, uniquement si le salon dispose d'un plan autorisant la réservation en ligne.

### Charger les créneaux disponibles
`GET /functions/v1/get-booking-slots?salon_id=<uuid>&service_id=<uuid>&date=YYYY-MM-DD[&staff_id=<uuid>]`

Le backend récupère lui-même la durée et le buffer du service. Les horaires du salon, les horaires du personnel, les pauses et les rendez-vous existants sont vérifiés côté serveur.

### Créer une réservation
`POST /functions/v1/create-public-booking`

Corps :
```json
{
  "salon_id": "<uuid>",
  "staff_id": "<uuid>",
  "service_id": "<uuid>",
  "start_time": "<ISO-8601>",
  "client_name": "Jean Dupont",
  "client_phone": "+32..."
}
```

Le prix, la durée et le contenu de la prestation ne sont jamais acceptés depuis le client : ils sont relus dans la base. Le serveur revalide également le plan du salon, les horaires du membre, les heures d'ouverture et les conflits avant insertion.

## Authentification

Les endpoints de réservation publique sont volontairement accessibles sans session utilisateur, mais n'exposent que les données strictement nécessaires et appliquent toutes les vérifications métier côté serveur.

Les endpoints d'administration, d'abonnement, de rapports et de SMS nécessitent une session authentifiée et des droits de plan appropriés.
