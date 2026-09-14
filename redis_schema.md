# Redis Schema Definition

## Key Format
`user:{stellar_address}:data`

## Value Structure (JSON)
The value is a JSON string with a Time-To-Live (TTL) of 24 hours.

```json
{
  "status": "active_subscription", 
  "tier": 1, 
  "expiry": 1709251200, 
  "airdrops": [
    {
      "name": "Stellar Ecosystem Fund",
      "url": "https://stellar.org/claim",
      "amount": "500 XLM"
    },
    {
      "name": "Soroban dApp Grant",
      "url": "https://soroban.stellar.org",
      "amount": "100 XLM"
    }
  ],
  "last_updated": 1708646400
}
```

## Fields
- **status**: `active_subscription` | `expired` | `no_subscription`
- **tier**: Subscription tier level (1, 2, 3)
- **expiry**: Unix timestamp of subscription expiry
- **airdrops**: List of eligible airdrops
    - **name**: Name of the airdrop
    - **url**: Claim URL (Filtered against `ALLOWED_DOMAINS`)
    - **amount**: Estimated amount
- **last_updated**: Unix timestamp of when this data was fetched/written
