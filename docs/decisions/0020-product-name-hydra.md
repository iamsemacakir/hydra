# ADR 0020: The product is called Hydra

Context: `AGENTS.md` asked for the working name DevOpsPlatform until a final product name was chosen. The team has chosen **Hydra**, the name of the repository.

Decision: Use Hydra in everything people read: the brand in the navigation and footer, page titles, eyebrows and headings, the sign-in screen (Keycloak realm display name) and all copy. Keep `DevOpsPlatform` as the working name of the code: the .NET solution, project and namespace names, the Keycloak realm and client ids, and the npm package name.

Consequences: Renaming the code is not needed and would only add risk; a reader of the code sees DevOpsPlatform, a user of the product sees Hydra. The Keycloak display name applies when the realm is imported, so an existing local Keycloak keeps the old header until its realm is imported again.
