# Lindy documentation

Intended documentation URL: https://brybrophy.github.io/lindy-docs/.
This repository contains only the reviewed static edition and its public deployment
checks. It is not a fork, mirror or source distribution of the application.

Canonical content and presentation are maintained separately through Lindy's
semantic review workflow. To update: generate a new static edition, review its
exact pages, search corpus, links, notices and checksums, replace only `site/` and
`site-manifest.json`, and review the commit on main. Do not hand-edit generated
HTML or put source archives, runtime files, logs or credentials here.

Run `node verify-public.mjs` before promotion. Checksums establish byte consistency,
not publisher authentication. The main-only Pages workflow deploys `site/`; pull
requests get read-only verification and cannot deploy. The owner must enable
GitHub Actions as the repository's Pages source and review its environment rules.
There is no private repository token, custom domain, DNS step, npm publication or
paid host. A successful deployment and live route verification are required before
claiming the site is published.
