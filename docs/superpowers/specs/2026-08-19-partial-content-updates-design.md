# Partial Content Updates Design

## Goal

Prevent small Health mutations from resending unrelated embedded binary data and being rejected by nginx as oversized requests.

## Decision

Extend `/api/content/[id]` with `PATCH` semantics. A patch body may contain `is_public` and/or a top-level `payload` fragment. The server loads the existing document, shallow-merges the payload fragment into the existing payload, validates the complete merged payload with the document's registered Zod schema, and writes only the supplied top-level fields with MongoDB dotted paths.

`PUT` remains the full-replacement operation for existing consumers. `PATCH` rejects empty requests, non-object payload fragments, unknown payload keys, and invalid merged payloads.

## Health integration

Health sub-record helpers send only the changed collection, for example:

```json
{
  "payload": {
    "vaccinations": []
  }
}
```

Vaccination add, edit, and repeat mutations use the same partial contract. This excludes `profile_pic`, health documents, and all other unrelated profile fields from the request while preserving the current vaccination workflow and response refresh.

## Error handling and safety

- The API validates the merged document before writing, so partial updates cannot bypass module validation.
- Unknown keys are rejected rather than silently stripped by Zod.
- MongoDB field names are generated only from keys retained by the validated payload, preventing arbitrary dotted-path updates.
- The Health client checks `response.ok`; failed mutations do not show success or close the form.

## Verification

- Route tests cover successful merging, dotted-field updates, unknown keys, malformed payload fragments, and validation failures.
- A Health component regression test proves that vaccination persistence uses `PATCH` and omits a large profile picture from the request body.
- Run `pnpm check` after focused tests pass.
