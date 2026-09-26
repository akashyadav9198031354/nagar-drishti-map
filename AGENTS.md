<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Clustering & priority scoring run client-side in src/lib/civic.ts — transparent, configurable, no extra tables.
- Report photos live in private bucket `report-photos`, shown via signed URLs — workspace blocks public buckets.
- First account to sign up gets the `authority` role (trigger handle_new_user) — demo bootstrap; later users are citizens.
