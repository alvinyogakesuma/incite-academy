---
paths:
  - 'app/**'
---

# App

## Keyless pivots: write and delete through the query builder, never the model instance
user_badges/user_avatars have no primary key. $pivot->update() and $pivot->delete() silently no-op (null-key where clauses) while model events still fire — the observers react to writes that never happened. Mutate these tables only via Model::query()->where(...)->update()/delete(), or firstOrCreate/create for inserts. Cascade deletes fire no Eloquent events at all, so recipient counters are not settled by row deletion.
