# Base de datos PostgreSQL: Esquema `public`

Este documento resume la estructura actual de la base de datos según el inventario proporcionado. Incluye tablas y vistas junto con sus columnas, tipos de datos y valores de ejemplo cuando están disponibles.

## Tablas

### `cat_difficulty`
| Columna       | Tipo      | Valor de ejemplo |
|---------------|-----------|------------------|
| difficulty_id | smallint  | 1                |
| code          | text      | Easy             |
| name          | text      | Fácil            |
| xp_base       | smallint  | 1                |

### `cat_emotion`
| Columna    | Tipo     | Valor de ejemplo |
|------------|----------|------------------|
| emotion_id | smallint | 1                |
| code       | text     | CALMA            |
| name       | text     | Calma            |

### `cat_game_mode`
| Columna       | Tipo     | Valor de ejemplo |
|---------------|----------|------------------|
| game_mode_id  | smallint | 1                |
| code          | text     | LOW              |
| name          | text     | Low Mood         |
| weekly_target | smallint | 1                |

### `cat_pillar`
| Columna   | Tipo     | Valor de ejemplo |
|-----------|----------|------------------|
| pillar_id | smallint | 1                |
| code      | text     | BODY             |
| name      | text     | Cuerpo           |

### `cat_trait`
| Columna   | Tipo     | Valor de ejemplo |
|-----------|----------|------------------|
| trait_id  | smallint | 1                |
| pillar_id | smallint | 1                |
| code      | text     | ENERGIA          |
| name      | text     | Energía          |

### `daily_log`
| Columna    | Tipo                        | Valor de ejemplo                         |
|------------|-----------------------------|------------------------------------------|
| log_id     | uuid                        | ded098a5-2e57-476e-85c7-2962e45b0e72     |
| date       | date                        | 2025-10-03                               |
| user_id    | uuid                        | dedb5d95-244c-47b7-922c-c256d8930723     |
| task_id    | uuid                        | 3e646e50-ee87-4c21-bde3-4a67a672d6f2     |
| quantity   | integer                     | 1                                        |
| created_at | timestamp with time zone    | 2025-10-06 21:44:19.83434+00             |

### `emotions_logs`
| Columna       | Tipo                     | Valor de ejemplo                         |
|---------------|--------------------------|------------------------------------------|
| emotion_log_id| uuid                     | 5685bf4d-f002-494a-9336-0378032bb6f9     |
| date          | date                     | 2025-08-07                               |
| user_id       | uuid                     | dedb5d95-244c-47b7-922c-c256d8930723     |
| emotion_id    | smallint                 | 1                                        |
| created_at    | timestamp with time zone | 2025-10-06 21:58:09.489889+00            |

### `tasks`
| Columna     | Tipo                     | Valor de ejemplo                         |
|-------------|--------------------------|------------------------------------------|
| task_id     | uuid                     | 3e646e50-ee87-4c21-bde3-4a67a672d6f2     |
| user_id     | uuid                     | dedb5d95-244c-47b7-922c-c256d8930723     |
| tasks_group_id | uuid                  | 34cb4c76-a37c-4b46-affd-42777dfcf567     |
| task        | text                     | Hacer ejercicios de estiramiento y movilidad |
| pillar_id   | smallint                 | 1                                        |
| trait_id    | smallint                 | 32                                       |
| difficulty_id | smallint               | 1                                        |
| xp_base     | smallint                 | 1                                        |
| active      | boolean                  | true                                     |
| created_at  | timestamp with time zone | 2025-10-06 21:37:03.581561+00            |
| updated_at  | timestamp with time zone | 2025-10-06 21:37:03.581561+00            |

### `users`
| Columna                        | Tipo                     | Valor de ejemplo                         |
|--------------------------------|--------------------------|------------------------------------------|
| user_id                        | uuid                     | dedb5d95-244c-47b7-922c-c256d8930723     |
| clerk_user_id                  | text                     | user_33a7i1Axe2UpuzuEBitjPFDhbE3         |
| email_primary                  | text                     | legacy-user@example.com                  |
| full_name                      | text                     | Ramiro Fernandez                         |
| image_url                      | text                     | https://i.ibb.co/4RRnX20q/Avatar1.jpg    |
| game_mode_id                   | smallint                 | 3                                        |
| timezone                       | text                     | EUROPE/MADRID                            |
| tasks_group_id                 | uuid                     | 34cb4c76-a37c-4b46-affd-42777dfcf567     |
| first_date_log                 | date                     | 2025-07-14                               |
| scheduler_enabled              | boolean                  | false                                    |
| created_at                     | timestamp with time zone | 2025-10-06 19:24:00.237698+00            |
| updated_at                     | timestamp with time zone | 2025-10-06 19:24:00.237698+00            |
| user_profile                   | text                     | *(null)*                                  |
| channel_scheduler              | text                     | email                                    |
| hour_scheduler                 | timestamp with time zone | *(null)*                                  |
| status_scheduler               | text                     | PAUSED                                   |
| last_sent_local_date_scheduler | date                     | *(null)*                                  |
| first_programmed               | boolean                  | true                                     |
| first_tasks_confirmed          | boolean                  | true                                     |

## Vistas

### `v_user_daily_xp`
| Columna | Tipo | Valor de ejemplo |
|---------|------|------------------|
| date    | date | 2025-07-14       |
| user_id | uuid | dedb5d95-244c-47b7-922c-c256d8930723 |
| xp_day  | bigint | 60             |

### `v_user_level`
| Columna     | Tipo    | Valor de ejemplo |
|-------------|---------|------------------|
| user_id     | uuid    | dedb5d95-244c-47b7-922c-c256d8930723 |
| level       | integer | 0                |
| xp_required | bigint  | 207              |

### `v_user_total_xp`
| Columna | Tipo   | Valor de ejemplo |
|---------|--------|------------------|
| user_id | uuid   | dedb5d95-244c-47b7-922c-c256d8930723 |
| total_xp| numeric| 1560             |

