import type { TocEntry } from "./content/python-django-blueprint";

export interface GuideModule {
  html: string;
  toc: TocEntry[];
}

/**
 * One entry per guide. Adding a new guide means adding one line here -
 * see guides/README.md for the full walkthrough.
 *
 * These are dynamic imports on purpose: 17 guides is a lot of markup
 * (roughly 1MB combined), and nobody reading one guide needs the other
 * sixteen in their initial bundle. Each entry becomes its own chunk,
 * fetched only when that guide is opened.
 */
export const guideRegistry: Record<string, () => Promise<GuideModule>> = {
  "python-django-blueprint": () => import("./content/python-django-blueprint"),
  "django-complete-guide": () => import("./content/django-complete-guide"),
  "django-auth-blueprint": () => import("./content/django-auth-blueprint"),
  "django-frontend-guide": () => import("./content/django-frontend-guide"),
  "django-deployment-guide": () => import("./content/django-deployment-guide"),
  "django-multipage-guide": () => import("./content/django-multipage-guide"),
  "django-single-page-guide": () => import("./content/django-single-page-guide"),
  "django-saas-dashboard": () => import("./content/django-saas-dashboard"),
  "django-user-management": () => import("./content/django-user-management"),
  "django-blog-guide": () => import("./content/django-blog-guide"),
  "django-postgres-guide": () => import("./content/django-postgres-guide"),
  "react-ultimate-guide": () => import("./content/react-ultimate-guide"),
  "javascript-in-react": () => import("./content/javascript-in-react"),
  "vue-ultimate-guide": () => import("./content/vue-ultimate-guide"),
  "wagtail-zero-to-production": () => import("./content/wagtail-zero-to-production"),
  "wagtail-gaming-blog": () => import("./content/wagtail-gaming-blog"),
  "infra-deep-guide": () => import("./content/infra-deep-guide"),
};
